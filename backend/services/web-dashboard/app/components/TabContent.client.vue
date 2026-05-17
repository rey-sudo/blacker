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

import TabTrading from "./TabTrading.vue";
import TabBacktesting from "./TabBacktesting.vue";
import { useTabContentStore } from '~/stores/tabs';

const props = defineProps<{ tabId: string }>()

const tabsStore = useTabsStore()

// tab puede ser undefined si el id no existe
const tab = computed(() => tabsStore.getTabById(props.tabId))

// tabStore puede ser null — el template lo guarda con v-if
const tabStore = computed(() => useTabContentStore(tab.value))

const component = computed(() => {
  if (!tab.value) return null
  switch (tab.value.kind) {
    case TabKind.Trading:     return TabTrading
    case TabKind.Backtesting: return TabBacktesting
  }
})

// Ciclo de vida — todos los stores implementan onMount/onUnmount
onMounted(()   => tabStore.value?.onMount())
onUnmounted(() => tabStore.value?.onUnmount())
</script>

<template>
  <div class="tab-content">
    <component
      v-if="tabStore && component"
      :is="component"
      :tabId="tabStore.id"
    />
  </div>
</template>
<style lang="css" scoped>
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: var(--tab-content-padding);
}
</style>
