<template>
  <div class="backtesting-rows">
    <div class="row" v-for="n in rows" :key="n"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const rows = ref<number[]>(Array.from({ length: 4 }, (_, i) => i));
</script>

<style scoped>
.backtesting-rows {
  flex: 1;
  gap: 0.5rem;
  min-height: 0;
  display: flex;
  overflow-y: auto;
  flex-direction: column;
}

.row {
  min-height: 400px;
  background: var(--ui-bg);
  box-shadow: var(--card-shadow);
  border-radius: var(--ui-radius);
  border-bottom: 1px solid var(--ui-border);
}
</style>
