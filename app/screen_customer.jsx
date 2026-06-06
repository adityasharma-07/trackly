/* TableTrack — Customer Seating Map + Public Display */

function GroupFilter({ value, onChange }) {
  const opts = [{ v: 0, l: "Any size" }, { v: 1, l: "1" }, { v: 2, l: "2" }, { v: 4, l: "3–4" }, { v: 6, l: "5+" }];
  return (
    <div className="seg-filter">
      {opts.map((o) => (
        <button key={o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

function Legend({ items }) {
  const list = items || ["available", "partial", "occupied", "unknown"];
  return (
    <div className="legend">
      {list.map((s) => (
        <div className="li" key={s}><span className="dot" style={{ background: TT.STMETA[s].color }} />{TT.STMETA[s].label}</div>
      ))}
    </div>
  );
}

function CustomerMap() {
  const snap  = useStore();
  const [group, setGroup] = React.useState(0);
  const c     = TT.counts(snap);

  const openTables = TT.TABLES
    .filter((t) => {
      const s = snap.tables[t.id];
      return s && s.status === "available" && (group === 0 || t.capacity >= group);
    })
    .sort((a, b) => a.capacity - b.capacity);

  return (
    <div className="customer">
      <div className="cust-wrap fadein">
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              {TT.VENUE.name}
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 780, letterSpacing: "-.03em", margin: "4px 0 0" }}>
              {TT.VENUE.area}
            </h1>
          </div>
          <div style={{ flex: 1 }} />
          <div className={"live-chip" + (snap.running ? "" : " paused")} style={{ fontSize: 13 }}>
            <span className="live-dot" />
            {snap.running ? "Live" : "Paused"} · updated {TT.timeAgo(snap.updatedAt)}
          </div>
        </div>

        {/* availability banner */}
        <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 26, padding: "22px 24px", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1,
              color: c.available + c.partial > 0 ? "var(--ok-ink)" : "var(--busy-ink)" }}>
              {c.available + c.partial}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ink-2)", fontWeight: 600, marginTop: 6 }}>tables with space</div>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            <Stat n={c.available} label="fully open"  color="var(--ok-ink)" />
            <Stat n={c.partial}   label="some seats"  color="var(--warn-ink)" />
            <Stat n={"~" + c.seatsOpen} label="seats free" color="var(--ink)" />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "right" }}>
            <div className="hint" style={{ marginBottom: 8 }}>Looking for</div>
            <GroupFilter value={group} onChange={setGroup} />
          </div>
        </div>

        {/* floor map */}
        <div className="card" style={{ padding: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 12px", gap: 14 }}>
            <Legend />
            <div style={{ flex: 1 }} />
            <div className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="dot" size={14} /> hover a zone for details
            </div>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: "8px 12px" }}>
            <FloorPlan snap={snap} interactive filterGroup={group} />
          </div>
        </div>

        {/* suggestions */}
        <div style={{ marginTop: 18 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>
            {group === 0 ? "Open right now" : "Open for your group"}
            <span className="section-sub" style={{ fontWeight: 500, marginLeft: 8 }}>{openTables.length} found</span>
          </div>
          {openTables.length === 0 ? (
            <div className="card card-pad hint" style={{ color: "var(--busy-ink)" }}>
              No fully-open tables right now — partially-occupied zones may still have room.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {openTables.slice(0, 8).map((t) => (
                <div key={t.id} className="card" style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 11 }}>
                  <span className="dot ok" style={{ width: 9, height: 9 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>seats {t.capacity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 8 }} className="hint">
          <Icon name="shield" size={14} />
          Anonymous occupancy only — no cameras, faces, or personal data are shown here.
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, color }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 760, letterSpacing: "-.03em", color: color || "var(--ink)", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginTop: 5 }}>{label}</div>
    </div>
  );
}

/* ---- Public Display (lobby TV) ---- */
function PublicDisplay() {
  const snap = useStore();
  const c    = TT.counts(snap);
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="public" style={{ padding: "clamp(20px,3vw,44px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "clamp(14px,2vw,26px)" }}>
        <div className="brand-logo" style={{ background: "#f4efe4", width: 34, height: 34 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "clamp(18px,1.6vw,26px)", letterSpacing: "-.02em", whiteSpace: "nowrap" }}>
            {TT.VENUE.name}
          </div>
          <div style={{ color: "#b7ad9a", fontSize: "clamp(12px,1vw,15px)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {TT.VENUE.area} · live seating
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div className="mono" style={{ fontSize: "clamp(24px,2.4vw,40px)", fontWeight: 600, letterSpacing: "-.02em" }}>{time}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#8ad29c", fontWeight: 700, fontSize: "clamp(11px,1vw,14px)" }}>
            <span className="live-dot" style={{ background: "#6fce8a" }} />LIVE
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 1.55fr", gap: "clamp(18px,2.5vw,40px)", flex: 1, minHeight: 0, alignItems: "center" }}>
        {/* big readout */}
        <div>
          <div style={{ fontSize: "clamp(13px,1.1vw,17px)", color: "#b7ad9a", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>
            Tables open now
          </div>
          <div style={{ fontSize: "clamp(90px,13vw,200px)", fontWeight: 850, letterSpacing: "-.05em", lineHeight: .9, color: "#7bd292", margin: "6px 0 4px" }}>
            {c.available}
          </div>
          <div style={{ fontSize: "clamp(16px,1.5vw,24px)", color: "#e7e0d2", fontWeight: 600 }}>
            + {c.partial} with some seats · <span className="mono">~{c.seatsOpen}</span> seats free
          </div>

          <div style={{ height: 1, background: "#ffffff1a", margin: "clamp(18px,2.5vw,34px) 0" }} />

          <div style={{ display: "grid", gap: "clamp(10px,1.2vw,16px)" }}>
            {["available", "partial", "occupied", "unknown"].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: "clamp(14px,1.2vw,20px)", height: "clamp(14px,1.2vw,20px)", borderRadius: 6, background: TT.STMETA[s].color, flex: "none" }} />
                <span style={{ fontSize: "clamp(15px,1.4vw,22px)", fontWeight: 650, color: "#ece5d6", whiteSpace: "nowrap" }}>{TT.STMETA[s].label}</span>
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: "clamp(16px,1.5vw,24px)", fontWeight: 600, color: "#fff" }}>{c[s]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* floor map */}
        <div style={{ background: "#211d17", borderRadius: 20, padding: "clamp(10px,1.4vw,20px)", border: "1px solid #ffffff14" }}>
          <FloorPlan snap={snap} showSeats showLabels />
        </div>
      </div>

      <div style={{ marginTop: "clamp(12px,1.6vw,22px)", display: "flex", alignItems: "center", gap: 10, color: "#9a9079", fontSize: "clamp(11px,1vw,14px)", fontWeight: 600 }}>
        <Icon name="shield" size={16} /> Privacy-first occupancy · no faces or personal data ·
        <span style={{ color: "#b7ad9a" }}>updated {TT.timeAgo(snap.updatedAt)}</span>
      </div>
    </div>
  );
}

Object.assign(window, { CustomerMap, PublicDisplay, GroupFilter, Legend, Stat });
