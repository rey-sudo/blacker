<template>
  <UModal
    v-model:open="open"
    :title="title"
    :close="{
      color: 'neutral',
      variant: 'outline',
      class: 'rounded-full',
    }"
    :overlay="false"
  >
    <UButton
      class="ml-auto"
      color="neutral"
      size="xs"
      variant="ghost"
      icon="material-symbols:fast-forward"
      >Backtest</UButton
    >

    <template #body>
      <p class="w-100 fz-1">
        Validate your strategy with historical data to uncover strengths,
        weaknesses, and potential risks before trading live.
      </p>
    </template>

    <template #footer>
      <div class="content w-100 flex justify-end gap-2">
        <UButton
          color="neutral"
          size="md"
          variant="outline"
          @click="open = false"
          >Cancel</UButton
        >

        <UButton color="neutral" size="md" variant="solid" @click="onCreate"
          >Create</UButton
        >
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});

const tabsStore = useTabsStore();

const tab = computed(() => tabsStore.getTabById(props.tabId));

const open = ref(false);

const title = computed(() => {
  return `Create a backtest for ${tab.value.symbol}`;
});

const onCreate = () => {
  const newTab: BacktestingTab = {
    id: "newId",
    kind: TabKind.Backtesting,
    title: "backtest title",
    subtitle: "sub title",
    description: "description",
    color: "red",
    symbol: tab.value.symbol,
  };

  tabsStore.addTab(newTab);
  open.value = false;
};
</script>
