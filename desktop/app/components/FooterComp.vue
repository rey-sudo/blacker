<template>
  <div class="footer">
    <div class="flex justify-center gap-6">
      <UButton color="neutral" size="xs" variant="ghost" icon="lucide:activity"
        >Positions

        <template #trailing>
          <UBadge size="md" color="neutral" variant="soft">0</UBadge>
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

      <UButton color="neutral" icon="i-lucide-cpu" size="xs" variant="ghost"
        >Bots</UButton
      >

      <UButton color="neutral" icon="i-lucide-bell" size="xs" variant="ghost">
        <template #trailing>
          <UBadge size="md" color="neutral" variant="soft">0</UBadge>
        </template>

        Alerts</UButton
      >
    </div>

    <FooterBuySellButtons style="margin-left: auto" />
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer {
  border-top: 1px solid var(--ui-border);
  background: var(--nav-background);
  height: var(--footer-height);
  position: fixed;
  padding: 0 1rem;
  width: 100%;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
}
</style>
