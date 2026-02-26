<template>
  <div class="tab fz-0" :class="[isActive ? 'active' : 'inactive']">
    <UChip standalone inset size="xs" :color="tabColor" />

    <div class="tab-label" @click="visible = true">{{ tabName }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

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

const visible = ref(false);

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const currentTab = tabStore.getCurrentTab(props.tabId);

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
  padding: 0.5rem 1rem;
  align-items: center;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  height: inherit;
  overflow: hidden;
}

.tab.active {
  background: var(--ui-bg);
  border-bottom-color: var(--color-white);
}

.tab.inactive {
  background: var(--ui-bg);
  border-bottom-color: transparent;
}

.tab:hover {
  background: var(--ui-bg-elevated);
}

.tab-label {
  margin-left: 0.25rem;
}
</style>
