/* TableTrack — Admin Dashboard + Live Monitor */

/* shared camera feed chrome (striped placeholder + OSD + svg overlay) */
function CameraFeed({ children, frozen, clock = true, height }) {
  const [t, setT] = React.useState(Date.now());
  React.useEffect(() => { if (!clock) return; const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i); }, [clock]);
  const stamp = new Date(t).toLocaleTimeString([], { hour12: false }) + "." + String(new Date(t).getMilliseconds()).padStart(3, "0").slice(0, 2);
  return (
    <div className="feed" style={{ width: "100%", paddingBottom: height ? undefined : "56.25%", height }}>
      <div className="feed-grid" />
      <svg viewBox="0 0 960 540" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {children}
      </svg>
      <div className="feed-vig" />
      <div className="feed-osd">
        <span className="rec"><b />REC</span>
        <span>{TT.VENUE.camera} · {TT.VENUE.area}</span>
        <span className="right">
          <span>{TT.VENUE.resolution}</span>
          <span className="mono">{stamp}</span>
        </span>
      </div>
      {frozen && (
        <div className="feed-empty" style={{ background: "#14110c99", color: "#e8e1d2", fontWeight: 600 }}>
          <div style={{ textAlign: "center" }}>
            <Icon name="pause" size={26} /><div style={{ marginTop: 8 }}>DETECTION PAUSED</div>
          </div>
        </div>
      )}
    </div>
  );
}

function polyBBox(poly) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/* detection overlay used by Live Monitor */
function DetectionOverlay({ snap, showZones = true, showBoxes = true }) {
  const zones = TT.CAM_ZONES;
  return (
    <g>
      {showZones && zones.map((z) => {
        const t = TT.TABLES.find((x) => x.id === z.id);
        const s = snap.tables[z.id];
        const m = TT.STMETA[s.status];
        const bb = polyBBox(z.poly);
        return (
          <g key={z.id}>
            <polygon points={z.poly.map((p) => p.join(",")).join(" ")} fill={m.color} fillOpacity="0.16"
              stroke={m.color} strokeWidth="2" />
            <g transform={`translate(${bb.x},${bb.y - 4})`}>
              <rect x="0" y="-17" width={(t.name.length + 4) * 7 + 14} height="17" rx="3" fill={m.color} />
              <text x="7" y="-5" fontSize="11" className="tbl-cap" fill="#fff" style={{ fontWeight: 600 }}>
                {(t.type === "round" || t.type === "window" ? "T" + t.name : t.name)} · {m.short}
              </text>
            </g>
          </g>
        );
      })}
      {showBoxes && snap.running && zones.map((z) => {
        const s = snap.tables[z.id];
        if (s.status === "available" || s.status === "unknown") return null;
        const bb = polyBBox(z.poly);
        const n = Math.min(s.people, 4);
        const boxes = [];
        for (let i = 0; i < n; i++) {
          const bw = bb.w / Math.max(2.6, n + 0.4), bh = bb.h * 0.62;
          const bx = bb.x + (bb.w - bw) * (n === 1 ? 0.5 : i / (n - 1)) * 0.85 + bb.w * 0.06;
          const by = bb.y + bb.h * 0.28 + (Math.random() - 0.5) * 8;
          const conf = (0.74 + Math.random() * 0.22).toFixed(2);
          boxes.push(
            <g key={i}>
              <rect x={bx} y={by} width={bw} height={bh} rx="2" fill="none" stroke="#7ee0ff" strokeWidth="1.6" />
              <rect x={bx} y={by - 13} width="58" height="13" fill="#7ee0ff" />
              <text x={bx + 3} y={by - 3} fontSize="9.5" className="tbl-cap" fill="#06222b" style={{ fontWeight: 700 }}>person {conf}</text>
            </g>
          );
        }
        return <g key={z.id}>{boxes}</g>;
      })}
    </g>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ go }) {
  const snap = useStore();
  const c = TT.counts(snap);
  let occSeats = 0, total = 0;
  TT.TABLES.forEach((t) => {
    total += t.capacity; const s = snap.tables[t.id];
    if (s.status === "occupied") occSeats += t.capacity;
    else if (s.status === "partial") occSeats += s.people;
  });
  const occPct = Math.round((occSeats / total) * 100);
  const recent = [...TT.TABLES].sort((a, b) => snap.tables[b.id].sinceMs - snap.tables[a.id].sinceMs).slice(0, 7);
  const A = TT.analytics;
  const maxOcc = Math.max(...A.OCC_BY_HOUR);

  return (
    <div className="page fadein">
      <div className="page-head">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{TT.VENUE.name} · {TT.VENUE.area} · {TT.TABLES.length} tables tracked</div>
        </div>
        <div className="spacer" />
        <RunToggle snap={snap} />
        <button className="btn" onClick={() => go("customer")}><Icon name="eye" size={15} />Customer view</button>
      </div>

      <div className="metrics" style={{ marginBottom: 16 }}>
        <Metric icon="check" label="Tables open" value={c.available} sub={<span className="trend-up">+{c.partial} partially open</span>} />
        <Metric icon="users" label="Live occupancy" value={<span>{occPct}<small>%</small></span>} sub={<span>{occSeats} of {total} seats</span>} />
        <Metric icon="analytics" label="Peak today" value="94%" sub={<span>at {A.peakHour}</span>} />
        <Metric icon="clock" label="Avg turnover" value={<span>{A.avgTurnover}<small>min</small></span>} sub={<span className="trend-down">−6 min vs avg</span>} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* mini map */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 10px", gap: 12 }}>
            <div className="section-title">Live floor map</div>
            <div style={{ flex: 1 }} />
            <Legend />
            <button className="btn sm ghost" onClick={() => go("monitor")}>Open monitor <Icon name="chevright" size={14} /></button>
          </div>
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 8 }}>
              <FloorPlan snap={snap} showSeats={false} />
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
              <div className="section-title">Occupancy by hour</div>
              <div className="section-sub" style={{ marginLeft: "auto" }}>today · % full</div>
            </div>
            <div className="bars">
              {A.OCC_BY_HOUR.map((v, i) => (
                <div key={i} className={"bar" + (v === maxOcc ? " peak" : "")} style={{ height: (v / 100 * 100) + "%" }} title={A.HOURS[i] + " · " + v + "%"} />
              ))}
            </div>
            <div className="bars-x">{A.HOURS.map((h, i) => <span key={i}>{i % 2 === 0 ? h : ""}</span>)}</div>
          </div>

          <div className="card card-pad" style={{ flex: 1 }}>
            <div className="section-title" style={{ marginBottom: 6 }}>Status breakdown</div>
            {["available", "partial", "occupied", "unknown"].map((s) => {
              const pct = Math.round((c[s] / TT.TABLES.length) * 100);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="dot" style={{ background: TT.STMETA[s].color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{TT.STMETA[s].label}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--fill-2)", borderRadius: 4, overflow: "hidden", margin: "0 4px" }}>
                    <div style={{ width: pct + "%", height: "100%", background: TT.STMETA[s].color, transition: "width .4s" }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, width: 26, textAlign: "right" }}>{c[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* activity */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 6px" }}>
          <div className="section-title">Recent status changes</div>
          <div className="section-sub" style={{ marginLeft: "auto" }}>anonymous events</div>
        </div>
        <div style={{ padding: "4px 8px 10px" }}>
          {recent.map((t) => {
            const s = snap.tables[t.id]; const m = TT.STMETA[s.status];
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid var(--line)" }}>
                <span className="dot" style={{ background: m.color }} />
                <span style={{ fontWeight: 650, fontSize: 13.5, minWidth: 110 }}>
                  {t.type === "round" || t.type === "window" ? "Table " + t.name : t.name}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>changed to <b style={{ color: m.ink }}>{m.label}</b></span>
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>conf {(s.confidence).toFixed(2)}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", width: 64, textAlign: "right" }}>{TT.timeAgo(s.sinceMs)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub }) {
  return (
    <div className="card metric">
      <div className="m-label"><Icon name={icon} size={15} />{label}</div>
      <div className="m-value tnum">{value}</div>
      <div className="m-foot">{sub}</div>
    </div>
  );
}

function RunToggle({ snap }) {
  return (
    <button className={"btn" + (snap.running ? "" : " primary")} onClick={() => TT.setRunning(!snap.running)}>
      <Icon name={snap.running ? "pause" : "play"} size={15} fill={!snap.running} />
      {snap.running ? "Pause detection" : "Resume detection"}
    </button>
  );
}

/* ---------------- Live Monitor ---------------- */
function LiveMonitor() {
  const snap = useStore();
  const c = TT.counts(snap);
  const [q, setQ] = React.useState("all");
  const rows = TT.TABLES.filter((t) => q === "all" || snap.tables[t.id].status === q);

  return (
    <div className="page fadein" style={{ maxWidth: 1400 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Live Monitor</div>
          <div className="page-sub">Real-time detection · {TT.VENUE.camera} · smoothing 3s on / 5s off</div>
        </div>
        <div className="spacer" />
        <button className="btn"><Icon name="refresh" size={15} />Recalibrate</button>
        <RunToggle snap={snap} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, alignItems: "start" }}>
        {/* feed */}
        <div className="card" style={{ padding: 12 }}>
          <CameraFeed frozen={!snap.running}>
            <DetectionOverlay snap={snap} />
          </CameraFeed>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 6px 4px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <CountChip status="available" n={c.available} />
              <CountChip status="partial" n={c.partial} />
              <CountChip status="occupied" n={c.occupied} />
              <CountChip status="unknown" n={c.unknown} />
            </div>
            <div style={{ flex: 1 }} />
            <div className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="shield" size={14} /> zones only · no footage stored
            </div>
          </div>
        </div>

        {/* table status list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderBottom: "1px solid var(--line)" }}>
            <div className="section-title">Table status</div>
            <div style={{ flex: 1 }} />
            <select className="mono" value={q} onChange={(e) => setQ(e.target.value)}
              style={{ fontSize: 12, padding: "6px 9px", border: "1px solid var(--line-2)", borderRadius: 8, background: "var(--surface)", color: "var(--ink-2)" }}>
              <option value="all">all ({TT.TABLES.length})</option>
              <option value="available">available ({c.available})</option>
              <option value="partial">partial ({c.partial})</option>
              <option value="occupied">occupied ({c.occupied})</option>
              <option value="unknown">unknown ({c.unknown})</option>
            </select>
          </div>
          <div className="tlist" style={{ maxHeight: 520, overflowY: "auto", padding: "0 10px" }}>
            {rows.map((t) => {
              const s = snap.tables[t.id]; const m = TT.STMETA[s.status];
              return (
                <div key={t.id} className={"trow " + m.cls}>
                  <div className="tn">
                    <div className="pin">{t.type === "round" || t.type === "window" ? t.name : t.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div className="nm">{t.type === "round" || t.type === "window" ? "Table " + t.name : t.name}</div>
                      <div className="sub">{s.status === "unknown" ? "—" : s.people + "/" + t.capacity} seats · {TT.timeAgo(s.sinceMs)}</div>
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                  <div className="conf">
                    <div className="bar"><i style={{ width: Math.round(s.confidence * 100) + "%", background: s.confidence < 0.6 ? "var(--warn)" : "var(--ink-3)" }} /></div>
                    {(s.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CountChip({ status, n }) {
  const m = TT.STMETA[status];
  return (
    <span className="chip" style={{ background: m.fill, color: m.ink }}>
      <span className="dot" style={{ background: m.color }} />{n} {m.short}
    </span>
  );
}

Object.assign(window, { CameraFeed, DetectionOverlay, Dashboard, LiveMonitor, Metric, RunToggle, CountChip, polyBBox });
