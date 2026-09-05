<template>
  <div class="footer">
    <div class="flex items-center justify-center gap-2">
      <UButton color="neutral" size="xs" variant="ghost">Live</UButton>

      <UButton color="neutral" size="xs" variant="ghost">Backtesting</UButton>

      <UButton color="neutral" size="xs" variant="ghost">Bots</UButton>

      <USeparator orientation="vertical" class="h-6 px-1" />
      <FooterTime />
      <USeparator orientation="vertical" class="h-6 px-1" />
      
      <HeaderNotificationButton />
      <HeaderThemeButton />
      <HeaderSettingsButton />
    </div>
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer {
  background: var(--footer-background);
  height: var(--header-height);
  padding: 0 1rem;
  width: 100%;
  display: flex;
  align-items: center;
}
</style>
