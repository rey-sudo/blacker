<template>
  <div class="footprint-wrapper">
    <div class="context-box">{{ contextText }} {{ ago }}</div>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import {
  ref,
  shallowRef,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import { useFootprint } from "~/composable/get-footprint";
import { formatDistanceToNow } from "date-fns";

/* ==========================
   Composable
========================== */

const { fetchFootprint } = useFootprint();

const symbol = ref("USDJPY");
const market = ref("forex");
const source = ref("dukascopy");
const interval = ref("15m");

/* ==========================
   State
========================== */

const candle = shallowRef(null);
const contextText = ref("");

/* ==========================
   Fetch
========================== */

const isFetching = ref(false);
const lastFetchTime = ref(new Date());

const ago = computed(() =>
  formatDistanceToNow(lastFetchTime.value, { addSuffix: true })
);

async function loadFootprint() {
  if (isFetching.value) return;
  isFetching.value = true;

  try {
    const data = await fetchFootprint({
      symbol: symbol.value,
      market: market.value,
      interval: interval.value,
      source: source.value,
    });

    candle.value = {
      ...data,
      levels: data.levels.map((l) => ({ ...l })),
    };

    lastFetchTime.value = new Date();
  } finally {
    isFetching.value = false;
  }
}

/* ==========================
   Canvas config
========================== */

const canvas = ref(null);

const WIDTH = 500;
const ROW_HEIGHT = 15;

const canvasHeight = computed(() =>
  candle.value ? candle.value.levels.length * ROW_HEIGHT : 0
);

function setupCanvas() {
  if (!canvas.value) return;

  const dpr = window.devicePixelRatio || 1;
  const el = canvas.value;

  el.width = WIDTH * dpr;
  el.height = canvasHeight.value * dpr;

  el.style.width = WIDTH + "px";
  el.style.height = canvasHeight.value + "px";

  const ctx = el.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ==========================
   Drawing
========================== */

function draw() {
  if (!canvas.value || !candle.value) return;

  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;

  const levels = [...candle.value.levels].sort((a, b) => b.price - a.price);
  if (!levels.length) return;

  ctx.clearRect(0, 0, WIDTH, canvasHeight.value);
  const centerX = Math.floor(WIDTH / 2) + 0.5;

  /* ==========================
     1. CÁLCULOS PREVIOS
  ========================== */
  let volPocIndex = 0;
  let maxVol = 0;
  let totalBidVolume = 0;
  let totalAskVolume = 0;

  const totals = levels.map((l, i) => {
    const total = l.bid + l.ask;
    totalBidVolume += l.bid;
    totalAskVolume += l.ask;
    if (total > maxVol) {
      maxVol = total;
      volPocIndex = i;
    }
    return total;
  });

  const totalVolume = totals.reduce((a, b) => a + b, 0);
  const netDelta = totalAskVolume - totalBidVolume; // Delta Neto

  // Cálculo de Value Area (VA)
  const targetVolume = totalVolume * 0.7;
  let cumVol = totals[volPocIndex],
    vah = volPocIndex,
    val = volPocIndex;
  while (cumVol < targetVolume) {
    const up = vah + 1 < totals.length ? totals[vah + 1] : 0;
    const down = val - 1 >= 0 ? totals[val - 1] : 0;
    if (up >= down && vah + 1 < totals.length) {
      vah++;
      cumVol += up;
    } else if (val - 1 >= 0) {
      val--;
      cumVol += down;
    } else break;
  }

  /* ==========================
     2. BARRA DE DELTA (AL PRINCIPIO/ARRIBA)
  ========================== */
  const barHeight = 12;
  const barMargin = 30;
  const barY = 25; // Posición superior
  const barWidth = WIDTH - barMargin * 2;

  const totalTrades = totalBidVolume + totalAskVolume;
  if (totalTrades > 0) {
    const bidPct = (totalBidVolume / totalTrades) * 100;
    const askPct = (totalAskVolume / totalTrades) * 100;
    const bidBarWidth = barWidth * (bidPct / 100);

    // Fondo y Barras
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(barMargin, barY, barWidth, barHeight);
    ctx.fillStyle = "#ef4444"; // Bid
    ctx.fillRect(barMargin, barY, bidBarWidth, barHeight);
    ctx.fillStyle = "#22c55e"; // Ask
    ctx.fillRect(
      barMargin + bidBarWidth,
      barY,
      barWidth - bidBarWidth,
      barHeight
    );

    // Texto Porcentajes
    ctx.font = "bold 10px monospace";
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillStyle = "#f87171";
    ctx.fillText(`${bidPct.toFixed(1)}%`, barMargin, barY - 4);

    ctx.textAlign = "right";
    ctx.fillStyle = "#4ade80";
    ctx.fillText(`${askPct.toFixed(1)}%`, barMargin + barWidth, barY - 4);

    // DELTA NETO (En el centro)
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    const deltaSign = netDelta > 0 ? "+" : "";
    ctx.fillText(
      `DELTA: ${deltaSign}${netDelta}`,
      barMargin + barWidth / 2,
      barY - 4
    );

    // Línea de equilibrio (50%)
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(barMargin + barWidth / 2, barY - 2);
    ctx.lineTo(barMargin + barWidth / 2, barY + barHeight + 2);
    ctx.stroke();
  }

  /* ==========================
     3. DIBUJO DE NIVELES (OFFSET HACIA ABAJO)
  ========================== */
  // Añadimos un pequeño margen superior para que la barra no tape el primer nivel
  const topOffset = 50;

  // Capa 1: Fondos
  const maxSideVol = Math.max(...levels.map((l) => Math.max(l.bid, l.ask)));
  levels.forEach((level, i) => {
    const y = i * ROW_HEIGHT + topOffset;
    const bidWidth = maxSideVol ? (level.bid / maxSideVol) * (centerX - 40) : 0;
    const askWidth = maxSideVol ? (level.ask / maxSideVol) * (centerX - 40) : 0;

    if (level.bid > 0) {
      ctx.fillStyle = "#450a0a";
      ctx.fillRect(centerX - bidWidth, y + 1, bidWidth, ROW_HEIGHT - 2);
    }
    if (level.ask > 0) {
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(centerX, y + 1, askWidth, ROW_HEIGHT - 2);
    }
  });

  // Capa 2: Eje Central y POC
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, topOffset);
  ctx.lineTo(centerX, canvasHeight.value + topOffset);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeRect(
    2,
    volPocIndex * ROW_HEIGHT + topOffset,
    WIDTH - 4,
    ROW_HEIGHT
  );

  // Capa 3: Números
  levels.forEach((level, i) => {
    const y = i * ROW_HEIGHT + topOffset;
    const centerYPos = y + ROW_HEIGHT / 2;
    const isBullish = level.ask > level.bid * 3 && level.ask > 10;
    const isBearish = level.bid > level.ask * 3 && level.bid > 10;

    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = isBearish ? "bold 12px monospace" : "11px monospace";
    ctx.fillStyle = isBearish ? "#f87171" : "#cbd5e1";
    ctx.fillText(level.bid.toFixed(0), centerX - 12, centerYPos);

    ctx.textAlign = "left";
    ctx.font = isBullish ? "bold 12px monospace" : "11px monospace";
    ctx.fillStyle = isBullish ? "#4ade80" : "#cbd5e1";
    ctx.fillText(level.ask.toFixed(0), centerX + 12, centerYPos);

    ctx.textAlign = "right";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.fillText(level.price.toFixed(2), WIDTH - 5, centerYPos);
  });

  contextText.value = getTradingSignal(
    levels,
    volPocIndex,
    vah,
    val,
    totalVolume
  );
}

/* ==========================
   Logic: Intelligent Signal
========================== */

function getTradingSignal(levels, volPocIndex, vah, val, totalVolume) {
  const totalBid = levels.reduce((acc, l) => acc + l.bid, 0);
  const totalAsk = levels.reduce((acc, l) => acc + l.ask, 0);
  const cumulativeDelta = totalAsk - totalBid;

  // 1. Detectar Imbalances agresivos (donde Ask > Bid * 3 o viceversa)
  let bullishImbalances = 0;
  let bearishImbalances = 0;
  levels.forEach((l) => {
    if (l.ask > l.bid * 3 && l.ask > 10) bullishImbalances++;
    if (l.bid > l.ask * 3 && l.bid > 10) bearishImbalances++;
  });

  // 2. Ubicación del POC (¿Está en el extremo superior o inferior?)
  const isPocTop = volPocIndex > levels.length * 0.7; // Cerca del máximo
  const isPocBottom = volPocIndex < levels.length * 0.3; // Cerca del mínimo

  // 3. Lógica de Decisión
  // COMPRA: Delta positivo fuerte + Imbalances alcistas + POC soportando el precio abajo
  if (
    cumulativeDelta > totalVolume * 0.05 &&
    bullishImbalances > bearishImbalances
  ) {
    if (isPocBottom)
      return "🟢 COMPRA: Absorción de ventas y fuerte iniciativa compradora.";
    return "🌱 COMPRA LEVE: Iniciativa alcista en control.";
  }

  // VENTA: Delta negativo fuerte + Imbalances bajistas + POC presionando arriba
  if (
    cumulativeDelta < -totalVolume * 0.05 &&
    bearishImbalances > bullishImbalances
  ) {
    if (isPocTop)
      return "🔴 VENTA: Absorción de compras y fuerte presión vendedora.";
    return "📉 VENTA LEVE: Iniciativa bajista en control.";
  }

  // DIVERGENCIAS O NEUTRALIDAD
  if (Math.abs(cumulativeDelta) < totalVolume * 0.02) {
    return "⚖️ NEUTRAL: Mercado en equilibrio / Acumulación.";
  }

  return "⚠️ PRECAUCIÓN: Flujo de órdenes mixto o divergente.";
}

/* ==========================
   Dentro de la función draw()
========================== */

// ... (después de calcular VA y POC)

// ... (resto del dibujo)

/* ==========================
   Lifecycle
========================== */

let refreshTimer = null;

onMounted(async () => {
  await loadFootprint();
  await nextTick();
  setupCanvas();
  draw();
  refreshTimer = setInterval(loadFootprint, 60_000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

watch(candle, async () => {
  await nextTick();
  setupCanvas();
  draw();
});
</script>

<style scoped>
.footprint-wrapper {
  display: inline-block;
  background: #020617;
  border: 1px solid #1e293b;
  overflow: auto;
  height: 500px;
  font-family: monospace;
}

.context-box {
  padding: 6px 10px;
  font-size: 12px;
  color: #e5e7eb;
  border-bottom: 1px solid #1e293b;
  background: #020617;
}

canvas {
  display: block;
}
</style>
