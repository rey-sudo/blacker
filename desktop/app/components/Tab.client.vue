<template>
  <div class="tab">
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
.tab {
  border-left: 1px solid var(--ui-border);
  border-right: 1px solid var(--ui-border);
  border-bottom: 1px solid var(--ui-primary);
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

</style>
