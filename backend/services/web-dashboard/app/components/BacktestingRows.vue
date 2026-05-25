<template>
  <div class="containerx">
    <div class="row" v-for="n in rows" :key="n"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const rows = ref<number[]>(Array.from({ length: 4 }, (_, i) => i));
</script>

<style scoped>
.containerx {
  flex: 1;
  width: 100%;
  display: flex;
  min-height: 0;
  overflow-y: auto;
  overflow: hidden;
  flex-direction: column;
  border-radius: var(--ui-radius);
  gap: var(--tab-content-padding);
}

.row {
  min-height: 400px;
  background: var(--ui-bg);
  box-shadow: var(--card-shadow);
  border-radius: var(--ui-radius);
  border-bottom: 1px solid var(--ui-border);
}
</style>
