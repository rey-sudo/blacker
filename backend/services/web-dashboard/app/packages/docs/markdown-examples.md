---
outline: deep
---

# Chart

This page demonstrates usage of some of the runtime APIs provided by VitePress.

## pane-main

In a financial charting library, a pane represents an independent visual container within a chart where different layers of data and UI elements are rendered. In this implementation, the main pane acts as a compositing layer that organizes multiple canvases, including the primary price chart, user drawings, price scale, and overlay elements, all sharing the same coordinate space but rendered separately to optimize performance and maintain modularity.

```html
<div class="pane" id="pane-main">
  <canvas class="chart-canvas" id="canvas-main"></canvas>
  <canvas class="drawings-canvas" id="canvas-drawings"></canvas>
  <canvas class="pricescale-canvas" id="canvas-pricescale"></canvas>
  <canvas class="overlay-canvas" id="canvas-overlay"></canvas>
</div>
```

### canvas-main

```html
<canvas class="chart-canvas" id="canvas-main"></canvas>
```
