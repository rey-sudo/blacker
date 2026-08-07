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

import { DEFAULT_SERIES, useBacktestingTabStore } from "~/stores/tabs";
import Chart from "~/components/Chart.vue";

// Define props to receive the unique identifier for the current tab
const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

// Initialize the main store containing tab definitions
const tabManager = useTabManager();
const tab = tabManager.getTabById(props.tabId)!;
const tabStore = useBacktestingTabStore(tab as BacktestingTab);

tabStore.addSeriesToLayout(DEFAULT_SERIES);

const chart = ref<InstanceType<typeof Chart>>();

//Subscription to tabStore must be before the websocket connection.
const unsubscribe = tabStore.subscribe((event: any) => {
  switch (event.type) {
    case "live-update":
      const data =
        event.data.engine_state.timeframes["1m"].series["candle-series"]
          .history;

      console.log(data);

      chart.value?.patchData(DEFAULT_SERIES.id, data);
      break;
  }
});

// Connect to backtest websocket
const session = useBacktestingSession(props.tabId, tabStore.symbol);

onMounted(() => {
  chart?.value?.applyLayout(tabStore.layout);

  chart.value?.applyOptions("candle-series", {
    legend: "Bitcoin/Tether USD",
  });
});

onUnmounted(() => {
  unsubscribe();
});
</script>

<template>
  <div class="backtesting-tab">
    <BacktestingToolbar :tabId="tabId" />
    <BacktestingRows :tabId="tabId" />
    <Chart ref="chart" />
  </div>
</template>

<style scoped>
.backtesting-tab {
  gap: 0.25rem;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: var(--tab-content-padding);
}
</style>
