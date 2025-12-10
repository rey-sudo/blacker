<template>
  <div class="footer">
    <div class="flex justify-center gap-4">
      <UButton color="neutral" size="xs" variant="soft"
        >Positions

        <template #trailing>
          <UBadge size="md" color="neutral" variant="outline">0</UBadge>
        </template>
      </UButton>

      <UButton icon="i-lucide-history" color="neutral" size="xs" variant="ghost"
        >Order History</UButton
      >

      <UButton
        icon="i-lucide-chart-candlestick"
        color="neutral"
        size="xs"
        variant="ghost"
        >Backtesting</UButton
      >

      <UButton color="neutral" icon="i-lucide-bot" size="xs" variant="ghost"
        >Bots</UButton
      >

      <UButton color="neutral" icon="i-lucide-bell" size="xs" variant="ghost"
        >Alerts</UButton
      >
    </div>

    <FooterBuySellButtons style="margin-left: auto" />
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer {
  height: 3rem;
  border-top: 2px solid var(--border-2);
  background: var(--nav-background);
  position: fixed;
  padding: 0 1rem;
  width: 100%;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
}
</style>
