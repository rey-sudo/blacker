# Capas y Flujo de Render

## Stack de capas (z-order)

Todos los canvas viven dentro de `#pane-main` con `position: absolute`.
El orden en el DOM define el z-order — el último en el source queda encima.

```
z=4  overlay-main        pointer-events: none
z=3  canvas-pricescale   position: absolute; right: 0; width: 72px
z=2  canvas-drawings     pointer-events: none
z=1  canvas-main         base — fondo, grid, velas, series
──────────────────────────────────────────────────────
     canvas-time         contenedor separado (#time-axis), no apilado
```

### Por qué este orden

- `canvas-main` es el más costoso. Vive en el fondo para que nada lo tape
  accidentalmente.
- `canvas-drawings` va encima de los datos para que los drawings se vean
  sobre las velas — pero debajo del precio scale y el overlay.
- `canvas-pricescale` se superpone sobre el borde derecho de `canvas-main`
  usando `right: 0`. Tapa cualquier vela o series que lleguen al borde.
- `overlay-main` va arriba de todo y tiene `pointer-events: none` para que
  los eventos del mouse pasen a través hasta `canvas-main`.
- `canvas-time` vive en `#time-axis`, un elemento hermano de `#pane-main`
  en el flex column — no comparte z-order con los anteriores.

---

## El RAF loop

El engine corre `requestAnimationFrame` a 60fps pero solo redibuja cuando
un flag está levantado. Si ningún estado cambia, ningún canvas se toca.

```
requestAnimationFrame(loop)
  │
  ├─ if dirty          → _render()              → canvas-main
  │                                                canvas-pricescale
  │                                                canvas-time
  │   (dirty también activa drawingsDirty y overlayDirty)
  │
  ├─ if drawingsDirty  → _renderDrawingModules() → canvas-drawings
  │
  └─ if overlayDirty   → _renderOverlay()        → overlay-main
```

### Qué activa cada flag

| Flag            | Lo activa                                          |
|-----------------|----------------------------------------------------|
| `dirty`         | `load()`, pan, zoom, scroll, `update()`, resize    |
| `drawingsDirty` | `dirty`, `api.requestRedraw()` desde un módulo     |
| `overlayDirty`  | `dirty`, `mousemove`, `mouseleave`                 |

### La regla de cascada

Cuando `dirty` se activa, fuerza los otros dos:

```js
if (this.dirty) {
  this._render();
  this.dirty         = false;
  this.drawingsDirty = true;   // ← forzado
  this.overlayDirty  = true;   // ← forzado
}
```

Los datos cambiaron → los drawing modules necesitan recalcular coordenadas
→ el overlay necesita redibujar la live dash y el crosshair con el nuevo
precio range. Pero `overlayDirty` puede activarse solo (en `mousemove`)
sin tocar datos — el crosshair es prácticamente gratuito.

---

## Qué dibuja cada método

### `_render()` — triggered by `dirty`

Llama tres sub-métodos en secuencia:

```
_renderMain(lo, hi)
  ├─ clearRect — limpia canvas-main completo
  ├─ fillRect  — fondo bg
  ├─ _drawGrid — líneas de precio (horizontales) y tiempo (verticales)
  ├─ series con layer:'background'  — BB fill, area fills
  ├─ _drawArea / _drawCandlesticks / _drawLine — datos OHLCV
  └─ series con layer:'foreground'  — MA, EMA, líneas sobre velas

_renderPriceScale(lo, hi)
  ├─ clearRect — limpia canvas-pricescale
  ├─ fillRect  — fondo bg2
  ├─ línea separadora izquierda (0.5px)
  ├─ labels de precio en cada grid step
  └─ tag del último close (estático, color bull/bear)

_renderTimeAxis()
  ├─ clearRect — limpia canvas-time
  ├─ fillRect  — fondo bg2
  └─ date labels en cada grid line visible
```

### `_renderDrawingModules()` — triggered by `drawingsDirty`

```
clearRect — limpia canvas-drawings completo

for each handle in _drawingModules:
  ctxDrawings.save()
  handle._render({ lo, hi, xOf, yOf, indexAtX, priceAtY })
  ctxDrawings.restore()
```

Las funciones de conversión (`xOf`, `yOf`) se recalculan en cada llamada
usando el viewport actual — nunca son stale.

### `_renderOverlay()` — triggered by `overlayDirty`

```
clearRect — limpia overlay-main completo

if liveMode:
  _drawLivePulse — línea dash horizontal al precio del último close
                 + price tag en el scale

if mouse.inside && data[barIdx] existe:
  ├─ línea vertical del crosshair (snapX)
  ├─ línea horizontal (localY) + price tag del crosshair
  ├─ dot en el close de la barra bajo cursor
  ├─ _drawTimeTag — tag de fecha en canvas-time
  └─ _updateOHLCDisplay — actualiza el div OHLC en el DOM
```

---

## Coordenadas

Todos los dibujos usan coordenadas lógicas, no píxeles:

```
barIndex  →  _xOf(i)          →  píxel X en canvas
price     →  _yOf(p, pane, lo, hi)  →  píxel Y en canvas
píxel X   →  _indexAtX(x)     →  barIndex
píxel Y   →  priceAtY(y)      →  price
```

El viewport (`viewStart`, `viewEnd`, `barWidth`) es el único estado que
cambia en pan/zoom. Las conversiones lo leen en tiempo real — no hay
coordenadas cacheadas que se desincronicen.

---

## Drawing modules API

Un drawing module recibe un objeto `api` en su `mount()` y devuelve
`{ render, destroy }`.

```js
const MyModule = {
  id: 'my-module',
  mount(api) {
    const unsubs = [];

    // suscribirse a eventos normalizados
    unsubs.push(api.on('mousedown', ({ barIdx, price }) => { ... }));
    unsubs.push(api.on('mousemove', ({ barIdx, price }) => { ... }));
    unsubs.push(api.on('mouseup',   ({ barIdx, price }) => { ... }));

    // pedir redraw cuando el estado interno cambia
    api.requestRedraw();

    return {
      render({ xOf, yOf, lo, hi }) {
        const ctx = api.ctx;
        // dibujar en canvas-drawings con coordenadas frescas
        ctx.beginPath();
        ctx.moveTo(xOf(i1), yOf(p1));
        ctx.lineTo(xOf(i2), yOf(p2));
        ctx.stroke();
      },
      destroy() {
        unsubs.forEach(fn => fn());
      }
    };
  }
};

// registrar
const handle = chart.addDrawingModule(MyModule);

// desmontar
handle.destroy();
```

El engine llama a `render()` cada vez que `drawingsDirty` está activo —
que incluye cualquier pan o zoom. Las coordenadas en `xOf`/`yOf` son
siempre las del frame actual, así los drawings se mueven en sincronía
con las velas sin ningún código extra en el módulo.

---

## Resumen de responsabilidades por canvas

| Canvas               | Responsabilidad                        | Flag            |
|----------------------|----------------------------------------|-----------------|
| `canvas-main`        | Datos: grid, velas, series             | `dirty`         |
| `canvas-drawings`    | Drawing modules (API externa)          | `drawingsDirty` |
| `canvas-pricescale`  | Eje Y: labels, last-close tag          | `dirty`         |
| `overlay-main`       | Crosshair, live dash, OHLC bar         | `overlayDirty`  |
| `canvas-time`        | Eje X: date labels, cursor tag         | `dirty`         |