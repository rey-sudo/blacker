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

const tabsStore = useTabsStore();

const tab: ComputedRef<Tab | undefined> = computed(() => tabsStore.getTabById(props.tabId));
const tabStore = computed(() => useTabContentStore(tab.value!));

const menuOpen = ref(false);
const menuItems: ContextMenuItem[] = [
  [
    {
      label: "Clone",
      icon: "i-lucide-copy-plus",
      onSelect() {
        tabsStore.cloneTab(props.tabId);
      },
    },
    {
      label: "Delete Tab",
      color: "error" as const,
      icon: "i-lucide-x",
      onSelect() {
        tabsStore.closeTab(props.tabId);
      },
    },
  ],
  [
    {
      label: "Delete All Tabs",
      color: "error" as const,
      icon: "i-lucide-x",
      onSelect() {
        tabsStore.closeAllTabs();
      },
    },
  ],
];

const tabColor: any = computed(() => tabStore.value?.tabColor ?? "primary");

onMounted(() => tabStore.value?.onMount());
onUnmounted(() => tabStore.value?.onUnmount());
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
  border: 1px solid var(--ui-border);
  border-top-left-radius: calc(var(--ui-radius) * 0.5);
  border-top-right-radius: calc(var(--ui-radius) * 0.5);
  align-items: center;
  border-bottom: none;
  font-weight: 600;
  cursor: pointer;
  height: 2rem;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
}

.tab-label {
  padding: 0.5rem 1rem;
}

.tab-label span {
  margin-left: 0.25rem;
}

.tab.active {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border-muted);
  border-bottom: none;
}

.tab.inactive {
  background: transparent;
}

.tab:hover {
  background: var(--ui-bg-elevated);
}
</style>
