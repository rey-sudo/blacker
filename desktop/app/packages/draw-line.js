'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  StraightLineModule — Segment between two exact points  (GNU GPL v3)
//
//  Unlike TrendLineModule, this draws the segment exactly between the two
//  clicked points — no extension to the edges of the chart.
//
//  Interaction:
//    1st click  → anchor point A
//    move       → live preview
//    2nd click  → commit segment, ready for next
//    right-click → cancel in-progress OR undo last committed
//
//  Usage:
//    const line = chart.addDrawingModule(StraightLineModule);
//    line.activate();
//    line.deactivate();
//    line.undo();
//    line.clear();
//    line.getDrawings();      // [{ i1,p1,i2,p2, color, width }]
//    line.setDrawings(arr);
//    line.setColor('#3d7aff');
//    line.setWidth(1.5);
// ═══════════════════════════════════════════════════════════════════════════════

const StraightLineModule = {
  id: 'straight-line',

  mount(api) {
    const lines  = [];     // committed: [{ i1,p1,i2,p2, color, width }]
    let active   = false;
    let drawing  = null;   // { i1,p1,i2,p2 } in construction
    let color    = '#e8c842';
    let width    = 1.5;
    const unsubs = [];

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _drawSegment(ctx, x1, y1, x2, y2, col, lw, preview) {
      ctx.save();
      ctx.strokeStyle = preview ? col + '80' : col;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.setLineDash(preview ? [5, 4] : []);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Endpoint dots
      const r = Math.max(2, lw * 1.8);
      ctx.fillStyle = preview ? col + '80' : col;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── Event handlers ───────────────────────────────────────────────────────

    unsubs.push(api.on('mousedown', ({ barIdx, price, button }) => {
      if (!active) return;

      if (button === 2) {
        if (drawing) { drawing = null; }
        else         { lines.pop(); }
        api.requestRedraw();
        return;
      }
      if (button !== 0) return;

      if (!drawing) {
        // First click — set A
        drawing = { i1: barIdx, p1: price, i2: barIdx, p2: price, color, width };
      } else {
        // Second click — commit
        lines.push({ ...drawing, i2: barIdx, p2: price });
        drawing = null;
      }
      api.requestRedraw();
    }));

    unsubs.push(api.on('mousemove', ({ barIdx, price }) => {
      if (!active || !drawing) return;
      drawing.i2 = barIdx;
      drawing.p2 = price;
      api.requestRedraw();
    }));

    unsubs.push(api.on('contextmenu', ({ original }) => {
      if (active) original.preventDefault();
    }));

    // ── Render ───────────────────────────────────────────────────────────────

    function render({ xOf, yOf }) {
      const ctx = api.ctx;

      lines.forEach(l => {
        _drawSegment(
          ctx,
          xOf(l.i1), yOf(l.p1),
          xOf(l.i2), yOf(l.p2),
          l.color, l.width, false,
        );
      });

      if (drawing) {
        _drawSegment(
          ctx,
          xOf(drawing.i1), yOf(drawing.p1),
          xOf(drawing.i2), yOf(drawing.p2),
          drawing.color, drawing.width, true,
        );
      }
    }

    // ── Public handle extensions ──────────────────────────────────────────────

    return {
      render,

      destroy() {
        unsubs.forEach(fn => fn());
        lines.length = 0;
        drawing = null;
      },

      activate() {
        active  = true;
        drawing = null;
        api.claimPointer(true);
        api.requestRedraw();
      },

      deactivate() {
        if (drawing) { lines.push(drawing); drawing = null; }
        active = false;
        api.claimPointer(false);
        api.requestRedraw();
      },

      isActive()   { return active; },

      undo() {
        if (drawing) { drawing = null; }
        else         { lines.pop(); }
        api.requestRedraw();
      },

      clear() {
        lines.length = 0;
        drawing = null;
        api.requestRedraw();
      },

      setColor(c) { color = c; },
      setWidth(w) { width = w; },
      getColor()  { return color; },
      getWidth()  { return width; },

      getDrawings() {
        return lines.map(l => ({ ...l }));
      },

      setDrawings(arr) {
        lines.length = 0;
        lines.push(...arr.map(l => ({
          i1    : l.i1,
          p1    : l.p1,
          i2    : l.i2,
          p2    : l.p2,
          color : l.color ?? '#e8c842',
          width : l.width ?? 1.5,
        })));
        api.requestRedraw();
      },
    };
  },
};