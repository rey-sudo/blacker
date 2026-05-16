<template>
  <div class="tab-content">
    <component v-if="tabStore.id" :is="component" :tabId="tabStore.id" />
  </div>
</template>

<script setup lang="ts">
import TabTrading from "./TabTrading.vue";
import Backtesting from "./TabBacktesting.vue";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const tabsStore = useTabsStore();

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const getComponentByKind = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return TabTrading;

    case TabKind.Backtesting:
      return Backtesting;
  }
};

const component = computed(() => {
  const currentTab = tabsStore.getTabById(props.tabId);
  if (!currentTab) return;
  return getComponentByKind(currentTab.kind);
});

onMounted(() => {
  tabStore.start();
});

onUnmounted(() => {
  tabStore.pause();
});
</script>

<style lang="css" scoped>
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: var(--tab-content-padding);
}
</style>
