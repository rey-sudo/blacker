<template>
  <KeepAlive :max="5">
    <TabContent
      v-if="tabsStore.activeTabId"
      :key="tabsStore.activeTabId"
      :tabId="tabsStore.activeTabId"
    />
  </KeepAlive>
</template>

<script setup>
import TabContent from "~/components/TabContent.client.vue";

const tabsStore = useTabsStore();

/**
 * We wrap TabContent with <KeepAlive> to cache inactive tabs instead of destroying them.
 *
 * Without KeepAlive:
 * - Switching tabs would unmount the current TabContent
 * - The chart instance would be destroyed
 * - Internal state (zoom, scroll, indicators, etc.) would be lost
 * - Returning to the tab would require a full re-mount and re-initialization
 *
 * With KeepAlive:
 * - Only one TabContent is rendered at a time (based on activeTabId)
 * - Previously visited tabs are cached in memory
 * - Switching back to a tab reactivates it instantly (no re-mount)
 *
 * We also use onActivated() and onDeactivated() inside TabContent
 * to pause and resume heavy processes (websockets, render loops, observers).
 *
 * The :max prop limits how many inactive tabs are kept in memory,
 * preventing excessive memory usage (LRU cache behavior).
 *
 * This approach provides:
 * - Better performance (only one active chart running)
 * - Instant tab switching
 * - Controlled memory usage
 */
</script>
