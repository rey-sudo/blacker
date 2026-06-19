"use strict";
// BLACKER CHART LIBRARY LICENSE GNU GPLv3.0

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const PRICE_SCALE_W = 72;
const MIN_BAR_W = 1;
const MAX_BAR_W = 40;
const DEFAULT_BAR_W = 8;
const SCROLL_ZOOM_FACTOR = 0.12;

const DEFAULT_OPTIONS = {
  chartType: "candlestick", // 'candlestick' | 'line' | 'area'
  rightPadBars: 20,
  barWidth: DEFAULT_BAR_W,
  minBarWidth: MIN_BAR_W,
  maxBarWidth: MAX_BAR_W,
  zoomFactor: SCROLL_ZOOM_FACTOR,

  colors: {
    bg: "#050810",
    bg2: "#080d1a",
    bg3: "#0d1526",
    grid: "rgba(26,37,64,0.9)",
    gridAlt: "rgba(26,37,64,0.4)",
    text: "#c8d4e8",
    textDim: "#4a5a7a",
    bull: "#00c87a",
    bear: "#ff4060",
    bullDim: "rgba(0,200,122,0.15)",
    bearDim: "rgba(255,64,96,0.15)",
    line: "#3d7aff",
    area1: "rgba(61,122,255,0.25)",
    area2: "rgba(61,122,255,0.0)",
    ma: "#ffb830",
    bb: "#a855f7",
    bbFill: "rgba(168,85,247,0.07)",
    cross: "rgba(200,212,232,0.3)",
    crossPt: "#3d7aff",
    vol: "rgba(61,122,255,0.35)",
    volBull: "rgba(0,200,122,0.35)",
    volBear: "rgba(255,64,96,0.35)",
  },
};

export function _mergeoptions(base, patch, opts = {}) {
  // ── Config ──────────────────────────────────────────────────────

  const resolvers = opts.resolvers ?? {};
  const strict = opts.strict ?? false;
  const clone = opts.clone !== false;

  // ── Helpers ────────────────────────────────────────────────────────────

  function isPlainObject(val) {
    if (val === null || typeof val !== "object") return false;
    const proto = Object.getPrototypeOf(val);
    return proto === Object.prototype || proto === null;
  }

  function ownKeys(obj) {
    const keys = Object.keys(obj);
    if (Object.getOwnPropertySymbols) {
      for (const sym of Object.getOwnPropertySymbols(obj)) {
        if (Object.prototype.propertyIsEnumerable.call(obj, sym))
          keys.push(sym);
      }
    }
    return keys;
  }

  function isProtected(target, key) {
    try {
      return (
        key in target &&
        !(
          Object.hasOwn(target, key) &&
          Object.prototype.propertyIsEnumerable.call(target, key)
        )
      );
    } catch {
      return false;
    }
  }

  // ── Recursive ───────────────────────────────────────────────────

  function fuse(a, b, seen) {
    if (seen.has(b)) {
      if (strict)
        throw new TypeError("_mergeoptions: referencia circular detectada.");
      return b;
    }
    seen.add(b);

    const result = {};

    if (isPlainObject(a)) {
      for (const key of ownKeys(a)) {
        result[key] = maybeClone(a[key], seen);
      }
    }

    for (const key of ownKeys(b)) {
      if (isProtected(a, key)) continue;

      if (resolvers[key]) {
        result[key] = resolvers[key](a?.[key], b[key], opts);
        continue;
      }

      if (isPlainObject(a?.[key]) && isPlainObject(b[key])) {
        result[key] = fuse(a[key], b[key], seen);
        continue;
      }

      result[key] = maybeClone(b[key], seen);
    }

    return result;
  }

  function maybeClone(val, seen) {
    if (!clone || !isPlainObject(val)) return val;
    return fuse({}, val, seen);
  }

  if (!isPlainObject(base) || !isPlainObject(patch)) {
    throw new TypeError(
      "_mergeoptions: base y patch deben ser objetos planos.",
    );
  }

  return fuse(base, patch, new WeakSet());
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
export class ChartEngine {
  constructor() {
    this.options = { ...DEFAULT_OPTIONS };

    // Data
    this.data = [];

    // Series registry — populated via addSeries()
    // Map<id, { def, values, enabled }>
    this._series = new Map();

    // Viewport (virtual scroll)
    this.barWidth = DEFAULT_BAR_W;
    this.interval = 86400;
    this.rightPadBars = 20; // empty bar-slots kept to the right of the last candle
    this.viewStart = 0; // first visible bar index
    this.viewEnd = 0; // last  visible bar index  (exclusive; may exceed data.length)

    // Render state
    this.dirty = true;
    this.overlayDirty = true;
    this.chartType = "candlestick";

    // Interaction
    this.mouse = { x: 0, y: 0, inside: false };
    this.isPanning = false;
    this.panOrigin = { x: 0, viewStart: 0 };

    // Live update state
    this._liveMode = false; // true while receiving ticks
    this._prevClose = 0; // close of bar before current (for RSI tick)

    this._drawingModules = new Map(); // Map<id, handle>
    this._pointerClaimed = false;
    this.drawingsDirty = false; // flag para el RAF loop
    this._dmEventHandlers = {}; // listeners internos del engine hacia los módulos

    // Perf
    this.fps = 60;
    this._fpsFrames = 0;
    this._fpsTime = performance.now();

    // Panes geometry (computed in resize)
    this.panes = {};

    this._loadCssVariables();
    this._grabCanvases();
    this._resize();
    this._bindEvents();
    this._startLoop();
  }

  /**
   * Applies configured color values as CSS custom properties
   * on the document root element.
   */
  _loadCssVariables() {
    const root = document.documentElement;

    Object.entries(this.options.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }

  /**
   * Retrieves all chart DOM elements and initializes their
   * corresponding 2D rendering contexts.
   */
  _grabCanvases() {
    this.legendDiv = document.getElementById("chart-legend");
    this.indicatorsDiv = document.getElementById("chart-indicators");

    this.cMain = document.getElementById("canvas-main");
    this.ctxMain = this.cMain.getContext("2d");

    this.cDrawings = document.getElementById("canvas-drawings");
    this.ctxDrawings = this.cDrawings.getContext("2d");

    this.pScale = document.getElementById("canvas-pricescale");
    this.ctxScale = this.pScale.getContext("2d");

    this.oMain = document.getElementById("canvas-overlay");
    this.ctxOMain = this.oMain.getContext("2d");

    this.cTime = document.getElementById("canvas-time");
    this.ctxTime = this.cTime.getContext("2d");
  }

  /**
   * Resizes and reconfigures all chart canvases to match the current
   * layout dimensions and device pixel ratio (DPR).
   *
   * This method:
   * - Synchronizes canvas backing-store resolution with CSS dimensions.
   * - Applies HiDPI scaling for crisp rendering on Retina displays.
   * - Resets canvas transforms to prevent accumulated scaling.
   * - Updates pane geometry for the main chart, price scale, and time axis.
   * - Recalculates the available chart width.
   * - Marks rendering layers as dirty for a full redraw.
   * - Clamps the current viewport and updates the scroll thumb.
   *
   * Canvas layers:
   * - Main canvas: price series and indicators.
   * - Overlay canvas: crosshair, hover states, and interactive elements.
   * - Drawings canvas: user annotations and drawing tools.
   * - Time canvas: bottom time scale.
   * - Price scale canvas: right-side price axis.
   */
  _resize() {
    const dpr = window.devicePixelRatio || 1;

    /**
     * Configures a canvas for HiDPI rendering by:
     * - Reading the container's visual size.
     * - Setting the canvas backing-store size in physical pixels.
     * - Preserving the intended CSS size.
     * - Scaling the 2D context to DPR coordinates.
     *
     * @param {HTMLCanvasElement} canvas Target canvas.
     * @param {HTMLElement} container Reference container element.
     */
    const setCanvas = (canvas, container) => {
      const r = container.getBoundingClientRect();
      const w = Math.ceil(r.width * dpr); // ← ceil, no truncar
      const h = Math.ceil(r.height * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = w / dpr + "px"; // ← CSS = exactamente lo físico / dpr
      canvas.style.height = h / dpr + "px";
      canvas.getContext("2d").scale(dpr, dpr);
    };

    const dpr2 = window.devicePixelRatio || 1;

    /**
     * Resets the canvas transformation matrix and reapplies
     * the current DPR scaling.
     *
     * This prevents scale accumulation across multiple resize calls.
     *
     * @param {HTMLCanvasElement} canvas Target canvas.
     */
    const resetScale = (canvas) => {
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr2, dpr2);
    };

    // Main chart pane container.
    const pMain = document.getElementById("pane-main");

    // Bottom time axis container.
    const tAxis = document.getElementById("time-axis");

    // Resize chart rendering layers.
    setCanvas(this.cMain, pMain);

    // Reset and resize overlay layer.
    resetScale(this.oMain);
    setCanvas(this.oMain, pMain);
    resetScale(this.oMain);

    // Resize drawings layer.
    setCanvas(this.cDrawings, pMain);

    // Resize time-axis layer.
    setCanvas(this.cTime, tAxis);

    // Read updated layout dimensions.
    const mainR = pMain.getBoundingClientRect();
    const timeR = tAxis.getBoundingClientRect();

    // Resize the fixed-width price scale canvas.
    this.pScale.width = Math.ceil(PRICE_SCALE_W * dpr);
    this.pScale.height = Math.ceil(mainR.height * dpr);
    this.pScale.style.width = Math.ceil(PRICE_SCALE_W * dpr) / dpr + "px";
    this.pScale.style.height = Math.ceil(mainR.height * dpr) / dpr + "px";

    // Reset and apply DPR scaling to the price scale context.
    this.ctxScale.setTransform(1, 0, 0, 1, 0, 0);
    this.ctxScale.scale(dpr, dpr);

    /**
     * Main chart pane geometry and rendering references.
     */
    this.panes.main = {
      x: mainR.left,
      y: mainR.top,
      w: mainR.width,
      h: mainR.height,
      canvas: this.cMain,
      ctx: this.ctxMain,
      oCtx: this.ctxOMain,
    };

    /**
     * Price scale pane dimensions.
     */
    this.panes.scale = { w: PRICE_SCALE_W, h: mainR.height };

    /**
     * Time axis pane geometry.
     */
    this.panes.time = {
      x: timeR.left,
      y: timeR.top,
      w: timeR.width,
      h: timeR.height,
    };

    // Effective drawable chart width excluding the price scale.
    this.chartW = mainR.width - PRICE_SCALE_W;

    // Request a complete redraw.
    this.dirty = true;
    this.overlayDirty = true;

    // Ensure viewport constraints remain valid.
    this._clampView();

    // Recalculate scrollbar thumb size and position.
    this._updateScrollThumb();
  }

  // ── DATA LOADING ──────────────────────────────────────────────────────────
  load(data) {
    this.data = data;

    if (data.length >= 2) {
      let minGap = Infinity;
      const n = Math.min(data.length - 1, 10);
      for (let i = 0; i < n; i++)
        minGap = Math.min(minGap, data[i + 1].t - data[i].t);
      this.interval = minGap;
    } else {
      this.interval = 86400; // fallback: daily
    }

    this._recomputeSeries();

    // Cache the close of the second-to-last bar (used by incremental RSI tick)
    this._prevClose =
      data.length >= 2 ? data[data.length - 2].c : (data[0]?.c ?? 0);

    // Start at the right end — leave rightPadBars of empty space after the last candle
    const capacity = Math.floor(this.chartW / this.barWidth);
    this.viewEnd = data.length + this.rightPadBars;
    this.viewStart = Math.max(0, this.viewEnd - capacity);
    this.dirty = true;
    this._updateScrollThumb();
    this._updateStatus();
  }

  // Recompute values for all registered series (called on full load)
  _recomputeSeries() {
    this._series.forEach((entry) => {
      entry.values = entry.def.compute(this.data, entry.params);
    });
  }
  // Incremental series update — O(period) per series, not O(n).
  // Falls back to full compute() if the series has no updateIncremental hook.
  _updateSeriesIncremental(isNewBar) {
    this._series.forEach((entry) => {
      if (entry.def.updateIncremental) {
        entry.def.updateIncremental(
          entry.values,
          this.data,
          isNewBar,
          entry.params,
        );
      } else {
        entry.values = entry.def.compute(this.data, entry.params);
      }
    });
  }

  // ── VIEWPORT HELPERS ──────────────────────────────────────────────────────
  _clampView() {
    if (!this.data.length) return;
    const capacity = Math.floor(this.chartW / this.barWidth);
    const maxViewEnd = this.data.length + this.rightPadBars;
    this.viewEnd = Math.min(Math.max(this.viewEnd, 1), maxViewEnd);
    this.viewStart = Math.max(0, this.viewEnd - capacity);
  }

  _barsVisible() {
    return this.viewEnd - this.viewStart;
  }

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
    return (
      pane.h - ((price - priceMin) / range) * pane.h * 0.92 - pane.h * 0.04
    );
  }

  // ── PRICE RANGE ──────────────────────────────────────────────────────────
  _visiblePriceRange() {
    let lo = Infinity,
      hi = -Infinity;
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
      if (ext) {
        lo = Math.min(lo, ext[0]);
        hi = Math.max(hi, ext[1]);
      }
    });
    // Add padding
    const pad = (hi - lo) * 0.06;
    return { lo: lo - pad, hi: hi + pad };
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
        this._fpsTime = now;
        document.getElementById("status-fps").textContent = this.fps + " FPS";
      }

      if (this.dirty) {
        this._render();
        this.dirty = false;
        this.drawingsDirty = true;
        this.overlayDirty = true; // overlay needs redraw after data repaint
      }

      if (this.drawingsDirty) {
        this._renderDrawingModules();
        this.drawingsDirty = false;
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
    this._renderPriceScale(lo, hi);
    this._renderTimeAxis();
  }

  // ── MAIN PANE ─────────────────────────────────────────────────────────────
  _renderMain(priceMin, priceMax) {
    const p = this.panes.main;
    const ctx = p.ctx;
    const W = p.w;
    const H = p.h;
    const cw = this.chartW;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = this.options.colors.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    this._drawGrid(ctx, W, H, cw, priceMin, priceMax, p);

    // ── Custom series (behind candles): fill-type series like BB render here
    this._series.forEach(({ def, values, enabled, params }) => {
      if (!enabled || def.layer !== "background") return;
      ctx.save();
      def.render(ctx, p, this, values, priceMin, priceMax, params);
      ctx.restore();
    });

    // Area fill (below close)
    if (this.chartType === "area") this._drawArea(ctx, p, priceMin, priceMax);

    // Candles / line
    if (this.chartType === "candlestick")
      this._drawCandlesticks(ctx, p, priceMin, priceMax);
    else if (this.chartType === "line")
      this._drawLine(ctx, p, priceMin, priceMax);
    else if (this.chartType === "area")
      this._drawLine(ctx, p, priceMin, priceMax);

    // ── Custom series (foreground): line-type series like MA render here — above candles
    this._series.forEach(({ def, values, enabled }) => {
      if (!enabled || def.layer === "background") return;
      ctx.save();
      def.render(ctx, p, this, values, priceMin, priceMax);
      ctx.restore();
    });
  }

  _drawGrid(ctx, W, H, cw, priceMin, priceMax, p) {
    ctx.save();
    ctx.strokeStyle = this.options.colors.grid;
    ctx.lineWidth = 1;

    // Horizontal price grid lines
    const steps = this._nicePriceSteps(priceMin, priceMax, 6);
    steps.forEach((price) => {
      const y = Math.round(this._yOf(price, p, priceMin, priceMax)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    });

    // Vertical time grid lines
    const timeStep = this._timeGridStep();
    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      if (this._isTimeGridLine(i, timeStep)) {
        const x = Math.round(this._xOf(i)) + 0.5;
        ctx.strokeStyle = this.options.colors.grid;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawCandlesticks(ctx, p, priceMin, priceMax) {
    const bw = Math.max(1, this.barWidth - 1);
    const hw = Math.max(1, Math.floor(bw / 2));
    ctx.save();
    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      const d = this.data[i];
      const x = Math.round(this._xOf(i));
      const yH = Math.round(this._yOf(d.h, p, priceMin, priceMax));
      const yL = Math.round(this._yOf(d.l, p, priceMin, priceMax));
      const yO = Math.round(this._yOf(d.o, p, priceMin, priceMax));
      const yC = Math.round(this._yOf(d.c, p, priceMin, priceMax));
      const bull = d.c >= d.o;
      const col = bull ? this.options.colors.bull : this.options.colors.bear;

      // Wick — +0.5 aligns 1px stroke to pixel center
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, yH);
      ctx.lineTo(x + 0.5, yL);
      ctx.stroke();

      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(1, Math.abs(yC - yO));
      if (bw >= 2) {
        ctx.fillStyle = col;
        ctx.fillRect(x - hw + 1, bodyTop, bw - 1, bodyH);
        if (bw >= 5 && bodyH > 2) {
          ctx.fillStyle = bull
            ? "rgba(0,200,122,0.25)"
            : "rgba(255,64,96,0.25)";
          ctx.fillRect(x - hw + 2, bodyTop + 1, bw - 3, bodyH - 2);
        }
      } else {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, bodyTop);
        ctx.lineTo(x + 0.5, bodyTop + bodyH);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawLine(ctx, p, priceMin, priceMax) {
    ctx.save();
    ctx.strokeStyle = this.options.colors.line;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      const x = this._xOf(i);
      const y = this._yOf(this.data[i].c, p, priceMin, priceMax);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
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
    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      const x = this._xOf(i);
      const y = this._yOf(this.data[i].c, p, priceMin, priceMax);
      if (!started) {
        ctx.moveTo(x, y);
        firstX = x;
        started = true;
      } else ctx.lineTo(x, y);
      lastX = x;
    }
    if (started) {
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(firstX, baseY);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, p.h);
      grad.addColorStop(0, this.options.colors.area1);
      grad.addColorStop(1, this.options.colors.area2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── TIME AXIS ─────────────────────────────────────────────────────────────
  _renderTimeAxis() {
    const ctx = this.ctxTime;
    const W = this.panes.time.w;
    const H = this.panes.time.h;
    const cw = this.chartW;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.options.colors.bg2;
    ctx.fillRect(0, 0, W, H);

    if (!this.data.length) return;
    const step = this._timeGridStep();
    ctx.fillStyle = this.options.colors.textDim;
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "center";

    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      if (!this._isTimeGridLine(i, step)) continue;
      const x = this._xOf(i);
      if (x < 16 || x > cw - 16) continue;
      ctx.fillText(this._formatDate(this.data[i].t, step), x, 15);
    }
  }

  _renderPriceScale(priceMin, priceMax) {
    const ctx = this.ctxScale;
    const W = PRICE_SCALE_W;
    const H = this.panes.scale.h;
    const p = this.panes.main; // yOf necesita el pane main para el height

    ctx.clearRect(0, 0, W, H);

    // Fondo
    ctx.fillStyle = this.options.colors.bg2;
    ctx.fillRect(0, 0, W, H);

    // Línea separadora izquierda
    ctx.strokeStyle = this.options.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, H);
    ctx.stroke();

    // Labels en cada grid step
    const steps = this._nicePriceSteps(priceMin, priceMax, 6);
    ctx.fillStyle = this.options.colors.textDim;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    steps.forEach((price) => {
      const y = Math.round(this._yOf(price, p, priceMin, priceMax)) + 0.5;
      ctx.fillText(price.toFixed(2), W - 8, y + 3.5);
    });

    // Tag del último close — estático, no es el crosshair
    if (!this.data.length) return;
    const last = this.data[this.data.length - 1];
    const y = this._yOf(last.c, p, priceMin, priceMax);
    const bull = last.c >= last.o;
    ctx.fillStyle = bull ? this.options.colors.bull : this.options.colors.bear;
    ctx.fillRect(1, y - 8, W - 2, 16);
    ctx.fillStyle = "#050810";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(last.c.toFixed(2), W / 2, y + 3.5);
  }

  _renderDrawingModules() {
    const { lo, hi } = this._visiblePriceRange();
    const p = this.panes.main;

    // Funciones de conversión frescas para este frame
    const xOf = (i) => this._xOf(i);
    const yOf = (price) => this._yOf(price, p, lo, hi);
    const indexAtX = (x) => this._indexAtX(x);
    const priceAtY = (y) => lo + ((hi - lo) * (p.h * 0.96 - y)) / (p.h * 0.92);

    this.ctxDrawings.clearRect(
      0,
      0,
      this.cDrawings.width,
      this.cDrawings.height,
    );

    this._drawingModules.forEach((handle) => {
      if (!handle._render) return;
      this.ctxDrawings.save();
      handle._render({ lo, hi, xOf, yOf, indexAtX, priceAtY });
      this.ctxDrawings.restore();
    });
  }

  _buildDrawingApi() {
    const engine = this;
    const area = document.getElementById("chart-area");

    return {
      get canvas() {
        return engine.cDrawings;
      },
      get ctx() {
        return engine.ctxDrawings;
      },
      get viewStart() {
        return engine.viewStart;
      },
      get viewEnd() {
        return engine.viewEnd;
      },
      get barWidth() {
        return engine.barWidth;
      },
      get chartW() {
        return engine.chartW;
      },
      get data() {
        return engine.data;
      },
      get pane() {
        return engine.panes.main;
      },
      get bus() {
        return engine._bus;
      },

      // Conversiones — siempre frescas, no capturadas al mount
      // Después — directo
      xOf(i) {
        return engine._xOf(i);
      },

      yOf(price) {
        const { lo, hi } = engine._visiblePriceRange();
        return engine._yOf(price, engine.panes.main, lo, hi);
      },
      indexAtX(x) {
        return engine._indexAtX(x);
      },

      priceAtY(y) {
        const { lo, hi } = engine._visiblePriceRange();
        const h = engine.panes.main.h;
        return lo + ((hi - lo) * (h * 0.96 - y)) / (h * 0.92);
      },

      requestRedraw() {
        engine.drawingsDirty = true;
      },

      claimPointer(v) {
        engine._pointerClaimed = !!v;
        document.getElementById("chart-area").style.cursor = v
          ? "crosshair"
          : "";
      },

      // Suscripción normalizada a eventos del chart area
      // payload: { localX, localY, barIdx, price, button, original }
      on(event, fn) {
        const target = event === "mouseup" ? window : area;

        const handler = (e) => {
          const { lo, hi } = engine._visiblePriceRange();
          const p = engine.panes.main;
          const localX = e.clientX - p.x;
          const localY = e.clientY - p.y;
          const barIdx = engine._indexAtX(localX);
          const price = lo + ((hi - lo) * (p.h * 0.96 - localY)) / (p.h * 0.92);
          fn({
            localX,
            localY,
            barIdx,
            price,
            button: e.button ?? 0,
            original: e,
          });
        };

        target.addEventListener(event, handler);
        return () => target.removeEventListener(event, handler);
      },
    };
  }

  // ── OVERLAY (crosshair) ───────────────────────────────────────────────────
  _renderOverlay() {
    this._clearOverlay(this.ctxOMain, this.panes.main);

    this._renderTimeAxis();

    if (!this.mouse.inside || !this.data.length) {
      // Still draw the live price line even without crosshair
      if (this._liveMode && this.data.length) {
        const { lo, hi } = this._visiblePriceRange();
        this._drawLivePulse(this.ctxOMain, this.panes.main, lo, hi);
      }
      return;
    }

    const mx = this.mouse.x;
    const my = this.mouse.y;
    const pMain = this.panes.main;

    // Determine which pane mouse is in
    const inMain = my >= pMain.y && my < pMain.y + pMain.h;

    // Bar index under cursor
    const localX = mx - pMain.x;
    const barIdx = Math.max(
      this.viewStart,
      Math.min(this.viewEnd - 1, this._indexAtX(localX)),
    );
    const d = this.data[barIdx]; // may be undefined in right-padding zone

    const { lo, hi } = this._visiblePriceRange();

    // Live price dash — drawn unconditionally so it survives the !d early-exit below
    if (this._liveMode) this._drawLivePulse(this.ctxOMain, pMain, lo, hi);

    if (!d) return; // cursor is in the empty right-padding zone — crosshair stops here

    // Crosshair X (shared across panes)
    const snapX = Math.round(this._xOf(barIdx)) + 0.5;

    // Main pane crosshair
    const ctx = this.ctxOMain;
    ctx.save();
    ctx.strokeStyle = this.options.colors.cross;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(snapX, 0);
    ctx.lineTo(snapX, pMain.h);
    ctx.stroke();

    if (inMain) {
      const localY = my - pMain.y;
      ctx.beginPath();
      ctx.moveTo(0, localY + 0.5);
      ctx.lineTo(this.chartW, localY + 0.5);
      ctx.stroke();
      // Price label on scale
      const crossPrice =
        lo + ((hi - lo) * (pMain.h * 0.96 - localY)) / (pMain.h * 0.92);
      this._drawPriceTag(
        ctx,
        crossPrice,
        localY,
        pMain,
        this.options.colors.cross,
        this.options.colors.textDim,
      );
    }
    ctx.setLineDash([]);

    // Dot at close
    const dotY = this._yOf(d.c, pMain, lo, hi);
    ctx.beginPath();
    ctx.arc(snapX - 0.5, dotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = this.options.colors.crossPt;
    ctx.fill();
    ctx.restore();

    // Time label on axis
    this._drawTimeTag(barIdx);

    // OHLC header
    this._updateOHLCVlegend(d, barIdx);
  }

  _clearOverlay(ctx, pane) {
    ctx.clearRect(0, 0, pane.w, pane.h);
  }

  _drawPriceTag(ctx, price, y, pane, bgColor, textColor) {
    const label = price.toFixed(2);
    const tw = 58;
    const th = 16;
    const tx = this.chartW + 1;
    const ty = y - th / 2;
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle =
      textColor === "#050810" ? "#050810" : this.options.colors.bg;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, tx + tw / 2, ty + 11.5);
    ctx.restore();
  }

  _drawTimeTag(idx) {
    const tCtx = this.ctxTime;
    const d = this.data[idx];
    if (!d) return;
    const x = this._xOf(idx);
    const label = this._formatDateFull(d.t);
    const tw = 90;
    tCtx.save();
    tCtx.fillStyle = this.options.colors.cross;
    tCtx.fillRect(x - tw / 2, 0, tw, this.panes.time.h);
    tCtx.fillStyle = this.options.colors.bg;
    tCtx.font = "9px Inter, sans-serif";
    tCtx.textAlign = "center";
    tCtx.fillText(label, x, 14);
    tCtx.restore();
  }

  // Dashed live-price line — spans the full chart width at the last close price
  _drawLivePulse(ctx, pane, priceMin, priceMax) {
    const last = this.data[this.data.length - 1];
    if (!last) return;

    const y = this._yOf(last.c, pane, priceMin, priceMax);
    const bull = last.c >= last.o;
    const col = bull ? this.options.colors.bull : this.options.colors.bear;
    const snapY = Math.round(y) + 0.5;

    ctx.save();

    // Dashed horizontal line across the chart area
    ctx.strokeStyle = bull ? "rgba(0,200,122,0.55)" : "rgba(255,64,96,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, snapY);
    ctx.lineTo(this.chartW, snapY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid price tag on the scale
    const tw = 58,
      th = 16;
    const tx = this.chartW + 1;
    const ty = snapY - th / 2;
    ctx.fillStyle = col;
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = "#050810";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(last.c.toFixed(2), tx + tw / 2, ty + 11.5);

    ctx.restore();
  }

  _updateOHLCVlegend(d, i) {
    //----------------------------------------------------------
    const bull = d.c >= d.o;
    const chg = d.c - d.o;
    const pct = ((chg / d.o) * 100).toFixed(2);
    const col = bull ? "var(--bull)" : "var(--bear)";

    let ohlcContainer = document.getElementById("chart-legend-content");

    const content =
      `<span class="chart-legend-item"><span class="chart-legend-label">Bitcoin / Tether USD · SPOT · CRYPTO­</span></span>` +
      `<span class="chart-legend-item"><span class="chart-legend-label">O</span><span class="chart-legend-val">${d.o.toFixed(2)}</span></span>` +
      `<span class="chart-legend-item"><span class="chart-legend-label">H</span><span class="chart-legend-val">${d.h.toFixed(2)}</span></span>` +
      `<span class="chart-legend-item"><span class="chart-legend-label">L</span><span class="chart-legend-val">${d.l.toFixed(2)}</span></span>` +
      `<span class="chart-legend-item"><span class="chart-legend-label">C</span><span class="chart-legend-val" style="color:${col}">${d.c.toFixed(2)}</span></span>` +
      `<span class="chart-legend-item"><span class="chart-legend-label">V</span><span class="chart-legend-val">${d.v.toFixed(2)}</span></span>` +
      `<span class="chart-legend-item"><span class="chart-legend-label">T</span><span class=".chart-legend-val">${d.t}</span></span>` +
      `<span class="chart-legend-item" style="color:${col}">${bull ? "+" : ""}${chg.toFixed(2)} (${bull ? "+" : ""}${pct}%)</span>`;

    if (ohlcContainer) {
      ohlcContainer.innerHTML = content;
    } else {
      ohlcContainer = document.createElement("div");
      ohlcContainer.id = "chart-legend-content";
      ohlcContainer.innerHTML = content;
      this.legendDiv.appendChild(ohlcContainer);
    }
    //----------------------------------------------------------
  }

  // ── INTERACTION ──────────────────────────────────────────────────────────
  _bindEvents() {
    const area = document.getElementById("chart-area");

    // Mouse move
    area.addEventListener("mousemove", (e) => {
      this.mouse = { x: e.clientX, y: e.clientY, inside: true };
      if (this.isPanning) {
        const dx = e.clientX - this.panOrigin.x;
        const shift = -Math.round(dx / this.barWidth);
        const capacity = Math.floor(this.chartW / this.barWidth);
        const maxStart = Math.max(
          0,
          this.data.length + this.rightPadBars - capacity,
        );
        this.viewStart = Math.max(
          0,
          Math.min(maxStart, this.panOrigin.viewStart + shift),
        );
        this.viewEnd = this.viewStart + capacity;
        this._clampView();
        this.dirty = true;
        this._updateScrollThumb();
        this._updateStatus();
      }

      this.overlayDirty = true;
    });

    area.addEventListener("mouseleave", () => {
      this.mouse.inside = false;
      this.overlayDirty = true;
    });

    area.addEventListener("mouseenter", () => {
      this.mouse.inside = true;
    });

    // Pan
    area.addEventListener("mousedown", (e) => {
      if (this._pointerClaimed) return;
      this.isPanning = true;
      this.panOrigin = { x: e.clientX, viewStart: this.viewStart };
      area.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        area.style.cursor = "";
      }
    });

    // Zoom
    area.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        const factor = 1 + delta * SCROLL_ZOOM_FACTOR;
        const newBarW = Math.max(
          MIN_BAR_W,
          Math.min(MAX_BAR_W, this.barWidth * factor),
        );
        if (newBarW === this.barWidth) return;

        // Zoom toward mouse X
        const localX = e.clientX - this.panes.main.x;
        const focusIdx = this._indexAtX(localX);
        this.barWidth = newBarW;
        const capacity = Math.floor(this.chartW / this.barWidth);
        // Keep focus bar at same relative screen position
        const rel = localX / this.chartW;
        this.viewStart = Math.max(0, Math.round(focusIdx - rel * capacity));
        this.viewEnd = this.viewStart + capacity;
        this._clampView();
        this.dirty = true;
        this._updateScrollThumb();
        this._updateStatus();
      },
      { passive: false },
    );

    // Touch (mobile pan/pinch)
    let lastTouches = [];
    area.addEventListener(
      "touchstart",
      (e) => {
        lastTouches = [...e.touches];
      },
      { passive: true },
    );

    area.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouches.length === 1) {
          const dx = e.touches[0].clientX - lastTouches[0].clientX;
          const shift = -Math.round(dx / this.barWidth);
          const capacity = Math.floor(this.chartW / this.barWidth);
          const maxStart = Math.max(
            0,
            this.data.length + this.rightPadBars - capacity,
          );
          this.viewStart = Math.max(
            0,
            Math.min(maxStart, this.viewStart + shift),
          );
          this.viewEnd = this.viewStart + capacity;
          this._clampView();
          this.dirty = true;
          this._updateScrollThumb();
        } else if (e.touches.length === 2 && lastTouches.length === 2) {
          const prev = Math.hypot(
            lastTouches[0].clientX - lastTouches[1].clientX,
            lastTouches[0].clientY - lastTouches[1].clientY,
          );
          const curr = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          const scale = curr / prev;
          this.barWidth = Math.max(
            MIN_BAR_W,
            Math.min(MAX_BAR_W, this.barWidth * scale),
          );
          const barsInView = Math.floor(this.chartW / this.barWidth);
          this.viewEnd = Math.min(
            this.data.length,
            this.viewStart + barsInView,
          );
          this._clampView();
          this.dirty = true;
          this._updateScrollThumb();
        }
        lastTouches = [...e.touches];
      },
      { passive: false },
    );

    // Scrollbar drag
    const thumb = document.getElementById("scrollthumb");
    const scrollbar = document.getElementById("scrollbar");
    let scrollDragging = false,
      scrollOriginX = 0,
      scrollOriginVS = 0;

    thumb.addEventListener("mousedown", (e) => {
      scrollDragging = true;
      scrollOriginX = e.clientX;
      scrollOriginVS = this.viewStart;
      e.stopPropagation();
    });
    window.addEventListener("mousemove", (e) => {
      if (!scrollDragging) return;
      const sbW = scrollbar.offsetWidth;
      const total = this.data.length + this.rightPadBars;
      const ratio = (e.clientX - scrollOriginX) / sbW;
      const shift = Math.round(ratio * total);
      const capacity = Math.floor(this.chartW / this.barWidth);
      this.viewStart = Math.max(
        0,
        Math.min(
          this.data.length + this.rightPadBars - capacity,
          scrollOriginVS + shift,
        ),
      );
      this.viewEnd = Math.min(
        this.data.length + this.rightPadBars,
        this.viewStart + capacity,
      );
      this._clampView();
      this.dirty = true;
      this._updateScrollThumb();
      this._updateStatus();
    });
    window.addEventListener("mouseup", () => {
      scrollDragging = false;
    });

    // Resize
    window.addEventListener("resize", () => {
      this._resize();
      this.dirty = true;
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  _nicePriceSteps(min, max, count) {
    const range = max - min;
    const rough = range / count;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const step =
      [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= rough) ||
      mag * 10;
    const start = Math.ceil(min / step) * step;
    const steps = [];
    for (let v = start; v <= max; v += step) steps.push(+v.toFixed(10));
    return steps;
  }

  _timeGridStep() {
    const span = this._barsVisible() * this.interval; // segundos cubiertos
    if (span <= 2 * 3600) return "minute"; // ≤ 2h   → grid cada minuto
    if (span <= 48 * 3600) return "hour"; // ≤ 2d   → grid cada hora
    if (span <= 8 * 86400) return "day"; // ≤ 8d   → grid cada día
    if (span <= 60 * 86400) return "week"; // ≤ 2m   → grid cada semana
    if (span <= 365 * 86400) return "month"; // ≤ 1a   → grid cada mes
    if (span <= 1460 * 86400) return "quarter"; // ≤ 4a   → grid cada trimestre
    return "year";
  }

  _isTimeGridLine(i, step) {
    if (i === 0 || i >= this.data.length) return false;
    const t = this.data[i].t;
    const t0 = this.data[i - 1].t;
    const DAY = 86400;
    const HOUR = 3600;
    const MINUTE = 60;
    const minOf = (ts) => Math.floor(ts / MINUTE);
    const hourOf = (ts) => Math.floor(ts / HOUR);
    const dayOf = (ts) => Math.floor(ts / DAY);
    const dowOf = (ts) => Math.floor(ts / DAY + 4) % 7;
    const yearOf = (ts) => new Date(ts * 1000).getUTCFullYear();
    const monthOf = (ts) => new Date(ts * 1000).getUTCMonth();

    if (step === "minute") return minOf(t) !== minOf(t0);
    if (step === "hour") return hourOf(t) !== hourOf(t0);
    if (step === "day") return dayOf(t) !== dayOf(t0);
    if (step === "week") return dowOf(t) === 1 && dowOf(t0) !== 1;
    if (step === "month") return monthOf(t) !== monthOf(t0);
    if (step === "quarter")
      return Math.floor(monthOf(t) / 3) !== Math.floor(monthOf(t0) / 3);
    if (step === "year") return yearOf(t) !== yearOf(t0);
    return false;
  }

  // t is an integer (Unix seconds). Convert once, only for display.
  _tsToDate(t) {
    return new Date(t * 1000);
  }

  _formatDate(t, step) {
    const d = this._tsToDate(t);
    const mo = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const yr = String(d.getUTCFullYear()).slice(2);

    if (step === "minute") return `${hh}:${mm}`;
    if (step === "hour") return `${hh}:00`;
    if (step === "day") return `${mo[d.getUTCMonth()]} ${dd}`;
    if (step === "week") return `${mo[d.getUTCMonth()]} ${dd}`;
    if (step === "month") return `${mo[d.getUTCMonth()]} ${yr}`;
    if (step === "quarter")
      return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${yr}`;
    return `${d.getUTCFullYear()}`;
  }

  _formatDateFull(t) {
    const d = this._tsToDate(t);
    const mo = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const date = `${mo[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}, ${d.getUTCFullYear()}`;
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");

    if (this.interval < 60) return `${date} ${hh}:${mm}:${ss}`; // sub-minuto
    if (this.interval < 86400) return `${date} ${hh}:${mm}`; // intraday
    return date; // daily+
  }

  _updateScrollThumb() {
    if (!this.data.length) return;
    const thumb = document.getElementById("scrollthumb");
    const bar = document.getElementById("scrollbar");
    const total = this.data.length + this.rightPadBars; // logical width including padding
    const sbW = bar.offsetWidth;
    const visible = this.viewEnd - this.viewStart;
    const thumbW = Math.max(20, sbW * (visible / total));
    const thumbL = sbW * (this.viewStart / total);
    thumb.style.width = thumbW + "px";
    thumb.style.left = thumbL + "px";
  }

  _updateStatus() {
    document.getElementById("status-bars").textContent =
      `${this._barsVisible()} bars`;
    document.getElementById("status-zoom").textContent =
      `×${this.barWidth.toFixed(1)}`;
  }

  _updateLegend() {
    if (!this.indicatorsDiv) return;

    this._series.forEach(({ def, enabled }) => {
      const itemId = `chart-indicators-item-${def.id}`;
      let item = document.getElementById(itemId);

      const opacity = enabled ? "1" : "0.4";
      const title = enabled ? "click to hide" : "click to show";
      const innerHTML =
        `<div class="chart-indicators-item-dot" style="background:${def.color}"></div>` +
        `<span>${def.label}</span>`;

      if (item) {
        item.style.opacity = opacity;
        item.title = title;
        item.innerHTML = innerHTML;
      } else {
        item = document.createElement("div");
        item.id = itemId;
        item.className = "chart-indicators-item";
        item.style.cursor = "pointer";
        item.style.opacity = opacity;
        item.title = title;
        item.innerHTML = innerHTML;

        item.addEventListener("click", () => {
          this.toggleSeries(def.id);
        });

        this.indicatorsDiv.appendChild(item);
      }
    });
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────
  applyOptions(newOptions) {
    this.options = _mergeoptions(this.options, newOptions);
    this._loadCssVariables();
    this.dirty = true;
  }

  setChartType(type) {
    this.chartType = type;
    this.dirty = true;
  }

  update(candle) {
    if (!this.data.length) return this;

    const last = this.data[this.data.length - 1];
    const isNewBar = candle.t != null && this._isDifferentBar(candle.t, last.t);

    // ── Was the viewport pinned to the live right edge before this tick?
    // "At edge" means viewEnd was within rightPadBars slots of the old data end.
    const wasAtEdge = this.viewEnd >= this.data.length;

    if (isNewBar) {
      // ── Append new candle ─────────────────────────────────────────────
      this.data.push({
        t:
          typeof candle.t === "number"
            ? candle.t
            : Math.floor(new Date(candle.t).getTime() / 1000),
        o: candle.o ?? last.c,
        h: candle.h,
        l: candle.l,
        c: candle.c,
        v: candle.v ?? 0,
      });

      this._updateSeriesIncremental(true);

      // Auto-advance viewport — slide by 1, keeping rightPadBars of empty space
      if (wasAtEdge) {
        const capacity = Math.floor(this.chartW / this.barWidth);
        this.viewEnd = this.data.length + this.rightPadBars;
        this.viewStart = Math.max(0, this.viewEnd - capacity);
      }
      this._updateScrollThumb();
      this._updateStatus();
    } else {
      // ── Tick: mutate last candle in place ─────────────────────────────
      if (candle.h != null) last.h = Math.max(last.h, candle.h);
      if (candle.l != null) last.l = Math.min(last.l, candle.l);
      if (candle.c != null) last.c = candle.c;
      if (candle.v != null) last.v = candle.v;

      this._updateSeriesIncremental(false);
    }

    this._liveMode = true;
    this.dirty = true;
    return this;
  }

  // Compare two integer-second timestamps at day granularity.
  // For intraday bars change 86400 to the bar interval in seconds.
  _isDifferentBar(t1, t2) {
    return Math.floor(t1 / this.interval) !== Math.floor(t2 / this.interval);
  }

  // ─── Series API ──────────────────────────────────────────────────────────

  addSeries(def) {
    const params = {};
    if (def.params) {
      for (const [k, field] of Object.entries(def.params)) {
        params[k] = { ...field }; // copy value, type, label, etc.
      }
    }

    const entry = { def, values: [], enabled: true, params };
    if (this.data.length) entry.values = def.compute(this.data);
    this._series.set(def.id, entry);
    this._updateLegend();
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
    this._updateLegend();
    this.dirty = true;
    return this;
  }

  // Explicitly enable a series
  enableSeries(id) {
    const entry = this._series.get(id);
    if (entry) {
      entry.enabled = true;
      this._updateLegend();
      this.dirty = true;
    }
    return this;
  }

  // Explicitly disable a series
  disableSeries(id) {
    const entry = this._series.get(id);
    if (entry) {
      entry.enabled = false;
      this._updateLegend();
      this.dirty = true;
    }
    return this;
  }

  // Is a series currently enabled?
  isSeriesEnabled(id) {
    return this._series.get(id)?.enabled ?? false;
  }

  // Leer el entry completo (def + values + enabled + params)
  getSeries(id) {
    return this._series.get(id) ?? null;
  }

  // Modificar un param individual
  setSeriesParam(id, key, value) {
    const entry = this._series.get(id);
    if (!entry || !entry.params[key]) return this;
    entry.params[key].value = value;
    // Si el param afecta el cálculo → recompute completo
    if (entry.params[key].affectsCompute) {
      entry.values = entry.def.compute(this.data, entry.params);
    }
    this.dirty = true;
    return this;
  }

  // Modificar múltiples params de una vez
  setSeriesParams(id, patch) {
    const entry = this._series.get(id);
    if (!entry) return this;
    let needsRecompute = false;
    for (const [key, value] of Object.entries(patch)) {
      if (!entry.params[key]) continue;
      entry.params[key].value = value;
      if (entry.params[key].affectsCompute) needsRecompute = true;
    }
    if (needsRecompute)
      entry.values = entry.def.compute(this.data, entry.params);
    this.dirty = true;
    return this;
  }

  // Snapshot serializable — { period: 20, color: '#ffb830', ... }
  getSeriesParams(id) {
    const entry = this._series.get(id);
    if (!entry) return null;
    const out = {};
    for (const [k, field] of Object.entries(entry.params)) out[k] = field.value;
    return out;
  }

  resetZoom() {
    this.barWidth = DEFAULT_BAR_W;
    const capacity = Math.floor(this.chartW / this.barWidth);
    this.viewEnd = this.data.length + this.rightPadBars;
    this.viewStart = Math.max(0, this.viewEnd - capacity);
    this.dirty = true;
    this._updateScrollThumb();
    this._updateStatus();
  }

  addDrawingModule(moduleDef) {
    if (this._drawingModules.has(moduleDef.id)) {
      this.removeDrawingModule(moduleDef.id);
    }

    const api = this._buildDrawingApi();
    const result = moduleDef.mount(api); // módulo devuelve { render, destroy }

    const handle = {
      id: moduleDef.id,
      module: moduleDef,
      _render: result.render ?? null,
      destroy: () => {
        result.destroy?.();
        this._drawingModules.delete(moduleDef.id);
        this.drawingsDirty = true;
      },
      redraw: () => {
        this.drawingsDirty = true;
      },
    };

    Object.keys(result).forEach((k) => {
      if (!["render", "destroy"].includes(k)) handle[k] = result[k];
    });

    this._drawingModules.set(moduleDef.id, handle);
    this.drawingsDirty = true;
    return handle;
  }

  removeDrawingModule(id) {
    this._drawingModules.get(id)?.destroy();
  }
}
