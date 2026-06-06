/* TableTrack — venue data + live occupancy simulation store */
(function () {
  const STATUS = { available: "available", partial: "partial", occupied: "occupied", unknown: "unknown" };
  const STMETA = {
    available: { label: "Available",          short: "Open",     cls: "st-ok",   dot: "ok",   color: "#3f9a55", fill: "#e6f1e7", ink: "#246b38" },
    partial:   { label: "Partially Occupied", short: "Some seats",cls: "st-warn", dot: "warn", color: "#cf8f23", fill: "#f7edd6", ink: "#9a6712" },
    occupied:  { label: "Occupied",           short: "Full",     cls: "st-busy", dot: "busy", color: "#cf4b3b", fill: "#f7e3df", ink: "#9c3327" },
    unknown:   { label: "Unknown",            short: "Unknown",  cls: "st-unk",  dot: "unk",  color: "#a59c8d", fill: "#ebe7df", ink: "#6f685c" },
  };

  const VENUE = { name: "Briar Hall Commons", area: "Main Dining", camera: "CAM-01", resolution: "1080p · 24fps" };

  // ---- Floor plan (viewBox 1040 x 740) ----
  const R = (id, name, x, y, w, h, capacity, type, prone) => ({ id, name, shape: "rect", x, y, w, h, capacity, type, prone: !!prone });
  const C = (id, name, cx, cy, r, capacity, type, prone) => ({ id, name, shape: "round", cx, cy, r, capacity, type, prone: !!prone });

  const TABLES = [
    // window 2-tops (top wall)
    R("w1", "W1", 92,  84, 60, 58, 2, "window"),
    R("w2", "W2", 176, 84, 60, 58, 2, "window"),
    R("w3", "W3", 260, 84, 60, 58, 2, "window"),
    R("w4", "W4", 344, 84, 60, 58, 2, "window"),
    // left rounds
    C("t1", "1", 150, 268, 47, 4, "round"),
    C("t2", "2", 150, 398, 47, 4, "round"),
    C("t3", "3", 150, 528, 47, 4, "round", true),
    C("t4", "4", 300, 268, 47, 4, "round"),
    C("t5", "5", 300, 398, 47, 4, "round"),
    C("t6", "6", 300, 528, 47, 4, "round"),
    // center communal
    R("c1", "Communal A", 450, 232, 70, 300, 10, "communal"),
    R("c2", "Communal B", 558, 232, 70, 300, 10, "communal"),
    // right rounds
    C("t7", "7", 716, 250, 47, 4, "round"),
    C("t8", "8", 716, 400, 47, 4, "round", true),
    // right booths
    R("b1", "Booth 1", 824, 196, 150, 70, 4, "booth"),
    R("b2", "Booth 2", 824, 300, 150, 70, 4, "booth"),
    R("b3", "Booth 3", 824, 404, 150, 70, 4, "booth"),
    // lounge
    R("lg", "Lounge", 760, 556, 214, 116, 6, "lounge"),
    // bottom 2-tops
    C("p1", "9",  474, 624, 38, 2, "round"),
    C("p2", "10", 562, 624, 38, 2, "round"),
    C("p3", "11", 650, 624, 38, 2, "round"),
  ];

  // room features (non-interactive)
  const FEATURES = {
    room: { x: 40, y: 48, w: 960, h: 656, r: 22 },
    serving: { x: 470, y: 70, w: 500, h: 58, label: "SERVING COUNTER" },
    entrance: { x: 70, y: 668, w: 150, h: 36, label: "ENTRANCE" },
    windows: { x: 60, y: 50, w: 360, h: 8 },
  };

  // camera-frame zones (frame 960 x 540) — the subset CAM-01 actually sees
  const CAM_ZONES = [
    { id: "t1", poly: [[120,210],[250,205],[262,300],[118,308]] },
    { id: "t4", poly: [[300,205],[430,210],[440,300],[300,300]] },
    { id: "c1", poly: [[470,160],[560,160],[572,300],[460,300]] },
    { id: "c2", poly: [[580,160],[668,162],[690,304],[586,300]] },
    { id: "b1", poly: [[710,150],[890,150],[900,250],[706,250]] },
    { id: "t7", poly: [[300,330],[440,340],[452,470],[292,464]] },
    { id: "b2", poly: [[700,300],[890,300],[902,420],[700,418]] },
    { id: "w2", poly: [[150,110],[250,110],[252,178],[148,178]] },
  ];

  // ---- simulation ----
  let listeners = new Set();
  let running = true;
  let updatedAt = Date.now();

  // per-table dynamic state
  const live = {};
  // seed deterministic-ish starting mix
  const seed = {
    w1:"occupied", w2:"available", w3:"occupied", w4:"available",
    t1:"available", t2:"occupied", t3:"unknown", t4:"partial", t5:"occupied", t6:"available",
    c1:"partial", c2:"occupied",
    t7:"available", t8:"unknown",
    b1:"occupied", b2:"available", b3:"partial",
    lg:"partial",
    p1:"occupied", p2:"available", p3:"occupied",
  };
  TABLES.forEach((t) => {
    const s = seed[t.id] || "available";
    const load = s === "occupied" ? 0.92 : s === "partial" ? 0.45 : s === "unknown" ? 0.3 : 0.04;
    live[t.id] = { load, baseline: load, status: s, people: 0, confidence: 0, sinceMs: Date.now() - rint(20000, 600000), unkTimer: 0 };
    recompute(t, true);
  });

  function rint(a, b) { return a + Math.floor(Math.random() * (b - a)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function statusFromPeople(people, cap) {
    if (people <= 0) return "available";
    if (people >= Math.ceil(cap * 0.75)) return "occupied";
    return "partial";
  }

  function recompute(t, init) {
    const L = live[t.id];
    const cap = t.capacity;
    // unknown handling for prone tables
    if (t.prone && Math.random() < (init ? 0 : 0.05) && L.status !== "unknown") {
      L.status = "unknown"; L.unkTimer = rint(2, 5); L.confidence = 0.35 + Math.random() * 0.16;
      L.sinceMs = Date.now(); return;
    }
    if (L.status === "unknown" && !init) {
      L.unkTimer -= 1; L.confidence = clamp(L.confidence + (Math.random() - 0.5) * 0.04, 0.32, 0.55);
      if (L.unkTimer > 0) return; // stay unknown
    }
    const people = clamp(Math.round(L.load * cap), 0, cap);
    L.people = people;
    const ns = statusFromPeople(people, cap);
    if (ns !== L.status) { L.status = ns; L.sinceMs = Date.now(); }
    // confidence by clarity of state
    let base = ns === "partial" ? 0.78 : 0.92;
    if (init) L.confidence = base + (Math.random() - 0.5) * 0.08;
    else L.confidence = clamp(L.confidence * 0.7 + (base + (Math.random() - 0.5) * 0.06) * 0.3, 0.6, 0.98);
  }

  function tick() {
    if (!running) return;
    TABLES.forEach((t) => {
      const L = live[t.id];
      // drift baseline slowly, load toward baseline + noise
      if (Math.random() < 0.12) L.baseline = clamp(L.baseline + (Math.random() - 0.5) * 0.4, 0.02, 1);
      L.load = clamp(L.load + (L.baseline - L.load) * 0.25 + (Math.random() - 0.5) * 0.12, 0, 1);
      recompute(t, false);
    });
    updatedAt = Date.now();
    emit();
  }

  function snapshot() {
    const tables = {};
    TABLES.forEach((t) => {
      const L = live[t.id];
      tables[t.id] = { status: L.status, people: L.people, capacity: t.capacity, confidence: L.confidence, sinceMs: L.sinceMs };
    });
    return { tables, running, updatedAt };
  }

  function emit() { const s = snapshot(); listeners.forEach((fn) => fn(s)); }

  let timer = setInterval(tick, 2200);

  const store = {
    STATUS, STMETA, VENUE, TABLES, FEATURES, CAM_ZONES,
    get: snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setRunning(v) { running = v; updatedAt = Date.now(); emit(); },
    isRunning() { return running; },
    forceTick() { const r = running; running = true; tick(); running = r; },
    counts(snap) {
      const c = { available: 0, partial: 0, occupied: 0, unknown: 0, seatsOpen: 0, seatsTotal: 0 };
      TABLES.forEach((t) => {
        const s = snap.tables[t.id];
        c[s.status]++;
        c.seatsTotal += t.capacity;
        if (s.status === "available") c.seatsOpen += t.capacity;
        else if (s.status === "partial") c.seatsOpen += Math.max(0, t.capacity - s.people);
      });
      return c;
    },
  };

  // analytics (illustrative, stable)
  const HOURS = ["7a","8a","9a","10","11","12p","1p","2p","3p","4p","5p","6p","7p","8p"];
  const OCC_BY_HOUR = [8, 22, 31, 28, 46, 88, 94, 71, 40, 33, 38, 64, 79, 52];
  store.analytics = { HOURS, OCC_BY_HOUR, peakHour: "1:00 PM", avgTurnover: 41, busiestDay: "Wednesday" };

  // helpers
  store.timeAgo = function (ms) {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 8) return "just now";
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    return h + "h ago";
  };

  window.TT = store;
})();
