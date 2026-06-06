/* TableTrack — Camera Setup & Table Zone Editor (drawable) */

const SEED_ZONES = [
  { name: "Table 1", cap: 4, x: 118, y: 205, w: 150, h: 104 },
  { name: "Table 4", cap: 4, x: 300, y: 205, w: 150, h: 95 },
  { name: "Communal A", cap: 10, x: 460, y: 158, w: 112, h: 150 },
  { name: "Booth 1", cap: 4, x: 708, y: 148, w: 192, h: 104 },
  { name: "Table 7", cap: 4, x: 296, y: 332, w: 158, h: 134 },
  { name: "Booth 2", cap: 4, x: 700, y: 300, w: 202, h: 120 },
];

const CAM_SOURCES = [
  { id: "webcam", label: "Built-in webcam", meta: "FaceTime HD · 1080p", icon: "camera", ok: true },
  { id: "usb", label: "USB camera", meta: "not connected", icon: "camera", ok: false },
  { id: "ip", label: "IP / RTSP stream", meta: "rtsp://…", icon: "wifi", ok: false },
  { id: "demo", label: "Demo video", meta: "main-dining-lunch.mp4", icon: "play", ok: true },
];

function CameraSetup() {
  const [zones, setZones] = React.useState(() => SEED_ZONES.map((z, i) => ({ ...z, id: "z" + (i + 1) })));
  const [sel, setSel] = React.useState("z1");
  const [draw, setDraw] = React.useState(false);
  const [rect, setRect] = React.useState(null); // in-progress
  const [source, setSource] = React.useState("webcam");
  const [saved, setSaved] = React.useState(true);
  const idRef = React.useRef(zones.length);
  const stageRef = React.useRef(null);

  function toFrame(e) {
    const r = stageRef.current.getBoundingClientRect();
    return [
      Math.max(0, Math.min(960, ((e.clientX - r.left) / r.width) * 960)),
      Math.max(0, Math.min(540, ((e.clientY - r.top) / r.height) * 540)),
    ];
  }
  function down(e) {
    if (!draw) return;
    e.preventDefault();
    const [x, y] = toFrame(e);
    setRect({ x0: x, y0: y, x, y });
    stageRef.current.setPointerCapture?.(e.pointerId);
  }
  function move(e) {
    if (!draw || !rect) return;
    const [x, y] = toFrame(e);
    setRect((r) => ({ ...r, x, y }));
  }
  function up() {
    if (!draw || !rect) return;
    const x = Math.min(rect.x0, rect.x), y = Math.min(rect.y0, rect.y);
    const w = Math.abs(rect.x - rect.x0), h = Math.abs(rect.y - rect.y0);
    setRect(null);
    if (w < 26 || h < 26) return;
    idRef.current += 1;
    const id = "z" + (idRef.current + 100);
    const n = zones.length + 1;
    const z = { id, name: "Table " + n, cap: 4, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    setZones((prev) => [...prev, z]);
    setSel(id); setDraw(false); setSaved(false);
  }

  function update(id, patch) { setZones((prev) => prev.map((z) => z.id === id ? { ...z, ...patch } : z)); setSaved(false); }
  function remove(id) { setZones((prev) => prev.filter((z) => z.id !== id)); if (sel === id) setSel(null); setSaved(false); }

  const selZone = zones.find((z) => z.id === sel);
  const drawPreview = rect && { x: Math.min(rect.x0, rect.x), y: Math.min(rect.y0, rect.y), w: Math.abs(rect.x - rect.x0), h: Math.abs(rect.y - rect.y0) };

  return (
    <div className="page fadein" style={{ maxWidth: 1400 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Camera Setup &amp; Table Zones</div>
          <div className="page-sub">Draw a zone over each table, then name it and set its capacity. {zones.length} zones defined.</div>
        </div>
        <div className="spacer" />
        {!saved && <span className="chip" style={{ background: "var(--warn-tint)", color: "var(--warn-ink)" }}>unsaved changes</span>}
        <button className={"btn " + (saved ? "" : "primary")} onClick={() => setSaved(true)}>
          <Icon name="check" size={15} />{saved ? "Layout saved" : "Save layout"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.42fr 1fr", gap: 16, alignItems: "start" }}>
        {/* left: feed + toolbar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: 12 }}>
            <div
              ref={stageRef}
              className="editor-stage"
              style={{ cursor: draw ? "crosshair" : "default", touchAction: "none" }}
              onPointerDown={down} onPointerMove={move} onPointerUp={up}
            >
              <CameraFeed>
                {/* existing zones */}
                {zones.map((z) => {
                  const isSel = z.id === sel;
                  return (
                    <g key={z.id} style={{ pointerEvents: draw ? "none" : "auto", cursor: "pointer" }}
                      onPointerDown={(e) => { if (!draw) { e.stopPropagation(); setSel(z.id); } }}>
                      <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4"
                        fill={isSel ? "#ffffff28" : "#ffffff14"} stroke={isSel ? "#ffd27a" : "#f4efe4"}
                        strokeWidth={isSel ? 2.5 : 1.8} strokeDasharray={isSel ? "" : "7 5"} />
                      <rect x={z.x} y={z.y - 17} width={(z.name.length) * 6.4 + 30} height="17" rx="3" fill={isSel ? "#ffd27a" : "#1f1c18cc"} />
                      <text x={z.x + 6} y={z.y - 5} fontSize="11" className="tbl-cap" fill={isSel ? "#1f1c18" : "#f4efe4"} style={{ fontWeight: 600 }}>
                        {z.name} · {z.cap}p
                      </text>
                      {/* corner handles when selected */}
                      {isSel && [[z.x, z.y], [z.x + z.w, z.y], [z.x, z.y + z.h], [z.x + z.w, z.y + z.h]].map((p, i) =>
                        <rect key={i} x={p[0] - 4} y={p[1] - 4} width="8" height="8" fill="#ffd27a" stroke="#1f1c18" strokeWidth="1" />)}
                    </g>
                  );
                })}
                {/* in-progress */}
                {drawPreview && (
                  <rect x={drawPreview.x} y={drawPreview.y} width={drawPreview.w} height={drawPreview.h} rx="4"
                    fill="#7ee0ff22" stroke="#7ee0ff" strokeWidth="2" />
                )}
              </CameraFeed>
            </div>

            {/* toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px 4px" }}>
              <button className={"btn " + (draw ? "primary" : "")} onClick={() => { setDraw((d) => !d); setRect(null); }}>
                <Icon name={draw ? "pencil" : "plus"} size={15} />{draw ? "Drawing… click + drag" : "Add table zone"}
              </button>
              <button className="btn" disabled={!sel} onClick={() => sel && remove(sel)}><Icon name="trash" size={15} />Delete</button>
              <div style={{ flex: 1 }} />
              <div className="hint">
                {draw ? <>Drag a box over a table, then release.</> : <>Click a zone to edit · <span className="kbd">+ Add</span> to draw a new one</>}
              </div>
            </div>
          </div>
        </div>

        {/* right: source + zone list + editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* camera source */}
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 4 }}>Camera source</div>
            <div className="section-sub" style={{ marginBottom: 12 }}>One camera per seating area in this version.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {CAM_SOURCES.map((s) => (
                <button key={s.id} onClick={() => s.ok && setSource(s.id)} disabled={!s.ok}
                  className="zone-list-row" style={{ marginBottom: 0, opacity: s.ok ? 1 : 0.55, borderColor: source === s.id ? "var(--ink)" : "var(--line)", boxShadow: source === s.id ? "0 0 0 1px var(--ink)" : "none" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--fill)", display: "grid", placeItems: "center", color: "var(--ink-2)" }}>
                    <Icon name={s.icon} size={16} />
                  </span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 650, fontSize: 13 }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.meta}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    {s.ok ? <span className="dot" style={{ background: source === s.id ? "var(--ok)" : "var(--muted)" }} />
                         : <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>—</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* selected zone editor */}
          {selZone ? (
            <div className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <div className="section-title">Edit zone</div>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>{selZone.id}</span>
              </div>
              <div className="field">
                <label>Table name</label>
                <input value={selZone.name} onChange={(e) => update(selZone.id, { name: e.target.value })} />
              </div>
              <div className="field">
                <label>Capacity</label>
                <select value={selZone.cap} onChange={(e) => update(selZone.id, { cap: +e.target.value })}>
                  {[2, 4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} seats</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 4 }}>
                <label>Zone bounds <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(frame px)</span></label>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", gap: 14, padding: "4px 0" }}>
                  <span>x {selZone.x}</span><span>y {selZone.y}</span><span>w {selZone.w}</span><span>h {selZone.h}</span>
                </div>
              </div>
              <button className="btn danger sm" onClick={() => remove(selZone.id)} style={{ marginTop: 4 }}>
                <Icon name="trash" size={14} />Delete zone
              </button>
            </div>
          ) : (
            <div className="card card-pad hint" style={{ textAlign: "center", padding: 22 }}>
              Select a zone on the feed to edit its name and capacity.
            </div>
          )}

          {/* zone list */}
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 10 }}>Defined zones <span className="section-sub" style={{ fontWeight: 500 }}>· {zones.length}</span></div>
            {zones.length === 0 && <div className="hint">No zones yet. Use “Add table zone”.</div>}
            {zones.map((z) => (
              <div key={z.id} className={"zone-list-row" + (z.id === sel ? " sel" : "")} onClick={() => setSel(z.id)} style={{ cursor: "pointer" }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--fill)", display: "grid", placeItems: "center" }}>
                  <Icon name="zones" size={14} />
                </span>
                <div style={{ fontWeight: 650, fontSize: 13 }}>{z.name}</div>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>{z.cap} seats</span>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); remove(z.id); }} style={{ padding: 5 }}><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }} className="hint">
        <Icon name="shield" size={14} /> Detection runs on-device. Only anonymous table status leaves this machine — never the video itself.
      </div>
    </div>
  );
}

window.CameraSetup = CameraSetup;
