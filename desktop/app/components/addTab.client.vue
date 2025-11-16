<template>
  <Button icon="pi pi-plus" size="small" @click="visible = true" />
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    header="Symbol Search"
    :style="{ width: '60rem', height: '40rem' }"
  >
    <SymbolSearch />
  </Dialog>
</template>

<script setup>
const visible = ref(true);
</script>

<style lang="css" scoped></style>
