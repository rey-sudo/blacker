<template>
  <div class="footer">
    <div class="flex items-center justify-center gap-2">
      <UButton color="neutral" size="xs" variant="ghost"
        >Positions

        <template #trailing>
          <UBadge size="xs" color="neutral" variant="subtle">2</UBadge>
        </template>
      </UButton>
      <UButton color="neutral" size="xs" variant="ghost">
        <template #trailing>
          <UBadge size="xs" color="neutral" variant="subtle">1</UBadge>
        </template>

        Alerts</UButton
      >
      <UButton color="neutral" size="xs" variant="ghost">History</UButton>

      <UButton color="neutral" size="xs" variant="ghost">Backtesting</UButton>

      <UButton color="neutral" size="xs" variant="ghost">Bots</UButton>

      <USeparator orientation="vertical" class="h-6 pl-2 pr-2" />
      <FooterTime />
      <USeparator orientation="vertical" class="h-6 px-2" />
    </div>

   
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer {
  background: var(--footer-background);
  height: var(--footer-height);
  padding: 0 1rem;
  width: 100%;
  z-index: 100;
  display: flex;
  align-items: center;
}
</style>
