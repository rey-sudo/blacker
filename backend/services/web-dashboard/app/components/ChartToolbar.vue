<template>
  <div class="chart-toolbar">
    <ChartBacktestButton :tabId="tabId" />
  </div>
</template>

<script setup>
const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});
</script>

<style lang="css" scoped>
.chart-toolbar {
  display: flex;
  padding: 0rem 1rem;
  align-items: center;
  background: var(--chart-background);
  height: var(--chart-toolbar-height);
  border-bottom: 1px solid var(--ui-border);
}
</style>
