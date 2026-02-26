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
      <p class="text-muted w-100">
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

        <UButton color="neutral" size="md" variant="solid">Create</UButton>
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

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const open = ref(true);

const title = computed(() => {
  return `Create backtest on ${tabStore.symbol}`;
});
</script>
