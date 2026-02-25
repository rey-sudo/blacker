<template>
  <div class="tab-content">
    <CandleChart :tabId="tabId" />
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
} from "vue";

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

onActivated(() => {
  //tabStore.resume?.();
});

onDeactivated(() => {
  //tabStore.pause?.();
});

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

  if (chartDiv.value) {
    chartObserver.observe(chartDiv.value);
  }
});

onBeforeUnmount(() => {
  if (chartObserver) chartObserver.disconnect();
});
</script>

<style lang="css" scoped>
.tab-content {
  display: grid;
  gap: 0.25rem;
  height: calc(100vh - (var(--header-height) + var(--footer-height)));
  overflow: hidden;
  padding: var(--tab-content-padding);
  grid-template-rows: 8fr 2fr;
  box-sizing: border-box;
}

/* Chrome, Edge, Safari */
.tab-content::-webkit-scrollbar {
  width: 0.75rem;
}

.tab-content::-webkit-scrollbar-track {
  background: var(--ui-bg);
}

.tab-content::-webkit-scrollbar-thumb {
  background: var(--color-neutral-400);
  border-radius: var(--ui-radius);
  border-right: 1px solid transparent;
  background-clip: content-box;
  cursor: grab;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-500);
}
</style>
