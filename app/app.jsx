/* TableTrack — app shell, routing, mount */

const NAV = [
  { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
  { id: "setup",     label: "Camera Setup", icon: "camera" },
  { id: "monitor",   label: "Live Monitor", icon: "monitor" },
];

function Topbar({ role, setRole, snap }) {
  return (
    <div className="topbar">
      <div className="brand-mark">
        <div className="brand-logo" />
        <span className="brand-name">TableTrack</span>
      </div>
      <div className="sep" />
      <span className="venue">{TT.VENUE.name} · {TT.VENUE.area}</span>
      <div className={"live-chip" + (snap.running ? "" : " paused")}>
        <span className="live-dot" />{snap.running ? "Detecting" : "Paused"}
      </div>
      <div className="spacer" />
      <div className="seg">
        {[["admin", "Admin"], ["customer", "Customer"], ["public", "Public Display"]].map(([id, label]) => (
          <button key={id} className={role === id ? "on" : ""} onClick={() => setRole(id)}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, snap }) {
  const c = TT.counts(snap);
  return (
    <div className="sidebar">
      <div className="nav-label">Operate</div>
      {NAV.map((n) => (
        <button key={n.id} className={"nav-item" + (page === n.id ? " on" : "")} onClick={() => setPage(n.id)}>
          <Icon name={n.icon} />{n.label}
          {n.id === "monitor" && TT.TABLES.length > 0 && (
            <span className="badge">{c.available} open</span>
          )}
        </button>
      ))}

      <div className="grow" />

      <div className="workcard">
        <div className="wc-cam">{TT.VENUE.camera}</div>
        <div className="wc-name">{TT.VENUE.area}</div>
        <div className="wc-meta">
          <span className="dot" style={{ background: snap.running ? "var(--ok)" : "var(--muted)" }} />
          {snap.running ? "Detection running" : "Detection paused"}
          {" · "}{TT.TABLES.length} zone{TT.TABLES.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="nav-item" style={{ cursor: "default", color: "var(--ink-3)", fontSize: 12, gap: 8 }}>
        <Icon name="shield" size={15} /> Privacy-first · on-device
      </div>
    </div>
  );
}

function App() {
  const snap = useStore();
  const [role, setRole] = React.useState("admin");
  const [page, setPage] = React.useState("dashboard");

  function go(target) {
    if (["customer", "public", "admin"].includes(target)) { setRole(target); return; }
    setRole("admin"); setPage(target);
  }

  return (
    <div className="app">
      <Topbar role={role} setRole={setRole} snap={snap} />
      {role === "admin" && (
        <div className="admin">
          <Sidebar page={page} setPage={setPage} snap={snap} />
          <div className="content">
            {page === "dashboard" && <Dashboard go={go} />}
            {page === "setup"     && <CameraSetup />}
            {page === "monitor"   && <LiveMonitor />}
          </div>
        </div>
      )}
      {role === "customer" && <CustomerMap />}
      {role === "public"   && <PublicDisplay />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
