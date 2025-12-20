<template>
  <div class="tab">
    <CandleChart :tabId="tabId" />
    <TabIndicators />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { fakeData1 } from "./fakeData";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const chartDiv = ref(null);
const chartWidth = ref(0);
const chartHeight = ref(0);

let chartObserver;

onMounted(async () => {
  await tabStore.start();

  chartObserver = new ResizeObserver(() => {
    const chartHeaderHeight = 48;

    if (chartDiv.value) {
      chartWidth.value = chartDiv.value.clientWidth;
      chartHeight.value = chartDiv.value.clientHeight - chartHeaderHeight;
    }
  });

  chartObserver.observe(chartDiv.value);
});

onBeforeUnmount(() => {
  if (chartObserver) chartObserver.disconnect();
});
</script>

<style lang="css" scoped>
.tab {
  display: grid;
  padding: var(--tab-padding);
  box-sizing: border-box;
  row-gap: 0.25rem;
  gap: 0.25rem;
  height: 92vh;
  overflow: hidden;
  grid-template-rows: 70% 30%;
  background: var(--main-background);
}

/* Chrome, Edge, Safari */
.tab::-webkit-scrollbar {
  width: 0.75rem;
}

.tab::-webkit-scrollbar-track {
  background: var(--ui-bg);
}

.tab::-webkit-scrollbar-thumb {
  background: var(--color-neutral-400);
  border-radius: var(--ui-radius);
  border-right: 1px solid transparent;
  background-clip: content-box;
  cursor: grab;
}

.tab::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-500);
}
</style>
