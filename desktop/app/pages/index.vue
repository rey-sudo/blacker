<template>
  <div v-for="tab in tabs" :key="tab.id" class="index-page">
    <component :is="tab.component" :tabId="tab.id" />
  </div>
</template>

<script setup>
import TabContent from "~/components/TabContent.client.vue";
import { ref, watch, markRaw } from "vue";

const tabsStore = useTabsStore();
const tabs = ref([]);

/**
 * We use `markRaw` for the tab component because `TabContent` renders a chart.
 *
 * Chart components (Chart.js, ApexCharts, ECharts, etc.) should not be made reactive,
 * since Vue's reactivity system is unnecessary for them and can cause performance
 * issues or unexpected behavior.
 *
 * By marking the component as raw, we prevent Vue from wrapping it in a Proxy,
 * avoiding unnecessary re-renders and ensuring better stability and performance.
 */

watch(
  () => tabsStore.tabs,
  (newTabs) => {
    newTabs.forEach((tab) => {
      if (!tabs.value.find((t) => t.id === tab.id)) {
        tabs.value.push({
          id: tab.id,
          component: markRaw(TabContent),
        });
      }
    });
  },
  { deep: true, immediate: true },
);
</script>

<style scoped></style>
