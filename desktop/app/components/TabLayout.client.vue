<template>
  <div class="tab-layout" ref="appGrid">
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

function addTab(id, componentName) {
  tabs.value.push({
    id,
    component: markRaw(TabContent),
  });

  tabsStore.increase();
}

function removeTab(id) {
  tabs.value = tabs.value.filter((t) => t.id !== id);
}


onMounted(() => {});
</script>

<style scoped></style>
