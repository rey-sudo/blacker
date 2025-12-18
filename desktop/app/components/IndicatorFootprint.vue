<template>
  <div class="footprint-wrapper">
    <canvas ref="canvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from "vue";

/* ==========================
   Props (backend contract)
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
  levels: FootprintLevel[]; // ordered High -> Low
}

const props = defineProps<{
  candle: FootprintCandle;
}>();

/* ==========================
   Canvas config
========================== */

const canvas = ref<HTMLCanvasElement | null>(null);

const width = 500; // más ancho, menos alto visualmente // px
const rowHeight = 12; // px per price level (más compacto) // px per price level

const height = computed(() => props.candle.levels.length * rowHeight);

/* ==========================
   Drawing logic
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

    // Background grid
    ctx.strokeStyle = "#1f2933";
    ctx.strokeRect(0, y, width, rowHeight);

    // Normalize volumes
    const bidWidth = maxVol ? (level.bid / maxVol) * (width / 2 - 30) : 0;
    const askWidth = maxVol ? (level.ask / maxVol) * (width / 2 - 30) : 0;

    // BID (left)
    if (level.bid > 0) {
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(width / 2 - bidWidth - 30, y + 1, bidWidth, rowHeight - 2);
    }

    // ASK (right)
    if (level.ask > 0) {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(width / 2, y + 1, askWidth, rowHeight - 2);
    }

    // Vol text center
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      `${level.bid.toFixed(0)} | ${level.ask.toFixed(0)}`,
      width / 2,
      y + rowHeight / 2
    );

    // Price text (right)
    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(level.price.toFixed(2), width - 4, y + rowHeight / 2);
  });
  (level: any, i: any) => {
    const y = i * rowHeight;

    // Background grid
    ctx.strokeStyle = "#1f2933";
    ctx.strokeRect(0, y, width, rowHeight);

    // Normalize volumes
    const bidWidth = maxVol ? (level.bid / maxVol) * (width / 2) : 0;
    const askWidth = maxVol ? (level.ask / maxVol) * (width / 2) : 0;

    // BID (left)
    if (level.bid > 0) {
      ctx.fillStyle = "#7f1d1d"; // red
      ctx.fillRect(width / 2 - bidWidth, y + 1, bidWidth, rowHeight - 2);
    }

    // ASK (right)
    if (level.ask > 0) {
      ctx.fillStyle = "#14532d"; // green
      ctx.fillRect(width / 2, y + 1, askWidth, rowHeight - 2);
    }

    // Text
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      `${level.bid.toFixed(0)} | ${level.ask.toFixed(0)}`,
      width / 2,
      y + rowHeight / 2
    );
  };
}

onMounted(draw);
watch(() => props.candle, draw, { deep: true });
</script>

<style scoped>
.footprint-wrapper {
  display: inline-block;
  background: #020617;
  border: 1px solid #1e293b;
}
canvas {
  display: block;
}
</style>
