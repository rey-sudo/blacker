<template>
  <div class="footer">
    <UButton
      class="rounded-none"
      icon="i-lucide-list-checks"
      size="xs"
      variant="soft"
      >Positions</UButton
    >
    <UButton
      class="rounded-none"
      icon="i-lucide-history"
      size="xs"
      variant="soft"
      >Order History</UButton
    >

    <UButton
      class="rounded-none"
      icon="i-lucide-chart-candlestick"
      size="xs"
      variant="soft"
      >Backtesting</UButton
    >

    <UButton class="rounded-none" icon="i-lucide-bot" size="xs" variant="soft"
      >Bots</UButton
    >

    <UButton class="font-bold rounded-none" size="lg" color="success" icon="i-lucide-arrow-up-right"
      >Buy</UButton
    >
    <UButton class="font-bold rounded-none" size="lg" color="error" icon="i-lucide-arrow-down-left"
      >Sell</UButton
    >
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer {
  height: 3rem;
  border-top: 2px solid var(--border-2);
  position: fixed;
  background: var(--nav-background);
  width: 100%;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
}
</style>
