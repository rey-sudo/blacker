<script setup lang="ts">
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey - https://github.com/rey-sudo
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

import { useBacktestingTabStore } from "~/stores/tabs";

// Define props to receive the unique identifier for the current tab
const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

// Initialize the main store containing tab definitions
const tabsStore = useTabManager();

// Retrieve the specific tab configuration based on the provided tabId
const tab: ComputedRef<Tab | undefined> = computed(() =>
  tabsStore.getTabById(props.tabId),
);

// Create a reactive instance of the backtesting store tied to the current tab
const tabStore = computed(() =>
  tab.value ? useBacktestingTabStore(tab.value) : undefined,
);

// Watch for changes in the store instance and trigger the start method automatically
watch(
  () => tabStore.value,
  (newStore) => {
    if (newStore) {
      newStore.startStore();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="backtesting-tab">
    <BacktestingToolbar :tabId="tabId" />
    <BacktestingRows :tabId="tabId" />
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
