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
import Chart, {
  type ChartSerie,
  type ChartTimeframe,
} from "~/components/Chart.vue";

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

// Connect to backtest websocket
const _session = useBacktestingSession(props.tabId, tabStore.symbol);

// Charts.
const charts = ref<InstanceType<typeof Chart>[]>([]);

// Subscription to tabStore must be before the websocket connection.
const unsubscribe = tabStore.subscribe((event: any) => {
  switch (event.type) {
    case "live-update":
      const timeframeEntries = Object.entries(
        tabStore.globalState.timeframes,
      ).entries();

      for (const [i, [key, timeframe]] of timeframeEntries) {
        const chart = charts.value[i];

        chart?.applyLayout(timeframe as ChartTimeframe);

        const seriesEntries = Object.entries(timeframe.series).entries();

        for (const [ii, [key, serie]] of seriesEntries) {
          const serie_ = serie as ChartSerie;
          const history = serie_?.history;

          chart?.patchData(key, history);

          chart?.applyOptions(key, {
            legend: "Bitcoin/Tether USD",
          });
        }
      }

      break;
  }
});

const activeTimeframe = ref("1m");

onUnmounted(() => {
  unsubscribe();
});
</script>

<template>
  <div class="backtesting-tab">
    <BacktestingToolbar
      :tab-id="tabId"
      :timeframes="Object.keys(tabStore.globalState.timeframes)"
      :active-timeframe="activeTimeframe"
      @update:timeframe="activeTimeframe = $event"
    />

    <Chart
      v-for="(timeframe, key) in tabStore.globalState.timeframes"
      :key="key"
      ref="charts"
      v-show="key === activeTimeframe"
      :timeframe="timeframe"
    />
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
