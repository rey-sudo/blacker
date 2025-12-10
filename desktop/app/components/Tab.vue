<template>
  <div class="symbol-selector">
    <div @click="visible = true">{{ tabName }}</div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const visible = ref(false);

const useTabStore = createTabStore(props.tabId);
const tabsStore = useTabStore();

const tabName = computed(() => `${tabsStore.symbol} ${tabsStore.interval}`);
</script>

<style lang="css" scoped>
.symbol-selector {
  border-left: 1px solid var(--border-1);
  border-right: 1px solid var(--border-1);
  border-bottom: 1px solid var(--primary-0);
  font-size: var(--font-size-1);
  text-transform: uppercase;
  padding: 0.5rem 1.5rem;
  color: var(--text-0);
  align-items: center;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  height: inherit;
}

.symbol-selector i {
  cursor: pointer;
  margin-left: 0.5rem;
  margin-top: 3px;
  font-size: var(--font-size-0);
}
</style>
