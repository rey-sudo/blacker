<template>
  <CandleChart :tabId="tabId" />
</template>

<script setup>
const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});
</script>

<style lang="css" scoped></style>
