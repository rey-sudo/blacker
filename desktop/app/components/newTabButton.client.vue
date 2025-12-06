<template>
  <Button icon="pi pi-plus" size="small" @click="visible = true" variant="text" />
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    header="Symbol Search"
    :style="{ width: '60rem', height: '40rem' }"
  >
    <SymbolSearch @close="visible = false" @select="onSelect" />
  </Dialog>
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
