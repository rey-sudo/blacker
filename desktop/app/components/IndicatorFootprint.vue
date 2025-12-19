<template>
  <div class="footprint-wrapper">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
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
   Types
========================== */

interface FootprintLevel {
  price: number;
  bid: number;
  ask: number;
}

interface FootprintCandle {
  high: number;
  low: number;
  tickSize: number;
  levels: FootprintLevel[];
}

/* ==========================
   State
========================== */

const candle = shallowRef<FootprintCandle | null>(null);

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

    // Clonado defensivo (evita bugs de referencia)
    candle.value = {
      ...data,
      levels: data.levels.map((l: any) => ({ ...l })),
    };
  } finally {
    isFetching = false;
  }
}

/* ==========================
   Canvas config
========================== */

const canvas = ref<HTMLCanvasElement | null>(null);

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

  el.style.width = `${WIDTH}px`;
  el.style.height = `${canvasHeight.value}px`;

  const ctx = el.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ==========================
   Drawing
========================== */

function draw() {
  const canvasEl = canvas.value;
  const candleData = candle.value;

  if (!canvasEl || !candleData) return;

  const ctx = canvasEl.getContext("2d");
  if (ctx === null) return;

  const levels = candleData.levels;
  if (!levels.length) return;

  ctx.clearRect(0, 0, WIDTH, canvasHeight.value);

  const centerX = Math.round(WIDTH / 2) + 0.5;

  /* ==========================
     VOLUMEN / DELTA
  ========================== */

  const totals = levels.map((l) => l.bid + l.ask);
  const deltas = levels.map((l) => l.ask - l.bid);

  const maxVol = Math.max(...levels.map((l) => Math.max(l.bid, l.ask)));
  const totalVolume = totals.reduce((a, b) => a + b, 0);

  /* ==========================
     POC
  ========================== */

  const maxTotal = totals.length ? Math.max(...totals) : 0;
  const pocIndex = totals.length ? totals.indexOf(maxTotal) : 0;
  const pocY = pocIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5;

  /* ==========================
     VALUE AREA
  ========================== */

  let vaVolume = totals[pocIndex] ?? 0;
  let vah = pocIndex;
  let val = pocIndex;

  while (vaVolume < totalVolume * 0.7) {
    const up = totals[vah + 1] ?? 0;
    const down = totals[val - 1] ?? 0;

    if (up >= down) {
      vah++;
      vaVolume += up;
    } else {
      val--;
      vaVolume += down;
    }
  }

  /* ==========================
     DELTA POC
  ========================== */

  const maxDeltaAbs = Math.max(...deltas.map((d) => Math.abs(d)));
  const deltaPocIndex = deltas.map((d) => Math.abs(d)).indexOf(maxDeltaAbs);

  /* ==========================
     HELPERS (ctx seguro)
  ========================== */

  const hLine = (y: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  };

  /* ==========================
     LÍNEAS
  ========================== */

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvasHeight.value);
  ctx.stroke();

  hLine(pocY, "#eab308");
  hLine(vah * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5, "#22c55e");
  hLine(val * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5, "#22c55e");
  hLine(deltaPocIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5, "#38bdf8");

  /* ==========================
     LEVELS
  ========================== */

  let stackedAsk = 0;
  let stackedBid = 0;

  levels.forEach((level, i) => {
    const y = i * ROW_HEIGHT;
    const delta = level.ask - level.bid;

    const bidWidth = maxVol ? (level.bid / maxVol) * (centerX - 30) : 0;
    const askWidth = maxVol ? (level.ask / maxVol) * (centerX - 30) : 0;

    const askImbalance = level.ask >= level.bid * 3;
    const bidImbalance = level.bid >= level.ask * 3;

    stackedAsk = askImbalance ? stackedAsk + 1 : 0;
    stackedBid = bidImbalance ? stackedBid + 1 : 0;

    if (level.bid > 0) {
      ctx.fillStyle = bidImbalance ? "#991b1b" : "#7f1d1d";
      ctx.fillRect(centerX - bidWidth, y + 1, bidWidth, ROW_HEIGHT - 2);
    }

    if (level.ask > 0) {
      ctx.fillStyle = askImbalance ? "#166534" : "#14532d";
      ctx.fillRect(centerX, y + 1, askWidth, ROW_HEIGHT - 2);
    }

    if (stackedAsk >= 3) {
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(WIDTH - 6, y + 2, 4, ROW_HEIGHT - 4);
    }

    if (stackedBid >= 3) {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(2, y + 2, 4, ROW_HEIGHT - 4);
    }

    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle =
      Math.abs(delta) === maxDeltaAbs
        ? "#38bdf8"
        : delta > 0
        ? "#4ade80"
        : delta < 0
        ? "#f87171"
        : "#e5e7eb";

    ctx.fillText(
      `${level.bid.toFixed(0)} | ${level.ask.toFixed(0)}`,
      centerX,
      y + ROW_HEIGHT / 2
    );

    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(level.price.toFixed(2), WIDTH - 8, y + ROW_HEIGHT / 2);
  });
}

/* ==========================
   Lifecycle
========================== */

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await loadFootprint();
  await nextTick();
  setupCanvas();
  draw();

  refreshTimer = setInterval(loadFootprint, 30_000);
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
}

canvas {
  display: block;
}
</style>
