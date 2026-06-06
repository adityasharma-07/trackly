#!/usr/bin/env python3
"""
TableTrack — local webcam table occupancy tracker
Uses YOLOv8n (CPU) to detect people inside user-drawn table zones.

Controls (click the window first so it has focus):
  E         toggle zone-edit mode
  D         toggle detection on/off
  S         save zones  →  zones.json
  L         load zones  ←  zones.json
  Z         undo last zone
  + / =     increase capacity of last zone
  -         decrease capacity of last zone
  Q / Esc   quit
"""

import cv2
import json
import time
import numpy as np
from pathlib import Path
from ultralytics import YOLO

# ── Config ────────────────────────────────────────────────────────────────────
CAMERA_INDEX = 0          # change if your webcam isn't device 0
ZONES_FILE   = Path("zones.json")
MODEL_NAME   = "yolov8n.pt"   # downloaded automatically on first run (~6 MB)
PERSON_CLASS = 0              # COCO class 0 = person
CONF_THRESH  = 0.40

OCCUPY_SECS  = 3.0   # person must be in zone this long before → occupied
VACATE_SECS  = 5.0   # zone must be empty this long before  → available

FRAME_W = 960
FRAME_H = 540
PANEL_W = 300         # right-side status panel

# BGR colour palette
C_AVAIL   = ( 60, 200,  60)
C_OCC     = ( 40,  40, 220)
C_PARTIAL = (  0, 165, 255)
C_UNKNOWN = (140, 140, 140)
C_DRAW    = (255, 200,   0)
C_WHITE   = (255, 255, 255)
C_DIM     = (130, 130, 130)
C_PANEL   = ( 28,  28,  28)
C_ACCENT  = ( 80, 180, 255)

STATUS_COLOR = {
    "available": C_AVAIL,
    "occupied":  C_OCC,
    "partial":   C_PARTIAL,
    "unknown":   C_UNKNOWN,
}


# ── Zone helpers ──────────────────────────────────────────────────────────────

def make_zone(name: str, rect_norm: list, capacity: int = 4) -> dict:
    """rect_norm = [x1,y1,x2,y2] each normalised to 0-1."""
    return {
        "name":       name,
        "capacity":   capacity,
        "rect":       rect_norm,
        "status":     "unknown",
        "count":      0,
        "conf":       0.0,
        "_in_since":  None,   # timestamp: when a person was first detected
        "_out_since": None,   # timestamp: when the zone first became empty
    }


def norm_rect(x1, y1, x2, y2, w, h) -> list:
    return [min(x1,x2)/w, min(y1,y2)/h, max(x1,x2)/w, max(y1,y2)/h]


def px_rect(zone: dict, w: int, h: int) -> tuple:
    r = zone["rect"]
    return int(r[0]*w), int(r[1]*h), int(r[2]*w), int(r[3]*h)


def rects_overlap(b: tuple, z: tuple) -> bool:
    bx1, by1, bx2, by2 = b
    zx1, zy1, zx2, zy2 = z
    return not (bx2 < zx1 or bx1 > zx2 or by2 < zy1 or by1 > zy2)


# ── Occupancy logic ───────────────────────────────────────────────────────────

def update_zone(zone: dict, persons: list, now: float):
    count = len(persons)
    conf  = max((p["conf"] for p in persons), default=0.0)
    zone["count"] = count
    zone["conf"]  = conf

    if count > 0:
        zone["_out_since"] = None
        if zone["_in_since"] is None:
            zone["_in_since"] = now
        if now - zone["_in_since"] >= OCCUPY_SECS:
            zone["status"] = "occupied" if count >= zone["capacity"] else "partial"
    else:
        zone["_in_since"] = None
        if zone["_out_since"] is None:
            zone["_out_since"] = now
        if now - zone["_out_since"] >= VACATE_SECS:
            zone["status"] = "available"


# ── Drawing helpers ───────────────────────────────────────────────────────────

def draw_zone(frame: np.ndarray, zone: dict, w: int, h: int):
    x1, y1, x2, y2 = px_rect(zone, w, h)
    color = STATUS_COLOR.get(zone["status"], C_UNKNOWN)

    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    cv2.addWeighted(overlay, 0.18, frame, 0.82, 0, frame)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    cv2.putText(frame, zone["name"], (x1+6, y1+18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.52, C_WHITE, 1, cv2.LINE_AA)
    if zone["count"] > 0:
        cv2.putText(frame, f"{zone['count']}p", (x2-32, y1+18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, color, 1, cv2.LINE_AA)
    short = {"available":"AVAIL","occupied":"OCC","partial":"PART","unknown":"?"}
    cv2.putText(frame, short.get(zone["status"], "?"), (x1+6, y2-6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, color, 1, cv2.LINE_AA)


def draw_detections(frame: np.ndarray, detections: list):
    for d in detections:
        x1, y1, x2, y2 = d["box"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (200, 200, 200), 1)
        cv2.putText(frame, f"{d['conf']:.2f}", (x1, max(y1-4, 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 200, 200), 1, cv2.LINE_AA)


def draw_panel(zones: list, detecting: bool, edit_mode: bool, fps: float) -> np.ndarray:
    panel = np.full((FRAME_H, PANEL_W, 3), C_PANEL, dtype=np.uint8)

    def put(text, y, col=C_WHITE, scale=0.48, thick=1) -> int:
        cv2.putText(panel, text, (12, y),
                    cv2.FONT_HERSHEY_SIMPLEX, scale, col, thick, cv2.LINE_AA)
        return y + int(scale * 32) + 4

    y = 22
    y = put("TableTrack", y, C_ACCENT, 0.70, 2)

    mode_str = "EDIT MODE" if edit_mode else ("DETECTING" if detecting else "PAUSED")
    mode_col = C_DRAW if edit_mode else (C_AVAIL if detecting else C_DIM)
    y = put(mode_str, y, mode_col, 0.48)
    y = put(f"FPS {fps:.1f}", y, C_DIM, 0.40)

    cv2.line(panel, (12, y+2), (PANEL_W-12, y+2), (60, 60, 60), 1)
    y += 14

    avail = sum(1 for z in zones if z["status"] == "available")
    taken = sum(1 for z in zones if z["status"] in ("occupied", "partial"))
    y = put(f"Zones {len(zones)}   Open {avail}   Taken {taken}", y, C_WHITE, 0.44)
    y += 6

    for z in zones:
        col = STATUS_COLOR.get(z["status"], C_UNKNOWN)
        cv2.circle(panel, (20, y - 5), 5, col, -1)
        y = put(f"  {z['name'][:16]}  [{z['capacity']}]", y, C_WHITE, 0.44)
        if z["conf"] > 0:
            bar_max = PANEL_W - 28
            bar_w   = int(bar_max * z["conf"])
            cv2.rectangle(panel, (14, y-2), (14+bar_w, y+5), col, -1)
            y = put(f"  conf {z['conf']:.0%}  {z['count']} person(s)", y+2, C_DIM, 0.38)
        y += 4

    # Controls at bottom
    footer_y = max(y + 10, FRAME_H - 150)
    cv2.line(panel, (12, footer_y), (PANEL_W-12, footer_y), (60, 60, 60), 1)
    footer_y += 10
    for line in ["E  edit zones", "D  toggle detect", "S  save  L  load",
                 "Z  undo zone", "+/-  capacity", "Q  quit"]:
        footer_y = put(line, footer_y, C_DIM, 0.38)

    return panel


# ── Persistence ───────────────────────────────────────────────────────────────

def save_zones(zones: list):
    data = [
        {k: v for k, v in z.items() if not k.startswith("_")}
        for z in zones
    ]
    ZONES_FILE.write_text(json.dumps({"zones": data}, indent=2))
    print(f"[tabletrack] Saved {len(zones)} zone(s) → {ZONES_FILE}")


def load_zones() -> list:
    if not ZONES_FILE.exists():
        print("[tabletrack] No zones.json found — start with E to draw zones.")
        return []
    raw = json.loads(ZONES_FILE.read_text())
    zones = [
        make_zone(d["name"], d["rect"], d.get("capacity", 4))
        for d in raw.get("zones", [])
    ]
    print(f"[tabletrack] Loaded {len(zones)} zone(s) from {ZONES_FILE}.")
    return zones


# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    print("[tabletrack] Loading YOLOv8n — first run downloads ~6 MB model…")
    model = YOLO(MODEL_NAME)
    model.fuse()
    print("[tabletrack] Model ready.")

    print(f"[tabletrack] Opening camera {CAMERA_INDEX}…")
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        raise RuntimeError(
            f"Could not open camera {CAMERA_INDEX}. "
            "Try changing CAMERA_INDEX at the top of tracker.py."
        )
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)

    zones: list      = load_zones()
    edit_mode        = False
    detecting        = True
    drawing          = False
    draw_start       = (0, 0)
    draw_cur         = (0, 0)
    cached_dets: list = []
    fps, fps_count, fps_ts = 0.0, 0, time.time()

    WIN = "TableTrack  —  E=draw zones  D=detect  Q=quit"
    cv2.namedWindow(WIN, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WIN, FRAME_W + PANEL_W, FRAME_H)

    def on_mouse(event, mx, my, flags, _):
        nonlocal drawing, draw_start, draw_cur, zones
        if not edit_mode or mx >= FRAME_W:   # ignore clicks in the panel
            return
        if event == cv2.EVENT_LBUTTONDOWN:
            drawing    = True
            draw_start = (mx, my)
            draw_cur   = (mx, my)
        elif event == cv2.EVENT_MOUSEMOVE and drawing:
            draw_cur = (mx, my)
        elif event == cv2.EVENT_LBUTTONUP and drawing:
            drawing = False
            x1, y1  = draw_start
            x2, y2  = mx, min(my, FRAME_H)
            if abs(x2-x1) > 20 and abs(y2-y1) > 20:
                name = f"Table {len(zones)+1}"
                zones.append(make_zone(name, norm_rect(x1, y1, x2, y2, FRAME_W, FRAME_H)))
                print(f"[tabletrack] Added zone '{name}'  (Z to undo, +/- to set capacity)")

    cv2.setMouseCallback(WIN, on_mouse)
    print("[tabletrack] Window open. Press E in the window to start drawing table zones.")

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        frame = cv2.resize(frame, (FRAME_W, FRAME_H))
        now   = time.time()
        fps_count += 1
        if now - fps_ts >= 1.0:
            fps       = fps_count / (now - fps_ts)
            fps_count = 0
            fps_ts    = now

        # ── Detection ─────────────────────────────────────────────────────────
        if detecting and not edit_mode:
            results = model(frame, classes=[PERSON_CLASS],
                            conf=CONF_THRESH, verbose=False, device="cpu")
            cached_dets = [
                {"box": tuple(map(int, box.xyxy[0])), "conf": float(box.conf[0])}
                for r in results for box in r.boxes
            ]

        for zone in zones:
            z_px = px_rect(zone, FRAME_W, FRAME_H)
            persons_here = [
                d for d in cached_dets if rects_overlap(d["box"], z_px)
            ]
            update_zone(zone, persons_here, now)

        # ── Render ────────────────────────────────────────────────────────────
        display = frame.copy()

        for zone in zones:
            draw_zone(display, zone, FRAME_W, FRAME_H)

        if detecting and not edit_mode:
            draw_detections(display, cached_dets)

        if drawing and edit_mode:
            cv2.rectangle(display, draw_start, draw_cur, C_DRAW, 2)

        if edit_mode:
            cv2.putText(display,
                        "EDIT  —  drag to draw a zone  |  Z undo  |  E to finish",
                        (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.52, C_DRAW, 1, cv2.LINE_AA)

        panel     = draw_panel(zones, detecting, edit_mode, fps)
        composite = np.hstack([display, panel])
        cv2.imshow(WIN, composite)

        # ── Keyboard ──────────────────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break
        elif key == ord('e'):
            edit_mode = not edit_mode
            print(f"[tabletrack] Edit mode {'ON — drag to draw zones' if edit_mode else 'OFF'}")
        elif key == ord('d'):
            detecting = not detecting
            print(f"[tabletrack] Detection {'ON' if detecting else 'OFF (paused)'}")
        elif key == ord('s'):
            save_zones(zones)
        elif key == ord('l'):
            zones = load_zones()
        elif key == ord('z') and zones:
            print(f"[tabletrack] Removed zone '{zones[-1]['name']}'")
            zones.pop()
        elif key in (ord('+'), ord('=')) and zones:
            zones[-1]["capacity"] = min(zones[-1]["capacity"] + 1, 20)
            print(f"[tabletrack] '{zones[-1]['name']}' capacity → {zones[-1]['capacity']}")
        elif key == ord('-') and zones:
            zones[-1]["capacity"] = max(zones[-1]["capacity"] - 1, 1)
            print(f"[tabletrack] '{zones[-1]['name']}' capacity → {zones[-1]['capacity']}")

    cap.release()
    cv2.destroyAllWindows()
    print("[tabletrack] Closed.")


if __name__ == "__main__":
    main()
