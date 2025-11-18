<template>
  <div class="pad">
    <div class="price">91,312.00</div>

    <div class="buttons">
      <Button label="Buy" />
      <Button label="Sell" severity="danger" />
    </div>
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.pad {
  height: 3rem;
  border: 1px solid var(--border-0);
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.price {
  font-size: var(--font-size-5);
  font-weight: 700;
}

.buttons {
  margin-left: auto;
}
</style>
