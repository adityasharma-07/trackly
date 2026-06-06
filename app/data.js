/* TableTrack — live WebSocket store (replaces simulation) */
(function () {

  const STMETA = {
    available: { label: "Available",          short: "Open",      cls: "st-ok",   dot: "ok",   color: "#3f9a55", fill: "#e6f1e7", ink: "#246b38" },
    partial:   { label: "Partially Occupied", short: "Some seats",cls: "st-warn", dot: "warn", color: "#cf8f23", fill: "#f7edd6", ink: "#9a6712" },
    occupied:  { label: "Occupied",           short: "Full",      cls: "st-busy", dot: "busy", color: "#cf4b3b", fill: "#f7e3df", ink: "#9c3327" },
    unknown:   { label: "Unknown",            short: "Unknown",   cls: "st-unk",  dot: "unk",  color: "#a59c8d", fill: "#ebe7df", ink: "#6f685c" },
  };

  const VENUE = { name: "Home", area: "Dining Room", camera: "Webcam", resolution: "HD · live" };

  /* floor plan features — room outline matches camera frame (960×540) */
  const FEATURES = {
    room: { x: 16, y: 16, w: 928, h: 508, r: 14 },
  };

  /* TABLES is built dynamically from zones returned by the server */
  let TABLES = [];

  function buildTables(zones) {
    TABLES = zones.map((z) => ({
      id:       z.id,
      name:     z.name,
      shape:    "rect",
      x:        z.x,
      y:        z.y,
      w:        z.w,
      h:        z.h,
      capacity: z.cap,
      type:     "dining",
    }));
  }

  /* ---- live state ---- */
  let _snap = {
    tables:    {},
    zones:     [],
    running:   true,
    updatedAt: Date.now(),
    analytics: { occ_by_hour: new Array(24).fill(0), sessions_today: 0, avg_turnover_min: 0, peak_hour: -1 },
  };

  let _listeners = new Set();

  function _emit() {
    const s = _get();
    _listeners.forEach((fn) => fn(s));
  }

  function _get() {
    return { ..._snap };
  }

  /* ---- WebSocket ---- */
  let _ws = null;

  function _connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    _ws = new WebSocket(`${proto}//${location.host}/ws`);

    _ws.onopen = () => console.log("[TT] WS connected");

    _ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      _snap = { ..._snap, ...data };
      if (data.zones) buildTables(data.zones);
      _emit();
    };

    _ws.onerror = (err) => console.warn("[TT] WS error", err);

    _ws.onclose = () => {
      console.log("[TT] WS closed — reconnecting in 2s…");
      setTimeout(_connect, 2000);
    };
  }

  /* Fetch initial state over REST, then open WebSocket */
  function _fetchState() {
    return fetch("/api/state")
      .then((r) => r.json())
      .then((data) => {
        _snap = { ..._snap, ...data };
        if (data.zones && data.zones.length > 0) buildTables(data.zones);
        _emit();
      })
      .catch(() => {/* server not ready yet */});
  }

  _fetchState().finally(() => _connect());

  /* Always-on polling — re-syncs every 1s to guarantee UI stays current */
  setInterval(_fetchState, 1000);

  /* ---- analytics accessor (reads live _snap) ---- */
  const HOUR_LABELS = [];
  for (let h = 7; h <= 22; h++) {
    HOUR_LABELS.push(h < 12 ? h + "a" : h === 12 ? "12p" : (h - 12) + "p");
  }

  function _analyticsSnap() {
    const raw    = (_snap.analytics && _snap.analytics.occ_by_hour) || new Array(24).fill(0);
    const slice  = raw.slice(7, 23);
    const peakH  = _snap.analytics?.peak_hour ?? -1;
    const peak   = peakH >= 7 && peakH <= 22
      ? (peakH < 12 ? peakH + ":00 AM" : peakH === 12 ? "12:00 PM" : (peakH - 12) + ":00 PM")
      : "—";
    return {
      HOURS:       HOUR_LABELS,
      OCC_BY_HOUR: slice,
      peakHour:    peak,
      avgTurnover: _snap.analytics?.avg_turnover_min ?? 0,
      busiestDay:  "Today",
      sessions:    _snap.analytics?.sessions_today ?? 0,
    };
  }

  /* ---- store ---- */
  const store = {
    STMETA,
    VENUE,
    FEATURES,
    STATUS: { available: "available", partial: "partial", occupied: "occupied", unknown: "unknown" },
    get TABLES() { return TABLES; },
    get analytics() { return _analyticsSnap(); },
    CAM_ZONES: [],  // legacy compat — not used in live version

    get:       _get,
    subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },

    setRunning(_v) {
      fetch("/api/detection/toggle", { method: "POST" }).catch(console.error);
    },
    isRunning() { return _snap.running; },

    counts(snap) {
      const c = { available: 0, partial: 0, occupied: 0, unknown: 0, seatsOpen: 0, seatsTotal: 0 };
      TABLES.forEach((t) => {
        const s = snap.tables[t.id];
        if (!s) { c.unknown++; return; }
        c[s.status]  = (c[s.status] || 0) + 1;
        c.seatsTotal += t.capacity;
        if (s.status === "available")      c.seatsOpen += t.capacity;
        else if (s.status === "partial")   c.seatsOpen += Math.max(0, t.capacity - (s.people || 0));
      });
      return c;
    },

    timeAgo(ms) {
      const s = Math.floor((Date.now() - ms) / 1000);
      if (s < 8)  return "just now";
      if (s < 60) return s + "s ago";
      const m = Math.floor(s / 60);
      if (m < 60) return m + "m ago";
      return Math.floor(m / 60) + "h ago";
    },
  };

  window.TT = store;
})();
