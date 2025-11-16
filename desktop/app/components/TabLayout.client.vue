<template>
  <div class="tab-layout">
    <div v-for="tab in tabs" :key="tab.id">
      <component :is="tab.component" :tabId="tab.id" />
    </div>
  </div>
</template>

<script setup>
import TabContent from "~/components/TabContent.vue";
import { ref, onMounted, onBeforeUnmount, markRaw } from "vue";

const tabsStore = useTabsStore();
const tabs = ref([]);

watch(
  () => tabsStore.tabs,
  (newTabs) => {
    console.log(newTabs);

    tabs.value = newTabs.map((tab) => ({
      id: tab.id,
      component: markRaw(TabContent),
    }));
  },
  { deep: true, immediate: true }
);

function removeTab(id) {
  tabs.value = tabs.value.filter((t) => t.id !== id);
}

onMounted(() => {});
</script>

<style scoped></style>
