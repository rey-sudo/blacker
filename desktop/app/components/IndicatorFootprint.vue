<template>
  <div class="footprint-wrapper">
    <canvas ref="canvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, reactive, computed } from "vue";
import { useFootprint } from "~/composable/get-footprint";

/* ==========================
   Composable
========================== */

const { fetchFootprint, fetchError } = useFootprint();

const symbol = ref("BTCUSDT");
const market = ref("crypto");
const interval = ref("15m");

/* ==========================
   Backend contracts
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
   Fake props (no tocar indicador)
========================== */

const props = reactive<{
  candle: FootprintCandle;
}>({
  candle: {
    high: 0,
    low: 0,
    tickSize: 0,
    levels: [],
  },
});

/* ==========================
   Fetch data
========================== */
let isFetching = false;

const loadFootprint = async () => {
  if (isFetching) return;
  isFetching = true;

  try {
    const data = await fetchFootprint({
      symbol: symbol.value,
      market: market.value,
      interval: interval.value,
    });

    props.candle = data;
  } finally {
    isFetching = false;
  }
};

await loadFootprint();

/* ==========================
   Canvas config
========================== */

const canvas = ref<HTMLCanvasElement | null>(null);

const width = 500;
const rowHeight = 10;

const height = computed(() => props.candle.levels.length * rowHeight);

/* ==========================
   Drawing logic (INTACTO)
========================== */

function draw() {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height.value);

  const levels = props.candle.levels;
  if (!levels || levels.length === 0) return;

  const maxVol = Math.max(...levels.map((l) => Math.max(l.bid, l.ask)));

  levels.forEach((level, i) => {
    const y = i * rowHeight;

    ctx.strokeStyle = "#1f2933";
    ctx.strokeRect(0, y, width, rowHeight);

    const bidWidth = maxVol ? (level.bid / maxVol) * (width / 2 - 30) : 0;
    const askWidth = maxVol ? (level.ask / maxVol) * (width / 2 - 30) : 0;

    if (level.bid > 0) {
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(width / 2 - bidWidth - 30, y + 1, bidWidth, rowHeight - 2);
    }

    if (level.ask > 0) {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(width / 2, y + 1, askWidth, rowHeight - 2);
    }

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      `${level.bid.toFixed(0)} | ${level.ask.toFixed(0)}`,
      width / 2,
      y + rowHeight / 2
    );

    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(level.price.toFixed(2), width - 4, y + rowHeight / 2);
  });
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  draw();

  refreshTimer = setInterval(() => {
    loadFootprint();
  }, 60_000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

watch(() => props.candle, draw, { deep: true });
</script>

<style scoped>
.footprint-wrapper {
  display: inline-block;
  background: #020617;
  border: 1px solid #1e293b;
  overflow: scroll;
  height: 500px;
}
canvas {
  display: block;
}
</style>
