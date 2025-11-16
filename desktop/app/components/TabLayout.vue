<template>
  <div class="tab-layout" ref="appGrid">
    <PadComp />

    <div v-for="tab in tabs" :key="tab.id">
      <component :is="tab.component" :tabId="tab.id" />
    </div>
  </div>
</template>

<script setup>
import TabComp from "@/components/TabComp.vue";
import { ref, onMounted, onBeforeUnmount, markRaw } from "vue";

const tabs = ref([]);

function addTab(id, componentName) {
  tabs.value.push({
    id,
    component: markRaw(TabComp),
  });
}

function removeTab(id) {
  tabs.value = tabs.value.filter((t) => t.id !== id);
}

addTab("0", TabComp);
onMounted(() => {});
</script>

<style scoped>
.tab-layout {
  display: flex;
  flex-direction: column;
}
</style>
