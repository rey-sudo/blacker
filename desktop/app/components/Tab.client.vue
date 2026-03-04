<template>
  <div class="tab text-xs" :class="[isActive ? 'active' : 'inactive']">
    <UContextMenu v-model:open="menuOpen" :items="menuItems" size="sm">
      <div class="tab-label flex items-center">
        <UChip standalone inset size="xs" :color="tabColor" />
        <span> {{ tabName }}</span>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ContextMenuItem } from "@nuxt/ui";

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

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const currentTab = tabStore.getCurrentTab(props.tabId);

const menuOpen = ref(false);
const menuItems: ContextMenuItem[] = [
  [
    {
      label: "Clone",
      icon: "i-lucide-arrow-right",
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
    },
  ],
];

const getBorderColor = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return "primary";

    case TabKind.Backtesting:
      return "warning";
  }
};

const getTabName = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return `${tabStore.symbol} ${tabStore.interval}`;

    case TabKind.Backtesting:
      return `${tabStore.symbol}_B`;
  }
};

const tabColor = computed(() => {
  if (!currentTab) return;

  return getBorderColor(currentTab.kind);
});

const tabName = computed(() => {
  if (!currentTab) return;

  return getTabName(currentTab.kind);
});

onMounted(() => {
  tabStore.start();
});

onBeforeUnmount(() => {
  tabStore.stop();
});
</script>

<style lang="css" scoped>
.tab {
  border-left: 1px solid var(--ui-border);
  border-right: 1px solid var(--ui-border);
  border-bottom: 1px solid var(--ui-border);
  align-items: center;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  height: inherit;
  overflow: hidden;
  box-sizing: border-box;
}
.tab-label {
  padding: 0.5rem 1rem;
  height: inherit;
}

.tab-label span {
  margin-left: 0.25rem;
}

.tab.active {
  background: var(--ui-bg);
  border-bottom-color: var(--ui-primary);
}

.tab.inactive {
  background: var(--ui-bg);
  border-bottom-color: transparent;
}

.tab:hover {
  background: var(--ui-bg-elevated);
}
</style>
