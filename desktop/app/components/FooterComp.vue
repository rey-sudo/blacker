<template>
  <div class="footer">
    <UButton
      class="rounded-none"
      icon="i-lucide-layers"
      size="xs"
      variant="ghost"
      >Positions</UButton
    >
    <UBadge size="sm" color="neutral" variant="outline">0</UBadge>

    <UButton
      class="rounded-none"
      icon="i-lucide-history"
      size="xs"
      variant="ghost"
      >Order History</UButton
    >

    <UButton
      class="rounded-none"
      icon="i-lucide-chart-candlestick"
      size="xs"
      variant="ghost"
      >Backtesting</UButton
    >
    <UBadge size="sm" color="neutral" variant="outline">0</UBadge>
    <UButton class="rounded-none" icon="i-lucide-bot" size="xs" variant="soft"
      >Bots</UButton
    >
    <UBadge size="sm" color="neutral" variant="outline">0</UBadge>
    
    <FooterBuySellButtons style="margin-left: auto" />
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
