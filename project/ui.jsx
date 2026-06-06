/* TableTrack — shared UI atoms, icons, and the FloorPlan centerpiece */

const TT = window.TT;
const { STMETA } = TT;

/* ---------------- Icons (simple stroke set) ---------------- */
const ICONS = {
  dashboard: "M3 3h7v8H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 14h7v7H3z",
  camera: "M2 7a2 2 0 0 1 2-2h2l1.2-1.6a1 1 0 0 1 .8-.4h4a1 1 0 0 1 .8.4L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  zones: "M3 3h18v18H3zM3 9h18M9 3v18",
  monitor: "M2 12h4l2-7 4 14 2-7h6",
  analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1-2.7H4a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1-2.8l-.1-.1A2 2 0 1 1 8 3.6l.1.1a1.6 1.6 0 0 0 2.7-1V2.4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  tv: "M3 5h18v12H3zM8 21h8M12 17v4",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check: "M20 6 9 17l-5-5",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5",
  pause: "M6 4h4v16H6zM14 4h4v16h-4z",
  play: "M6 4l14 8-14 8z",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  pencil: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeoff: "M9.9 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a10.6 10.6 0 0 0 3.8-.7M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  expand: "M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  chevright: "M9 6l6 6-6 6",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v7M17 20h4",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  layers: "M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  filter: "M3 4h18l-7 8v6l-4 2v-8z",
  wifi: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a15 15 0 0 1 20 0",
  dot: "M12 12h.01",
};

function Icon({ name, size = 18, fill = false, style }) {
  const p = ICONS[name] || ICONS.dot;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={p} />
    </svg>
  );
}

/* ---------------- live store hook ---------------- */
function useStore() {
  const [snap, setSnap] = React.useState(() => TT.get());
  React.useEffect(() => TT.subscribe(setSnap), []);
  return snap;
}

function StatusPill({ status, children }) {
  const m = STMETA[status];
  return <span className={"status-pill " + m.cls}><span className="dot" />{children || m.label}</span>;
}

/* ---------------- FloorPlan (shared SVG seating map) ---------------- */
function seatPositions(t) {
  const pts = [];
  if (t.shape === "round") {
    const n = t.capacity, rr = t.r + 13;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      pts.push([t.cx + Math.cos(a) * rr, t.cy + Math.sin(a) * rr]);
    }
  } else {
    const cap = t.capacity, horiz = t.w >= t.h;
    if (horiz) {
      const per = Math.ceil(cap / 2), gap = t.w / per;
      for (let i = 0; i < per; i++) { pts.push([t.x + gap * (i + 0.5), t.y - 11]); }
      for (let i = 0; i < cap - per; i++) { pts.push([t.x + gap * (i + 0.5), t.y + t.h + 11]); }
    } else {
      const per = Math.ceil(cap / 2), gap = t.h / per;
      for (let i = 0; i < per; i++) { pts.push([t.x - 11, t.y + gap * (i + 0.5)]); }
      for (let i = 0; i < cap - per; i++) { pts.push([t.x + t.w + 11, t.y + gap * (i + 0.5)]); }
    }
  }
  return pts;
}

function FloorPlan({ snap, showSeats = true, showLabels = true, interactive = false, filterGroup = 0, onPick }) {
  const { TABLES, FEATURES } = TT;
  const [hover, setHover] = React.useState(null);
  const wrapRef = React.useRef(null);

  function move(e, t) {
    if (!interactive || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setHover({ id: t.id, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  const hoveredTable = hover && TABLES.find((t) => t.id === hover.id);
  const hoveredSnap = hover && snap.tables[hover.id];

  return (
    <div className="floor-wrap" ref={wrapRef}>
      <svg className="floor-svg" viewBox="0 0 1040 740" role="img" aria-label="Seating map">
        {/* room */}
        <rect x={FEATURES.room.x} y={FEATURES.room.y} width={FEATURES.room.w} height={FEATURES.room.h}
          rx={FEATURES.room.r} fill="#fbf9f5" stroke="#e1dacb" strokeWidth="2" />
        {/* window strip */}
        <rect x={FEATURES.windows.x} y={FEATURES.windows.y} width={FEATURES.windows.w} height={FEATURES.windows.h}
          rx="4" fill="#cfe3ea" />
        {/* serving counter */}
        <g>
          <rect x={FEATURES.serving.x} y={FEATURES.serving.y} width={FEATURES.serving.w} height={FEATURES.serving.h}
            rx="10" fill="#efe9dd" stroke="#e1dacb" strokeWidth="1.5" />
          <text x={FEATURES.serving.x + FEATURES.serving.w / 2} y={FEATURES.serving.y + FEATURES.serving.h / 2 + 4}
            textAnchor="middle" className="tbl-cap" fontSize="13" fill="#9a9286" letterSpacing="2" style={{ fontWeight: 600 }}>
            {FEATURES.serving.label}
          </text>
        </g>
        {/* entrance */}
        <g>
          <rect x={FEATURES.entrance.x} y={FEATURES.entrance.y} width={FEATURES.entrance.w} height={FEATURES.entrance.h}
            rx="8" fill="none" stroke="#c9b89a" strokeWidth="2" strokeDasharray="6 5" />
          <text x={FEATURES.entrance.x + FEATURES.entrance.w / 2} y={FEATURES.entrance.y + FEATURES.entrance.h / 2 + 4}
            textAnchor="middle" className="tbl-cap" fontSize="12" fill="#a99a7e" letterSpacing="2">{FEATURES.entrance.label}</text>
        </g>

        {/* tables */}
        {TABLES.map((t) => {
          const s = snap.tables[t.id];
          const m = STMETA[s.status];
          const dim = filterGroup > 0 && !(s.status === "available" && t.capacity >= filterGroup);
          const op = dim ? 0.22 : 1;
          const isHover = hover && hover.id === t.id;
          const seats = showSeats ? seatPositions(t) : [];
          const cx = t.shape === "round" ? t.cx : t.x + t.w / 2;
          const cy = t.shape === "round" ? t.cy : t.y + t.h / 2;
          return (
            <g key={t.id} style={{ opacity: op, transition: "opacity .3s, transform .15s", cursor: interactive ? "pointer" : "default" }}
              onMouseMove={(e) => move(e, t)} onMouseLeave={() => setHover(null)}
              onClick={() => interactive && onPick && onPick(t.id)}>
              {/* seats */}
              {seats.map((p, i) => {
                const filled = s.status === "unknown" ? false : i < s.people;
                return <circle key={i} cx={p[0]} cy={p[1]} r="6.5"
                  fill={filled ? m.color : "#fff"} stroke={s.status === "unknown" ? "#cdc6b8" : m.color}
                  strokeWidth="1.6" opacity={s.status === "unknown" ? 0.7 : 1} />;
              })}
              {/* table body */}
              {t.shape === "round"
                ? <circle cx={t.cx} cy={t.cy} r={t.r} fill={m.fill} stroke={m.color}
                    strokeWidth={isHover ? 3 : 2} />
                : <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={t.type === "lounge" ? 16 : 11}
                    fill={m.fill} stroke={m.color} strokeWidth={isHover ? 3 : 2} />}
              {/* label */}
              {showLabels && (
                <text x={cx} y={cy + (t.capacity > 4 ? -2 : 5)} textAnchor="middle"
                  className="tbl-label" fontSize={t.type === "round" && t.capacity <= 2 ? 13 : 15}
                  fill={m.ink}>{t.name.length > 3 ? t.name : t.name}</text>
              )}
              {showLabels && t.capacity > 4 && (
                <text x={cx} y={cy + 16} textAnchor="middle" className="tbl-cap" fontSize="11" fill={m.ink} opacity="0.8">
                  {s.status === "unknown" ? "—/" + t.capacity : s.people + "/" + t.capacity}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {interactive && hoveredTable && (
        <div className={"floor-tip show"} style={{ left: hover.x, top: hover.y }}>
          <div style={{ fontWeight: 700 }}>
            {hoveredTable.type === "round" || hoveredTable.type === "window" ? "Table " + hoveredTable.name : hoveredTable.name}
            {"  ·  "}{STMETA[hoveredSnap.status].label}
          </div>
          <div className="ft-cap">
            {hoveredSnap.status === "unknown" ? "needs review" : hoveredSnap.people + " of " + hoveredTable.capacity + " seats taken"}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Icon, useStore, StatusPill, FloorPlan, seatPositions });
