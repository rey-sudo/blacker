<template>
  <UModal
    v-model:open="open"
    title="Create Backtest"
    :close="{
      color: 'primary',
      variant: 'outline',
      class: 'rounded-full',
    }"
  >
    <UButton
      color="neutral"
      size="sm"
      variant="ghost"
      icon="lucide:step-forward"
      >Backtest</UButton
    >
    <template #body>
      <div class="content">x</div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = ref(true);

const openModal = () => {
  open.value = open.value!;
};
</script>

<style lang="css" scoped>
.content {
  width: 700px;
  height: 200px;
}
</style>
