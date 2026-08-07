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
import type { AnyChartSeries, ChartEngine } from "~/packages/src/core/types";
import { seriesRegistry, type ChartLayout, type SeriesId } from "~/stores/tabs";

interface RuntimeSeries {
  chart: ChartEngine;
  serie: AnyChartSeries;
}

const allSeries = new Map<SeriesId, RuntimeSeries>();

function _cleanAllSeries() {
  allSeries.forEach((runtime) => {
    runtime.chart.api.destroy();
    runtime.serie.destroy();
  });

  allSeries.clear();
}

/**
 * Applies the provided chart layout by recreating all series in the
 * order they are defined. Root series create new charts, while child
 * series are attached to the chart of their parent.
 *
 * @throws {Error} If a series references a parent that has not been created.
 */
function applyLayout(layout: ChartLayout) {
  _cleanAllSeries();

  for (const [seriesId, item] of layout.series) {
    // Create the series builder from its registered type and configuration.
    const seriesFactory = seriesRegistry[item.kind];
    const build = seriesFactory(item.options);

    // Root series create a new chart instance.
    if (!item.parent) {
      const chart = createChart(_addChildToContainer(seriesId));
      const serie = chart.api.addSeries(build);

      allSeries.set(seriesId, { chart, serie });

      continue;
    }

    // Child series reuse the chart created by their parent.
    const parent = allSeries.get(item.parent);
    if (!parent) {
      throw new Error(`Parent series "${item.parent}" has not been created.`);
    }
     
    const serie = parent.chart.api.addSeries(build);

    allSeries.set(seriesId, { chart: parent.chart, serie });
  }
}

function applyOptions(serieId: SeriesId, config: any) {
  allSeries.get(serieId)?.chart.api.applyOptions(config);
}

function setData(serieId: SeriesId, data: any) {
  allSeries.get(serieId)?.serie.setData(data);
}

function patchData(serieId: SeriesId, data: any) {
  allSeries.get(serieId)?.serie.patchData(data);
}

function updateLive(serieId: SeriesId, candle: any) {
  allSeries.get(serieId)?.serie.update(candle);
}

function getSeriesById(serieId: SeriesId) {
  return allSeries.get(serieId);
}

function _addChildToContainer(id: SeriesId): HTMLDivElement {
  const container = document.getElementById("chart-container");

  if (!container) {
    console.error("Element #chart-container not found");
    throw new Error("No Chart container");
  }

  const newDiv = document.createElement("div");

  if (id) newDiv.id = id;
  newDiv.className = "chart-area";

  container.appendChild(newDiv);

  return newDiv;
}

onBeforeUnmount(() => {
  _cleanAllSeries();

  document.getElementById("chart-container")?.replaceChildren();
});

defineExpose({
  patchData,
  getSeriesById,
  applyLayout,
  applyOptions,
  setData,
  updateLive,
});
</script>

<template>
  <div class="chart-container" id="chart-container"></div>
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
