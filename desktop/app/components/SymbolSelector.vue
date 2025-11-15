<template>
  <div class="symbol-selector">
    <div>BTCUSDT 4h</div>
    <i class="pi pi-times"></i>
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.symbol-selector {
  border-left: 1px solid var(--border-0);
  border-right: 1px solid var(--border-0);
  font-size: var(--font-size-1);
  align-items: center;
  font-weight: 600;
  padding: 0.5rem;
  display: flex;
}

.symbol-selector i {
  cursor: pointer;
  margin-left: 0.5rem;
  font-size: var(--font-size-0);
}
</style>
