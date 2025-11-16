<template>
  <Button icon="pi pi-plus" size="small" @click="visible = true" />
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    header="Edit Profile"
    :style="{ width: '50rem' }"
  >
    <SearchSymbol />
  </Dialog>
</template>

<script setup>
const visible = ref(true);
</script>

<style lang="css" scoped></style>
