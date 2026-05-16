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

const getBorderColor = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return "neutral";

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
  border-top: 1px solid var(--ui-border);
  border-top-left-radius: var(--ui-radius);
  border-top-right-radius: var(--ui-radius);
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
  margin-left: 0.5rem;
}

.tab.active {
  background: var(--ui-bg-muted);
  border-left: 1px solid var(--ui-border-muted);
  border-right: 1px solid var(--ui-border-muted);
  border-top: 1px solid var(--ui-border-muted);
}

.tab.inactive {
  background: transparent;
}

.tab:hover {
  background: var(--ui-bg-elevated);
}
</style>
