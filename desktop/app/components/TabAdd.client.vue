<template>
  <UButton
    icon="i-lucide-plus"
    size="xs"
    color="neutral"
    @click="visible = true"
    variant="outline"
  />

  <UModal v-model:open="visible" title="Symbol Search">
    <template #body>
      <TabSymbolSearch @close="visible = false" @select="onSelect" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { TabKind, type TradingTab } from "~/stores/tabs";

const tabsStore = useTabsStore();

const visible = ref(true);

const onSelect = () => {
  const newTab: TradingTab = {
    id: `hashid${Date.now()}`,
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
