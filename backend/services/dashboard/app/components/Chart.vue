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
  primary: boolean;
  overlay: boolean;
  params: Record<string, unknown>;
  [key: string]: any;
}

export interface ChartTimeframe {
  id: string;
  series: Record<string, Series>;
  timeframe_ms: number;
  [key: string]: any;
}

interface RuntimeSeries extends Series {
  chart: ChartEngine;
  serie: AnyChartSeries;
  kind: SeriesKind;
}

/**
 * -------------------------------------------------------------------------
 * Runtime series belonging to this Chart.vue instance.
 * -------------------------------------------------------------------------
 */
const allSeries = new Map<SeriesId, RuntimeSeries>();

/**
 * -------------------------------------------------------------------------
 * The single ChartEngine owned by the primary series.
 * All overlay series use this same ChartEngine.
 * -------------------------------------------------------------------------
 */
let primaryChart: ChartEngine | null = null;

/**
 * -------------------------------------------------------------------------
 * Main Chart container.
 * -------------------------------------------------------------------------
 */
const container = ref<HTMLDivElement | null>(null);

/**
 * -------------------------------------------------------------------------
 * All ChartEngines created by this component.
 *
 * At the moment there should normally be only one,
 * but keeping this Set makes cleanup robust.
 * -------------------------------------------------------------------------
 */
const charts = new Set<ChartEngine>();

/**
 * -------------------------------------------------------------------------
 * Removes all series and charts created by this component.
 * -------------------------------------------------------------------------
 */
function cleanAllSeries() {
  const uniqueCharts = new Set<ChartEngine>();

  for (const runtime of allSeries.values()) {
    uniqueCharts.add(runtime.chart);
  }

  for (const chart of charts) {
    uniqueCharts.add(chart);
  }

  for (const runtime of allSeries.values()) {
    try {
      runtime.serie.destroy();
    } catch {}
  }

  for (const chart of uniqueCharts) {
    try {
      chart.api.destroy();
    } catch {}
  }

  allSeries.clear();
  charts.clear();

  primaryChart = null;

  container.value?.replaceChildren();
}

/**
 * -------------------------------------------------------------------------
 * Creates the DOM element used by the primary chart.
 * -------------------------------------------------------------------------
 */
function addChartContainer(
  seriesId: SeriesId,
  width: string,
  height: string,
): HTMLDivElement {
  if (!container.value) {
    throw new Error("Chart container is not mounted.");
  }

  const element = document.createElement("div");

  element.className = "chart-area";
  element.dataset.seriesId = seriesId;

  element.style.width = width;
  element.style.height = height;

  container.value.appendChild(element);

  return element;
}

/**
 * -------------------------------------------------------------------------
 * Builds the chart series configuration from a backend definition.
 * -------------------------------------------------------------------------
 */
function buildSeries(seriesId: SeriesId, seriesValue: Series) {
  const seriesFactory = seriesRegistry[seriesValue.kind as SeriesKind];

  if (!seriesFactory) {
    throw new Error(
      `Unknown series kind "${seriesValue.kind}" for series "${seriesId}".`,
    );
  }

  return seriesFactory({
    id: seriesId,
    label: seriesValue.params?.label as string,
    color: seriesValue.params?.color as string,
    layer: seriesValue.params?.layer as "background" | "foreground",
    priceTagColor: seriesValue.params?.priceTagColor as string,
    params: seriesValue.params as any,
  });
}

/**
 * -------------------------------------------------------------------------
 * Validates the topology of a series.
 * Exactly one of primary / overlay must be true.
 * -------------------------------------------------------------------------
 */
function validateSeries(series: Series) {
  if (series.primary === series.overlay) {
    throw new Error(`Series "${series.id}" must be either primary or overlay.`);
  }
}

/**
 * -------------------------------------------------------------------------
 * Validates the complete timeframe topology.
 * There can be exactly one primary.
 * -------------------------------------------------------------------------
 */
function validateLayout(definitions: Record<string, Series>) {
  let primaryCount = 0;

  for (const series of Object.values(definitions)) {
    validateSeries(series);

    if (series.primary) {
      primaryCount++;
    }
  }

  if (primaryCount > 1) {
    throw new Error("Only one primary series is allowed.");
  }
}

/**
 * -------------------------------------------------------------------------
 * Creates the runtime primary series.
 * The primary owns the only ChartEngine.
 * -------------------------------------------------------------------------
 */
function createPrimarySeries(seriesId: SeriesId, seriesValue: Series) {
  if (primaryChart) {
    throw new Error(
      `Primary series already exists. Cannot create "${seriesId}".`,
    );
  }

  const build = buildSeries(seriesId, seriesValue);

  const chart = createChart(
    addChartContainer(seriesId, build.width, build.height),
  );

  const serie = chart.api.addSeries(build);

  primaryChart = chart;
  charts.add(chart);

  allSeries.set(seriesId, {
    ...seriesValue,
    chart,
    serie,
    kind: seriesValue.kind as SeriesKind,
  });
}

/**
 * -------------------------------------------------------------------------
 * Creates the runtime overlay series.
 *
 * Overlays never create their own ChartEngine.
 * They are always added to the primary ChartEngine.
 * -------------------------------------------------------------------------
 */
function createOverlaySeries(seriesId: SeriesId, seriesValue: Series) {
  if (!primaryChart) {
    throw new Error(
      `Cannot create overlay "${seriesId}" because no primary series exists.`,
    );
  }

  const build = buildSeries(seriesId, seriesValue);

  const serie = primaryChart.api.addSeries(build);

  allSeries.set(seriesId, {
    ...seriesValue,
    chart: primaryChart,
    serie,
    kind: seriesValue.kind as SeriesKind,
  });
}

/**
 * -------------------------------------------------------------------------
 * Creates a runtime series according to its type.
 * -------------------------------------------------------------------------
 */
function _createRuntimeSeries(seriesId: SeriesId, seriesValue: Series) {
  validateSeries(seriesValue);

  if (seriesValue.primary) {
    createPrimarySeries(seriesId, seriesValue);

    return;
  }

  createOverlaySeries(seriesId, seriesValue);
}

/**
 ** -------------------------------------------------------------------------
 * Resolves the creation order.
 *
 * The primary must exist before overlays because overlays
 * share the primary ChartEngine.
 *
 * level is only used to preserve the existing ordering
 * between series. It is NOT used to determine ownership.
 * -------------------------------------------------------------------------
 */
function resolveSeriesOrder(series: Record<string, Series>): Series[] {
  return Object.values(series).sort((a, b) => {
    if (a.primary !== b.primary) {
      return a.primary ? -1 : 1;
    }

    return a.level - b.level;
  });
}

/**
 * -------------------------------------------------------------------------
 * Removes a single runtime series.
 * -------------------------------------------------------------------------
 */
function _destroySeries(seriesId: SeriesId) {
  const runtime = allSeries.get(seriesId);

  if (!runtime) {
    return;
  }

  try {
    runtime.serie.destroy();
  } catch {}

  allSeries.delete(seriesId);

  /**
   * If the primary itself was destroyed, its ChartEngine
   * must no longer be considered available.
   */
  if (runtime.primary) {
    primaryChart = null;
  }
}

/**
 * -------------------------------------------------------------------------
 * Determines whether an existing runtime series
 * can be reused.
 *
 * A series must be recreated if its kind or topology changes.
 * -------------------------------------------------------------------------
 */
function requiresRecreation(
  runtime: RuntimeSeries,
  seriesValue: Series,
): boolean {
  if (runtime.kind !== seriesValue.kind) {
    return true;
  }

  if (runtime.primary !== seriesValue.primary) {
    return true;
  }

  if (runtime.overlay !== seriesValue.overlay) {
    return true;
  }

  if (JSON.stringify(runtime.params) !== JSON.stringify(seriesValue.params)) {
    return true;
  }

  return false;
}

/**
 * -------------------------------------------------------------------------
 * Removes ChartEngines that no longer own active series.
 * -------------------------------------------------------------------------
 */
function _cleanupEmptyCharts() {
  const activeCharts = new Set<ChartEngine>();

  for (const runtime of allSeries.values()) {
    activeCharts.add(runtime.chart);
  }

  for (const chart of charts) {
    if (activeCharts.has(chart)) {
      continue;
    }

    try {
      chart.api.destroy();
    } catch {}

    charts.delete(chart);

    if (primaryChart === chart) {
      primaryChart = null;
    }
  }
}

/**
 * -------------------------------------------------------------------------
 * Applies a timeframe layout.
 *
 * Reconciliation is incremental:
 *
 * - Existing compatible series are reused.
 * - New series are created.
 * - Removed series are destroyed.
 * - Series whose kind/topology changed are recreated.
 *
 * Data is intentionally NOT updated here.
 * -------------------------------------------------------------------------
 */
function applyLayout(timeframe: ChartTimeframe) {
  const definitions = timeframe.series;

  validateLayout(definitions);

  /**
   * Remove series that no longer exist.
   */
  const nextSeriesIds = new Set(Object.keys(definitions));

  const seriesToRemove: SeriesId[] = [];

  for (const seriesId of allSeries.keys()) {
    if (!nextSeriesIds.has(seriesId)) {
      seriesToRemove.push(seriesId);
    }
  }

  /**
   * Destroy overlays before the primary.
   * The primary owns their ChartEngine.
   */
  seriesToRemove.sort((a, b) => {
    const seriesA = definitions[a];
    const seriesB = definitions[b];

    if (!seriesA || !seriesB) {
      return 0;
    }

    if (seriesA.overlay !== seriesB.overlay) {
      return seriesA.overlay ? -1 : 1;
    }

    return seriesB.level - seriesA.level;
  });

  for (const seriesId of seriesToRemove) {
    _destroySeries(seriesId);
  }

  /**
   * Resolve primary -> overlay creation order.
   */
  const orderedSeries = resolveSeriesOrder(definitions);

  /**
   * Create new series or reuse existing ones.
   */
  for (const seriesValue of orderedSeries) {
    const seriesId = seriesValue.id;

    const existing = allSeries.get(seriesId);

    if (!existing) {
      _createRuntimeSeries(seriesId, seriesValue);

      continue;
    }

    /**
     * Existing series whose runtime topology changed.
     */
    if (requiresRecreation(existing, seriesValue)) {
      _destroySeries(seriesId);

      _createRuntimeSeries(seriesId, seriesValue);

      continue;
    }
  }

  _cleanupEmptyCharts();
}

/**
 * -------------------------------------------------------------------------
 * Applies options to the ChartEngine owning the series.
 * -------------------------------------------------------------------------
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
 * -------------------------------------------------------------------------
 * Sets the complete data of a series.
 * -------------------------------------------------------------------------
 */
function setData(seriesId: SeriesId, data: any) {
  allSeries.get(seriesId)?.serie.setData(data);
}

/**
 * -------------------------------------------------------------------------
 * Patches existing series data.
 * -------------------------------------------------------------------------
 */
function patchData(seriesId: SeriesId, data: any) {
  allSeries.get(seriesId)?.serie.patchData(data);
}

/**
 * -------------------------------------------------------------------------
 * Updates the latest live candle/tick.
 * -------------------------------------------------------------------------
 */
function updateLive(seriesId: SeriesId, candle: any) {
  allSeries.get(seriesId)?.serie.update(candle);
}

/**
 * -------------------------------------------------------------------------
 * Returns the runtime series.
 * -------------------------------------------------------------------------
 */
function getSeriesById(seriesId: SeriesId) {
  return allSeries.get(seriesId);
}

/**
 * -------------------------------------------------------------------------
 * Public Chart.vue API.
 * -------------------------------------------------------------------------
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
 * -------------------------------------------------------------------------
 * Make sure the component is mounted before charts are created.
 * -------------------------------------------------------------------------
 */
onMounted(() => {
  if (!container.value) {
    throw new Error("Chart container was not mounted.");
  }
});

/**
 * -------------------------------------------------------------------------
 * Completely clean up this Chart.vue instance.
 * -------------------------------------------------------------------------
 */
onBeforeUnmount(() => {
  cleanAllSeries();
});
</script>

<template>
  <div ref="container" class="chart-container" />
</template>

<style>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  scrollbar-gutter: stable;
  background: var(--ui-bg);
  border-radius: var(--ui-radius);
}

.chart-area {
  border-radius: var(--ui-radius);
}

/* Chrome / Edge / Safari */
.chart-container::-webkit-scrollbar {
  background: var(--ui-bg-accented);
  width: 16px;
}

.chart-container::-webkit-scrollbar-track {
  background: transparent;
}

.chart-container::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.45);
  border-left: 0.25rem solid transparent;
  background-clip: padding-box;
}

.chart-container::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.7);
  background-clip: padding-box;
}
</style>
