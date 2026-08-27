<script setup lang="ts">
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
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

import { onBeforeUnmount, onMounted, ref } from "vue";
import { createChart } from "@/packages/src/index";
import type { ChartOptions } from "~/packages/src/core/config";
import type { AnyChartSeries, ChartEngine } from "~/packages/src/core/types";
import { seriesRegistry, type SeriesId, type SeriesKind } from "~/stores/tabs";

export interface Series {
  id: string;
  kind: string;
  level: number;
  params: Record<string, unknown>;
  parent_id: string | null;
  [key: string]: any;
}

export interface ChartTimeframe {
  id: string;
  series: Record<string, Series>;
  timeframe_ms: number;
  [key: string]: any;
}

interface RuntimeSeries {
  chart: ChartEngine;
  serie: AnyChartSeries;
}

/**
 * This Map belongs to ONE Chart.vue instance.
 */
const allSeries = new Map<SeriesId, RuntimeSeries>();

/**
 * Main Chart container.
 */
const container = ref<HTMLDivElement | null>(null);

/**
 * Multiple series can belong to the same chart.
 */
const charts = new Set<ChartEngine>();

/**
 * Remove all series and charts created by this component.
 */
function cleanAllSeries() {
  const _uniqueCharts = new Set<ChartEngine>();

  for (const item of allSeries.values()) {
    _uniqueCharts.add(item.chart);
  }

  for (const item of allSeries.values()) {
    try {
      item.serie.destroy();
    } catch {}
  }

  for (const chart of _uniqueCharts) {
    try {
      chart.api.destroy();
    } catch {}
  }

  allSeries.clear();
  charts.clear();

  container.value?.replaceChildren();
}

/**
 * Creates a DOM element for a root chart.
 */
function addChartContainer(seriesId: SeriesId): HTMLDivElement {
  if (!container.value) {
    throw new Error("Chart container is not mounted.");
  }

  const element = document.createElement("div");

  element.className = "chart-area";
  element.dataset.seriesId = seriesId;

  container.value.appendChild(element);

  return element;
}

/**
 * Applies a timeframe layout.
 */
function applyLayout(timeframe: ChartTimeframe) {
  cleanAllSeries();

  for (const [seriesId, seriesValue] of Object.entries(timeframe.series).sort(
    ([, a], [, b]) => a.level - b.level,
  )) {
    const seriesFactory = seriesRegistry[seriesValue.kind as SeriesKind];

    const build = seriesFactory({
      id: seriesId,
      label: seriesValue.params?.label as string,
      color: seriesValue.params?.color as string,
      layer: seriesValue.params.layer as "background" | "foreground",
      priceTagColor: seriesValue.params.priceTagColor as string,
      params: seriesValue.params as any,
    });

    // -------------------------------------------------------------------------
    // Root series
    // -------------------------------------------------------------------------

    if (!seriesValue?.parent_id) {
      const chart = createChart(addChartContainer(seriesId));

      const serie = chart.api.addSeries(build);

      allSeries.set(seriesId, {
        chart,
        serie,
      });

      charts.add(chart);

      continue;
    }

    // -------------------------------------------------------------------------
    // Child series
    // -------------------------------------------------------------------------

    const parent = allSeries.get(seriesValue?.parent_id);

    if (!parent) {
      console.error(
        `Parent series "${seriesValue?.parent_id}" has not been created.`,
      );
      return;
    }

    const serie = parent.chart.api.addSeries(build);

    allSeries.set(seriesId, {
      chart: parent.chart,
      serie,
    });
  }
}

// -------------------------------------------------------------------------
// EXPOSED API
// -------------------------------------------------------------------------

/**
 * Applies options to the chart that owns the series.
 */
function applyOptions(seriesId: SeriesId, config: Partial<ChartOptions>) {
  const runtime = allSeries.get(seriesId);

  if (!runtime) {
    console.warn(`Cannot apply options: series "${seriesId}" not found.`);

    return;
  }

  runtime.chart.api.applyOptions(config);
}

/**
 * Sets the complete data of a series.
 */
function setData(seriesId: SeriesId, data: any) {
  allSeries.get(seriesId)?.serie.setData(data);
}

/**
 * Patches existing series data.
 */
function patchData(seriesId: SeriesId, data: any) {
  allSeries.get(seriesId)?.serie.patchData(data);
}

/**
 * Updates a live candle/tick.
 */
function updateLive(seriesId: SeriesId, candle: any) {
  allSeries.get(seriesId)?.serie.update(candle);
}

/**
 * Returns the runtime series.
 */
function getSeriesById(seriesId: SeriesId) {
  return allSeries.get(seriesId);
}

/**
 * Expose the public Chart.vue API.
 */
defineExpose({
  patchData,
  getSeriesById,
  applyLayout,
  applyOptions,
  setData,
  updateLive,
});

/**
 * Make sure the component is mounted before charts are created.
 */
onMounted(() => {
  if (!container.value) {
    throw new Error("Chart container was not mounted.");
  }
});

/**
 * Completely clean up this Chart.vue instance.
 */
onBeforeUnmount(() => {
  cleanAllSeries();
});
</script>

<template>
  <div ref="container" class="chart-container" />
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  box-sizing: border-box;
  border-radius: var(--ui-radius);
  background: var(--chart-background);
}

.chart-area {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
}
</style>
