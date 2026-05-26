<script setup lang="ts">
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey - https://github.com/rey-sudo
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

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="backtesting-row">
    <div class="left">
      <ChartCandlestick :tabId="tabId" />
    </div>
    <USeparator orientation="vertical" class="h-full" />
    <div class="right">
      <div class="top-panel">
        <!-- Controles principales -->
      </div>

      <div class="bottom-panel">
        <!-- Info: timeframe, métricas, etc -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.backtesting-row {
  display: flex;
  overflow: hidden;
  min-height: 600px;
  box-shadow: var(--card-shadow);
  border-radius: var(--ui-radius);
  background: var(--chart-background);
  border-bottom: 1px solid var(--ui-border);
}

.left {
  flex: 1;
}

.right {
  gap: 1rem;
  width: 600px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.top-panel {
  height: 100px;
  padding: 1rem;
  border-radius: var(--ui-radius);
  border: 1px solid var(--ui-border);
}

.bottom-panel {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background-color: var(--ui-bg);
}
</style>
