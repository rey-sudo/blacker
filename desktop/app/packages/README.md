┌─────────────────────────────────────────────────────┐
│  pane-main  (position: relative)                    │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  overlay-main        z: 3  pointer-events:none│  │  ← crosshair
│  │  · crosshair X + Y                            │  │     live dash
│  │  · live price dash                            │  │     OHLC bar
│  │  · price tag (cursor)                         │  │
│  ├───────────────────────────────────────────────┤  │
│  │  canvas-drawings     z: 2  pointer-events:none│  │  ← drawing modules
│  │  · PencilModule                               │  │     HLineModule
│  │  · HLineModule                                │  │     TrendLineModule
│  │  · TrendLineModule                            │  │     RectModule
│  │  · RectModule                                 │  │     (cualquier módulo)
│  │  · cualquier módulo futuro                    │  │
│  ├───────────────────────────────────────────────┤  │
│  │  canvas-main         z: 1                     │  │  ← datos
│  │  · background fill                            │  │     series
│  │  · grid                                       │  │     velas
│  │  · series background  (BB fill, area)         │  │
│  │  · candlesticks / line / area                 │  │
│  │  · series foreground  (MA, EMA…)              │  │
│  │  · price scale border                         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

  canvas-time  (time-axis, posición separada)
  · labels de fecha
  · time tag del crosshair


Redraw triggers
───────────────
dirty          → canvas-main    + drawingsDirty + overlayDirty
drawingsDirty  → canvas-drawings
overlayDirty   → overlay-main

mousemove      → overlayDirty = true          (crosshair, O(1))
pan / zoom     → dirty = true                 (todo se repinta)
api.requestRedraw() → drawingsDirty = true    (solo drawings)


PencilModule.mount(api)
  → captura eventos vía api.on()
  → guarda puntos como { i, p } — coordenadas lógicas
  → llama api.requestRedraw() en cada mousemove

RAF loop
  → drawingsDirty = true
  → _renderDrawingModules()
      → clearRect en canvas-drawings
      → handle._render({ xOf, yOf })  ← coords frescas del viewport actual
      → bezier sobre los puntos recalculados

Pan / zoom
  → dirty = true → drawingsDirty = true
  → mismo render, mismos puntos lógicos
  → xOf(i) devuelve el píxel nuevo → el trazo se mueve solo