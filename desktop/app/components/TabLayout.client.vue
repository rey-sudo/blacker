<template>
  <div class="tab-layout">
    <div v-for="tab in tabs" :key="tab.id">
      <component :is="tab.component" :tabId="tab.id" />
    </div>
  </div>
</template>

<script setup>
import TabContent from "~/components/TabContent.vue";
import { ref, watch, markRaw } from "vue";

const tabsStore = useTabsStore();
const tabs = ref([]);

watch(
  () => tabsStore.tabs,
  (newTabs) => {
    newTabs.forEach(tab => {

      if (!tabs.value.find(t => t.id === tab.id)) {
        tabs.value.push({
          id: tab.id,
          component: markRaw(TabContent)
        });
      }
    });
  },
  { deep: true, immediate: true }
);

function removeTab(id) {
  tabs.value = tabs.value.filter(t => t.id !== id);
}
</script>

<style scoped></style>
