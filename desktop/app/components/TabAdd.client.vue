<template>
  <div class="tab-add flex items-center h-[inherit]">
    <UButton
      class="mt-2"
      icon="i-lucide-plus"
      size="sm"
      color="neutral"
      @click="visible = true"
      variant="ghost"
    />

    <UModal v-model:open="visible" title="Symbol Search">
      <template #body>
        <TabSymbolSearch @close="visible = false" @select="onSelect" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { TabKind, type TradingTab } from "~/stores/tabs";

const tabsStore = useTabsStore();

const visible = ref(true);

const onSelect = () => {
  const newTab: TradingTab = {
    id: crypto.randomUUID(),
    kind: TabKind.Trading,
    title: "tab test",
    subtitle: "tab sub",
    description: "tab description",
    color: "red",
    symbol: "BTCUSDT",
    timeframe: "H1",
  };

  visible.value = false;
  tabsStore.addTab(newTab);
};
</script>

<style lang="css" scoped></style>
