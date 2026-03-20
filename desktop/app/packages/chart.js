'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  FinChart — Lightweight Financial Charting Engine v1.0
//  Architecture:
//    • Dirty-flag RAF loop   → only redraws when state changes (true 60fps)
//    • Virtual viewport      → renders only visible bars (O(view) not O(n))
//    • Layered canvases      → data layer + overlay layer (crosshair redraws cheaply)
//    • Multi-pane            → main / volume / custom indicators
//    • Drawing tools         → trendlines, h-lines, rectangles, fib, text
// ═══════════════════════════════════════════════════════════════════════════════

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const PRICE_SCALE_W = 72;
const MIN_BAR_W     = 1;
const MAX_BAR_W     = 40;
const DEFAULT_BAR_W = 8;
const SCROLL_ZOOM_FACTOR = 0.12;

// ── COLOR PALETTE ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#050810',
  bg2:      '#080d1a',
  bg3:      '#0d1526',
  grid:     'rgba(26,37,64,0.9)',
  gridAlt:  'rgba(26,37,64,0.4)',
  text:     '#c8d4e8',
  textDim:  '#4a5a7a',
  bull:     '#00c87a',
  bear:     '#ff4060',
  bullDim:  'rgba(0,200,122,0.15)',
  bearDim:  'rgba(255,64,96,0.15)',
  line:     '#3d7aff',
  area1:    'rgba(61,122,255,0.25)',
  area2:    'rgba(61,122,255,0.0)',
  ma:       '#ffb830',
  bb:       '#a855f7',
  bbFill:   'rgba(168,85,247,0.07)',
  cross:    'rgba(200,212,232,0.3)',
  crossPt:  '#3d7aff',
  vol:      'rgba(61,122,255,0.35)',
  volBull:  'rgba(0,200,122,0.35)',
  volBear:  'rgba(255,64,96,0.35)',
  rsi:      '#00d9a3',
  rsiOB:    'rgba(255,64,96,0.15)',
  rsiOS:    'rgba(0,200,122,0.15)',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
function generateOHLC(bars = 800, seed = 42) {
  const data = [];
  let price  = 180;
  let vol    = 45e6;
  // Start timestamp: 2022-01-03 00:00:00 UTC in seconds
  let ts     = 1641168000;
  let rng    = seed;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const DAY  = 86400;

  // Skip to first weekday
  const dow  = (ts) => Math.floor(ts / DAY + 4) % 7; // 0=Sun,1=Mon…6=Sat
  while (dow(ts) === 0 || dow(ts) === 6) ts += DAY;

  for (let i = 0; i < bars; i++) {
    const trend   = Math.sin(i / 120) * 0.0003 + 0.00008;
    const noise   = (rand() - 0.49) * 0.025;
    const gap     = price * (trend + noise);
    const open    = price;
    const close   = Math.max(1, price + gap);
    const hiRange = price * (rand() * 0.015 + 0.002);
    const loRange = price * (rand() * 0.015 + 0.002);
    const high    = Math.max(open, close) + hiRange;
    const low     = Math.min(open, close) - loRange;
    vol = Math.max(1e6, vol * (0.85 + rand() * 0.3));

    data.push({ t: ts, o: +open.toFixed(2), h: +high.toFixed(2), l: +low.toFixed(2), c: +close.toFixed(2), v: Math.round(vol) });
    price = close;

    // Advance to next weekday
    ts += DAY;
    while (dow(ts) === 0 || dow(ts) === 6) ts += DAY;
  }
  return data;
}

// ── INDICATORS ────────────────────────────────────────────────────────────────
// calcMA, calcBB, and calcRSI are no longer global functions.
// MA and BB live inside their addSeries() definitions (with incremental update hooks).
// RSI lives inside ChartEngine._computeRSIFull() / _updateRSIIncremental().

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
class ChartEngine {
  constructor() {
    // Data
    this.data       = [];
    this.rsiData    = [];
    this._rsiState  = { avgG: 0, avgL: 0, period: 14 }; // persisted for O(1) incremental updates

    // Series registry — populated via addSeries()
    // Map<id, { def, values, enabled }>
    this._series    = new Map();

    // Viewport (virtual scroll)
    this.barWidth    = DEFAULT_BAR_W;
    this.rightPadBars = 20;         // empty bar-slots kept to the right of the last candle
    this.viewStart   = 0;   // first visible bar index
    this.viewEnd     = 0;   // last  visible bar index  (exclusive; may exceed data.length)

    // Render state
    this.dirty      = true;
    this.overlayDirty = true;
    this.chartType  = 'candlestick';
    this.showRSI    = false;

    // Interaction
    this.mouse      = { x: 0, y: 0, inside: false };
    this.isPanning  = false;
    this.panOrigin  = { x: 0, viewStart: 0 };
    this.activeTool = 'cursor';

    // Drawings
    this.drawings   = [];
    this.drawInProgress = null;

    // Live update state
    this._liveMode   = false;   // true while receiving ticks
    this._prevClose  = 0;       // close of bar before current (for RSI tick)

    // Perf
    this.fps        = 60;
    this._fpsFrames = 0;
    this._fpsTime   = performance.now();

    // Panes geometry (computed in resize)
    this.panes      = {};

    this._grabCanvases();
    this._resize();
    this._bindEvents();
    this._startLoop();
  }

  // ── DOM SETUP ──────────────────────────────────────────────────────────────
  _grabCanvases() {
    this.cMain   = document.getElementById('canvas-main');
    this.oMain   = document.getElementById('overlay-main');
    this.cVol    = document.getElementById('canvas-vol');
    this.oVol    = document.getElementById('overlay-vol');
    this.cRsi    = document.getElementById('canvas-rsi');
    this.oRsi    = document.getElementById('overlay-rsi');
    this.cTime   = document.getElementById('canvas-time');
    this.ohlcDiv = document.getElementById('ohlc-display');

    this.ctxMain  = this.cMain.getContext('2d');
    this.ctxOMain = this.oMain.getContext('2d');
    this.ctxVol   = this.cVol.getContext('2d');
    this.ctxOVol  = this.oVol.getContext('2d');
    this.ctxRsi   = this.cRsi.getContext('2d');
    this.ctxORsi  = this.oRsi.getContext('2d');
    this.ctxTime  = this.cTime.getContext('2d');
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;

    const setCanvas = (canvas, container) => {
      const r = container.getBoundingClientRect();
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width  = r.width  + 'px';
      canvas.style.height = r.height + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      return { w: r.width, h: r.height };
    };

    const dpr2 = window.devicePixelRatio || 1;
    const resetScale = (canvas) => {
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(dpr2, dpr2);
    };

    const pMain = document.getElementById('pane-main');
    const pVol  = document.getElementById('pane-vol');
    const pRsi  = document.getElementById('pane-rsi');
    const tAxis = document.getElementById('time-axis');

    setCanvas(this.cMain,  pMain);  resetScale(this.oMain);
    setCanvas(this.oMain,  pMain);  resetScale(this.oMain);
    setCanvas(this.cVol,   pVol);   resetScale(this.oVol);
    setCanvas(this.oVol,   pVol);   resetScale(this.oVol);
    setCanvas(this.cRsi,   pRsi);   resetScale(this.oRsi);
    setCanvas(this.oRsi,   pRsi);   resetScale(this.oRsi);
    setCanvas(this.cTime,  tAxis);  

    const mainR = pMain.getBoundingClientRect();
    const volR  = pVol.getBoundingClientRect();
    const rsiR  = pRsi.getBoundingClientRect();
    const timeR = tAxis.getBoundingClientRect();

    this.panes.main = { x: mainR.left, y: mainR.top, w: mainR.width,  h: mainR.height,  canvas: this.cMain,  ctx: this.ctxMain,  oCtx: this.ctxOMain };
    this.panes.vol  = { x: volR.left,  y: volR.top,  w: volR.width,   h: volR.height,   canvas: this.cVol,   ctx: this.ctxVol,   oCtx: this.ctxOVol  };
    this.panes.rsi  = { x: rsiR.left,  y: rsiR.top,  w: rsiR.width,   h: rsiR.height,   canvas: this.cRsi,   ctx: this.ctxRsi,   oCtx: this.ctxORsi  };
    this.panes.time = { x: timeR.left, y: timeR.top, w: timeR.width,  h: timeR.height };

    this.chartW = mainR.width - PRICE_SCALE_W;
    this.dirty = true;
    this.overlayDirty = true;
    this._clampView();
    this._updateScrollThumb();
  }

  // ── DATA LOADING ──────────────────────────────────────────────────────────
  load(data) {
    this.data    = data;
    this._computeRSIFull();
    this._recomputeSeries();

    // Cache the close of the second-to-last bar (used by incremental RSI tick)
    this._prevClose = data.length >= 2 ? data[data.length - 2].c : (data[0]?.c ?? 0);

    // Start at the right end — leave rightPadBars of empty space after the last candle
    const capacity  = Math.floor(this.chartW / this.barWidth);
    this.viewEnd    = data.length + this.rightPadBars;
    this.viewStart  = Math.max(0, this.viewEnd - capacity);
    this.dirty = true;
    this._updateScrollThumb();
    this._updateStatus();
  }

  // Full O(n) RSI — stores running state for subsequent incremental updates
  _computeRSIFull() {
    const data   = this.data;
    const period = this._rsiState.period;
    const result = new Array(data.length).fill(null);
    if (data.length < period + 1) { this.rsiData = result; return; }

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = data[i].c - data[i - 1].c;
      if (d > 0) gains += d; else losses -= d;
    }
    let avgG = gains / period, avgL = losses / period;
    result[period] = 100 - 100 / (1 + avgG / (avgL || 1e-10));

    for (let i = period + 1; i < data.length; i++) {
      const d = data[i].c - data[i - 1].c;
      avgG = (avgG * (period - 1) + Math.max(0,  d)) / period;
      avgL = (avgL * (period - 1) + Math.max(0, -d)) / period;
      result[i] = 100 - 100 / (1 + avgG / (avgL || 1e-10));
    }

    this.rsiData = result;
    this._rsiState.avgG = avgG;
    this._rsiState.avgL = avgL;
  }

  // Incremental RSI — O(1). Call after data[last] has been mutated or appended.
  // isNewBar: true  → a new candle was pushed; extend rsiData by 1.
  //           false → last candle ticked in place; recompute last rsiData slot only.
  _updateRSIIncremental(isNewBar) {
    const data   = this.data;
    const period = this._rsiState.period;
    const n      = data.length - 1; // index of the candle that changed

    if (n < period) {
      // Not enough history yet
      if (isNewBar) this.rsiData.push(null);
      return;
    }

    // The previous close for the delta depends on whether this is a new bar or a tick.
    // For a new bar  : prev = data[n-1].c  (already committed before this call)
    // For a same-bar tick: prev = this._prevClose (close of data[n-1], unchanged)
    const prevClose = isNewBar ? data[n - 1].c : this._prevClose;
    const delta     = data[n].c - prevClose;
    const g         = Math.max(0,  delta);
    const l         = Math.max(0, -delta);

    let avgG, avgL;
    if (isNewBar) {
      // Wilder smoothing: advance the running averages
      avgG = (this._rsiState.avgG * (period - 1) + g) / period;
      avgL = (this._rsiState.avgL * (period - 1) + l) / period;
      this._rsiState.avgG = avgG;
      this._rsiState.avgL = avgL;
      this.rsiData.push(100 - 100 / (1 + avgG / (avgL || 1e-10)));
      // _prevClose now points to what was data[n-1] — i.e. the bar before the new one
      this._prevClose = data[n - 1].c;
    } else {
      // Tick: recompute last slot using the *unchanged* smoothed averages from the
      // previous confirmed bar (stored in _rsiState) and the current live delta.
      avgG = (this._rsiState.avgG * (period - 1) + g) / period;
      avgL = (this._rsiState.avgL * (period - 1) + l) / period;
      this.rsiData[n] = 100 - 100 / (1 + avgG / (avgL || 1e-10));
      // NOTE: _rsiState.avgG/L are NOT updated on ticks — only on confirmed new bars.
    }
  }

  // Recompute values for all registered series (called on full load)
  _recomputeSeries() {
    this._series.forEach(entry => {
      entry.values = entry.def.compute(this.data);
    });
  }

  // Incremental series update — O(period) per series, not O(n).
  // Falls back to full compute() if the series has no updateIncremental hook.
  _updateSeriesIncremental(isNewBar) {
    this._series.forEach(entry => {
      if (entry.def.updateIncremental) {
        entry.def.updateIncremental(entry.values, this.data, isNewBar);
      } else {
        // Fallback: full recompute (still correct, just not O(1))
        entry.values = entry.def.compute(this.data);
      }
    });
  }

  // ── VIEWPORT HELPERS ──────────────────────────────────────────────────────
  _clampView() {
    if (!this.data.length) return;
    const capacity   = Math.floor(this.chartW / this.barWidth);
    const maxViewEnd = this.data.length + this.rightPadBars;
    this.viewEnd     = Math.min(Math.max(this.viewEnd, 1), maxViewEnd);
    this.viewStart   = Math.max(0, this.viewEnd - capacity);
  }

  _barsVisible() { return this.viewEnd - this.viewStart; }

  // Data index → X pixel in chart area
  _xOf(i) {
    return (i - this.viewStart) * this.barWidth + this.barWidth / 2;
  }

  // X pixel → data index
  _indexAtX(x) {
    return Math.round((x - this.barWidth / 2) / this.barWidth) + this.viewStart;
  }

  // Price → Y pixel in a pane
  _yOf(price, pane, priceMin, priceMax) {
    const range = priceMax - priceMin || 1;
    return pane.h - ((price - priceMin) / range) * pane.h * 0.92 - pane.h * 0.04;
  }

  // ── PRICE RANGE ──────────────────────────────────────────────────────────
  _visiblePriceRange() {
    let lo = Infinity, hi = -Infinity;
    const vs = Math.max(0, this.viewStart);
    const ve = Math.min(this.data.length, this.viewEnd);
    for (let i = vs; i < ve; i++) {
      if (this.data[i].l < lo) lo = this.data[i].l;
      if (this.data[i].h > hi) hi = this.data[i].h;
    }
    // Let enabled series extend the visible price range (e.g. BB bands)
    this._series.forEach(({ def, values, enabled }) => {
      if (!enabled || !def.priceExtent) return;
      const ext = def.priceExtent(values, vs, ve);
      if (ext) { lo = Math.min(lo, ext[0]); hi = Math.max(hi, ext[1]); }
    });
    // Add padding
    const pad = (hi - lo) * 0.06;
    return { lo: lo - pad, hi: hi + pad };
  }

  _visibleVolRange() {
    let max = 0;
    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      if (this.data[i].v > max) max = this.data[i].v;
    }
    return max * 1.15;
  }

  // ── MAIN RAF LOOP ─────────────────────────────────────────────────────────
  _startLoop() {
    let lastT = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);

      // FPS counter
      this._fpsFrames++;
      if (now - this._fpsTime >= 800) {
        this.fps = Math.round(this._fpsFrames / ((now - this._fpsTime) / 1000));
        this._fpsFrames = 0;
        this._fpsTime   = now;
        document.getElementById('status-fps').textContent = this.fps + ' FPS';
      }

      if (this.dirty) {
        this._render();
        this.dirty = false;
        this.overlayDirty = true; // overlay needs redraw after data repaint
      }
      if (this.overlayDirty) {
        this._renderOverlay();
        this.overlayDirty = false;
      }
    };
    requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER PASS — only called when dirty
  // ═══════════════════════════════════════════════════════════════════════════
  _render() {
    if (!this.data.length) return;
    const { lo, hi } = this._visiblePriceRange();
    this._renderMain(lo, hi);
    this._renderVol();
    if (this.showRSI) this._renderRSI();
    this._renderTimeAxis();
    this._renderPriceScale(lo, hi);
  }

  // ── MAIN PANE ─────────────────────────────────────────────────────────────
  _renderMain(priceMin, priceMax) {
    const p   = this.panes.main;
    const ctx = p.ctx;
    const W   = p.w;
    const H   = p.h;
    const cw  = this.chartW;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    this._drawGrid(ctx, W, H, cw, priceMin, priceMax, p);

    // ── Custom series (behind candles): fill-type series like BB render here
    this._series.forEach(({ def, values, enabled }) => {
      if (!enabled || def.layer !== 'background') return;
      ctx.save();
      def.render(ctx, p, this, values, priceMin, priceMax);
      ctx.restore();
    });

    // Area fill (below close)
    if (this.chartType === 'area') this._drawArea(ctx, p, priceMin, priceMax);

    // Candles / line
    if (this.chartType === 'candlestick')  this._drawCandlesticks(ctx, p, priceMin, priceMax);
    else if (this.chartType === 'line')    this._drawLine(ctx, p, priceMin, priceMax);
    else if (this.chartType === 'area')    this._drawLine(ctx, p, priceMin, priceMax);

    // ── Custom series (foreground): line-type series like MA render here — above candles
    this._series.forEach(({ def, values, enabled }) => {
      if (!enabled || def.layer === 'background') return;
      ctx.save();
      def.render(ctx, p, this, values, priceMin, priceMax);
      ctx.restore();
    });

    // Drawings
    this._renderDrawings(ctx, p, priceMin, priceMax);

    // Price scale border
    ctx.fillStyle = C.bg2;
    ctx.fillRect(cw, 0, PRICE_SCALE_W, H);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw, H); ctx.stroke();
  }

  _drawGrid(ctx, W, H, cw, priceMin, priceMax, p) {
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth   = 1;

    // Horizontal price grid lines
    const steps  = this._nicePriceSteps(priceMin, priceMax, 6);
    steps.forEach(price => {
      const y = Math.round(this._yOf(price, p, priceMin, priceMax)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
      // Label
      ctx.fillStyle = C.textDim;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), cw + PRICE_SCALE_W - 8, y + 3.5);
    });

    // Vertical time grid lines
    const timeStep = this._timeGridStep();
    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      if (this._isTimeGridLine(i, timeStep)) {
        const x = Math.round(this._xOf(i)) + 0.5;
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawCandlesticks(ctx, p, priceMin, priceMax) {
    const bw  = Math.max(1, this.barWidth - 1);
    const hw  = Math.max(1, Math.floor(bw / 2));

    ctx.save();
    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      const d    = this.data[i];
      const x    = Math.round(this._xOf(i));
      const yO   = this._yOf(d.o, p, priceMin, priceMax);
      const yC   = this._yOf(d.c, p, priceMin, priceMax);
      const yH   = this._yOf(d.h, p, priceMin, priceMax);
      const yL   = this._yOf(d.l, p, priceMin, priceMax);
      const bull = d.c >= d.o;
      const col  = bull ? C.bull : C.bear;

      // Wick
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, yH);
      ctx.lineTo(x + 0.5, yL);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(yO, yC);
      const bodyH   = Math.max(1, Math.abs(yC - yO));
      if (bw >= 2) {
        ctx.fillStyle = col;
        ctx.fillRect(x - hw + 1, bodyTop, bw - 1, bodyH);
        // Inner glow on large candles
        if (bw >= 5 && bodyH > 2) {
          ctx.fillStyle = bull ? 'rgba(0,200,122,0.25)' : 'rgba(255,64,96,0.25)';
          ctx.fillRect(x - hw + 2, bodyTop + 1, bw - 3, bodyH - 2);
        }
      } else {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, bodyTop); ctx.lineTo(x, bodyTop + bodyH); ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawLine(ctx, p, priceMin, priceMax) {
    ctx.save();
    ctx.strokeStyle = C.line;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      const x = this._xOf(i);
      const y = this._yOf(this.data[i].c, p, priceMin, priceMax);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawArea(ctx, p, priceMin, priceMax) {
    ctx.save();
    const baseY = p.h;
    ctx.beginPath();
    let started = false;
    let firstX, lastX;
    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      const x = this._xOf(i);
      const y = this._yOf(this.data[i].c, p, priceMin, priceMax);
      if (!started) { ctx.moveTo(x, y); firstX = x; started = true; }
      else ctx.lineTo(x, y);
      lastX = x;
    }
    if (started) {
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(firstX, baseY);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, p.h);
      grad.addColorStop(0, C.area1);
      grad.addColorStop(1, C.area2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── VOLUME PANE ───────────────────────────────────────────────────────────
  _renderVol() {
    const p   = this.panes.vol;
    const ctx = p.ctx;
    const W   = p.w;
    const H   = p.h;
    const cw  = this.chartW;
    const maxV = this._visibleVolRange();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const bw = Math.max(1, this.barWidth - 1);
    const hw = Math.max(1, Math.floor(bw / 2));

    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      const d    = this.data[i];
      const x    = Math.round(this._xOf(i));
      const barH = Math.max(1, (d.v / maxV) * H * 0.9);
      ctx.fillStyle = d.c >= d.o ? C.volBull : C.volBear;
      ctx.fillRect(x - hw + 1, H - barH, Math.max(1, bw - 1), barH);
    }

    // Scale border
    ctx.fillStyle = C.bg2;
    ctx.fillRect(cw, 0, PRICE_SCALE_W, H);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw, H); ctx.stroke();

    // Vol label on scale
    ctx.fillStyle = C.textDim;
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    const fmt = v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(1)+'M' : (v/1e3).toFixed(0)+'K';
    ctx.fillText(fmt(maxV / 1.15), cw + PRICE_SCALE_W - 8, 14);
  }

  // ── RSI PANE ──────────────────────────────────────────────────────────────
  _renderRSI() {
    const p   = this.panes.rsi;
    const ctx = p.ctx;
    const W   = p.w; const H = p.h;
    const cw  = this.chartW;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const yOf = v => H - (v / 100) * H * 0.9 - H * 0.05;

    // OB/OS zones
    ctx.fillStyle = C.rsiOB;
    const yOB = yOf(70);
    ctx.fillRect(0, yOB, cw, yOf(100) - yOB);

    ctx.fillStyle = C.rsiOS;
    const yOS = yOf(30);
    ctx.fillRect(0, yOS, cw, yOf(0) - yOS);

    // Level lines
    [30, 50, 70].forEach(lv => {
      const y = Math.round(yOf(lv)) + 0.5;
      ctx.strokeStyle = lv === 50 ? C.grid : 'rgba(255,64,96,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash(lv === 50 ? [] : [3,3]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.textDim;
      ctx.font = '9px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(lv, cw + PRICE_SCALE_W - 8, y + 3);
    });

    // RSI line
    ctx.strokeStyle = C.rsi;
    ctx.lineWidth   = 1.2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      if (this.rsiData[i] === null) continue;
      const x = this._xOf(i);
      const y = yOf(this.rsiData[i]);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = C.bg2;
    ctx.fillRect(cw, 0, PRICE_SCALE_W, H);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw, H); ctx.stroke();
  }

  // ── TIME AXIS ─────────────────────────────────────────────────────────────
  _renderTimeAxis() {
    const ctx = this.ctxTime;
    const W   = this.panes.time.w;
    const H   = this.panes.time.h;
    const cw  = this.chartW;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg2;
    ctx.fillRect(0, 0, W, H);

    if (!this.data.length) return;
    const step = this._timeGridStep();
    ctx.fillStyle = C.textDim;
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';

    for (let i = this.viewStart; i < this.viewEnd && i < this.data.length; i++) {
      if (!this._isTimeGridLine(i, step)) continue;
      const x = this._xOf(i);
      if (x < 16 || x > cw - 16) continue;
      ctx.fillText(this._formatDate(this.data[i].t, step), x, 15);
    }
  }

  // ── PRICE SCALE ───────────────────────────────────────────────────────────
  _renderPriceScale(priceMin, priceMax) {
    // Already drawn inline in _renderMain grid pass — this is a no-op
    // (kept as hook for extensions)
  }

  // ── OVERLAY (crosshair) ───────────────────────────────────────────────────
  _renderOverlay() {
    this._clearOverlay(this.ctxOMain, this.panes.main);
    this._clearOverlay(this.ctxOVol,  this.panes.vol);
    if (this.showRSI) this._clearOverlay(this.ctxORsi, this.panes.rsi);

    if (!this.mouse.inside || !this.data.length) {
      // Still draw the live price line even without crosshair
      if (this._liveMode && this.data.length) {
        const { lo, hi } = this._visiblePriceRange();
        this._drawLivePulse(this.ctxOMain, this.panes.main, lo, hi);
      }
      return;
    }

    const mx    = this.mouse.x;
    const my    = this.mouse.y;
    const pMain = this.panes.main;
    const pVol  = this.panes.vol;

    // Determine which pane mouse is in
    const inMain = my >= pMain.y && my < pMain.y + pMain.h;
    const inVol  = my >= pVol.y  && my < pVol.y  + pVol.h;

    // Bar index under cursor
    const localX = mx - pMain.x;
    const barIdx = Math.max(this.viewStart, Math.min(this.viewEnd - 1, this._indexAtX(localX)));
    const d      = this.data[barIdx]; // may be undefined in right-padding zone

    const { lo, hi } = this._visiblePriceRange();

    // Live price dash — drawn unconditionally so it survives the !d early-exit below
    if (this._liveMode) this._drawLivePulse(this.ctxOMain, pMain, lo, hi);

    if (!d) return; // cursor is in the empty right-padding zone — crosshair stops here

    // Crosshair X (shared across panes)
    const snapX = Math.round(this._xOf(barIdx)) + 0.5;

    // Main pane crosshair
    const ctx = this.ctxOMain;
    ctx.save();
    ctx.strokeStyle = C.cross;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath(); ctx.moveTo(snapX, 0); ctx.lineTo(snapX, pMain.h); ctx.stroke();

    if (inMain) {
      const localY = my - pMain.y;
      ctx.beginPath(); ctx.moveTo(0, localY + 0.5); ctx.lineTo(this.chartW, localY + 0.5); ctx.stroke();
      // Price label on scale
      const crossPrice = lo + (1 - (localY / pMain.h)) * (hi - lo);
      this._drawPriceTag(ctx, crossPrice, localY, pMain, C.cross, C.textDim);
    }
    ctx.setLineDash([]);

    // Dot at close
    const dotY = this._yOf(d.c, pMain, lo, hi);
    ctx.beginPath();
    ctx.arc(snapX - 0.5, dotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = C.crossPt;
    ctx.fill();
    ctx.restore();

    // Vol pane crosshair
    const ctxV = this.ctxOVol;
    ctxV.save();
    ctxV.strokeStyle = C.cross;
    ctxV.lineWidth = 1;
    ctxV.setLineDash([4,4]);
    ctxV.beginPath(); ctxV.moveTo(snapX, 0); ctxV.lineTo(snapX, pVol.h); ctxV.stroke();
    ctxV.setLineDash([]);
    ctxV.restore();

    // RSI crosshair
    if (this.showRSI) {
      const ctxR = this.ctxORsi;
      ctxR.save();
      ctxR.strokeStyle = C.cross;
      ctxR.lineWidth = 1;
      ctxR.setLineDash([4,4]);
      ctxR.beginPath(); ctxR.moveTo(snapX, 0); ctxR.lineTo(snapX, this.panes.rsi.h); ctxR.stroke();
      ctxR.setLineDash([]);
      ctxR.restore();
    }

    // Time label on axis
    this._drawTimeTag(barIdx);

    // OHLC header
    this._updateOHLCDisplay(d, barIdx);
  }

  _clearOverlay(ctx, pane) {
    ctx.clearRect(0, 0, pane.w, pane.h);
  }

  _drawPriceTag(ctx, price, y, pane, bgColor, textColor) {
    const label = price.toFixed(2);
    const tw    = 58;
    const th    = 16;
    const tx    = this.chartW + 1;
    const ty    = y - th / 2;
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = textColor === '#050810' ? '#050810' : C.bg;
    ctx.font      = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, tx + tw / 2, ty + 11.5);
    ctx.restore();
  }

  _drawTimeTag(idx) {
    const tCtx = this.ctxTime;
    const d    = this.data[idx];
    if (!d) return;
    const x  = this._xOf(idx);
    const label = this._formatDateFull(d.t);
    const tw  = 90;
    tCtx.save();
    tCtx.fillStyle = C.cross;
    tCtx.fillRect(x - tw / 2, 0, tw, this.panes.time.h);
    tCtx.fillStyle = C.bg;
    tCtx.font = '9px IBM Plex Mono, monospace';
    tCtx.textAlign = 'center';
    tCtx.fillText(label, x, 14);
    tCtx.restore();
  }

  // Dashed live-price line — spans the full chart width at the last close price
  _drawLivePulse(ctx, pane, priceMin, priceMax) {
    const last = this.data[this.data.length - 1];
    if (!last) return;

    const y    = this._yOf(last.c, pane, priceMin, priceMax);
    const bull = last.c >= last.o;
    const col  = bull ? C.bull : C.bear;
    const snapY = Math.round(y) + 0.5;

    ctx.save();

    // Dashed horizontal line across the chart area
    ctx.strokeStyle = bull ? 'rgba(0,200,122,0.55)' : 'rgba(255,64,96,0.55)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, snapY);
    ctx.lineTo(this.chartW, snapY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid price tag on the scale
    const tw = 58, th = 16;
    const tx = this.chartW + 1;
    const ty = snapY - th / 2;
    ctx.fillStyle = col;
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = '#050810';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(last.c.toFixed(2), tx + tw / 2, ty + 11.5);

    ctx.restore();
  }


  _updateOHLCDisplay(d, i) {
    const bull = d.c >= d.o;
    const chg  = d.c - d.o;
    const pct  = (chg / d.o * 100).toFixed(2);
    const col  = bull ? 'var(--bull)' : 'var(--bear)';
    this.ohlcDiv.innerHTML =
      `<span class="ohlc-item"><span class="ohlc-label">O</span><span class="ohlc-val">${d.o.toFixed(2)}</span></span>` +
      `<span class="ohlc-item"><span class="ohlc-label">H</span><span class="ohlc-val">${d.h.toFixed(2)}</span></span>` +
      `<span class="ohlc-item"><span class="ohlc-label">L</span><span class="ohlc-val">${d.l.toFixed(2)}</span></span>` +
      `<span class="ohlc-item"><span class="ohlc-label">C</span><span class="ohlc-val" style="color:${col}">${d.c.toFixed(2)}</span></span>` +
      `<span class="ohlc-item" style="color:${col}">${bull?'+':''}${chg.toFixed(2)} (${bull?'+':''}${pct}%)</span>`;
  }

  // ── DRAWING TOOLS ─────────────────────────────────────────────────────────
  _renderDrawings(ctx, pane, priceMin, priceMax) {
    const allDrawings = [...this.drawings];
    if (this.drawInProgress) allDrawings.push(this.drawInProgress);

    allDrawings.forEach(dr => {
      ctx.save();
      ctx.strokeStyle = '#e8c842';
      ctx.lineWidth   = 1.2;
      ctx.fillStyle   = 'rgba(232,200,66,0.08)';

      switch (dr.type) {
        case 'trendline': {
          const x1 = this._xOf(dr.i1), y1 = this._yOf(dr.p1, pane, priceMin, priceMax);
          const x2 = this._xOf(dr.i2), y2 = this._yOf(dr.p2, pane, priceMin, priceMax);
          // Extend to edges
          const slope = (y2 - y1) / ((x2 - x1) || 1);
          const yLeft  = y1 + slope * (0 - x1);
          const yRight = y1 + slope * (this.chartW - x1);
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(0, yLeft); ctx.lineTo(this.chartW, yRight); ctx.stroke();
          ctx.setLineDash([]);
          // Endpoint dots
          ctx.fillStyle = '#e8c842';
          [x1,x2].forEach((x,n) => {
            const y = n === 0 ? y1 : y2;
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
          });
          break;
        }
        case 'hline': {
          const y = this._yOf(dr.price, pane, priceMin, priceMax);
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(232,200,66,0.8)';
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.chartW, y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(232,200,66,0.7)';
          ctx.font = '9px IBM Plex Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(dr.price.toFixed(2), 8, y - 3);
          break;
        }
        case 'rect': {
          const x1 = this._xOf(dr.i1), y1 = this._yOf(dr.p1, pane, priceMin, priceMax);
          const x2 = this._xOf(dr.i2), y2 = this._yOf(dr.p2, pane, priceMin, priceMax);
          ctx.strokeStyle = 'rgba(232,200,66,0.7)';
          ctx.fillStyle   = 'rgba(232,200,66,0.06)';
          ctx.beginPath();
          ctx.rect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
          ctx.fill(); ctx.stroke();
          break;
        }
        case 'fib': {
          const x1 = this._xOf(dr.i1), y1 = this._yOf(dr.p1, pane, priceMin, priceMax);
          const x2 = this._xOf(dr.i2), y2 = this._yOf(dr.p2, pane, priceMin, priceMax);
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const colors = ['#e8c842','#3d7aff','#a855f7','#00d9a3','#ff4060','#00c87a','#e8c842'];
          levels.forEach((lv,li) => {
            const y = y1 + (y2 - y1) * lv;
            ctx.strokeStyle = colors[li];
            ctx.lineWidth = 0.8;
            ctx.setLineDash([4,3]);
            ctx.beginPath(); ctx.moveTo(Math.min(x1,x2), y); ctx.lineTo(this.chartW, y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = colors[li];
            ctx.font = '8px IBM Plex Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${(lv*100).toFixed(1)}%`, Math.min(x1,x2) + 2, y - 2);
          });
          break;
        }
      }
      ctx.restore();
    });
  }

  _priceAtY(localY, priceMin, priceMax) {
    const p = this.panes.main;
    return priceMax - (localY / p.h) * (priceMax - priceMin);
  }

  // ── INTERACTION ──────────────────────────────────────────────────────────
  _bindEvents() {
    const area = document.getElementById('chart-area');

    // Mouse move
    area.addEventListener('mousemove', e => {
      this.mouse = { x: e.clientX, y: e.clientY, inside: true };
      if (this.isPanning) {
        const dx       = e.clientX - this.panOrigin.x;
        const shift    = -Math.round(dx / this.barWidth);
        const capacity = Math.floor(this.chartW / this.barWidth);
        const maxStart = Math.max(0, this.data.length + this.rightPadBars - capacity);
        this.viewStart = Math.max(0, Math.min(maxStart, this.panOrigin.viewStart + shift));
        this.viewEnd   = this.viewStart + capacity;
        this._clampView();
        this.dirty = true;
        this._updateScrollThumb();
        this._updateStatus();
      } else if (this.drawInProgress) {
        const { lo, hi } = this._visiblePriceRange();
        const localX = e.clientX - this.panes.main.x;
        const localY = e.clientY - this.panes.main.y;
        this.drawInProgress.i2 = this._indexAtX(localX);
        this.drawInProgress.p2 = this._priceAtY(localY, lo, hi);
      }
      this.overlayDirty = true;
    });

    area.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
      this.overlayDirty = true;
    });

    area.addEventListener('mouseenter', () => { this.mouse.inside = true; });

    // Pan
    area.addEventListener('mousedown', e => {
      if (this.activeTool === 'cursor' || this.activeTool === 'crosshair') {
        this.isPanning    = true;
        this.panOrigin    = { x: e.clientX, viewStart: this.viewStart };
        area.style.cursor = 'grabbing';
      } else {
        // Start drawing
        const { lo, hi } = this._visiblePriceRange();
        const localX = e.clientX - this.panes.main.x;
        const localY = e.clientY - this.panes.main.y;
        const i = this._indexAtX(localX);
        const p = this._priceAtY(localY, lo, hi);
        this.drawInProgress = { type: this.activeTool, i1: i, p1: p, i2: i, p2: p };
        if (this.activeTool === 'hline') {
          this.drawInProgress.price = p;
          this.drawings.push(this.drawInProgress);
          this.drawInProgress = null;
          this.dirty = true;
        }
      }
    });

    window.addEventListener('mouseup', e => {
      if (this.isPanning) {
        this.isPanning    = false;
        area.style.cursor = '';
      }
      if (this.drawInProgress) {
        if (this.drawInProgress.type !== 'hline') {
          this.drawings.push(this.drawInProgress);
        }
        this.drawInProgress = null;
        this.dirty = true;
      }
    });

    // Zoom
    area.addEventListener('wheel', e => {
      e.preventDefault();
      const delta     = e.deltaY > 0 ? -1 : 1;
      const factor    = 1 + delta * SCROLL_ZOOM_FACTOR;
      const newBarW   = Math.max(MIN_BAR_W, Math.min(MAX_BAR_W, this.barWidth * factor));
      if (newBarW === this.barWidth) return;

      // Zoom toward mouse X
      const localX    = e.clientX - this.panes.main.x;
      const focusIdx  = this._indexAtX(localX);
      this.barWidth   = newBarW;
      const capacity  = Math.floor(this.chartW / this.barWidth);
      // Keep focus bar at same relative screen position
      const rel       = localX / this.chartW;
      this.viewStart  = Math.max(0, Math.round(focusIdx - rel * capacity));
      this.viewEnd    = this.viewStart + capacity;
      this._clampView();
      this.dirty = true;
      this._updateScrollThumb();
      this._updateStatus();
    }, { passive: false });

    // Touch (mobile pan/pinch)
    let lastTouches = [];
    area.addEventListener('touchstart', e => {
      lastTouches = [...e.touches];
    }, { passive: true });

    area.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouches.length === 1) {
        const dx       = e.touches[0].clientX - lastTouches[0].clientX;
        const shift    = -Math.round(dx / this.barWidth);
        const capacity = Math.floor(this.chartW / this.barWidth);
        const maxStart = Math.max(0, this.data.length + this.rightPadBars - capacity);
        this.viewStart = Math.max(0, Math.min(maxStart, this.viewStart + shift));
        this.viewEnd   = this.viewStart + capacity;
        this._clampView();
        this.dirty = true;
        this._updateScrollThumb();
      } else if (e.touches.length === 2 && lastTouches.length === 2) {
        const prev = Math.hypot(lastTouches[0].clientX - lastTouches[1].clientX, lastTouches[0].clientY - lastTouches[1].clientY);
        const curr = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const scale = curr / prev;
        this.barWidth = Math.max(MIN_BAR_W, Math.min(MAX_BAR_W, this.barWidth * scale));
        const barsInView = Math.floor(this.chartW / this.barWidth);
        this.viewEnd = Math.min(this.data.length, this.viewStart + barsInView);
        this._clampView();
        this.dirty = true;
        this._updateScrollThumb();
      }
      lastTouches = [...e.touches];
    }, { passive: false });

    // Scrollbar drag
    const thumb    = document.getElementById('scrollthumb');
    const scrollbar = document.getElementById('scrollbar');
    let scrollDragging = false, scrollOriginX = 0, scrollOriginVS = 0;

    thumb.addEventListener('mousedown', e => {
      scrollDragging = true; scrollOriginX = e.clientX; scrollOriginVS = this.viewStart; e.stopPropagation();
    });
    window.addEventListener('mousemove', e => {
      if (!scrollDragging) return;
      const sbW    = scrollbar.offsetWidth;
      const total  = this.data.length + this.rightPadBars;
      const ratio  = (e.clientX - scrollOriginX) / sbW;
      const shift  = Math.round(ratio * total);
      const capacity = Math.floor(this.chartW / this.barWidth);
      this.viewStart = Math.max(0, Math.min(this.data.length + this.rightPadBars - capacity, scrollOriginVS + shift));
      this.viewEnd   = Math.min(this.data.length + this.rightPadBars, this.viewStart + capacity);
      this._clampView();
      this.dirty = true;
      this._updateScrollThumb();
      this._updateStatus();
    });
    window.addEventListener('mouseup', () => { scrollDragging = false; });

    // Resize
    window.addEventListener('resize', () => { this._resize(); this.dirty = true; });

    // Double-click to add horizontal line
    area.addEventListener('dblclick', e => {
      if (this.activeTool === 'cursor') {
        const { lo, hi } = this._visiblePriceRange();
        const localY = e.clientY - this.panes.main.y;
        const price  = this._priceAtY(localY, lo, hi);
        this.drawings.push({ type: 'hline', price });
        this.dirty = true;
      }
    });

    // Right-click to clear drawings
    area.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (this.drawings.length) { this.drawings.pop(); this.dirty = true; }
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  _nicePriceSteps(min, max, count) {
    const range  = max - min;
    const rough  = range / count;
    const mag    = Math.pow(10, Math.floor(Math.log10(rough)));
    const step   = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= rough) || mag * 10;
    const start  = Math.ceil(min / step) * step;
    const steps  = [];
    for (let v = start; v <= max; v += step) steps.push(+v.toFixed(10));
    return steps;
  }

  _timeGridStep() {
    const bars = this._barsVisible();
    if (bars <= 30)  return 'week';
    if (bars <= 90)  return 'month';
    if (bars <= 365) return 'quarter';
    return 'year';
  }

  _isTimeGridLine(i, step) {
    if (i === 0 || i >= this.data.length) return false;
    const t  = this.data[i].t;
    const t0 = this.data[i - 1].t;
    const DAY = 86400;
    // Derive UTC calendar fields from seconds without allocating Date objects
    const dayOf    = ts => Math.floor(ts / DAY);
    const yearOf   = ts => { const d = new Date(ts * 1000); return d.getUTCFullYear(); };
    const monthOf  = ts => { const d = new Date(ts * 1000); return d.getUTCMonth(); };
    const dowOf    = ts => Math.floor(ts / DAY + 4) % 7; // 0=Sun
    if (step === 'week')    return dowOf(t) === 1 && dowOf(t0) !== 1;
    if (step === 'month')   return monthOf(t) !== monthOf(t0);
    if (step === 'quarter') return Math.floor(monthOf(t) / 3) !== Math.floor(monthOf(t0) / 3);
    if (step === 'year')    return yearOf(t) !== yearOf(t0);
    return false;
  }

  // t is an integer (Unix seconds). Convert once, only for display.
  _tsToDate(t) { return new Date(t * 1000); }

  _formatDate(t, step) {
    const d = this._tsToDate(t);
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mo = d.getUTCMonth(), yr = d.getUTCFullYear();
    if (step === 'week')    return `${m[mo]} ${d.getUTCDate()}`;
    if (step === 'month')   return `${m[mo]} ${String(yr).slice(2)}`;
    if (step === 'quarter') return `Q${Math.floor(mo / 3) + 1} ${String(yr).slice(2)}`;
    return `${yr}`;
  }

  _formatDateFull(t) {
    const d = this._tsToDate(t);
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${m[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,'0')}, ${d.getUTCFullYear()}`;
  }

  _updateScrollThumb() {
    if (!this.data.length) return;
    const thumb   = document.getElementById('scrollthumb');
    const bar     = document.getElementById('scrollbar');
    const total   = this.data.length + this.rightPadBars; // logical width including padding
    const sbW     = bar.offsetWidth;
    const visible = this.viewEnd - this.viewStart;
    const thumbW  = Math.max(20, sbW * (visible / total));
    const thumbL  = sbW * (this.viewStart / total);
    thumb.style.width = thumbW + 'px';
    thumb.style.left  = thumbL + 'px';
  }

  _updateStatus() {
    document.getElementById('status-bars').textContent = `${this._barsVisible()} bars`;
    document.getElementById('status-zoom').textContent = `×${this.barWidth.toFixed(1)}`;
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────
  setChartType(type) {
    this.chartType = type;
    this.dirty = true;
  }

  // ─── Live Update API ─────────────────────────────────────────────────────
  //
  //  update(candle)
  //
  //  Feed a live OHLCV tick into the chart. Handles two cases automatically:
  //
  //  • Same-bar tick  — candle.t matches the last bar's timestamp.
  //                     Mutates the last candle in place (H/L/C/V update).
  //                     All indicators recompute only their last slot → O(1).
  //
  //  • New-bar tick   — candle.t is newer than the last bar's timestamp.
  //                     Appends a new candle and extends all indicator arrays.
  //                     Auto-scrolls the viewport if the user was at the right edge.
  //
  //  candle shape: { t: Date|string|number, o, h, l, c, v }
  //    t  — timestamp. Any value accepted by new Date(). If omitted, treated as same-bar.
  //    o  — open.  On same-bar ticks the open of the existing bar is preserved.
  //    h  — high.  Merged with max(existing.h, candle.h).
  //    l  — low.   Merged with min(existing.l, candle.l).
  //    c  — close. Always updated.
  //    v  — volume. Always updated (replace semantics; add yourself if needed).
  //
  //  Returns `this` for chaining.
  //
  //  Example — WebSocket feed:
  //
  //    ws.onmessage = ({ data }) => {
  //      const tick = JSON.parse(data);   // { t, o, h, l, c, v }
  //      chart.update(tick);
  //    };
  //
  update(candle) {
    if (!this.data.length) return this;

    const last     = this.data[this.data.length - 1];
    const isNewBar = candle.t != null && this._isDifferentBar(candle.t, last.t);

    // ── Was the viewport pinned to the live right edge before this tick?
    // "At edge" means viewEnd was within rightPadBars slots of the old data end.
    const wasAtEdge = this.viewEnd >= this.data.length;

    if (isNewBar) {
      // ── Append new candle ─────────────────────────────────────────────
      this.data.push({
        t: typeof candle.t === 'number' ? candle.t : Math.floor(new Date(candle.t).getTime() / 1000),
        o: candle.o ?? last.c,
        h: candle.h,
        l: candle.l,
        c: candle.c,
        v: candle.v ?? 0
      });
      this._updateRSIIncremental(true);
      this._updateSeriesIncremental(true);

      // Auto-advance viewport — slide by 1, keeping rightPadBars of empty space
      if (wasAtEdge) {
        const capacity  = Math.floor(this.chartW / this.barWidth);
        this.viewEnd    = this.data.length + this.rightPadBars;
        this.viewStart  = Math.max(0, this.viewEnd - capacity);
      }
      this._updateScrollThumb();
      this._updateStatus();

    } else {
      // ── Tick: mutate last candle in place ─────────────────────────────
      if (candle.h != null) last.h = Math.max(last.h, candle.h);
      if (candle.l != null) last.l = Math.min(last.l, candle.l);
      if (candle.c != null) last.c = candle.c;
      if (candle.v != null) last.v = candle.v;
      this._updateRSIIncremental(false);
      this._updateSeriesIncremental(false);
    }

    this._liveMode = true;
    this.dirty = true;
    return this;
  }

  // Compare two integer-second timestamps at day granularity.
  // For intraday bars change 86400 to the bar interval in seconds.
  _isDifferentBar(t1, t2) {
    return Math.floor(t1 / 86400) !== Math.floor(t2 / 86400);
  }

  // ─── Series API ──────────────────────────────────────────────────────────
  //
  //  addSeries(def)  — register a custom overlay series on the main pane.
  //
  //  def shape:
  //  {
  //    id:           string           — unique key (e.g. 'ma20', 'bb')
  //    label:        string           — legend label
  //    color:        string           — legend swatch color
  //    layer:        'background'|undefined
  //                                   — 'background' renders BEFORE candles
  //                                     (use for fills like BB envelope).
  //                                     Omit or set anything else → renders
  //                                     AFTER candles (lines, dots, etc.)
  //    compute(data) → values[]       — called on load(); result stored in
  //                                     entry.values. Can return anything:
  //                                     numbers, objects, nulls…
  //    priceExtent(values, vs, ve)    — optional. Return [lo, hi] to extend
  //      → [number, number] | null      the auto-scale for your series.
  //    render(ctx, pane, engine,       — draw your series. Called inside a
  //           values, pMin, pMax)        save/restore block. engine exposes:
  //                                       engine.viewStart / viewEnd
  //                                       engine._xOf(i)
  //                                       engine._yOf(price, pane, lo, hi)
  //                                       engine.data[i]
  //    tooltipRow(values, i)          — optional. Called when crosshair is
  //      → { label, value, color }|null  at bar i. Return an object to append
  //                                      a row to the tooltip.
  //  }
  //
  //  Example — 50-period EMA:
  //
  //    chart.addSeries({
  //      id: 'ema50', label: 'EMA 50', color: '#00d9a3',
  //      compute(data) {
  //        const k = 2 / 51;
  //        return data.reduce((acc, d, i) => {
  //          acc.push(i === 0 ? d.c : d.c * k + acc[i-1] * (1 - k));
  //          return acc;
  //        }, []);
  //      },
  //      render(ctx, pane, engine, values, lo, hi) {
  //        ctx.strokeStyle = '#00d9a3'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
  //        ctx.beginPath();
  //        let s = false;
  //        for (let i = engine.viewStart; i < engine.viewEnd; i++) {
  //          const x = engine._xOf(i), y = engine._yOf(values[i], pane, lo, hi);
  //          s ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), s = true);
  //        }
  //        ctx.stroke();
  //      },
  //      tooltipRow: (values, i) => ({ label: 'EMA50', value: values[i].toFixed(2), color: '#00d9a3' })
  //    });
  //
  addSeries(def) {
    const entry = { def, values: [], enabled: false };
    if (this.data.length) entry.values = def.compute(this.data);
    this._series.set(def.id, entry);
    return this; // chainable
  }

  // Remove a series by id
  removeSeries(id) {
    this._series.delete(id);
    this.dirty = true;
    return this;
  }

  // Toggle enabled/disabled for a series by id
  toggleSeries(id) {
    const entry = this._series.get(id);
    if (!entry) return this;
    entry.enabled = !entry.enabled;
    this.dirty = true;
    return this;
  }

  // Explicitly enable a series
  enableSeries(id) {
    const entry = this._series.get(id);
    if (entry) { entry.enabled = true; this.dirty = true; }
    return this;
  }

  // Explicitly disable a series
  disableSeries(id) {
    const entry = this._series.get(id);
    if (entry) { entry.enabled = false; this.dirty = true; }
    return this;
  }

  // Is a series currently enabled?
  isSeriesEnabled(id) {
    return this._series.get(id)?.enabled ?? false;
  }

  togglePane(name) {
    if (name === 'rsi') {
      this.showRSI = !this.showRSI;
      document.getElementById('pane-rsi').style.display = this.showRSI ? 'block' : 'none';
    }
    this._resize();
    this.dirty = true;
  }

  resetZoom() {
    this.barWidth  = DEFAULT_BAR_W;
    const capacity = Math.floor(this.chartW / this.barWidth);
    this.viewEnd   = this.data.length + this.rightPadBars;
    this.viewStart = Math.max(0, this.viewEnd - capacity);
    this.dirty     = true;
    this._updateScrollThumb();
    this._updateStatus();
  }

  setTool(toolName) {
    this.activeTool = toolName;
  }

  clearDrawings() {
    this.drawings = [];
    this.dirty = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
const chart = new ChartEngine();
const rawData = generateOHLC(900);

// ── REGISTER MA via addSeries() ───────────────────────────────────────────────
chart.addSeries({
  id:    'ma',
  label: 'MA 20',
  color: '#ffb830',
  layer: 'foreground', // renders after candles

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
    ctx.strokeStyle = '#ffb830';
    ctx.lineWidth   = 1.3;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = engine.viewStart; i < engine.viewEnd && i < engine.data.length; i++) {
      if (values[i] === null) continue;
      const x = engine._xOf(i);
      const y = engine._yOf(values[i], pane, priceMin, priceMax);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  // O(period) incremental update — avoids full O(n) recompute on every tick
  updateIncremental(values, data, isNewBar) {
    const period = 20;
    const n = data.length - 1;
    if (isNewBar) values.push(null);           // extend array for the new slot
    if (n < period - 1) return;
    // Recompute last value from the last `period` closes
    let sum = 0;
    for (let j = n - period + 1; j <= n; j++) sum += data[j].c;
    values[n] = sum / period;
  },

  // Tooltip contribution
  tooltipRow(values, i) {
    if (values[i] === null) return null;
    return { label: 'MA20', value: values[i].toFixed(2), color: '#ffb830' };
  }
});

// ── REGISTER BB via addSeries() ───────────────────────────────────────────────
chart.addSeries({
  id:    'bb',
  label: 'BB 20',
  color: '#a855f7',
  layer: 'background', // fill renders BEFORE candles; lines after is handled below

  // Compute full BB array once on data load
  compute(data) {
    const period = 20, mult = 2;
    const out = new Array(data.length).fill(null);
    let sum = 0, sum2 = 0;
    for (let i = 0; i < data.length; i++) {
      sum  += data[i].c;
      sum2 += data[i].c ** 2;
      if (i >= period) {
        sum  -= data[i - period].c;
        sum2 -= data[i - period].c ** 2;
      }
      if (i >= period - 1) {
        const mean = sum / period;
        const variance = sum2 / period - mean ** 2;
        const std = Math.sqrt(Math.max(0, variance));
        out[i] = { upper: mean + mult * std, mid: mean, lower: mean - mult * std };
      }
    }
    return out;
  },

  // BB bands may exceed OHLC range — extend the scale
  priceExtent(values, vs, ve) {
    let lo = Infinity, hi = -Infinity;
    for (let i = vs; i < ve; i++) {
      if (!values[i]) continue;
      if (values[i].upper > hi) hi = values[i].upper;
      if (values[i].lower < lo) lo = values[i].lower;
    }
    return lo === Infinity ? null : [lo, hi];
  },

  // Render fill + dashed bands (fill behind candles via layer:'background')
  render(ctx, pane, engine, values, priceMin, priceMax) {
    const ve = engine.viewEnd, vs = engine.viewStart;

    // ── Envelope fill
    ctx.fillStyle = 'rgba(168,85,247,0.07)';
    ctx.beginPath();
    let first = true;
    for (let i = vs; i < ve && i < engine.data.length; i++) {
      if (!values[i]) continue;
      const x = engine._xOf(i);
      const y = engine._yOf(values[i].upper, pane, priceMin, priceMax);
      first ? (ctx.moveTo(x, y), first = false) : ctx.lineTo(x, y);
    }
    for (let i = Math.min(ve, engine.data.length) - 1; i >= vs; i--) {
      if (!values[i]) continue;
      ctx.lineTo(engine._xOf(i), engine._yOf(values[i].lower, pane, priceMin, priceMax));
    }
    ctx.closePath();
    ctx.fill();

    // ── Upper & lower bands
    ctx.strokeStyle = 'rgba(168,85,247,0.65)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ['upper', 'lower'].forEach(key => {
      ctx.beginPath();
      let s = false;
      for (let i = vs; i < ve && i < engine.data.length; i++) {
        if (!values[i]) continue;
        const x = engine._xOf(i);
        const y = engine._yOf(values[i][key], pane, priceMin, priceMax);
        s ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), s = true);
      }
      ctx.stroke();
    });

    // ── Middle band (lighter)
    ctx.strokeStyle = 'rgba(168,85,247,0.35)';
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    let sm = false;
    for (let i = vs; i < ve && i < engine.data.length; i++) {
      if (!values[i]) continue;
      const x = engine._xOf(i);
      const y = engine._yOf(values[i].mid, pane, priceMin, priceMax);
      sm ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), sm = true);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  },

  // Tooltip contribution — show upper/lower spread
  tooltipRow(values, i) {
    if (!values[i]) return null;
    return {
      label: 'BB',
      value: `${values[i].upper.toFixed(2)} / ${values[i].lower.toFixed(2)}`,
      color: '#a855f7'
    };
  },

  // O(period) incremental update for BB
  updateIncremental(values, data, isNewBar) {
    const period = 20, mult = 2;
    const n = data.length - 1;
    if (isNewBar) values.push(null);
    if (n < period - 1) return;
    let sum = 0, sum2 = 0;
    for (let j = n - period + 1; j <= n; j++) {
      sum  += data[j].c;
      sum2 += data[j].c ** 2;
    }
    const mean = sum / period;
    const variance = sum2 / period - mean ** 2;
    const std  = Math.sqrt(Math.max(0, variance));
    values[n]  = { upper: mean + mult * std, mid: mean, lower: mean - mult * std };
  }
});

// Load data after series are registered so compute() runs immediately
chart.load(rawData);

// ── UI BINDINGS ──────────────────────────────────────────────────────────────
function setChartType(type) {
  chart.setChartType(type);
  ['candle','line','area'].forEach(t => {
    document.getElementById('btn-'+t).classList.remove('active');
  });
  const map = { candlestick: 'candle', line: 'line', area: 'area' };
  document.getElementById('btn-'+map[type]).classList.add('active');
}

function toggleSeries(id) {
  chart.toggleSeries(id);
  // Sync toolbar button state
  document.getElementById('btn-'+id).classList.toggle('active');
  // Sync legend pill
  const legEl = document.getElementById('leg-'+id);
  if (legEl) legEl.style.display = chart.isSeriesEnabled(id) ? 'flex' : 'none';
}

function togglePane(name) {
  chart.togglePane(name);
  document.getElementById('btn-'+name).classList.toggle('active');
}

function resetZoom() { chart.resetZoom(); }

function setTF(el, tf) {
  document.querySelectorAll('.sym-tab').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  const samples = { '1D': 900, '1W': 200, '1M': 60 };
  chart.load(generateOHLC(samples[tf] || 900));
}

function setTool(el, name) {
  document.querySelectorAll('.tool').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  chart.setTool(name);
}

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
let _liveSeed  = 999;
const _liveRng = () => { _liveSeed = (_liveSeed * 1664525 + 1013904223) & 0xffffffff; return (_liveSeed >>> 0) / 0xffffffff; };

// Tick state for the current live bar
let _tick = null;

function _generateTick(isNewBar) {
  const last = chart.data[chart.data.length - 1];
  if (!last) return null;

  if (isNewBar || !_tick) {
    const open = last.c * (1 + (_liveRng() - 0.5) * 0.002);
    _tick = { t: null, o: open, h: open, l: open, c: open, v: 0 };
    // Advance timestamp by 1 trading day (integer seconds)
    const DAY = 86400;
    const dow  = ts => Math.floor(ts / DAY + 4) % 7; // 0=Sun
    let next = last.t + DAY;
    while (dow(next) === 0 || dow(next) === 6) next += DAY;
    _tick.t = next;
  }

  const move  = _tick.c * (_liveRng() - 0.492) * 0.005;
  _tick.c     = Math.max(0.01, _tick.c + move);
  _tick.h     = Math.max(_tick.h, _tick.c);
  _tick.l     = Math.min(_tick.l, _tick.c);
  _tick.v    += Math.round(_liveRng() * 500_000);

  return { ..._tick };
}

let _tickCount    = 0;
const TICKS_PER_BAR = 12;   // after this many ticks we open a new bar

function _fireTick() {
  _tickCount++;
  const isNewBar = _tickCount % TICKS_PER_BAR === 0;
  const tick = _generateTick(isNewBar);
  if (tick) chart.update(tick);
}

function toggleLive() {
  const btn = document.getElementById('btn-live');
  if (_liveTimer) {
    clearInterval(_liveTimer);
    _liveTimer = null;
    chart._liveMode = false;
    chart.dirty = true;
    btn.classList.remove('active');
    btn.style.color = '';
  } else {
    _tick = null;
    _tickCount = 0;
    _liveTimer = setInterval(_fireTick, 180); // ~5–6 ticks/sec
    btn.classList.add('active');
    btn.style.color = 'var(--bull)';
  }
}

