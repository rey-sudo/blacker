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

//--------------------------------------------------------------------------------------------------------------------
//  CHART ENGINE
//--------------------------------------------------------------------------------------------------------------------

export class ChartEngine {
  constructor(area) {
    this.options = { ...DEFAULT_OPTIONS };

    this.area = area;

    // Data
    this.data = [];

    // Series registry — populated via addSeries()
    // Map<id, { def, values, enabled }>
    this._series = new Map();

    /**
     * Indicates whether the process is currently running.
     */
    this._running = false;

    /**
     *  Stores the current requestAnimationFrame ID.
     */
    this._rafId = null;

    /**
     * Sets the initial width, in pixels, used to render each chart bar.
     */
    this.barWidth = DEFAULT_BAR_W;
    this.interval = 86400;
    /**
     * Number of empty bar slots reserved to the right of the last data point.
     */
    this.rightPadBars = 20;

    /**
     * Index of the first bar currently visible in the viewport.
     */
    this.viewStart = 0;

    /**
     * Exclusive end index of the current visible range. May exceed
     * data.length due to reserved right-side padding bars.
     */
    this.viewEnd = 0;

    // Render state
    this.dirty = true;
    this.overlayDirty = true;
    this.chartType = "candlestick";

    /**
     * Stores the latest mouse coordinates and hover state,
     * used by overlay elements.
     */
    this.mouse = { x: 0, y: 0, inside: false };

    /**
     * Indicates whether a pan (click-and-drag navigation) interaction
     * is currently active on the chart.
     */
    this.isPanning = false;

    /**
     * Stores the pointer position and viewport state at the start
     * of a pan operation, used to calculate drag offsets.
     */
    this.panOrigin = { x: 0, viewStart: 0 };

    // Live update state
    this._liveMode = false; // true while receiving ticks
    this._prevClose = 0; // close of bar before current (for RSI tick)

    this._drawingModules = new Map(); // Map<id, handle>

    /**
     * Indicates whether pointer input is currently owned by another interaction.
     */
    this._pointerClaimed = false;

    this.drawingsDirty = false; // flag para el RAF loop
    this._dmEventHandlers = {}; // listeners internos del engine hacia los módulos

    // Perf
    this.fps = 60;
    this._fpsFrames = 0;
    this._fpsTime = performance.now();

    // Panes geometry (computed in resize)
    this.panes = {};

    /**
     * Stores the drawable chart width, excluding the price scale area.
     */
    this.chartW = 0;

    this._abortController = new AbortController();

    this._loadCssVariables();
    this._buildLayout();
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

  _buildLayout() {
    const chartArea = this.area;

    if (!chartArea) {
      console.error("Not found id chart-area");
      return;
    }

    chartArea.innerHTML = `
    <div class="pane" id="pane-main">
      <canvas class="chart-canvas" id="canvas-main"></canvas>
      <canvas class="drawings-canvas" id="canvas-drawings"></canvas>
      <canvas class="pricescale-canvas" id="canvas-pricescale"></canvas>
      <canvas class="overlay-canvas" id="canvas-overlay"></canvas>
    </div>

    <div id="time-axis">
      <canvas class="time-canvas" id="canvas-time"></canvas>
    </div>

    <div id="scrollbar">
      <div id="scrollthumb"></div>
    </div>

    <div id="chart-legend"></div>
    <div id="chart-indicators"></div>

    <div id="statusbar">
      <span id="status-fps">60 FPS</span>
      <span id="status-bars"></span>
      <span id="status-zoom"></span>
      <span id="status-cursor"></span>
    </div>
  `;
  }

  /**
   * Retrieves all chart DOM elements and initializes their
   * corresponding 2D rendering contexts.
   */
  _grabCanvases() {
    const area = this.area;
    this.legendDiv = area.querySelector("#chart-legend");
    this.indicatorsDiv = area.querySelector("#chart-indicators");

    this.cMain = area.querySelector("#canvas-main");
    this.ctxMain = this.cMain.getContext("2d");
    this.cDrawings = area.querySelector("#canvas-drawings");
    this.ctxDrawings = this.cDrawings.getContext("2d");
    this.pScale = area.querySelector("#canvas-pricescale");
    this.ctxPScale = this.pScale.getContext("2d");
    this.oMain = area.querySelector("#canvas-overlay");
    this.ctxOMain = this.oMain.getContext("2d");
    this.cTime = area.querySelector("#canvas-time");
    this.ctxTime = this.cTime.getContext("2d");

    // Cachear el resto para no volver a tocar document.getElementById
    this.paneMainEl = area.querySelector("#pane-main");
    this.timeAxisEl = area.querySelector("#time-axis");
    this.scrollbarEl = area.querySelector("#scrollbar");
    this.scrollThumbEl = area.querySelector("#scrollthumb");
    this.statusFpsEl = area.querySelector("#status-fps");
    this.statusBarsEl = area.querySelector("#status-bars");
    this.statusZoomEl = area.querySelector("#status-zoom");
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
     * Configures a canvas for HiDPI rendering to ensure sharp,
     * pixel-perfect graphics on high-density displays.
     *
     * @param {HTMLCanvasElement} canvas Target canvas element.
     * @param {HTMLElement} container Container used to determine dimensions.
     */
    const setCanvas = (canvas, container) => {
      // Get the container's current layout dimensions.
      const r = container.getBoundingClientRect();

      // Compute the physical canvas width / height using the current DPR.
      const w = Math.ceil(r.width * dpr);
      const h = Math.ceil(r.height * dpr);

      // Set the canvas backing-store width / height in physical pixels.
      canvas.width = w;
      canvas.height = h;

      // Preserve the intended visual width / height in CSS pixels.
      canvas.style.width = w / dpr + "px";
      canvas.style.height = h / dpr + "px";

      // Scale the rendering context to match DPR coordinates.
      const ctx = canvas.getContext("2d");

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    // Main chart pane-main container.
    const pMain = this.paneMainEl;

    // Bottom time axis container.
    const tAxis = this.timeAxisEl;

    // Resize chart rendering layers.
    setCanvas(this.cMain, pMain);

    // Reset and resize overlay layer.
    setCanvas(this.oMain, pMain);

    // Resize drawings layer.
    setCanvas(this.cDrawings, pMain);

    // Resize time-axis layer.
    setCanvas(this.cTime, tAxis);

    // Read updated layout dimensions.
    const mainR = pMain.getBoundingClientRect();
    const timeR = tAxis.getBoundingClientRect();

    // Resize the fixed width / height price scale canvas.
    this.pScale.width = Math.ceil(PRICE_SCALE_W * dpr);
    this.pScale.height = Math.ceil(mainR.height * dpr);
    this.pScale.style.width = Math.ceil(PRICE_SCALE_W * dpr) / dpr + "px";
    this.pScale.style.height = Math.ceil(mainR.height * dpr) / dpr + "px";

    // Reset and apply DPR scaling to the price scale context.
    this.ctxPScale.setTransform(1, 0, 0, 1, 0, 0);
    this.ctxPScale.scale(dpr, dpr);

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
  setData(data) {
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

  /**
   * Keeps the chart viewport within valid data limits and
   * recalculates the visible range according to the current
   * zoom level and available chart width.
   */
  _clampView() {
    // Exit if no data is available.
    if (!this.data.length) return;

    // Calculate how many bars fit within the current chart width.
    const capacity = Math.floor(this.chartW / this.barWidth);

    // Determine the maximum allowed end index, including right padding.
    const maxViewEnd = this.data.length + this.rightPadBars;

    // Clamp the viewport end index to the valid range.
    this.viewEnd = Math.min(Math.max(this.viewEnd, 1), maxViewEnd);

    // Recalculate the viewport start index based on chart capacity.
    this.viewStart = Math.max(0, this.viewEnd - capacity);
  }

  _barsVisible() {
    return this.viewEnd - this.viewStart;
  }

  // Data index → X pixel in chart area
  _xOf(i) {
    return (i - this.viewStart) * this.barWidth + this.barWidth / 2;
  }

  /**
   * Converts a horizontal pixel position within the chart
   * into the corresponding data index based on current zoom
   * (bar width) and viewport offset.
   */
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
    this._running = true;

    const loop = (now) => {
      if (!this._running) return;

      this._rafId = requestAnimationFrame(loop);

      // FPS counter
      this._fpsFrames++;
      if (now - this._fpsTime >= 800) {
        this.fps = Math.round(this._fpsFrames / ((now - this._fpsTime) / 1000));
        this._fpsFrames = 0;
        this._fpsTime = now;
        this.statusFpsEl.textContent = this.fps + " FPS";
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

    this._rafId = requestAnimationFrame(loop);
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

    // ── Custom series (foreground): line-type series like MA render here — above candles
    this._series.forEach(({ def, values, enabled, params }) => {
      if (!enabled || def.layer === "background") return;
      ctx.save();
      def.render(ctx, p, this, values, priceMin, priceMax, params);
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
    const ctx = this.ctxPScale;
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
    const area = this.area;

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
        this.area.style.cursor = v ? "crosshair" : "";
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

    // Crosshair X (shared across panes)
    const snapX = Math.round(this._xOf(barIdx)) + 0.5;

    if (!d) {
      const ctx = this.ctxOMain;

      ctx.save();

      ctx.strokeStyle = this.options.colors.cross;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(snapX, 0);
      ctx.lineTo(snapX, pMain.h);
      ctx.stroke();

      ctx.restore();

      return;
    }

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

  /**
   * Registers all user interaction and lifecycle event handlers
   * required by the chart, including mouse, touch, scrolling,
   * zooming, panning, scrollbar dragging, and window resizing.
   */
  _bindEvents() {
    const area = this.area;

    // Track mouse movement within the chart area.
    area.addEventListener(
      "mousemove",
      (e) => {
        // Update the current mouse position and mark it as inside the chart.
        this.mouse = { x: e.clientX, y: e.clientY, inside: true };

        // Handle horizontal panning while dragging.
        if (this.isPanning) {
          // Calculate the horizontal drag distance from the pan start point.
          const dx = e.clientX - this.panOrigin.x;

          // Calculate how many bars to shift based on the horizontal pixel movement.
          const shift = -Math.round(dx / this.barWidth);

          // Calculate how many bars fit in the current viewport.
          const capacity = Math.floor(this.chartW / this.barWidth);

          // Determine the maximum valid start index for the viewport.
          const maxStart = Math.max(
            0,
            this.data.length + this.rightPadBars - capacity,
          );

          // Update and clamp the viewport start index.
          this.viewStart = Math.max(
            0,
            Math.min(maxStart, this.panOrigin.viewStart + shift),
          );

          // Recalculate the viewport end index.
          this.viewEnd = this.viewStart + capacity;

          // Ensure the visible range remains within valid bounds.
          this._clampView();

          // Mark the main chart layer for redraw.
          this.dirty = true;

          // Synchronize the scrollbar thumb with the new viewport.
          this._updateScrollThumb();

          // Refresh status information displayed to the user.
          this._updateStatus();
        }

        // Mark the overlay layer for redraw.
        this.overlayDirty = true;
      },
      { signal: this._abortController.signal },
    );

    // Handle pointer exit from the chart area.
    area.addEventListener(
      "mouseleave",
      () => {
        // Mark the mouse as outside the chart bounds.
        this.mouse.inside = false;

        // Redraw overlay elements affected by hover state.
        this.overlayDirty = true;
      },
      { signal: this._abortController.signal },
    );

    // Restore hover state when the pointer enters the chart area.
    area.addEventListener(
      "mouseenter",
      () => {
        this.mouse.inside = true;
      },
      { signal: this._abortController.signal },
    );

    // Start a horizontal pan operation when the chart is clicked and dragged.
    area.addEventListener(
      "mousedown",
      (e) => {
        // Ignore panning if another tool or interaction has claimed the pointer.
        if (this._pointerClaimed) return;
        
        if (e.button !== 0) return;

        // Mark the chart as being actively panned.
        this.isPanning = true;

        // Store the initial pointer position and viewport state for panning calculations.
        this.panOrigin = { x: e.clientX, viewStart: this.viewStart };

        // Update the cursor to indicate an active drag operation.
        area.style.cursor = "grabbing";
      },
      { signal: this._abortController.signal },
    );

    // End the current pan operation when the mouse button is released.
    window.addEventListener(
      "mouseup",
      (e) => {
        if (this.isPanning) {
          this.isPanning = false;
          area.style.cursor = "";
        }
      },
      { signal: this._abortController.signal },
    );

    // Handle mouse wheel zoom interaction on the chart area.
    area.addEventListener(
      "wheel",
      (e) => {
        // Prevent default page scrolling behavior.
        e.preventDefault();

        // Determine zoom direction based on wheel movement.
        const delta = e.deltaY > 0 ? -1 : 1;

        // Compute zoom factor applied to current bar width.
        const factor = 1 + delta * SCROLL_ZOOM_FACTOR;

        // Compute the new bar width, clamped to allowed zoom limits.
        const newBarW = Math.max(
          MIN_BAR_W,
          Math.min(MAX_BAR_W, this.barWidth * factor),
        );

        // If zoom does not change bar width, exit early.
        if (newBarW === this.barWidth) return;

        // Get mouse position relative to the chart content area.
        const localX = e.clientX - this.panes.main.x;

        // Identify the bar index under the cursor (zoom focus point).
        const focusIdx = this._indexAtX(localX);

        // Apply the new zoom level.
        this.barWidth = newBarW;

        // Recalculate how many bars fit in the viewport.
        const capacity = Math.floor(this.chartW / this.barWidth);

        // Compute cursor position as a ratio of chart width.
        const rel = localX / this.chartW;

        // Adjust viewport so the focused bar stays under the cursor.
        this.viewStart = Math.max(0, Math.round(focusIdx - rel * capacity));

        // Recalculate viewport end based on new capacity.
        this.viewEnd = this.viewStart + capacity;

        // Clamp viewport to valid data bounds.
        this._clampView();

        // Mark chart for redraw.
        this.dirty = true;

        // Sync scrollbar thumb with new viewport.
        this._updateScrollThumb();

        // Update UI status indicators.
        this._updateStatus();
      },
      { passive: false, signal: this._abortController.signal },
    );

    // Initialize touch tracking state for mobile interactions (pan and pinch zoom).
    let lastTouches = [];

    // Store initial touch points when the user starts touching the chart.
    area.addEventListener(
      "touchstart",
      (e) => {
        // Copy current touch points so we can compare movement in touchmove.
        lastTouches = [...e.touches];
      },
      // Allow the browser to handle default behaviors (no preventDefault here).
      { passive: true, signal: this._abortController.signal },
    );

    // Handle touch movement for mobile pan (1 finger) and pinch zoom (2 fingers).
    area.addEventListener(
      "touchmove",
      (e) => {
        // Prevent default browser behavior (scroll/zoom page).
        e.preventDefault();

        // SINGLE TOUCH: horizontal pan gesture.
        if (e.touches.length === 1 && lastTouches.length === 1) {
          // Compute horizontal movement since last frame (in pixels).
          const dx = e.touches[0].clientX - lastTouches[0].clientX;

          // Convert pixel movement into bar index shift.
          const shift = -Math.round(dx / this.barWidth);

          // Compute how many bars fit in the visible chart area.
          const capacity = Math.floor(this.chartW / this.barWidth);

          // Compute the maximum valid starting index (right boundary constraint).
          const maxStart = Math.max(
            0,
            this.data.length + this.rightPadBars - capacity,
          );

          // Update viewport start index with clamping to valid range.
          this.viewStart = Math.max(
            0,
            Math.min(maxStart, this.viewStart + shift),
          );

          // Recompute viewport end index based on capacity.
          this.viewEnd = this.viewStart + capacity;

          // Ensure viewport stays within valid data bounds.
          this._clampView();

          // Mark chart for redraw.
          this.dirty = true;

          // Update scrollbar thumb position.
          this._updateScrollThumb();
        }

        // TWO FINGERS: pinch zoom — reemplazar este bloque
        else if (e.touches.length === 2 && lastTouches.length === 2) {
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

          const capacity = Math.floor(this.chartW / this.barWidth);
          this.viewEnd = this.viewStart + capacity; // <- antes: Math.min(this.data.length, ...)
          this._clampView();

          this.dirty = true;
          this._updateScrollThumb();
        }

        // Update last known touch positions for next move event.
        lastTouches = [...e.touches];
      },
      // Enable preventDefault because we block native touch scrolling.
      { passive: false, signal: this._abortController.signal },
    );

    // Cache references to the scrollbar thumb and track elements.
    const thumb = this.scrollThumbEl;
    const scrollbar = this.scrollbarEl;

    // Track scrollbar drag state and drag origin information.
    let scrollDragging = false,
      scrollOriginX = 0,
      scrollOriginVS = 0;

    // Begin scrollbar dragging when the thumb is pressed.
    thumb.addEventListener(
      "mousedown",
      (e) => {
        // Enable scrollbar drag mode.
        scrollDragging = true;
        // Store the initial mouse X position.
        scrollOriginX = e.clientX;
        // Store the viewport start index at drag start.
        scrollOriginVS = this.viewStart;
        // Prevent the event from triggering chart panning.
        e.stopPropagation();
      },
      { signal: this._abortController.signal },
    );

    // Handle thumb dragging while the mouse moves.
    window.addEventListener(
      "mousemove",
      (e) => {
        // Ignore movement unless a scrollbar drag is active.
        if (!scrollDragging) return;

        // Get the current scrollbar track width.
        const scrollbarWidth = scrollbar.offsetWidth;

        // Compute the total scrollable range, including right padding.
        const total = this.data.length + this.rightPadBars;

        // Convert horizontal mouse movement into a scrollbar ratio.
        const ratio = (e.clientX - scrollOriginX) / scrollbarWidth;

        // Convert scrollbar movement into a bar index offset.
        const shift = Math.round(ratio * total);

        // Calculate how many bars fit in the current viewport.
        const capacity = Math.floor(this.chartW / this.barWidth);

        // Update and clamp the viewport start index.
        this.viewStart = Math.max(
          0,
          Math.min(
            this.data.length + this.rightPadBars - capacity,
            scrollOriginVS + shift,
          ),
        );

        // Recalculate the viewport end index.
        this.viewEnd = Math.min(
          this.data.length + this.rightPadBars,
          this.viewStart + capacity,
        );

        // Ensure the viewport remains within valid bounds.
        this._clampView();

        // Mark the chart for redraw.
        this.dirty = true;

        // Synchronize the scrollbar thumb position and size.
        this._updateScrollThumb();

        // Refresh viewport-related status information.
        this._updateStatus();
      },
      { signal: this._abortController.signal },
    );

    // End scrollbar dragging when the mouse button is released.
    window.addEventListener(
      "mouseup",
      () => {
        scrollDragging = false;
      },
      { signal: this._abortController.signal },
    );

    // Recalculate chart layout when the browser window is resized.
    window.addEventListener(
      "resize",
      () => {
        this._resize();
        this.dirty = true;
      },
      { signal: this._abortController.signal },
    );
  }

  //--------------------------------------------------------------------------------------------------------------------
  //  HELPERS
  //--------------------------------------------------------------------------------------------------------------------

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

  /**
   * Updates the scrollbar thumb size and position to reflect
   * the current visible range relative to the total scrollable
   * data range, including right-side padding.
   */
  _updateScrollThumb() {
    // Exit if no data is available.
    if (!this.data.length) return;

    // Retrieve the draggable scrollbar thumb element.
    const thumb = this.scrollThumbEl;

    // Retrieve the scrollbar track element.
    const bar = this.scrollbarEl;

    // Calculate the total logical range, including right-side padding.
    const total = this.data.length + this.rightPadBars;

    // Get the current width of the scrollbar track in pixels.
    const scrollbarWidth = bar.offsetWidth;

    // Calculate the number of bars currently visible in the viewport.
    const visible = this.viewEnd - this.viewStart;

    // Compute the thumb width proportionally to the visible range,
    // enforcing a minimum width for usability.
    const thumbW = Math.max(20, scrollbarWidth * (visible / total));

    // Compute the thumb's horizontal position based on the
    // viewport start index relative to the total range.
    const thumbL = scrollbarWidth * (this.viewStart / total);

    // Apply the calculated width to the thumb element.
    thumb.style.width = thumbW + "px";

    // Position the thumb along the scrollbar track.
    thumb.style.left = thumbL + "px";
  }

  _updateStatus() {
    this.statusBarsEl.textContent = `${this._barsVisible()} bars`;
    this.statusZoomEl.textContent = `×${this.barWidth.toFixed(1)}`;
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

  //--------------------------------------------------------------------------------------------------------------------
  //  PUBLIC API
  //--------------------------------------------------------------------------------------------------------------------

  destroy() {
    this._running = false;

    if (this._rafId) cancelAnimationFrame(this._rafId);

    this._abortController.abort();

    this._drawingModules.forEach((handle) => handle.destroy());
    this._drawingModules.clear();

    if (this.area) this.area.innerHTML = "";
  }

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

export function createChart(container) {
  const chart = new ChartEngine(container);

  return chart;
}
