<template>
  <div class="tab fz-1" :style="{ borderBottomColor: tabColor }">
    <div @click="visible = true">{{ tabName }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const visible = ref(false);

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const currentTab = tabStore.getCurrentTab(props.tabId);

const getBorderColor = (kind: TabKind) =>{
  switch (kind) {
    case TabKind.Trading:
      return "var(--ui-primary)";

    case TabKind.Backtesting:
      return "var(--color-yellow)";
  }
}

const getTabName = (kind: TabKind) => {
  switch (kind) {
    case TabKind.Trading:
      return `${tabStore.symbol} ${tabStore.interval}`;

    case TabKind.Backtesting:
      return `${tabStore.symbol}_B`;
  }
};

const tabColor = computed(() => {
  if(!currentTab) return;

  return getBorderColor(currentTab.kind);
});

const tabName = computed(() => {
  if(!currentTab) return;

  return getTabName(currentTab.kind);
});

onMounted(() => {
  tabStore.start();
});

onBeforeUnmount(() => {
  tabStore.stop();
});
</script>

<style lang="css" scoped>
.tab {
  border-left: 1px solid var(--ui-border);
  border-right: 1px solid var(--ui-border);
  border-bottom: 0.5px solid
    color-mix(in oklab, var(--ui-primary) 65%, transparent);
  text-transform: capitalize;
  padding: 0.5rem 1rem;
  color: var(--text-0);
  align-items: center;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  height: inherit;
}
</style>
