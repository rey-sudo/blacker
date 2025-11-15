<template>
  <div class="header">
    <img src="../assets//icons/logo.svg" alt="" />

    <div class="header-body">
      <IndicatorSelector />
      <SymbolSelector />
      <Button icon="pi pi-plus" size="small" variant="icon" />
    </div>
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.header {
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
