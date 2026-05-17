<template>
  <div class="tab-trading">
    <ChartToolbar :tabId="tabId" />
    <ChartCandlestick :tabId="tabId" />
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

<style scoped>
.tab-trading {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: calc(var(--ui-radius) * 0.5);
  overflow: hidden;
}
</style>
