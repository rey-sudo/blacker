<template>
  <div ref="tabsContainer" class="flex gap-2 overflow-x-auto">
    <Tab
      v-for="tab in tabsStore.allTabs"
      :key="tab.id"
      :data-id="tab.id"
      :tabId="String(tab.id)"
      :isActive="tabsStore.activeTabId === tab.id"
      @click="tabsStore.selectTab(tab.id)"
    />
  </div>
</template>

<script setup>
import Sortable from "sortablejs";
import { ref, onMounted, nextTick } from "vue";

const tabsStore = useTabsStore();
const tabsContainer = ref(null);

onMounted(async () => {
  await nextTick();

  Sortable.create(tabsContainer.value, {
    animation: 200,
    direction: "horizontal",
    ghostClass: "opacity-40",
    draggable: "[data-id]",
    onEnd: (evt) => {
      if (
        evt.oldIndex == null ||
        evt.newIndex == null ||
        evt.oldIndex === evt.newIndex
      )
        return;

      tabsStore.moveTab(evt.oldIndex, evt.newIndex);
    },
  });
});
</script>
