<template>
  <TabContent
    v-for="tab in tabsStore.allTabs"
    :key="tab.id"
    :tabId="tab.id"
    :isActive="tab.id === tabsStore.activeTabId"
    :style="{
      visibility: tab.id === tabsStore.activeTabId ? 'visible' : 'hidden',
      position: tab.id === tabsStore.activeTabId ? 'relative' : 'absolute',
    }"
  />
</template>

<script setup>
import TabContent from "~/components/TabContent.client.vue";

const tabsStore = useTabsStore();

</script>
