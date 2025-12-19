<template>
  <div class="footprint-wrapper">
    <div class="context-box">
      {{ contextText }}
    </div>
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

/* ==========================
   Composable
========================== */

const { fetchFootprint } = useFootprint();

const symbol = ref("BTCUSDT");
const market = ref("crypto");
const interval = ref("15m");

/* ==========================
   State
========================== */

const candle = shallowRef(null);
const contextText = ref("");

/* ==========================
   Fetch
========================== */

let isFetching = false;

async function loadFootprint() {
  if (isFetching) return;
  isFetching = true;

  try {
    const data = await fetchFootprint({
      symbol: symbol.value,
      market: market.value,
      interval: interval.value,
    });

    candle.value = {
      ...data,
      levels: data.levels.map(l => ({ ...l })),
    };
  } finally {
    isFetching = false;
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

  const levels = candle.value.levels;
  if (!levels.length) return;

  ctx.clearRect(0, 0, WIDTH, canvasHeight.value);

  const centerX = Math.floor(WIDTH / 2) + 0.5;

  /* ==========================
     Volume POC
  ========================== */

  let volPocIndex = 0;
  let maxVol = 0;

  levels.forEach((l, i) => {
    const total = l.bid + l.ask;
    if (total > maxVol) {
      maxVol = total;
      volPocIndex = i;
    }
  });

  /* ==========================
     Delta POC
  ========================== */

  let deltaPocIndex = 0;
  let maxDeltaAbs = 0;

  levels.forEach((l, i) => {
    const abs = Math.abs(l.ask - l.bid);
    if (abs > maxDeltaAbs) {
      maxDeltaAbs = abs;
      deltaPocIndex = i;
    }
  });

  /* ==========================
     Value Area 70%
  ========================== */

  const totals = levels.map(l => l.bid + l.ask);
  const totalVolume = totals.reduce((a, b) => a + b, 0);
  const targetVolume = totalVolume * 0.7;

  let cumVol = totals[volPocIndex];
  let vah = volPocIndex;
  let val = volPocIndex;

  while (cumVol < targetVolume) {
    const up = vah + 1 < totals.length ? totals[vah + 1] : 0;
    const down = val - 1 >= 0 ? totals[val - 1] : 0;

    if (up >= down && vah + 1 < totals.length) {
      vah++;
      cumVol += up;
    } else if (val - 1 >= 0) {
      val--;
      cumVol += down;
    } else {
      break;
    }
  }

  /* ==========================
     Context interpretation
  ========================== */

  if (volPocIndex === deltaPocIndex) {
    contextText.value =
      "Alta convicción institucional (volumen y delta alineados)";
  } else if (deltaPocIndex < val || deltaPocIndex > vah) {
    contextText.value =
      "Agresión fuera del valor → posible fake o absorción";
  } else {
    contextText.value =
      "Mercado balanceado / rotación interna";
  }

  /* ==========================
     Lines
  ========================== */

  // Vertical center
  ctx.strokeStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvasHeight.value);
  ctx.stroke();

  // Volume POC
  const pocY = volPocIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5;
  ctx.strokeStyle = "#eab308";
  ctx.beginPath();
  ctx.moveTo(0, pocY);
  ctx.lineTo(WIDTH, pocY);
  ctx.stroke();

  // Delta POC
  const deltaY = deltaPocIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5;
  ctx.strokeStyle = "#38bdf8";
  ctx.beginPath();
  ctx.moveTo(0, deltaY);
  ctx.lineTo(WIDTH, deltaY);
  ctx.stroke();

  /* ==========================
     Levels
  ========================== */

  const maxSideVol = Math.max(...levels.map(l => Math.max(l.bid, l.ask)));

  levels.forEach((level, i) => {
    const y = i * ROW_HEIGHT;

    const bidWidth = maxSideVol
      ? (level.bid / maxSideVol) * (centerX - 30)
      : 0;
    const askWidth = maxSideVol
      ? (level.ask / maxSideVol) * (centerX - 30)
      : 0;

    if (level.bid > 0) {
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(centerX - bidWidth, y + 1, bidWidth, ROW_HEIGHT - 2);
    }

    if (level.ask > 0) {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(centerX, y + 1, askWidth, ROW_HEIGHT - 2);
    }

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${level.bid.toFixed(0)} | ${level.ask.toFixed(0)}`,
      centerX,
      y + ROW_HEIGHT / 2
    );

    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(level.price.toFixed(2), WIDTH - 4, y + ROW_HEIGHT / 2);
  });
}

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
