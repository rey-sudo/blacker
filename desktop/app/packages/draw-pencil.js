'use strict';

 const PencilModule = {
  id: 'pencil',
 
  mount(api) {
    const strokes = [];   // committed: [{ points:[{i,p},...], color, width }]
    let active    = false;
    let current   = null; // stroke being drawn right now
    let color     = '#e8c842';
    let lineWidth = 1.5;
    const unsubs  = [];
 
    // ── Event handlers ──────────────────────────────────────────────────────
 
    unsubs.push(api.on('mousedown', ({ barIdx, price, button }) => {
      if (!active) return;
      if (button === 2) {
        strokes.pop();
        api.requestRedraw();
        return;
      }
      if (button !== 0) return;
      current = { points: [{ i: barIdx, p: price }], color, width: lineWidth };
      api.requestRedraw();
    }));
 
    unsubs.push(api.on('mousemove', ({ barIdx, price }) => {
      if (!active || !current) return;
      const last = current.points[current.points.length - 1];
      // Skip duplicate points — saves memory on fast moves
      if (last.i === barIdx && Math.abs(last.p - price) < 0.0001) return;
      current.points.push({ i: barIdx, p: price });
      api.requestRedraw();
    }));
 
    unsubs.push(api.on('mouseup', () => {
      if (!active || !current) return;
      // Only commit strokes with more than 1 point
      if (current.points.length > 1) strokes.push(current);
      current = null;
      api.requestRedraw();
    }));
 
    unsubs.push(api.on('mouseleave', () => {
      if (!active || !current) return;
      // Commit partial stroke on leave so it isn't lost
      if (current.points.length > 1) strokes.push(current);
      current = null;
      api.requestRedraw();
    }));
 
    unsubs.push(api.on('contextmenu', ({ original }) => {
      if (active) original.preventDefault();
    }));
 
    // ── Render ──────────────────────────────────────────────────────────────
 
    function _drawStroke(ctx, stroke, xOf, yOf, preview = false) {
      const pts = stroke.points;
      if (pts.length < 2) return;
 
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth   = preview ? stroke.width * 0.7 : stroke.width;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.globalAlpha = preview ? 0.5 : 1;
 
      ctx.beginPath();
      ctx.moveTo(xOf(pts[0].i), yOf(pts[0].p));
      for (let k = 1; k < pts.length; k++) {
        // Smooth with quadratic bezier between midpoints for a natural feel
        const prev = pts[k - 1];
        const curr = pts[k];
        const mx   = (xOf(prev.i) + xOf(curr.i)) / 2;
        const my   = (yOf(prev.p) + yOf(curr.p)) / 2;
        ctx.quadraticCurveTo(xOf(prev.i), yOf(prev.p), mx, my);
      }
      // Last segment straight to the final point
      ctx.lineTo(xOf(pts[pts.length - 1].i), yOf(pts[pts.length - 1].p));
      ctx.stroke();
      ctx.restore();
    }
 
    function render({ xOf, yOf }) {
      const ctx = api.ctx;
      strokes.forEach(s => _drawStroke(ctx, s, xOf, yOf, false));
      if (current) _drawStroke(ctx, current, xOf, yOf, true);
    }
 
    // ── Public handle extensions ─────────────────────────────────────────────
 
    return {
      render,
 
      destroy() {
        unsubs.forEach(fn => fn());
        strokes.length = 0;
        current = null;
      },
 
      activate() {
        active  = true;
        current = null;
        api.claimPointer(true);
        api.requestRedraw();
      },
 
      deactivate() {
        if (current && current.points.length > 1) strokes.push(current);
        current = null;
        active  = false;
        api.claimPointer(false);
        api.requestRedraw();
      },
 
      isActive() { return active; },
 
      undo() {
        if (current) { current = null; }
        else         { strokes.pop(); }
        api.requestRedraw();
      },
 
      clear() {
        strokes.length = 0;
        current = null;
        api.requestRedraw();
      },
 
      setColor(c)  { color = c; },
      setWidth(w)  { lineWidth = w; },
      getColor()   { return color; },
      getWidth()   { return lineWidth; },
 
      getDrawings() {
        return strokes.map(s => ({
          points : s.points.map(pt => ({ ...pt })),
          color  : s.color,
          width  : s.width,
        }));
      },
 
      setDrawings(arr) {
        strokes.length = 0;
        strokes.push(...arr.map(s => ({
          points : s.points.map(pt => ({ ...pt })),
          color  : s.color  ?? '#e8c842',
          width  : s.width  ?? 1.5,
        })));
        api.requestRedraw();
      },
    };
  },
};
 