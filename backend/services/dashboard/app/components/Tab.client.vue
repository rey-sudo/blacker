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

import { ref } from "vue";
import type { ContextMenuItem } from "@nuxt/ui";
import { useTabContentStore } from "~/stores/tabs";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    required: true,
  },
});

const tabManager = useTabManager();

const tab = tabManager.getTabById(props.tabId)!;
const tabStore = useTabContentStore(tab);

const menuOpen = ref(false);
const menuItems: ContextMenuItem[] = [
  [
    {
      label: "Clone",
      icon: "i-lucide-copy-plus",
      onSelect() {
        tabManager.cloneTab(props.tabId);
      },
    },

    {
      label: "Backtest",
      icon: "i-lucide-step-forward",
      onSelect() {
        const newTab: BacktestingTab = {
          id: crypto.randomUUID(),
          kind: TabKind.Backtesting,
          title: "tab test",
          subtitle: "tab sub",
          description: "tab description",
          color: "primary",
          symbol: "BTCUSDT",
          source: "binance",
          timeframe: "1m",
        };

        tabManager.addTab(newTab);
      },
    },
    {
      label: "Delete Tab",
      color: "error" as const,
      icon: "i-lucide-x",
      onSelect() {
        tabManager.closeTab(props.tabId);
      },
    },
  ],
  [
    {
      label: "Delete All Tabs",
      color: "error" as const,
      icon: "i-lucide-x",
      onSelect() {
        tabManager.closeAllTabs();
      },
    },
  ],
];

const tabColor: any = computed(() => tabStore?.tabColor ?? "primary");

onMounted(() => tabStore?.onMount());
onUnmounted(() => tabStore?.onUnmount());
</script>

<template>
  <div class="tab text-xs" :class="[isActive ? 'active' : 'inactive']">
    <UContextMenu v-model:open="menuOpen" :items="menuItems" size="sm">
      <div class="tab-label flex items-center">
        <UChip standalone inset size="xs" :color="tabColor" />
        <span> {{ tabStore?.tabTitle }}</span>
      </div>
    </UContextMenu>
  </div>
</template>

<style lang="css" scoped>
.tab {
  border: 1px solid transparent;
  border-top-left-radius: calc(var(--ui-radius) * 1);
  border-top-right-radius: calc(var(--ui-radius) * 1);
  align-items: center;
  border-bottom: none;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
}

.tab:hover {
  background: var(--ui-bg-muted);
}

.tab-label {
  padding: 0.5rem 1rem;
}

.tab-label span {
  margin-left: 0.5rem;
}

.tab.active {
  border: 1px solid var(--ui-border-accented);
  background: var(--ui-bg-elevated);
  border-bottom: none;
}
</style>
