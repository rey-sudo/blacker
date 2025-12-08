<template>
  <UButton
    icon="i-lucide-plus"
    size="md"
    @click="visible = true"
    variant="outline"
  />

  <UModal
    v-model:open="visible"
    title="Search symbol"
    :style="{ width: '60rem', height: '40rem' }"
  >
    <template #body>
         <SymbolSearch @close="visible = false" @select="onSelect" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const tabsStore = useTabsStore();

const visible = ref(true);

const fakeAsset = {
  id: "casdcasdascd",
  symbol: "FAKE",
  subtitle: "Fictitious Asset",
  description:
    "This is a mock description for a fake financial asset used for testing purposes.",
  category: "Cryptocurrency",
  exchange: "FakeExchange",
  base: "FAKE",
  quote: "USD",
  precision: 8,
};

const onSelect = (e: SymbolInfo) => {
  visible.value = false;
  tabsStore.addTab(fakeAsset);
};
</script>

<style lang="css" scoped></style>
