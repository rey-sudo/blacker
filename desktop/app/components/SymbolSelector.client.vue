<template>
  <div class="symbol-selector">
    <div @click="visible = true">BTCUSDT 4h</div>
    <i class="pi pi-times" />
  </div>
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    header="Edit Profile"
    :style="{ width: '50rem' }"
  >
    </Dialog>
</template>

<script setup>
import { ref } from "vue";

const visible = ref(false);
</script>

<style lang="css" scoped>
.symbol-selector {
  border-left: 1px solid var(--border-0);
  border-right: 1px solid var(--border-0);
  font-size: var(--font-size-1);
  padding: 0.5rem 1rem;
  align-items: center;
  font-weight: 600;
  cursor: pointer;
  display: flex;
}

.symbol-selector i {
  cursor: pointer;
  margin-left: 0.5rem;
  margin-top: 3px;
  font-size: var(--font-size-0);
}
</style>
