<template>
  <div v-for="tab in renderedTabs" :key="tab.id" class="index-page">
    <component :is="tab.component" :tabId="tab.id" />
  </div>
</template>

<script setup>
import TabContent from "~/components/TabContent.client.vue";
import { markRaw } from "vue";

const tabsStore = useTabsStore();

/**
 * We derive `renderedTabs` from the store using a computed property.
 *
 * Even though this computed recalculates whenever `allTabs` changes,
 * Vue will NOT remount all TabContent components.
 *
 * Because we use `:key="tab.id"` in the template, Vue's Virtual DOM
 * diffing algorithm preserves existing component instances and only
 * mounts the newly added tab.
 *
 * This makes the approach declarative, safe, and more maintainable
 * than manually syncing state with a watcher.
 *
 * Only new tabs are mounted.
 * Existing tabs remain untouched.
 */
const renderedTabs = computed(() =>
  tabsStore.allTabs.map(tab => ({
    id: tab.id,
    component: markRaw(TabContent)
  }))
);
</script>

<style scoped></style>
