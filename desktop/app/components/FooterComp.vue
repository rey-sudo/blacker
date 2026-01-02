<template>
  <div class="footer">
    <div class="flex items-center justify-center gap-1">
      <UButton color="neutral" size="xs" variant="ghost"
        >Positions

        <template #trailing>
          <UBadge size="sm" color="neutral" variant="outline">2</UBadge>
        </template>
      </UButton>

      <USeparator orientation="vertical" class="h-6 px-1" />
      <UButton color="neutral" size="xs" variant="ghost">
        <template #trailing>
          <UBadge size="sm" color="neutral" variant="outline">1</UBadge>
        </template>

        Alerts</UButton
      >
      <USeparator orientation="vertical" class="h-6 px-1" />
      <UButton color="neutral" size="xs" variant="ghost">Order History</UButton>
      <USeparator orientation="vertical" class="h-6 px-1" />
      <UButton color="neutral" size="xs" variant="ghost">Backtesting</UButton>
      <USeparator orientation="vertical" class="h-6 px-1" />
      <UButton color="neutral" size="xs" variant="ghost">Algorithmic</UButton>
      <USeparator orientation="vertical" class="h-6 pl-1 pr-4" />
      <FooterBacktestBar />
      <USeparator orientation="vertical" class="h-6 px-4" />
    </div>

    <FooterExecute style="margin-left: auto" />
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer {
  border-top: 1px solid var(--ui-border);
  background: var(--nav-background);
  height: var(--footer-height);
  padding: 0 1rem;
  width: 100%;
  z-index: 100;
  display: flex;
  align-items: center;
}
</style>
