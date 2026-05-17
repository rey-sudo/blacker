<template>
  <div class="tab-backtesting">
    <BacktestingToolbar />
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
.tab-backtesting {
  display: flex;
  flex-direction: column;
}
</style>
