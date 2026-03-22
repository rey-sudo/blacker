<template>
  <div class="chart-container">
    <div id="chart-area">
      <!-- MAIN PANE -->
      <div class="pane" id="pane-main">
        <canvas class="chart-canvas" id="canvas-main"></canvas>
        <canvas class="drawings-canvas" id="canvas-drawings"></canvas>
        <canvas class="pricescale-canvas" id="canvas-pricescale"></canvas>
        <canvas class="overlay-canvas" id="overlay-main"></canvas>
      </div>

      <!-- TIME AXIS -->
      <div id="time-axis">
        <canvas id="canvas-time"></canvas>
      </div>

      <!-- SCROLLBAR -->
      <div id="scrollbar">
        <div id="scrollthumb"></div>
      </div>

      <div id="chart-legend"></div>
      <div id="chart-indicators"></div>

      <div id="statusbar">
        <span id="status-fps">60 FPS</span>
        <span id="status-bars"></span>
        <span id="status-zoom"></span>
        <span id="status-cursor"></span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ChartEngine } from "@/packages/chart.js";
import { generate4h } from "@/packages/utils_.js";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

onMounted(() => {
  const chart = new ChartEngine();

  const rawData = generate4h();

  chart.load(rawData);
  chart._updateStatus();
});
</script>

<style lang="css" scoped>
.chart-container{
  display: flex;
  height: 100%;
  overflow: hidden;
}


</style>
