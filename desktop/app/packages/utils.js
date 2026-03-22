"use strict";

function generate4h(bars = 500, seed = 42) {
  const BAR = 4 * 3600;
  const DAY = 86400;
  const dow = (ts) => Math.floor(ts / DAY + 4) % 7; // 0=Sun … 6=Sat
  const hUTC = (ts) => Math.floor((ts % DAY) / 3600); // 0–23
  const SLOTS = new Set([0, 4, 8, 12, 16]);

  // First valid slot: 2022-01-03 00:00:00 UTC (Monday)
  let ts = 1641168000;
  while (dow(ts) === 0 || dow(ts) === 6) ts += DAY;

  const nextSlot = (ts) => {
    do {
      ts += BAR;
    } while (!SLOTS.has(hUTC(ts)) || dow(ts) === 0 || dow(ts) === 6);
    return ts;
  };

  let price = 180;
  let vol = 8e6;
  let rng = seed;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };

  const data = [];
  for (let i = 0; i < bars; i++) {
    const trend = Math.sin(i / 300) * 0.0002 + 0.00004;
    const noise = (rand() - 0.49) * 0.012;
    const open = price;
    const close = Math.max(1, open + open * (trend + noise));
    const hi = Math.max(open, close) + open * (rand() * 0.008 + 0.001);
    const lo = Math.min(open, close) - open * (rand() * 0.008 + 0.001);
    vol = Math.max(500_000, vol * (0.75 + rand() * 0.5));
    data.push({
      t: ts,
      o: +open.toFixed(2),
      h: +hi.toFixed(2),
      l: +lo.toFixed(2),
      c: +close.toFixed(2),
      v: Math.round(vol),
    });
    price = close;
    ts = nextSlot(ts);
  }
  return data;
}

function generateOHLC(bars = 800, seed = 42) {
  const data = [];
  let price = 180;
  let vol = 45e6;
  // Start timestamp: 2022-01-03 00:00:00 UTC in seconds
  let ts = 1641168000;
  let rng = seed;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };
  const DAY = 86400;

  // Skip to first weekday
  const dow = (ts) => Math.floor(ts / DAY + 4) % 7; // 0=Sun,1=Mon…6=Sat
  while (dow(ts) === 0 || dow(ts) === 6) ts += DAY;

  for (let i = 0; i < bars; i++) {
    const trend = Math.sin(i / 120) * 0.0003 + 0.00008;
    const noise = (rand() - 0.49) * 0.025;
    const gap = price * (trend + noise);
    const open = price;
    const close = Math.max(1, price + gap);
    const hiRange = price * (rand() * 0.015 + 0.002);
    const loRange = price * (rand() * 0.015 + 0.002);
    const high = Math.max(open, close) + hiRange;
    const low = Math.min(open, close) - loRange;
    vol = Math.max(1e6, vol * (0.85 + rand() * 0.3));

    data.push({
      t: ts,
      o: +open.toFixed(2),
      h: +high.toFixed(2),
      l: +low.toFixed(2),
      c: +close.toFixed(2),
      v: Math.round(vol),
    });
    price = close;

    // Advance to next weekday
    ts += DAY;
    while (dow(ts) === 0 || dow(ts) === 6) ts += DAY;
  }
  return data;
}

const chart = new ChartEngine();

const rawData = generate4h();

// ── REGISTER MA via addSeries() ───────────────────────────────────────────────
chart.addSeries({
  id: "ma",
  label: "MA 20",
  color: "#ffb830",
  layer: "foreground", // renders after candles

  // Compute full MA array once on data load
  compute(data) {
    const period = 20;
    const out = new Array(data.length).fill(null);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].c;
      if (i >= period) sum -= data[i - period].c;
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  },

  // MA values don't push the price range beyond OHLC, so no priceExtent needed.

  // Render a single golden line
  render(ctx, pane, engine, values, priceMin, priceMax) {
    ctx.strokeStyle = "#ffb830";
    ctx.lineWidth = 1.3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (
      let i = engine.viewStart;
      i < engine.viewEnd && i < engine.data.length;
      i++
    ) {
      if (values[i] === null) continue;
      const x = engine._xOf(i);
      const y = engine._yOf(values[i], pane, priceMin, priceMax);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  // O(period) incremental update — avoids full O(n) recompute on every tick
  updateIncremental(values, data, isNewBar) {
    const period = 20;
    const n = data.length - 1;
    if (isNewBar) values.push(null); // extend array for the new slot
    if (n < period - 1) return;
    // Recompute last value from the last `period` closes
    let sum = 0;
    for (let j = n - period + 1; j <= n; j++) sum += data[j].c;
    values[n] = sum / period;
  },

  // Tooltip contribution
  tooltipRow(values, i) {
    if (values[i] === null) return null;
    return { label: "MA20", value: values[i].toFixed(2), color: "#ffb830" };
  },
});

// ── REGISTER BB via addSeries() ───────────────────────────────────────────────
chart.addSeries({
  id: "bb",
  label: "BB 20",
  color: "#a855f7",
  layer: "background", // fill renders BEFORE candles; lines after is handled below

  // Compute full BB array once on data load
  compute(data) {
    const period = 20,
      mult = 2;
    const out = new Array(data.length).fill(null);
    let sum = 0,
      sum2 = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].c;
      sum2 += data[i].c ** 2;
      if (i >= period) {
        sum -= data[i - period].c;
        sum2 -= data[i - period].c ** 2;
      }
      if (i >= period - 1) {
        const mean = sum / period;
        const variance = sum2 / period - mean ** 2;
        const std = Math.sqrt(Math.max(0, variance));
        out[i] = {
          upper: mean + mult * std,
          mid: mean,
          lower: mean - mult * std,
        };
      }
    }
    return out;
  },

  // BB bands may exceed OHLC range — extend the scale
  priceExtent(values, vs, ve) {
    let lo = Infinity,
      hi = -Infinity;
    for (let i = vs; i < ve; i++) {
      if (!values[i]) continue;
      if (values[i].upper > hi) hi = values[i].upper;
      if (values[i].lower < lo) lo = values[i].lower;
    }
    return lo === Infinity ? null : [lo, hi];
  },

  // Render fill + dashed bands (fill behind candles via layer:'background')
  render(ctx, pane, engine, values, priceMin, priceMax) {
    const ve = engine.viewEnd,
      vs = engine.viewStart;

    // ── Envelope fill
    ctx.fillStyle = "rgba(168,85,247,0.07)";
    ctx.beginPath();
    let first = true;
    for (let i = vs; i < ve && i < engine.data.length; i++) {
      if (!values[i]) continue;
      const x = engine._xOf(i);
      const y = engine._yOf(values[i].upper, pane, priceMin, priceMax);
      first ? (ctx.moveTo(x, y), (first = false)) : ctx.lineTo(x, y);
    }
    for (let i = Math.min(ve, engine.data.length) - 1; i >= vs; i--) {
      if (!values[i]) continue;
      ctx.lineTo(
        engine._xOf(i),
        engine._yOf(values[i].lower, pane, priceMin, priceMax),
      );
    }
    ctx.closePath();
    ctx.fill();

    // ── Upper & lower bands
    ctx.strokeStyle = "rgba(168,85,247,0.65)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ["upper", "lower"].forEach((key) => {
      ctx.beginPath();
      let s = false;
      for (let i = vs; i < ve && i < engine.data.length; i++) {
        if (!values[i]) continue;
        const x = engine._xOf(i);
        const y = engine._yOf(values[i][key], pane, priceMin, priceMax);
        s ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (s = true));
      }
      ctx.stroke();
    });

    // ── Middle band (lighter)
    ctx.strokeStyle = "rgba(168,85,247,0.35)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    let sm = false;
    for (let i = vs; i < ve && i < engine.data.length; i++) {
      if (!values[i]) continue;
      const x = engine._xOf(i);
      const y = engine._yOf(values[i].mid, pane, priceMin, priceMax);
      sm ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (sm = true));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  },

  // Tooltip contribution — show upper/lower spread
  tooltipRow(values, i) {
    if (!values[i]) return null;
    return {
      label: "BB",
      value: `${values[i].upper.toFixed(2)} / ${values[i].lower.toFixed(2)}`,
      color: "#a855f7",
    };
  },

  // O(period) incremental update for BB
  updateIncremental(values, data, isNewBar) {
    const period = 20,
      mult = 2;
    const n = data.length - 1;
    if (isNewBar) values.push(null);
    if (n < period - 1) return;
    let sum = 0,
      sum2 = 0;
    for (let j = n - period + 1; j <= n; j++) {
      sum += data[j].c;
      sum2 += data[j].c ** 2;
    }
    const mean = sum / period;
    const variance = sum2 / period - mean ** 2;
    const std = Math.sqrt(Math.max(0, variance));
    values[n] = {
      upper: mean + mult * std,
      mid: mean,
      lower: mean - mult * std,
    };
  },
});

// Load data after series are registered so compute() runs immediately
chart.load(rawData);

// ── UI BINDINGS ──────────────────────────────────────────────────────────────
function setChartType(type) {
  chart.setChartType(type);
  ["candle", "line", "area"].forEach((t) => {
    document.getElementById("btn-" + t).classList.remove("active");
  });
  const map = { candlestick: "candle", line: "line", area: "area" };
  document.getElementById("btn-" + map[type]).classList.add("active");
}

function toggleSeries(id) {
  chart.toggleSeries(id);
  // Sync toolbar button state
  document.getElementById("btn-" + id).classList.toggle("active");
  // Sync legend pill
  const legEl = document.getElementById("leg-" + id);
  if (legEl) legEl.style.display = chart.isSeriesEnabled(id) ? "flex" : "none";
}

function resetZoom() {
  chart.resetZoom();
}

const pencil = chart.addDrawingModule(StraightLineModule);

pencil.setColor("#ff4060"); // opcional — default '#e8c842'

//pencil.activate();   // empieza a dibujar

// Status init
chart._updateStatus();

// ── LIVE SIMULATION ──────────────────────────────────────────────────────────
//
//  Demonstrates chart.update(candle) — simulates a live WebSocket feed.
//
//  In production, replace the setInterval with your real data source:
//
//    const ws = new WebSocket('wss://your-exchange.com/stream');
//    ws.onmessage = ({ data }) => {
//      const tick = JSON.parse(data);       // { t, o, h, l, c, v }
//      chart.update(tick);
//    };
//
let _liveTimer = null;
let _liveSeed = 999;
const _liveRng = () => {
  _liveSeed = (_liveSeed * 1664525 + 1013904223) & 0xffffffff;
  return (_liveSeed >>> 0) / 0xffffffff;
};

// Tick state for the current live bar
let _tick = null;

function _generateTick(isNewBar) {
  const last = chart.data[chart.data.length - 1];
  if (!last) return null;

  if (isNewBar || !_tick) {
    const open = last.c * (1 + (_liveRng() - 0.5) * 0.002);
    _tick = { t: null, o: open, h: open, l: open, c: open, v: 0 };
    // Advance timestamp by 1 trading day (integer seconds)

    let next = last.t + chart.interval;
    const dow = (ts) => Math.floor(ts / 86400 + 4) % 7;
    if (chart.interval < 86400) {
      while (dow(next) === 0 || dow(next) === 6) next += chart.interval;
    }
    _tick.t = next;
  }

  const move = _tick.c * (_liveRng() - 0.492) * 0.005;
  _tick.c = Math.max(0.01, _tick.c + move);
  _tick.h = Math.max(_tick.h, _tick.c);
  _tick.l = Math.min(_tick.l, _tick.c);
  _tick.v += Math.round(_liveRng() * 500_000);

  return { ..._tick };
}

let _tickCount = 0;
const TICKS_PER_BAR = 12; // after this many ticks we open a new bar

function _fireTick() {
  _tickCount++;
  const isNewBar = _tickCount % TICKS_PER_BAR === 0;
  const tick = _generateTick(isNewBar);
  if (tick) chart.update(tick);
}

function toggleLive() {
  const btn = document.getElementById("btn-live");
  if (_liveTimer) {
    clearInterval(_liveTimer);
    _liveTimer = null;
    chart._liveMode = false;
    chart.dirty = true;
    btn.classList.remove("active");
    btn.style.color = "";
  } else {
    _tick = null;
    _tickCount = 0;
    _liveTimer = setInterval(_fireTick, 180); // ~5–6 ticks/sec
    btn.classList.add("active");
    btn.style.color = "var(--bull)";
  }
}
