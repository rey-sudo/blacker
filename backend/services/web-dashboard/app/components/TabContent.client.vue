<template>
  <div class="tab-content">
    <!-- 
      Dynamically resolves and mounts the concrete tab view (e.g., Trading or Backtesting) 
      only when the localized tab store has finished initializing its ID.
    -->
    <component v-if="tabStore.id" :is="component" :tabId="tabStore.id" />
  </div>
</template>

<script setup lang="ts">
/**
 * @component TabContent
 * @description Acts as a dynamic wrapper and orchestrator for individual tab views. 
 * It instantiates an isolated, unique pinia/store instance for each tab identifier 
 * and handles lazy/dynamic resolution of the view matching the tab's metadata category.
 */

import { computed, onMounted, onUnmounted } from "vue";
import TabTrading from "./TabTrading.vue";
import Backtesting from "./TabBacktesting.vue";

const props = defineProps({
  /**
   * Unique identifier passed down by the parent to decouple state context per tab.
   */
  tabId: {
    type: String,
    required: true,
  },
});

// Reference to the global, overarching tabs configuration store
const tabsStore = useTabsStore();

// Factory instantiation targeting a unique, localized store slice for this specific tab instance
const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

/**
 * Maps a structural TabKind enum key to its corresponding Vue SFC constructor.
 * 
 * @param {TabKind} kind - The target functional behavior mode of the tab.
 * @returns {Component | undefined} The matched Vue component object to render.
 */
const getComponentByKind = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return TabTrading;

    case TabKind.Backtesting:
      return Backtesting;
  }
};

/**
 * Reactive computed dependency that safely looks up the current tab's metadata configuration 
 * from the global registry, dynamically determining which component tree to mount.
 * 
 * @returns {Component | undefined} The resolved child component tree context.
 */
const component = computed(() => {
  const currentTab = tabsStore.getTabById(props.tabId);
  if (!currentTab) return;
  return getComponentByKind(currentTab.kind);
});

/**
 * Lifecycle Hook: Triggers background initialization routines (e.g., network polling, 
 * WebSocket handshakes) isolated entirely to this tab's scope upon DOM injection.
 */
onMounted(() => {
  tabStore.start();
});

/**
 * Lifecycle Hook: Teardown/Hibernation routine. Safely suspends active stream connections, 
 * asynchronous pipelines, or structural listeners when the tab is swapped or unmounted.
 */
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