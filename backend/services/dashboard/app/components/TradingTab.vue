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

import {
  useTradingTabStore,
  type LayoutSeries,
} from "~/stores/tabs/trading-tab.store";
import Chart from "~/components/Chart.vue";

const history = [
  {
    time: 1785280680,
    open: 63604.0,
    high: 63611.9,
    low: 63604.0,
    close: 63611.9,
    volume: 13.385999999999965,
    start_ts: 1785280680000,
    end_ts: 1785280740000,
  },
  {
    time: 1785280740,
    open: 63611.9,
    high: 63612.0,
    low: 63600.0,
    close: 63600.1,
    volume: 74.86900000000011,
    start_ts: 1785280740000,
    end_ts: 1785280800000,
  },
];

const DEFAULT_SERIES: LayoutSeries = {
  id: "candle-series",
  kind: "CandleBubbleSeries",
  options: {
    id: "candle-series",
    label: "Candlesticks",
    layer: "background",
    color: "red",
    priceTagColor: "#F23645",
    params: {
      bullColor: "#089981",
      bearColor: "#F23645",
    },
  },
};

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const tabManager = useTabManager();

const tab = tabManager.getTabById(props.tabId)!;
const tabStore = useTradingTabStore(tab as TradingTab);

const unsubscribe = tabStore.subscribe((event: any) => {
  switch (event.type) {
    case "series-added":
      break;
    case "live-update":
      for (const [seriesId, liveData] of Object.entries(event.data.series)) {
        chart.value?.updateLive(seriesId, liveData);
      }
      break;
    case "layout-replaced":
      break;
  }
});

tabStore.addSeriesToLayout(DEFAULT_SERIES);

const getSessionParams = (): [string, string, string, string] => [
  props.tabId,
  tabStore.source,
  tabStore.symbol,
  tabStore.timeframe,
];

// Connect to market websocket tabId, source, symbol, timeframe
const session = useTradingSession(...getSessionParams());

const chart = ref<InstanceType<typeof Chart>>();

onBeforeUnmount(unsubscribe);

onMounted(() => {
  chart?.value?.applyLayout(tabStore.layout);

  chart.value?.applyOptions("candle-bubble-series", {
    legend: "Bitcoin/Tether USD · 4h",
  });
  chart.value?.setData("candle-bubble-series", history);
});

onUnmounted(() => {
  unsubscribe();
});
</script>

<template>
  <div class="trading-tab">
    <Chart ref="chart" />
  </div>
</template>

<style scoped>
.trading-tab {
  height: 100%;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  box-shadow: var(--card-shadow);
  padding: var(--tab-content-padding);
}
</style>
