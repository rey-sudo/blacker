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

import { ref, computed } from "vue";
import type { SelectItem } from "@nuxt/ui";
// Props
const props = defineProps({
  tickState: { type: String, default: "idle" },
  ohlcvState: { type: String, default: "idle" },
  timeframeState: { type: String, default: "idle" },
  engineState: { type: String, default: "idle" },
});

// Playback
const isPlaying = ref(false);

const backtestState = computed(() => [
  {
    key: "tick",
    label: "API",
    status: "idle",
    display: "LIVE",
    color: "success" as any,
  },
  {
    key: "tick",
    label: "TICK",
    status: "idle",
    display: "LIVE",
    color: "success" as any,
  },
  {
    key: "engine",
    label: "ENGINE",
    status: "idle",
    display: "IDLE",
    color: "warning" as any,
  },
]);

const timeframeModalOpen = ref(false);
const timeframeModalTitle = ref("Add Custom Interval");

const timeframeItems = ref<SelectItem[]>([
  {
    type: "label",
    label: "Minutes",
  },
  "1m",
  "5m",
  "15m",
  "30m",
  "45m",
  {
    type: "separator",
  },
  {
    type: "label",
    label: "Hours",
  },
  "1h",
  "2h",
  "3h",
  "4h",
  "6h",
]);

const timeframeSelected = ref("1m");

const onTimeframeAdded = () => {
  timeframeModalOpen.value = false;
};
</script>

<template>
  <div class="backtesting-toolbar">
    <!----------------------------------------------------------------------------------------------------------------------
  SYMBOL INFO
----------------------------------------------------------------------------------------------------------------------->
    <div class="symbol">
      <span class="symbol-badge">BTCUSDT</span>
      <span class="symbol-sub">PERPETUAL</span>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />
    <!----------------------------------------------------------------------------------------------------------------------
  WORKER STATES
----------------------------------------------------------------------------------------------------------------------->
    <div class="backtesting-toolbar-workers">
      <UButton
        v-for="state in backtestState"
        :key="state.key"
        variant="outline"
        color="neutral"
        size="xs"
      >
        <UChip standalone inset size="xs" :color="state.color" />
        <span class="label">{{ state.label }}</span>
      </UButton>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />
    <!----------------------------------------------------------------------------------------------------------------------
  ADD TIMEFRAMES
----------------------------------------------------------------------------------------------------------------------->
    <div class="backtesting-toolbar-timeframes">
      <UModal
        v-model:open="timeframeModalOpen"
        :title="timeframeModalTitle"
        :close="{
          color: 'neutral',
          variant: 'outline',
          class: 'rounded-full',
        }"
        :overlay="false"
      >
        <UButton color="neutral" variant="outline" icon="lucide:plus" size="sm"
          >Add Timeframe</UButton
        >

        <template #body>
          <UForm class="space-y-4">
            <UFormField label="Timeframe">
              <USelect
                class="w-full"
                v-model="timeframeSelected"
                size="lg"
                :items="timeframeItems"
              />
            </UFormField>
          </UForm>
        </template>

        <template #footer>
          <div class="content w-100 flex justify-end gap-2">
            <UButton
              color="neutral"
              size="md"
              variant="outline"
              @click="timeframeModalOpen = false"
              >Cancel</UButton
            >

            <UButton
              color="neutral"
              size="md"
              variant="solid"
              @click="onTimeframeAdded"
            >
              Add
            </UButton>
          </div>
        </template>
      </UModal>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />
    <!----------------------------------------------------------------------------------------------------------------------
  BACKTEST CONTROLS
----------------------------------------------------------------------------------------------------------------------->
    <div class="backtesting-toolbar-controls">
      <UButton
        :disabled="isPlaying"
        title="Play"
        color="neutral"
        icon="material-symbols:play-arrow"
        @click="isPlaying = true"
        label="Play"
        :variant="isPlaying ? 'solid' : 'outline'"
        :loading="isPlaying"
      />

      <UButton
        :disabled="!isPlaying"
        title="Stop"
        color="neutral"
        icon="material-symbols:stop"
        @click="isPlaying = false"
        label="Stop"
        :variant="isPlaying ? 'outline' : 'solid'"
      />
    </div>
  </div>
</template>

<style scoped>
.backtesting-toolbar {
  height: 4rem;
  display: flex;
  padding: 0.5rem 1rem;
  overflow: hidden;
  align-items: center;
  background: var(--ui-bg);
  box-shadow: var(--card-shadow);
  border-radius: var(--ui-radius);
}
/* ─── symbol ─────────────────────────────────────────── */
.symbol {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex-shrink: 0;
}

.symbol-badge {
  display: flex;
  font-weight: 600;
  align-items: center;
  color: var(--ui-text);
  letter-spacing: 0.075em;
  font-size: var(--text-md);
}

.symbol-sub {
  font-size: calc(var(--text-xs) * 0.75);
  color: var(--ui-text-muted);
  letter-spacing: 0.125em;
  padding-left: 1rem;
}

/* ─── workers ─────────────────────────────────────────── */
.backtesting-toolbar-workers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.backtesting-toolbar-workers .label {
  color: var(--ui-text-muted);
  font-weight: 500;
}

.backtesting-toolbar-workers .value {
  font-weight: 600;
}

/* ─── Timeframes ─────────────────────────────────────────── */
.backtesting-toolbar-timeframes {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tf-label {
  font-size: 0.55rem;
  letter-spacing: 0.15em;
  color: rgba(255 255 255 / 0.25);
  margin-right: 4px;
}

.tf-chip {
  padding: 0.25rem 1rem;
  cursor: pointer;
  border-radius: var(--ui-radius);
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  color: var(--ui-text-muted);
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  transition: all 0.15s ease;
}

.tf-chip:hover {
  background: rgba(255 255 255 / 0.07);
  color: rgba(255 255 255 / 0.7);
  border-color: rgba(255 255 255 / 0.15);
}

.tf-chip--active {
  background: color-mix(in srgb, var(--ui-primary) 25%, transparent);
  border-color: color-mix(in srgb, var(--ui-primary) 50%, transparent);
  color: var(--ui-primary);
}

.tf-add {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px dashed rgba(255 255 255 / 0.15);
  background: transparent;
  color: rgba(255 255 255 / 0.3);
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  margin-left: 2px;
  transition: all 0.15s ease;
}

.tf-add:hover {
  border-color: rgba(255 255 255 / 0.28);
  color: rgba(255 255 255 / 0.55);
}

.backtesting-toolbar-controls {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 0.5rem;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-btn:disabled {
  opacity: 0.28;
  cursor: not-allowed;
  pointer-events: none;
}

/* Play */
.ctrl-btn--play {
  background: rgba(56 189 120 / 0.12);
  border-color: rgba(56 189 120 / 0.25);
  color: #38bd78;
}

.ctrl-btn--play:not(:disabled):hover {
  background: rgba(56 189 120 / 0.22);
  border-color: rgba(56 189 120 / 0.45);
  box-shadow: 0 0 12px rgba(56 189 120 / 0.2);
}

.ctrl-btn--play.ctrl-btn--active {
  background: rgba(56 189 120 / 0.18);
  border-color: #38bd78;
  box-shadow: 0 0 14px rgba(56 189 120 / 0.25);
}

/* Stop */
.ctrl-btn--stop {
  background: rgba(239 68 68 / 0.1);
  border-color: rgba(239 68 68 / 0.2);
  color: #ef4444;
}

.ctrl-btn--stop:not(:disabled):hover {
  background: rgba(239 68 68 / 0.2);
  border-color: rgba(239 68 68 / 0.4);
  box-shadow: 0 0 12px rgba(239 68 68 / 0.18);
}

.ctrl-btn--stop.ctrl-btn--active {
  background: rgba(239 68 68 / 0.16);
  border-color: #ef4444;
}
</style>
