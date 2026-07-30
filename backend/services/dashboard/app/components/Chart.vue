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
import { EMASeries } from "~/packages/playground/indicators/EMASeries/EMASeries";
import type { AnyChartSeries, ChartEngine } from "~/packages/src/core/types";

const seriesRegistry = {
  CandleBubbleSeries,
  EMASeries,
} as const;

type Registry = typeof seriesRegistry;
type SeriesKind = keyof Registry;
type SeriesId = string;

type LayoutSeries<K extends SeriesKind = SeriesKind> = {
  id: SeriesId;
  kind: K;
  parent?: SeriesId;
  options: any;
};

interface Layout {
  series: LayoutSeries[];
}

const layout: Layout = {
  series: [
    {
      id: "candle-bubble-series",
      kind: "CandleBubbleSeries",
      options: {
        id: "candle-bubble-series",
        label: "Candlesticks",
        layer: "background",
        color: "red",
        priceTagColor: "#F23645",
        params: {
          bullColor: "#089981",
          bearColor: "#F23645",
        },
      },
    },
    {
      id: "ema-55-series",
      kind: "EMASeries",
      parent: "candle-bubble-series",
      options: {
        id: "ema-55-series",
        label: "EMA 55",
        color: "#ffb830",
        layer: "foreground",
        priceTagColor: "#ffb830",
        params: {
          lineWidth: 2,
        },
      },
    },
  ],
};

interface RuntimeSeries {
  chart: ChartEngine;
  serie: AnyChartSeries;
}

const allSeries: Record<SeriesId, RuntimeSeries> = {};

onMounted(() => {
  for (const item of layout.series) {
    const seriesFactory = seriesRegistry[item.kind];
    const build = seriesFactory(item.options);

    if (!item.parent) {
      const chart = createChart(_addChildToContainer(item.id));
      const serie = chart.api.addSeries(build);

      allSeries[item.id] = {
        chart,
        serie,
      };

      continue;
    }

    const parent = allSeries[item.parent];
    if (!parent) {
      throw new Error(`Parent series "${item.parent}" has not been created.`);
    }

    const serie = parent.chart.api.addSeries(build);

    allSeries[item.id] = {
      chart: parent.chart,
      serie,
    };
  }
});

function applyOptions(serieId: SeriesId, config: any) {
  allSeries[serieId]?.chart.api.applyOptions(config);
}

function setData(serieId: SeriesId, data: any) {
  allSeries[serieId]?.serie.setData(data);
}

function update(serieId: SeriesId, candle: any) {
  allSeries[serieId]?.serie.update(candle);
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

defineExpose({
  applyOptions,
  setData,
  update,
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
