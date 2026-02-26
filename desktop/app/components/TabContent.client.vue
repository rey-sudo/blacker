<template>
  <div class="tab-content">
    <component v-if="currentTab" :is="component" :tabId="currentTab.id" />
  </div>
</template>

<script setup lang="ts">
import TabTrading from "./TabTrading.vue";
import Backtesting from "./TabBacktesting.vue";
import { onMounted, onActivated, onDeactivated } from "vue";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const tabsStore = useTabsStore();
const currentTab = computed(() => tabsStore.getTabById(props.tabId));

const useTabStore = createTabStore(props.tabId);
const currentTabStore = useTabStore();

const getComponentByKind = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return TabTrading;

    case TabKind.Backtesting:
      return Backtesting;
  }
};

const component = computed(() => {
  if (!currentTab.value) return null;

  return getComponentByKind(currentTab.value.kind);
});

onActivated(() => {
  //currentTabStore.resume?.();
});

onDeactivated(() => {
  //currentTabStore.pause?.();
});

onMounted(async () => {
  console.log(currentTab.value);

  await currentTabStore.start();
});
</script>

<style lang="css" scoped>
.tab-content {
  display: grid;
  gap: 0.25rem;
  height: calc(100vh - (var(--header-height) + var(--footer-height)));
  overflow: hidden;
  padding: var(--tab-content-padding);
  grid-template-rows: 8fr 2fr;
  box-sizing: border-box;
}

/* Chrome, Edge, Safari */
.tab-content::-webkit-scrollbar {
  width: 0.75rem;
}

.tab-content::-webkit-scrollbar-track {
  background: var(--ui-bg);
}

.tab-content::-webkit-scrollbar-thumb {
  background: var(--color-neutral-400);
  border-radius: var(--ui-radius);
  border-right: 1px solid transparent;
  background-clip: content-box;
  cursor: grab;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-500);
}
</style>
