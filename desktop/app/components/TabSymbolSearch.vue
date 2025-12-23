<template>
  <div class="tab-symbol-search">
    <div class="tab-symbol-header">
      <UInput
        icon="i-lucide-search"
        size="lg"
        variant="outline"
        placeholder="Search..."
        v-model="query"
        @keydown.down.prevent="focusNext"
        @keydown.up.prevent="focusPrev"
        @keydown.enter.prevent="selectFocused"
        class="tab-symbol-input"
        color="neutral"
        :highlight="false"
      />

      <div class="tabs">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['rounded-full', activeTab === tab.key ? 'active' : '']"
          size="xs"
          variant="soft"
        >
          {{ tab.label }}
        </UButton>
      </div>
    </div>

    <!-- Content -->
    <div class="tray-body">
      <div v-if="filtered.length === 0" class="no-results">
        No se encontraron símbolos.
      </div>

      <ul class="list">
        <li
          v-for="(item, idx) in filtered"
          :key="item.id"
          class="list-item"
          :class="{ focused: focusedIndex === idx }"
          @click="select(item)"
          @mouseenter="focusedIndex = idx"
          @mouseleave="focusedIndex = -1"
        >
          <div class="exchange-icon">
            <img
              v-if="item.exchangeIcon"
              :src="item.exchangeIcon"
              class="icon-img"
            />
            <div v-else class="icon-default"></div>
          </div>

          <div class="item-mid">
            <div class="row1">
              <div class="symbol">{{ item.symbol }}</div>
              <div class="desc">{{ item.desc }}</div>
            </div>
          </div>

          <div class="item-right">
            <span class="market">{{ item.marketType }}</span>
            <div class="exchange">{{ item.exchange }}</div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";

const props = defineProps({
  modelValue: String,
  items: Array,
});

const value = ref(null);

const emit = defineEmits(["update:modelValue", "select", "close"]);

const query = ref(props.modelValue || "");
const activeTab = ref("all");
const focusedIndex = ref(-1);
const searchInput = ref(null);

const tabs = [
  { key: "all", label: "All" },
  { key: "stocks", label: "Stocks" },
  { key: "funds", label: "Funds" },
  { key: "futures", label: "Futures" },
  { key: "forex", label: "Forex" },
  { key: "crypto", label: "Crypto" },
  { key: "indices", label: "Indices" },
  { key: "bonds", label: "Bonds" },
  { key: "economy", label: "Economy" },
  { key: "options", label: "Options" },
];

const defaultItems = [
  {
    id: 1,
    symbol: "BTCUSDT",
    desc: "Bitcoin / TetherUS",
    subtitle: "spot crypto",
    exchange: "Binance",
    marketType: "spot",
    category: "crypto",
  },
  {
    id: 2,
    symbol: "LTCUSDT",
    desc: "Bitcoin / TetherUS",
    subtitle: "spot crypto",
    exchange: "Binance",
    marketType: "spot",
    category: "crypto",
  },
  {
    id: 3,
    symbol: "LTCUSDT",
    desc: "Bitcoin / TetherUS",
    subtitle: "spot crypto",
    exchange: "Binance",
    marketType: "spot",
    category: "crypto",
  },
  {
    id: 3,
    symbol: "ADAUSDT",
    desc: "Bitcoin / TetherUS",
    subtitle: "spot crypto",
    exchange: "Binance",
    marketType: "spot",
    category: "crypto",
  },
];

const items = ref(props.items || defaultItems);

const debounced = ref(query.value);
let debounceTimer = null;

watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => (debounced.value = val), 180);
});

const filtered = computed(() => {
  const q = debounced.value.trim().toLowerCase();
  const byTab = (it) =>
    activeTab.value === "all" || it.category === activeTab.value;

  if (!q) return items.value.filter(byTab);

  return items.value.filter((it) => {
    if (!byTab(it)) return false;
    return (
      it.symbol.toLowerCase().includes(q) ||
      it.desc.toLowerCase().includes(q) ||
      (it.subtitle && it.subtitle.toLowerCase().includes(q)) ||
      (it.exchange && it.exchange.toLowerCase().includes(q))
    );
  });
});

function focusNext() {
  if (!filtered.value.length) return;
  focusedIndex.value = Math.min(
    filtered.value.length - 1,
    focusedIndex.value + 1
  );
}

function focusPrev() {
  if (!filtered.value.length) return;
  focusedIndex.value = Math.max(0, focusedIndex.value - 1);
}

function selectFocused() {
  if (focusedIndex.value >= 0) select(filtered.value[focusedIndex.value]);
}

function select(item) {
  emit("update:modelValue", item.symbol);
  emit("select", item);
}

onMounted(() => searchInput.value?.focus());
</script>

<style scoped>
.tab-symbol-search {
  width: 100%;
  height: 500px;
  display: flex;
  overflow: hidden;

  flex-direction: column;
}

.tab-symbol-header {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  gap: 1rem;
  width: inherit;
  flex-direction: column;
}

.tab-symbol-input {
  width: 100%;
}

.tabs {
  display: flex;
  width: inherit;
  gap: 0.5rem;
}

.tray-body {
  max-height: 56vh;
  overflow-y: auto;
  padding: 0.5rem;
}

.no-results {
  text-align: center;
  color: #777;
  padding: 40px 0;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-item {
  gap: 1rem;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--ui-border-muted);
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.list-item.focused {
  background: rgba(255, 255, 255, 0.1);
}

.exchange-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.icon-img {
  width: 22px;
  height: 22px;
}

.icon-default {
  width: 16px;
  height: 16px;
  background: orange;
  border-radius: 50%;
}

.item-mid {
  flex: 1;
  min-width: 0;
}

.row1 {
  display: flex;
  gap: 12px;
  align-items: center;
}

.symbol {
  font-weight: bold;
  font-size: 14px;
  color: var(--primary-0);
}

.desc {
  font-size: 12px;
  color: #bbb;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.market {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.4);
  color: #ddd;
  padding: 4px 8px;
  border-radius: 4px;
}

.exchange {
  font-size: 12px;
  color: #aaa;
}
</style>
