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

import {
  seriesRegistry,
  type SeriesId,
  type SeriesKind,
} from "~/stores/tabs";

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

interface RuntimeSeries {
  chart: ChartEngine;
  serie: AnyChartSeries;

  /**
   * Runtime metadata used to determine
   * whether the existing series can be reused.
   */
  kind: SeriesKind;

  /**
   * Whether this runtime series is a primary
   * or an overlay.
   */
  primary: boolean;
  overlay: boolean;
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
 * Creates a DOM element for a primary chart.
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
  const seriesFactory =
    seriesRegistry[seriesValue.kind as SeriesKind];

  if (!seriesFactory) {
    throw new Error(
      `Unknown series kind "${seriesValue.kind}" for series "${seriesId}".`,
    );
  }

  return seriesFactory({
    id: seriesId,
    label: seriesValue.params?.label as string,
    color: seriesValue.params?.color as string,
    layer: seriesValue.params?.layer as
      | "background"
      | "foreground",
    priceTagColor: seriesValue.params?.priceTagColor as string,
    params: seriesValue.params as any,
  });
}

/**
 * Returns whether the series is a primary series.
 */
function isPrimary(series: Series): boolean {
  return series.primary === true;
}

/**
 * Returns whether the series is an overlay.
 */
function isOverlay(series: Series): boolean {
  return series.overlay === true;
}

/**
 * Finds the primary series that owns an overlay.
 *
 * Current rule:
 *
 * - A primary creates its own ChartEngine.
 * - An overlay is attached to the primary with the closest
 *   lower level.
 *
 * If your backend has a more explicit relation between an
 * overlay and a primary, replace this function with that rule.
 */
function findPrimaryForOverlay(
  seriesValue: Series,
  definitions: Record<string, Series>,
): RuntimeSeries | undefined {
  let bestPrimary: RuntimeSeries | undefined;
  let bestLevel = -Infinity;

  for (const candidate of Object.values(definitions)) {
    if (!isPrimary(candidate)) {
      continue;
    }

    /**
     * An overlay belongs to a primary at the same logical
     * level or immediately below it.
     *
     * We prefer the closest primary level.
     */
    if (candidate.level > seriesValue.level) {
      continue;
    }

    const runtime = allSeries.get(candidate.id);

    if (!runtime) {
      continue;
    }

    if (candidate.level > bestLevel) {
      bestLevel = candidate.level;
      bestPrimary = runtime;
    }
  }

  return bestPrimary;
}

/**
 * Creates a runtime primary series.
 *
 * Primary series create their own ChartEngine.
 */
function createPrimaryRuntimeSeries(
  seriesId: SeriesId,
  seriesValue: Series,
) {
  const build = buildSeries(seriesId, seriesValue);

  const chart = createChart(
    addChartContainer(
      seriesId,
      build.width,
      build.height,
    ),
  );

  const serie = chart.api.addSeries(build);

  allSeries.set(seriesId, {
    chart,
    serie,
    kind: seriesValue.kind as SeriesKind,
    primary: true,
    overlay: false,
  });

  charts.add(chart);
}

/**
 * Creates a runtime overlay series.
 *
 * Overlay series do NOT create a ChartEngine.
 * They are added to the ChartEngine owned by their primary.
 */
function createOverlayRuntimeSeries(
  seriesId: SeriesId,
  seriesValue: Series,
  definitions: Record<string, Series>,
) {
  const build = buildSeries(seriesId, seriesValue);

  const primary = findPrimaryForOverlay(
    seriesValue,
    definitions,
  );

  if (!primary) {
    throw new Error(
      `Primary series for overlay "${seriesId}" has not been created.`,
    );
  }

  const serie = primary.chart.api.addSeries(build);

  allSeries.set(seriesId, {
    chart: primary.chart,
    serie,
    kind: seriesValue.kind as SeriesKind,
    primary: false,
    overlay: true,
  });
}

/**
 * Creates a runtime series according to its topology.
 */
function createRuntimeSeries(
  seriesId: SeriesId,
  seriesValue: Series,
  definitions: Record<string, Series>,
) {
  /**
   * Primary series are chart roots.
   */
  if (isPrimary(seriesValue)) {
    createPrimaryRuntimeSeries(
      seriesId,
      seriesValue,
    );

    return;
  }

  /**
   * Overlay series are children of a primary.
   */
  if (isOverlay(seriesValue)) {
    createOverlayRuntimeSeries(
      seriesId,
      seriesValue,
      definitions,
    );

    return;
  }

  throw new Error(
    `Series "${seriesId}" must be either primary or overlay.`,
  );
}

/**
 * Resolves series in primary -> overlay order.
 *
 * Primary series must always be created before their overlays.
 *
 * Since the new model no longer has parent_id, the ordering
 * is determined by:
 *
 *   1. primary first
 *   2. level ascending
 *   3. original object order
 */
function resolveSeriesOrder(
  series: Record<string, Series>,
): Series[] {
  return Object.values(series).sort((a, b) => {
    /**
     * Primary series always come first.
     */
    if (a.primary !== b.primary) {
      return a.primary ? -1 : 1;
    }

    /**
     * Lower levels are created first.
     */
    if (a.level !== b.level) {
      return a.level - b.level;
    }

    return 0;
  });
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
 * A series must be recreated if its kind or topology changes.
 */
function requiresRecreation(
  runtime: RuntimeSeries,
  seriesValue: Series,
): boolean {
  /**
   * The series implementation changed.
   */
  if (runtime.kind !== seriesValue.kind) {
    return true;
  }

  /**
   * Primary <-> overlay topology changed.
   */
  if (runtime.primary !== seriesValue.primary) {
    return true;
  }

  if (runtime.overlay !== seriesValue.overlay) {
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
 * - Series whose kind or topology changed are recreated.
 *
 * Data is intentionally NOT updated here.
 */
function applyLayout(timeframe: ChartTimeframe) {
  const definitions = timeframe.series;

  /**
   * -------------------------------------------------------------------------
   * Remove series that no longer exist in the new layout.
   * -------------------------------------------------------------------------
   */
  const nextSeriesIds = new Set(
    Object.keys(definitions),
  );

  const seriesToRemove: SeriesId[] = [];

  for (const seriesId of allSeries.keys()) {
    if (!nextSeriesIds.has(seriesId)) {
      seriesToRemove.push(seriesId);
    }
  }

  /**
   * -------------------------------------------------------------------------
   * Remove overlays before primaries.
   *
   * Overlays are children of primary charts.
   * -------------------------------------------------------------------------
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

    return (
      (seriesB.level ?? 0) -
      (seriesA.level ?? 0)
    );
  });

  for (const seriesId of seriesToRemove) {
    destroySeries(seriesId);
  }

  /**
   * -------------------------------------------------------------------------
   * Resolve primary -> overlay order.
   * -------------------------------------------------------------------------
   */
  const orderedSeries =
    resolveSeriesOrder(definitions);

  /**
   * -------------------------------------------------------------------------
   * Create new series or reuse existing runtime series.
   * -------------------------------------------------------------------------
   */
  for (const seriesValue of orderedSeries) {
    const seriesId = seriesValue.id;

    const existing = allSeries.get(seriesId);

    /**
     * -----------------------------------------------------------------------
     * New series
     * -----------------------------------------------------------------------
     */
    if (!existing) {
      createRuntimeSeries(
        seriesId,
        seriesValue,
        definitions,
      );

      continue;
    }

    /**
     * -----------------------------------------------------------------------
     * Existing series whose runtime topology changed.
     * -----------------------------------------------------------------------
     */
    if (
      requiresRecreation(
        existing,
        seriesValue,
      )
    ) {
      destroySeries(seriesId);

      createRuntimeSeries(
        seriesId,
        seriesValue,
        definitions,
      );

      continue;
    }

    /**
     * -----------------------------------------------------------------------
     * Existing compatible series.
     *
     * Keep the ChartEngine and AnyChartSeries instances alive.
     *
     * Data updates are handled separately by setData(),
     * patchData() and updateLive().
     * -----------------------------------------------------------------------
     */
    continue;
  }

  /**
   * -------------------------------------------------------------------------
   * Destroy ChartEngines that no longer have any series.
   * -------------------------------------------------------------------------
   */
  cleanupEmptyCharts();
}

/**
 * ---------------------------------------------------------------------------
 * EXPOSED API
 * ---------------------------------------------------------------------------
 */

/**
 * Applies options to the chart that owns the series.
 */
function applyOptions(
  seriesId: SeriesId,
  config: Partial<ChartOptions>,
) {
  const runtime = allSeries.get(seriesId);

  if (!runtime) {
    console.warn(
      `Cannot apply options: series "${seriesId}" not found.`,
    );

    return;
  }

  runtime.chart.api.applyOptions(config);
}

/**
 * Sets the complete data of a series.
 *
 * Intended for initial/full data loading.
 */
function setData(
  seriesId: SeriesId,
  data: any,
) {
  allSeries
    .get(seriesId)
    ?.serie
    .setData(data);
}

/**
 * Patches existing series data.
 *
 * Intended for incremental backtest data.
 */
function patchData(
  seriesId: SeriesId,
  data: any,
) {
  allSeries
    .get(seriesId)
    ?.serie
    .patchData(data);
}

/**
 * Updates a live candle/tick.
 *
 * Intended for updating the current/latest data point.
 */
function updateLive(
  seriesId: SeriesId,
  candle: any,
) {
  allSeries
    .get(seriesId)
    ?.serie
    .update(candle);
}

/**
 * Returns the runtime series.
 */
function getSeriesById(
  seriesId: SeriesId,
) {
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
    throw new Error(
      "Chart container was not mounted.",
    );
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
  <div
    ref="container"
    class="chart-container"
  />
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
  width: 17px;
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
