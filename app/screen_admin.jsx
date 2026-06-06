/* TableTrack — Admin Dashboard + Live Monitor (live camera version) */

/* ---- Camera feed: real MJPEG stream with SVG overlay ---- */
function CameraFeed({ children, frozen, clock = true, height, videoSrc = "/video_feed" }) {
  const [t, setT] = React.useState(Date.now());
  React.useEffect(() => {
    if (!clock) return;
    const i = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(i);
  }, [clock]);
  const stamp = new Date(t).toLocaleTimeString([], { hour12: false });

  return (
    <div className="feed" style={{ width: "100%", paddingBottom: height ? undefined : "56.25%", height }}>
      {/* live MJPEG stream */}
      <img
        src={videoSrc}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        alt="Camera feed"
      />
      {/* SVG overlay (zone labels, etc.) */}
      <svg viewBox="0 0 960 540" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
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
            <Icon name="pause" size={26} />
            <div style={{ marginTop: 8 }}>DETECTION PAUSED</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Dashboard ---- */
function Dashboard({ go }) {
  const snap = useStore();
  const c    = TT.counts(snap);
  const A    = TT.analytics;

  let occSeats = 0, total = 0;
  TT.TABLES.forEach((t) => {
    total += t.capacity;
    const s = snap.tables[t.id];
    if (!s) return;
    if (s.status === "occupied") occSeats += t.capacity;
    else if (s.status === "partial") occSeats += (s.people || 0);
  });
  const occPct  = total > 0 ? Math.round((occSeats / total) * 100) : 0;
  const maxOcc  = Math.max(...A.OCC_BY_HOUR, 1);
  const recent  = [...TT.TABLES]
    .filter((t) => snap.tables[t.id])
    .sort((a, b) => (snap.tables[b.id].sinceMs || 0) - (snap.tables[a.id].sinceMs || 0))
    .slice(0, 8);

  return (
    <div className="page fadein">
      <div className="page-head">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{TT.VENUE.name} · {TT.VENUE.area} · {TT.TABLES.length} zone{TT.TABLES.length !== 1 ? "s" : ""} tracked</div>
        </div>
        <div className="spacer" />
        <RunToggle snap={snap} />
        <button className="btn" onClick={() => go("customer")}><Icon name="eye" size={15} />Customer view</button>
      </div>

      {/* no zones hint */}
      {TT.TABLES.length === 0 && (
        <div className="card card-pad" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, background: "var(--warn-tint)", border: "1px solid var(--warn-tint-2)" }}>
          <Icon name="zones" size={16} style={{ color: "var(--warn-ink)" }} />
          <span style={{ color: "var(--warn-ink)", fontWeight: 550, fontSize: 13.5 }}>
            No table zones defined yet.
          </span>
          <button className="btn sm" style={{ marginLeft: 4 }} onClick={() => go("setup")}>
            Go to Camera Setup <Icon name="chevright" size={13} />
          </button>
        </div>
      )}

      <div className="metrics" style={{ marginBottom: 16 }}>
        <Metric icon="check"    label="Tables open"     value={c.available} sub={<span className="trend-up">+{c.partial} partially open</span>} />
        <Metric icon="users"    label="Live occupancy"  value={<span>{occPct}<small>%</small></span>} sub={<span>{occSeats} of {total} seats</span>} />
        <Metric icon="analytics" label="Peak today"     value={A.peakHour !== "—" ? A.peakHour : "—"} sub={<span>busiest hour</span>} />
        <Metric icon="clock"    label="Avg session"     value={A.avgTurnover > 0 ? <span>{A.avgTurnover}<small>min</small></span> : "—"} sub={<span>{A.sessions} session{A.sessions !== 1 ? "s" : ""} today</span>} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* floor map */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 10px", gap: 12 }}>
            <div className="section-title">Live floor map</div>
            <div style={{ flex: 1 }} />
            <Legend />
            <button className="btn sm ghost" onClick={() => go("monitor")}>
              Open monitor <Icon name="chevright" size={14} />
            </button>
          </div>
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 8 }}>
              <FloorPlan snap={snap} showSeats={false} />
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* occupancy chart */}
          <div className="card card-pad">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
              <div className="section-title">Occupancy by hour</div>
              <div className="section-sub" style={{ marginLeft: "auto" }}>today · % occupied</div>
            </div>
            <div className="bars">
              {A.OCC_BY_HOUR.map((v, i) => (
                <div key={i} className={"bar" + (v === maxOcc && v > 0 ? " peak" : "")}
                  style={{ height: (v / 100 * 100) + "%" }}
                  title={A.HOURS[i] + " · " + v + "%"} />
              ))}
            </div>
            <div className="bars-x">
              {A.HOURS.map((h, i) => <span key={i}>{i % 2 === 0 ? h : ""}</span>)}
            </div>
          </div>

          {/* status breakdown */}
          <div className="card card-pad" style={{ flex: 1 }}>
            <div className="section-title" style={{ marginBottom: 6 }}>Status breakdown</div>
            {["available", "partial", "occupied", "unknown"].map((s) => {
              const total = TT.TABLES.length || 1;
              const n     = c[s] || 0;
              const pct   = Math.round((n / total) * 100);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="dot" style={{ background: STMETA[s].color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{STMETA[s].label}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--fill-2)", borderRadius: 4, overflow: "hidden", margin: "0 4px" }}>
                    <div style={{ width: pct + "%", height: "100%", background: STMETA[s].color, transition: "width .4s" }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, width: 26, textAlign: "right" }}>{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* activity */}
      {recent.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 6px" }}>
            <div className="section-title">Recent status changes</div>
            <div className="section-sub" style={{ marginLeft: "auto" }}>anonymous events</div>
          </div>
          <div style={{ padding: "4px 8px 10px" }}>
            {recent.map((t) => {
              const s = snap.tables[t.id];
              const m = STMETA[s.status];
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid var(--line)" }}>
                  <span className="dot" style={{ background: m.color }} />
                  <span style={{ fontWeight: 650, fontSize: 13.5, minWidth: 140 }}>{t.name}</span>
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                    changed to <b style={{ color: m.ink }}>{m.label}</b>
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    {s.confidence ? "conf " + (s.confidence * 100).toFixed(0) + "%" : ""}
                  </span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", width: 72, textAlign: "right" }}>
                    {TT.timeAgo(s.sinceMs || Date.now())}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

/* ---- Live Monitor ---- */
function LiveMonitor() {
  const snap = useStore();
  const c    = TT.counts(snap);
  const [q, setQ] = React.useState("all");
  const rows = TT.TABLES.filter((t) => q === "all" || (snap.tables[t.id] && snap.tables[t.id].status === q));

  return (
    <div className="page fadein" style={{ maxWidth: 1400 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Live Monitor</div>
          <div className="page-sub">
            Real-time detection · {TT.VENUE.camera} · smoothing {3}s on / {5}s off
          </div>
        </div>
        <div className="spacer" />
        <RunToggle snap={snap} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, alignItems: "start" }}>
        {/* camera feed — server annotates with zones + detection boxes */}
        <div className="card" style={{ padding: 12 }}>
          <CameraFeed frozen={!snap.running} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 6px 4px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <CountChip status="available" n={c.available} />
              <CountChip status="partial"   n={c.partial} />
              <CountChip status="occupied"  n={c.occupied} />
              <CountChip status="unknown"   n={c.unknown} />
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
            <div className="section-title">Zone status</div>
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
          {TT.TABLES.length === 0 && (
            <div className="hint" style={{ padding: 18 }}>No zones defined. Go to Camera Setup.</div>
          )}
          <div className="tlist" style={{ maxHeight: 520, overflowY: "auto", padding: "0 10px" }}>
            {rows.map((t) => {
              const s = snap.tables[t.id] || { status: "unknown", people: 0, capacity: t.capacity, confidence: 0, sinceMs: Date.now() };
              const m = STMETA[s.status];
              return (
                <div key={t.id} className={"trow " + m.cls}>
                  <div className="tn">
                    <div className="pin">{t.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div className="nm">{t.name}</div>
                      <div className="sub">
                        {s.status === "unknown" ? "—" : (s.people || 0) + "/" + t.capacity} seats
                        {" · "}{TT.timeAgo(s.sinceMs || Date.now())}
                      </div>
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                  <div className="conf">
                    <div className="bar">
                      <i style={{ width: Math.round((s.confidence || 0) * 100) + "%", background: (s.confidence || 0) < 0.6 ? "var(--warn)" : "var(--ink-3)" }} />
                    </div>
                    {((s.confidence || 0) * 100).toFixed(0)}%
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
  const m = STMETA[status];
  return (
    <span className="chip" style={{ background: m.fill, color: m.ink }}>
      <span className="dot" style={{ background: m.color }} />{n} {m.short}
    </span>
  );
}

Object.assign(window, { CameraFeed, Dashboard, LiveMonitor, Metric, RunToggle, CountChip });
