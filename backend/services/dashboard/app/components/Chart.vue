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

  /**
   * Runtime metadata used to determine whether
   * the existing series can be reused.
   */
  kind: SeriesKind;
  parentId: SeriesId | null;
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
  const uniqueCharts = new Set<ChartEngine>();

  for (const item of allSeries.values()) {
    uniqueCharts.add(item.chart);
  }

  for (const item of allSeries.values()) {
    try {
      item.serie.destroy();
    } catch {}
  }

  for (const chart of uniqueCharts) {
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
 * Builds the chart series configuration from a backend series definition.
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
 * Creates a runtime series.
 *
 * Root series create their own ChartEngine.
 * Child series are added to their parent's ChartEngine.
 */
function createRuntimeSeries(seriesId: SeriesId, seriesValue: Series) {
  const build = buildSeries(seriesId, seriesValue);

  // -------------------------------------------------------------------------
  // Root series
  // -------------------------------------------------------------------------

  if (!seriesValue.parent_id) {
    const chart = createChart(
      addChartContainer(seriesId, build.width, build.height),
    );
    const serie = chart.api.addSeries(build);

    allSeries.set(seriesId, {
      chart,
      serie,
      kind: seriesValue.kind as SeriesKind,
      parentId: null,
    });

    charts.add(chart);

    return;
  }

  // -------------------------------------------------------------------------
  // Child series
  // -------------------------------------------------------------------------

  const parent = allSeries.get(seriesValue.parent_id);

  if (!parent) {
    throw new Error(
      `Parent series "${seriesValue.parent_id}" has not been created.`,
    );
  }

  const serie = parent.chart.api.addSeries(build);

  allSeries.set(seriesId, {
    chart: parent.chart,
    serie,
    kind: seriesValue.kind as SeriesKind,
    parentId: seriesValue.parent_id,
  });
}

/**
 * Resolves series in parent -> child order.
 *
 * The backend does not need to guarantee that parents appear
 * before their children in the returned object.
 */
function resolveSeriesOrder(series: Record<string, Series>): Series[] {
  //
  // Stores series in the resolved parent-before-child order.
  //
  const result: Series[] = [];
  //
  // Tracks series currently being processed to detect circular dependencies.
  //
  const visiting = new Set<SeriesId>();
  //
  // Tracks series that have already been fully processed.
  //
  const visited = new Set<SeriesId>();
  //
  // Recursively processes a series and its parent dependencies.
  //
  function _visit(seriesId: SeriesId) {
    //
    // Skip the series if it has already been processed.
    //
    if (visited.has(seriesId)) {
      return;
    }
    //
    // Throw if the current dependency chain contains a cycle.
    //
    if (visiting.has(seriesId)) {
      throw new Error(`Circular series dependency detected at "${seriesId}".`);
    }
    //
    //  Get the current series by its ID.
    //
    const current = series[seriesId];
    //
    // Throw if the requested series does not exist.
    //
    if (!current) {
      throw new Error(`Series "${seriesId}" does not exist.`);
    }
    //
    //  Mark the series as currently being processed.
    //
    visiting.add(seriesId);
    //
    // Process the parent before the current series.
    //
    if (current.parent_id) {
      _visit(current.parent_id);
    }
    //
    // Mark the series as no longer being processed.
    //
    visiting.delete(seriesId);
    //
    // Mark the series as fully processed.
    //
    visited.add(seriesId);
    //
    // Add the series after its parent has been added.
    //
    result.push(current);
  }

  for (const seriesId of Object.keys(series)) {
    _visit(seriesId);
  }

  return result;
}

/**
 * Removes a single series from the runtime.
 *
 * The ChartEngine is kept alive until it no longer owns
 * any remaining series.
 */
function destroySeries(seriesId: SeriesId) {
  const runtime = allSeries.get(seriesId);

  if (!runtime) {
    return;
  }

  try {
    runtime.serie.destroy();
  } catch {}

  allSeries.delete(seriesId);
}

/**
 * Determines whether an existing runtime series can be reused.
 *
 * A series must be recreated if its kind or parent changes.
 */
function requiresRecreation(
  runtime: RuntimeSeries,
  seriesValue: Series,
): boolean {
  if (runtime.kind !== seriesValue.kind) {
    return true;
  }

  if (runtime.parentId !== seriesValue.parent_id) {
    return true;
  }

  return false;
}

/**
 * Removes charts that no longer own any series.
 */
function cleanupEmptyCharts() {
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
  }
}

/**
 * Applies a timeframe layout.
 *
 * The layout is reconciled incrementally:
 *
 * - Existing series are reused.
 * - New series are created.
 * - Removed series are destroyed.
 * - Series whose kind or parent changed are recreated.
 *
 * Data is intentionally NOT updated here.
 */
function applyLayout(timeframe: ChartTimeframe) {
  const definitions = timeframe.series;

  // -------------------------------------------------------------------------
  // Remove series that no longer exist in the new layout.
  // -------------------------------------------------------------------------

  const nextSeriesIds = new Set(Object.keys(definitions));

  const seriesToRemove: SeriesId[] = [];

  for (const seriesId of allSeries.keys()) {
    if (!nextSeriesIds.has(seriesId)) {
      seriesToRemove.push(seriesId);
    }
  }

  // -------------------------------------------------------------------------
  // Remove children before parents.
  //
  // This is important when the chart engine has dependencies between
  // a parent series and its children.
  // -------------------------------------------------------------------------

  seriesToRemove.sort((a, b) => {
    const levelA = definitions[a]?.level ?? Number.MAX_SAFE_INTEGER;
    const levelB = definitions[b]?.level ?? Number.MAX_SAFE_INTEGER;

    return levelB - levelA;
  });

  for (const seriesId of seriesToRemove) {
    destroySeries(seriesId);
  }

  // -------------------------------------------------------------------------
  // Resolve parent -> child order.
  // -------------------------------------------------------------------------

  const orderedSeries = resolveSeriesOrder(definitions);

  // -------------------------------------------------------------------------
  // Create new series or reuse existing runtime series.
  // -------------------------------------------------------------------------

  for (const seriesValue of orderedSeries) {
    const seriesId = seriesValue.id;

    const existing = allSeries.get(seriesId);

    // -----------------------------------------------------------------------
    // New series
    // -----------------------------------------------------------------------

    if (!existing) {
      createRuntimeSeries(seriesId, seriesValue);
      continue;
    }

    // -----------------------------------------------------------------------
    // Existing series whose runtime topology changed.
    // -----------------------------------------------------------------------

    if (requiresRecreation(existing, seriesValue)) {
      destroySeries(seriesId);
      createRuntimeSeries(seriesId, seriesValue);
      continue;
    }

    // -----------------------------------------------------------------------
    // Existing compatible series.
    //
    // Keep the ChartEngine and AnyChartSeries instances alive.
    // Data updates are handled separately by setData(), patchData()
    // and updateLive().
    // -----------------------------------------------------------------------

    continue;
  }

  // -------------------------------------------------------------------------
  // Destroy ChartEngines that no longer have any series.
  // -------------------------------------------------------------------------

  cleanupEmptyCharts();
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
 *
 * Intended for initial/full data loading.
 */
function setData(seriesId: SeriesId, data: any) {
  allSeries.get(seriesId)?.serie.setData(data);
}

/**
 * Patches existing series data.
 *
 * Intended for incremental backtest data.
 */
function patchData(seriesId: SeriesId, data: any) {
  allSeries.get(seriesId)?.serie.patchData(data);
}

/**
 * Updates a live candle/tick.
 *
 * Intended for updating the current/latest data point.
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

<style>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  overflow-y: auto;
  overflow-x: hidden;

  box-sizing: border-box;

  scrollbar-gutter: stable;
}

.chart-area {
  border-radius: var(--ui-radius);
}

/* Chrome / Edge / Safari */
.chart-container::-webkit-scrollbar {
  width: 19px;
}

.chart-container::-webkit-scrollbar-track {
  background: transparent;
}

.chart-container::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.45);
  border-radius: var(--ui-radius);
  border-left: 4px solid transparent;
  background-clip: padding-box;
}

.chart-container::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.7);
  background-clip: padding-box;
}
</style>
