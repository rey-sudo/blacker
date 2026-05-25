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

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const tabsStore = useTabsStore();

const tab: ComputedRef<Tab | undefined> = computed(() =>
  tabsStore.getTabById(props.tabId),
);
</script>

<template>
  <div class="trading-tab">
    <ChartToolbar :tabId="tabId" />
    <ChartCandlestick :tabId="tabId" />
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
