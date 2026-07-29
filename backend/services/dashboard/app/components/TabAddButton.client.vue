<script setup lang="ts">
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { TabKind, type TradingTab } from "~/stores/tabs.store";

const tabsStore = useTabsStore();

const visible = ref(false);

const symbolData = [
  {
    id: "0",
    source: "binance",
    symbol: "BTCUSDT",
    status: "sync",
    legend: "Bitcoin / Dolar Futures USDM",
    market: "crypto",
  },
  {
    id: "1",
    source: "dydx",
    symbol: "BTCUSDT",
    status: "sync",
    legend: "Bitcoin / Dolar Futures",
    market: "crypto",
  },
  {
    id: "2",
    source: "hyperliquid",
    symbol: "BTCUSDT",
    status: "unsync",
    legend: "Bitcoin / Dolar Futures",
    market: "crypto",
  },
];

const onSelect = (e: any) => {
  console.log(e);
  const newTab: TradingTab = {
    id: crypto.randomUUID(),
    kind: TabKind.Trading,
    title: "tab test",
    subtitle: "tab sub",
    description: "tab description",
    color: "primary",
    symbol: "BTCUSDT",
    timeframe: "H1",
  };

  tabsStore.addTab(newTab);
  visible.value = false;
};
</script>

<template>
  <div class="tab-add flex items-center h-[inherit]">
    <UButton
      class="mt-1"
      icon="i-lucide-plus"
      size="sm"
      color="neutral"
      @click="visible = true"
      variant="ghost"
    />

    <UModal
      v-model:open="visible"
      title="Symbol Search"
      :ui="{
        content: 'w-fit max-w-none rounded-lg shadow-lg ring ring-default',
      }"
    >
      <template #body>
        <SymbolSearch :data="symbolData" @select="onSelect" />
      </template>
    </UModal>
  </div>
</template>

<style lang="css" scoped></style>

