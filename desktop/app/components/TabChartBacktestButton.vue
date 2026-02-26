<template>
  <UModal
    v-model:open="open"
    :title="title"
    :close="{
      color: 'primary',
      variant: 'outline',
      class: 'rounded-full',
    }"
    :overlay="false"
  >
    <UButton
      color="neutral"
      size="sm"
      variant="ghost"
      icon="lucide:step-forward"
      >Backtest</UButton
    >

    <template #body>
      <p class="text-muted w-100 fz-1">
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
const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const open = ref(false);

const title = computed(() => {
  return `Create backtest on ${tabStore.symbol}`;
});

const onCreate = () => {
  const newTab: BacktestingTab = {
    id: "newId",
    kind: TabKind.Backtesting,
    title: "backtest title",
    subtitle: "sub title",
    description: "description",
    color: "red",
    symbol: tabStore.symbol,
  };

  tabsStore.addTab(newTab);
  open.value = false;
};
</script>
