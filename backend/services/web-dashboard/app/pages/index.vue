<template>
  <!-- 
    Dynamically renders the active tab content. 
    The ':key' attribute forces a clean re-render whenever the active tab changes.
  -->
  <TabContent v-if="activeTab" :key="activeTab.id" :tabId="activeTab.id" />
</template>

<script setup lang="ts">
/**
 * @component TabViewer
 * @description Dynamically manages and displays the content of the currently selected tab.
 * It automatically syncs with the global tabs store to determine which tab is active.
 */
import TabContent from "~/components/TabContent.client.vue";

// Initialize the global state store for tabs management
const tabsStore = useTabsStore();

/**
 * Reactive computed property that retrieves the current active tab object.
 * It searches through all available tabs to find the one matching the active ID.
 *
 * @returns {ComputedRef<Object|undefined>} The active tab object, or undefined if no match is found.
 */
const activeTab = computed(() =>
  tabsStore.allTabs.find((t: Tab) => t.id === tabsStore.activeTabId),
);
</script>
