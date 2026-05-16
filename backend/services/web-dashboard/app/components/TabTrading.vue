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
  display: flex;
  height: 100%;
  flex-direction: column;
  background: red;
}
</style>
