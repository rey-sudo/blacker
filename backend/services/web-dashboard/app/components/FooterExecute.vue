<template>
  <div class="footer-execute">
<!--
    <UInputNumber
      v-model="value"
      size="xs"
      color="neutral"
      :step="0.01"
      :highlight="false"
      :format-options="{
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }"
    />    
-->

    <UButton
      class="font-bold"
      size="sm"
      color="success"
      icon="i-lucide-arrow-up-right"
      >Buy</UButton
    >
    <UButton
      class="font-bold"
      size="sm"
      color="error"
      icon="i-lucide-arrow-down-left"
      >Sell</UButton
    >
  </div>
</template>

<script setup>
const value = ref(0.0);
</script>

<style lang="css" scoped>
.footer-execute {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
