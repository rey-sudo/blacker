<template>
  <div class="header">
    <img class="logo" src="../assets//icons/logo.svg" alt="" />

    <div class="header-body">
      <SymbolSelector />
      <Button
        icon="pi pi-plus"
        size="small"
        variant="outlined"
      />
    </div>
  </div>
</template>

<script setup>
onMounted(() => { 
  document.body.classList.toggle("p-dark");
});
</script>

<style lang="css" scoped>
.header {
  gap: 1rem;
  height: 3rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border-0);
}

.header-body {
  gap: 1rem;
  display: flex;
  align-items: center;
}
</style>
