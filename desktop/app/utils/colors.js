
export const colors = {

  aqua: "#00BCD4",       // color.aqua :contentReference[oaicite:1]{index=1}
  black: "#363A45",      // color.black :contentReference[oaicite:2]{index=2}
  blue: "#2196F3",       // color.blue :contentReference[oaicite:3]{index=3}
  fuchsia: "#E040FB",    // color.fuchsia :contentReference[oaicite:4]{index=4}
  gray: "#787B86",       // color.gray :contentReference[oaicite:5]{index=5}
  green: "#4CAF50",      // color.green :contentReference[oaicite:6]{index=6}
  lime: "#00E676",       // color.lime :contentReference[oaicite:7]{index=7}
  maroon: "#880E4F",     // color.maroon :contentReference[oaicite:8]{index=8}
  navy: "#311B92",       // color.navy :contentReference[oaicite:9]{index=9}
  olive: "#808000",      // color.olive :contentReference[oaicite:10]{index=10}
  orange: "#FF9800",     // color.orange :contentReference[oaicite:11]{index=11}
  purple: "#9C27B0",     // color.purple :contentReference[oaicite:12]{index=12}
  red: "#FF5252",        // color.red :contentReference[oaicite:13]{index=13}
  silver: "#B2B5BE",     // color.silver :contentReference[oaicite:14]{index=14}
  teal: "#00897B",       // color.teal :contentReference[oaicite:15]{index=15}
  white: "#FFFFFF",      // color.white :contentReference[oaicite:16]{index=16}
  yellow: "#FFEB3B",     // color.yellow :contentReference[oaicite:17]{index=17}


  background: {
    dark: "#363A45",        // fondo principal del chart → reuse de black
    panel: "#787B86",       // color gris para paneles o separadores
    highlight: "#2196F3",   // azul para resaltar zona o background de tooltip
  },

  candle: {
    up: "#4CAF50",          // vela alcista → same as green
    down: "#FF5252",        // vela bajista → same as red
    neutral: "#FFEB3B",     // vela neutral, por ejemplo para “doji”
    border: "#787B86",      // borde de vela (gris)
  },

  volume: {
    up: "#00E676",          // volumen alcista → lime
    down: "#E040FB",        // volumen bajista usando fuchsia para contraste
    neutral: "#B2B5BE",     // volumen neutro → silver
  },

  indicators: {
    sma: "#FF9800",         // media simple → orange
    ema: "#2196F3",         // media exponencial → blue
    macdLine: "#9C27B0",    // MACD → purple
    macdSignal: "#00897B",  // MACD señal → teal
    rsi: "#00BCD4",         // RSI → aqua
    bbUpper: "#E040FB",     // Banda superior de Bollinger → fuchsia
    bbLower: "#880E4F",     // Banda inferior → maroon
    atr: "#808000",         // ATR → olive

  },

  alerts: {
    buy: "#00E676",         // señal de compra → lime
    sell: "#FF5252",        // señal de venta → red
    warning: "#FFEB3B",     // alerta neutral o advertencia → yellow
    info: "#2196F3",        // información / dato → blue
  },

  text: {
    primary: "#FFFFFF",     // texto principal → white
    secondary: "#B2B5BE",   // texto secundario → silver
    highlight: "#FFEB3B",   // texto resaltado → yellow
  },

  grid: {
    lines: "rgba(255,255,255,0.1)",       // líneas de la grilla → gray
    axis: "rgba(255,255,255,0.1)",        // ejes → black (oscuro)
  },

  crosshair: "#FFEB3B",     // color del crosshair → amarillo para alta visibilidad
};


