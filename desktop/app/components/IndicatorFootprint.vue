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
  if (!canvas.value || !candle.value) return;
  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;

  const levels = candle.value.levels;
  if (!levels.length) return;

  ctx.clearRect(0, 0, WIDTH, canvasHeight.value);

  // Centro fijo, pixel-perfect
  const centerX = Math.floor(WIDTH / 2) + 0.5;

  // ==========================
  // POC (bid + ask)
  // ==========================
  let pocIndex = 0;
  let maxTotalVol = 0;

  levels.forEach((l, i) => {
    const total = l.bid + l.ask;
    if (total > maxTotalVol) {
      maxTotalVol = total;
      pocIndex = i;
    }
  });

  const pocY = pocIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 0.5;

  const maxVol = Math.max(...levels.map((l) => Math.max(l.bid, l.ask)));

  // ==========================
  // Línea vertical central (ÚNICA)
  // ==========================
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvasHeight.value);
  ctx.stroke();

  // ==========================
  // Línea horizontal POC
  // ==========================
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, pocY);
  ctx.lineTo(WIDTH, pocY);
  ctx.stroke();

  // ==========================
  // Levels
  // ==========================
  levels.forEach((level, i) => {
    const y = i * ROW_HEIGHT;

    const centerX = Math.round(WIDTH / 2) + 0.5;

    ctx.save();
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvasHeight.value);
    ctx.stroke();
    ctx.restore();

    const bidWidth = maxVol ? (level.bid / maxVol) * (centerX - 30) : 0;
    const askWidth = maxVol ? (level.ask / maxVol) * (centerX - 30) : 0;

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

let refreshTimer: ReturnType<typeof setInterval> | null = null;

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
}

canvas {
  display: block;
}
</style>
