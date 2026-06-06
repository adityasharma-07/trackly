"""
TableTrack — FastAPI server with live webcam detection
Run: uvicorn server:app --host 0.0.0.0 --port 8000
Then open http://localhost:8000 in your browser.
"""

import asyncio
import cv2
import json
import threading
import time
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from ultralytics import YOLO

# ── Config ────────────────────────────────────────────────────────────────────
CAMERA_INDEX     = 0
ZONES_FILE       = Path("zones.json")
MODEL_NAME       = "yolov8n.pt"
FRAME_W, FRAME_H = 960, 540
CONF_THRESH      = 0.40
PERSON_CLASS     = 0
OCCUPY_SECS      = 3.0
VACATE_SECS      = 5.0
BROADCAST_HZ     = 2      # WebSocket state updates per second
DETECT_INTERVAL  = 0.15   # seconds between YOLO runs (~6-7 fps detection)

# ── Shared state ──────────────────────────────────────────────────────────────
_lock = threading.Lock()
_ws_clients: set = set()
_event_loop: asyncio.AbstractEventLoop | None = None

_latest_raw: bytes = b""    # raw MJPEG frame bytes
_latest_frame: np.ndarray | None = None  # latest raw numpy frame
_cached_dets: list = []     # latest YOLO detections (shared with MJPEG generator)

_zones: list = []           # live zone dicts (with detection state)
_running: bool = True       # detection on/off
_updated_at: int = 0        # epoch ms of last state change

_analytics = {
    "occ_by_hour":     [0.0] * 24,
    "_hour_samples":   [0]   * 24,
    "_hour_occ":       [0]   * 24,
    "sessions_today":  0,
    "total_occ_ms":    0,
    "_last_occ":       False,
    "_session_start":  None,
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def _rects_overlap(bx1, by1, bx2, by2, zx1, zy1, zx2, zy2) -> bool:
    return not (bx2 < zx1 or bx1 > zx2 or by2 < zy1 or by1 > zy2)


def _zone_px(z: dict) -> tuple:
    return z["x"], z["y"], z["x"] + z["w"], z["y"] + z["h"]


def _update_zone(z: dict, persons: list, now: float):
    count = len(persons)
    conf  = max((p["conf"] for p in persons), default=0.0)
    z["people"] = count
    z["conf"]   = conf
    if count > 0:
        z["_out_since"] = None
        if z["_in_since"] is None:
            z["_in_since"] = now
        if now - z["_in_since"] >= OCCUPY_SECS:
            ns = "occupied" if count >= z["cap"] else "partial"
            if ns != z["status"]:
                z["status"]    = ns
                z["_since_ms"] = int(time.time() * 1000)
    else:
        z["_in_since"] = None
        if z["_out_since"] is None:
            z["_out_since"] = now
        if now - z["_out_since"] >= VACATE_SECS:
            if z["status"] != "available":
                z["status"]    = "available"
                z["_since_ms"] = int(time.time() * 1000)


def _tick_analytics(zones: list):
    hour    = datetime.now().hour
    now_ms  = int(time.time() * 1000)
    is_occ  = any(z["status"] in ("occupied", "partial") for z in zones)
    was_occ = _analytics["_last_occ"]

    if not was_occ and is_occ:
        _analytics["sessions_today"] += 1
        _analytics["_session_start"]  = now_ms
    elif was_occ and not is_occ and _analytics["_session_start"]:
        _analytics["total_occ_ms"] += now_ms - _analytics["_session_start"]
        _analytics["_session_start"] = None

    _analytics["_last_occ"]              = is_occ
    _analytics["_hour_samples"][hour]    += 1
    _analytics["_hour_occ"][hour]        += 1 if is_occ else 0
    n = _analytics["_hour_samples"][hour]
    _analytics["occ_by_hour"][hour]      = round(_analytics["_hour_occ"][hour] / n * 100)


def _make_snapshot() -> dict:
    tables = {}
    for z in _zones:
        tables[z["id"]] = {
            "status":     z["status"],
            "people":     z["people"],
            "capacity":   z["cap"],
            "confidence": z["conf"],
            "sinceMs":    z.get("_since_ms", _updated_at),
            "name":       z["name"],
        }
    avg_min = 0
    if _analytics["sessions_today"] > 0:
        avg_min = int(_analytics["total_occ_ms"] / _analytics["sessions_today"] / 60000)

    occ_arr = _analytics["occ_by_hour"]
    peak    = occ_arr.index(max(occ_arr)) if any(occ_arr) else -1

    return {
        "tables":     tables,
        "zones":      [{"id": z["id"], "name": z["name"], "cap": z["cap"],
                        "x": z["x"], "y": z["y"], "w": z["w"], "h": z["h"]} for z in _zones],
        "running":    _running,
        "updatedAt":  _updated_at,
        "analytics": {
            "occ_by_hour":      occ_arr,
            "sessions_today":   _analytics["sessions_today"],
            "avg_turnover_min": avg_min,
            "peak_hour":        peak,
        },
    }


# ── Zone persistence ──────────────────────────────────────────────────────────
def _load_zones():
    global _zones
    if not ZONES_FILE.exists():
        _zones = []
        return
    raw = json.loads(ZONES_FILE.read_text())
    _zones = [
        {"id": d["id"], "name": d["name"], "cap": d["cap"],
         "x": d["x"], "y": d["y"], "w": d["w"], "h": d["h"],
         "status": "available", "people": 0, "conf": 0.0,
         "_in_since": None, "_out_since": None,
         "_since_ms": int(time.time() * 1000)}
        for d in raw.get("zones", [])
    ]
    print(f"[server] Loaded {len(_zones)} zone(s) from {ZONES_FILE}")


def _save_zones():
    data = [{"id": z["id"], "name": z["name"], "cap": z["cap"],
             "x": z["x"], "y": z["y"], "w": z["w"], "h": z["h"]}
            for z in _zones]
    ZONES_FILE.write_text(json.dumps({"zones": data}, indent=2))


# ── Frame annotation ──────────────────────────────────────────────────────────
_STATUS_BGR = {
    "available": (60,  200, 60),
    "occupied":  (40,  40,  220),
    "partial":   (0,   165, 255),
    "unknown":   (140, 140, 140),
}

def _annotate(frame: np.ndarray, detections: list, zones: list) -> np.ndarray:
    f = frame.copy()
    for z in zones:
        x1, y1, x2, y2 = z["x"], z["y"], z["x"] + z["w"], z["y"] + z["h"]
        col = _STATUS_BGR.get(z["status"], (140, 140, 140))
        ov  = f.copy()
        cv2.rectangle(ov, (x1, y1), (x2, y2), col, -1)
        cv2.addWeighted(ov, 0.18, f, 0.82, 0, f)
        cv2.rectangle(f, (x1, y1), (x2, y2), col, 2)
        cv2.putText(f, f"{z['name']}  {z['status'].upper()}",
                    (x1 + 5, y1 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 255, 255), 1, cv2.LINE_AA)
        if z["conf"] > 0:
            cv2.putText(f, f"{z['conf']:.0%}  {z['people']}p",
                        (x1 + 5, y2 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.38, col, 1, cv2.LINE_AA)
    for d in detections:
        bx1, by1, bx2, by2 = d["box"]
        cv2.rectangle(f, (bx1, by1), (bx2, by2), (100, 220, 255), 1)
        cv2.putText(f, f"person {d['conf']:.2f}", (bx1, max(by1 - 4, 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.36, (100, 220, 255), 1, cv2.LINE_AA)
    return f


# ── Background thread ─────────────────────────────────────────────────────────
def _detection_loop():
    global _latest_raw, _latest_frame, _updated_at, _running

    print("[server] Loading YOLOv8n (downloads ~6 MB on first run)…")
    model = YOLO(MODEL_NAME)
    model.fuse()
    print("[server] Model ready.")

    print(f"[server] Opening camera {CAMERA_INDEX}…")
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print(f"[server] ✗ Could not open camera {CAMERA_INDEX}")
        return
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
    print("[server] Camera ready — open http://localhost:8000")

    last_detect    = 0.0
    last_broadcast = 0.0

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        frame = cv2.resize(frame, (FRAME_W, FRAME_H))
        now   = time.time()

        # Store latest raw frame for MJPEG raw endpoint
        _, raw_buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        raw_bytes  = raw_buf.tobytes()
        with _lock:
            _latest_raw   = raw_bytes
            _latest_frame = frame

        # Run detection on interval
        if _running and now - last_detect >= DETECT_INTERVAL:
            last_detect = now
            with _lock:
                current_zones = _zones  # reference is fine under lock

            results = model(frame, classes=[PERSON_CLASS],
                            conf=CONF_THRESH, verbose=False, device="cpu")
            new_dets = [
                {"box": tuple(map(int, b.xyxy[0])), "conf": float(b.conf[0])}
                for r in results for b in r.boxes
            ]

            with _lock:
                global _cached_dets
                _cached_dets = new_dets
                for z in current_zones:
                    zr = _zone_px(z)
                    here = [d for d in new_dets if _rects_overlap(*d["box"], *zr)]
                    _update_zone(z, here, now)
                _tick_analytics(current_zones)
                _updated_at = int(now * 1000)

        # Broadcast to WS clients at configured rate
        if now - last_broadcast >= 1.0 / BROADCAST_HZ:
            last_broadcast = now
            _notify()


def _notify():
    if _event_loop and not _event_loop.is_closed():
        snap = _make_snapshot()
        asyncio.run_coroutine_threadsafe(_broadcast(snap), _event_loop)


# ── WebSocket broadcast ───────────────────────────────────────────────────────
async def _broadcast(data: dict):
    dead = set()
    for ws in list(_ws_clients):
        try:
            await ws.send_json(data)
        except Exception:
            dead.add(ws)
    _ws_clients -= dead


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="TableTrack")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def _startup():
    global _event_loop
    _event_loop = asyncio.get_event_loop()
    _load_zones()
    t = threading.Thread(target=_detection_loop, daemon=True)
    t.start()


# ── MJPEG streams ─────────────────────────────────────────────────────────────
async def _mjpeg_annotated():
    while True:
        with _lock:
            frame = _latest_frame
            zones = [z.copy() for z in _zones]
            dets  = list(_cached_dets)
        if frame is not None:
            ann = _annotate(frame, dets, zones)
            _, buf = cv2.imencode(".jpg", ann, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
        await asyncio.sleep(0.04)


async def _mjpeg_raw():
    while True:
        with _lock:
            data = _latest_raw
        if data:
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + data + b"\r\n"
        await asyncio.sleep(0.033)


@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(_mjpeg_annotated(),
                             media_type="multipart/x-mixed-replace;boundary=frame")


@app.get("/video_raw")
async def video_raw():
    return StreamingResponse(_mjpeg_raw(),
                             media_type="multipart/x-mixed-replace;boundary=frame")


# ── REST API ──────────────────────────────────────────────────────────────────
@app.get("/api/state")
async def get_state():
    with _lock:
        return _make_snapshot()


@app.get("/api/zones")
async def get_zones():
    with _lock:
        return {"zones": [{"id": z["id"], "name": z["name"], "cap": z["cap"],
                           "x": z["x"], "y": z["y"], "w": z["w"], "h": z["h"]}
                          for z in _zones]}


class _ZonePayload(BaseModel):
    zones: List[dict]


@app.post("/api/zones")
async def post_zones(payload: _ZonePayload):
    global _zones
    with _lock:
        old = {z["id"]: z for z in _zones}
        new_list = []
        for d in payload.zones:
            if d["id"] in old:
                z = old[d["id"]]
                z.update({"name": d["name"], "cap": d["cap"],
                          "x": d["x"], "y": d["y"], "w": d["w"], "h": d["h"]})
                new_list.append(z)
            else:
                new_list.append({
                    "id": d["id"], "name": d["name"], "cap": d["cap"],
                    "x": d["x"], "y": d["y"], "w": d["w"], "h": d["h"],
                    "status": "available", "people": 0, "conf": 0.0,
                    "_in_since": None, "_out_since": None,
                    "_since_ms": int(time.time() * 1000),
                })
        _zones = new_list
        _save_zones()
    _notify()
    return {"ok": True, "count": len(_zones)}


@app.post("/api/detection/toggle")
async def toggle_detection():
    global _running
    with _lock:
        _running = not _running
    _notify()
    return {"running": _running}


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    _ws_clients.add(ws)
    with _lock:
        snap = _make_snapshot()
    await ws.send_json(snap)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        _ws_clients.discard(ws)


# ── Static frontend (must be last) ────────────────────────────────────────────
app.mount("/", StaticFiles(directory="app", html=True), name="static")
