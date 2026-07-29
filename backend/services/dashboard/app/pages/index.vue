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

import TabContent from "~/components/TabContent.client.vue";

// Initialize the global state store for tabs management.
const tabsStore = useTabsStore();

// Reactive computed property that retrieves the current active tab object.
// It searches through all available tabs to find the one matching the active ID.
const activeTab = computed(() =>
  tabsStore.allTabs.find((t: Tab) => t.id === tabsStore.activeTabId),
);

const selectSymbol = () => {
  tabsStore.symbolSearchModal = true;
};
</script>
<template>
  <!-- 
    Dynamically renders the active tab content. 
    The ':key' attribute forces a clean re-render whenever the active tab changes.
  -->
  <TabContent v-if="activeTab" :key="activeTab.id" :tabId="activeTab.id" />
  <UEmpty
    v-else
    icon="i-lucide-chart-no-axes-column"
    title="No trading symbol selected"
    description="Select a trading symbol to view its data and begin your analysis."
    :actions="[
      {
        icon: 'i-lucide-search',
        label: 'Select symbol',
        color: 'neutral',
        onClick: selectSymbol,
      },
    ]"
    :ui="{
      root: 'rounded-xs m-1',
    }"
  />
</template>
