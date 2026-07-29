<script setup lang="ts">
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { createChart } from "@/packages/src/index";
import { CandleBubbleSeries } from "@/packages/playground/indicators/CandleBubbleSeries/CandleBubbleSeries";
import type { AnyChartSeries, ChartEngine } from "~/packages/src/core/types";

let chart: ChartEngine | null = null;
let candleSeries: AnyChartSeries | null = null;

onMounted(() => {
  chart = createChart(document.getElementById("chart-area")!);
  candleSeries = chart.api.addSeries(CandleBubbleSeries);
});

function applyOptions(config: any) {
  chart?.api.applyOptions(config);
}

function setData(data: any) {
  candleSeries?.setData(data);
}

function update(candle: any) {
  candleSeries?.update(candle);
}

defineExpose({
  applyOptions,
  setData,
  update,
});
</script>

<template>
  <div class="chart-container">
    <div id="chart-area" class="chart-area"></div>
  </div>
</template>

<style lang="css" scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-area {
  min-height: 100%;
}
</style>
