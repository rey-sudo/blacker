<template>
  <div class="footer-backtest-bar">
    <USlider size="xs" :default-value="0" />

    <UButton
      size="xs"
      icon="i-lucide-step-back"
      color="neutral"
      variant="outline"
    />
    <UButton size="xs" icon="i-lucide-play" color="neutral" variant="outline" />
    <UButton
      size="xs"
      icon="i-lucide-step-forward"
      color="neutral"
      variant="outline"
    />
  </div>
</template>

<script setup></script>

<style lang="css" scoped>
.footer-backtest-bar {
  width: 300px; 
  display: flex;
  gap: 1rem;
}
</style>
