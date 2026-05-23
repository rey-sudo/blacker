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

// Props
const props = defineProps({
  tickState: { type: String, default: "idle" },
  ohlcvState: { type: String, default: "idle" },
  timeframeState: { type: String, default: "idle" },
  engineState: { type: String, default: "idle" },
});

// Playback
const isPlaying = ref(false);

// Timeframes
const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
const activeTimeframe = ref("1h");

const backtestState = computed(() => [
  {
    key: "tick",
    label: "TICK",
    status: "idle",
    display: "ON",
    color: "success" as any,
  },
  {
    key: "ohlcv",
    label: "OHLCV",
    status: "idle",
    display: "ON",
    color: "success" as any,
  },
  {
    key: "timeframe",
    label: "TF",
    status: "idle",
    display: "ON",
    color: "success" as any,
  },
  {
    key: "engine",
    label: "ENGINE",
    status: "idle",
    display: "ON",
    color: "success" as any,
  },
]);
</script>

<template>
  <div class="backtesting-toolbar">
    <div class="tb-symbol">
      <span class="symbol-badge">BTCUSDT</span>
      <span class="symbol-sub">PERPETUAL</span>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />

    <div class="tb-states">
      <UButton
        v-for="state in backtestState"
        :key="state.key"
        class="state-pill"
        :class="`state-pill--${state.status}`"
        variant="outline"
        color="neutral"
        size="xs"
      >
        <UChip standalone inset size="xs" :color="state.color" />
        <span class="state-label">{{ state.label }}</span>
        <span class="state-value">{{ state.display }}</span>
      </UButton>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />

    <div class="tb-timeframes">
      <UButton color="neutral" variant="outline" icon="lucide:plus" size="sm"
        >Add Timeframe</UButton
      >
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />

    <!-- RIGHT: Playback controls -->
    <div class="tb-controls">
      <button
        class="ctrl-btn ctrl-btn--play"
        :class="{ 'ctrl-btn--active': isPlaying }"
        :disabled="isPlaying"
        title="Play"
        @click="isPlaying = true"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 2l7 4-7 4V2z" fill="currentColor" />
        </svg>
        <span>Play</span>
      </button>

      <button
        class="ctrl-btn ctrl-btn--stop"
        :class="{ 'ctrl-btn--active': !isPlaying }"
        :disabled="!isPlaying"
        title="Stop"
        @click="isPlaying = false"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />
        </svg>
        <span>Stop</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.backtesting-toolbar {
  gap: 0;
  height: 5rem;
  display: flex;
  overflow: hidden;
  position: relative;
  padding: 0 1.25rem;
  align-items: center;
  background: var(--ui-bg);
  box-shadow: var(--card-shadow);
  border-radius: var(--ui-radius);
}

.tb-symbol {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

.symbol-badge {
  display: flex;
  font-weight: 600;
  align-items: center;
  font-size: var(--text-md);
  letter-spacing: 0.075em;
  color: var(--ui-text);
}

.symbol-sub {
  font-size: calc(var(--text-xs) * 0.75);
  letter-spacing: 0.125em;
  color: var(--ui-text-muted);
  padding-left: 1rem;
}

/* ─── States ─────────────────────────────────────────────── */
.tb-states {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.state-pill {
  gap: 0.25rem;
  display: flex;
  align-items: center;
  padding: 0.25rem 1rem;
  border-radius: var(--ui-radius);
  border: 1px solid transparent;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.state-label {
  color: var(--ui-text-muted);
  font-weight: 500;
}

.state-value {
  font-weight: 600;
}

/* ─── Timeframes ─────────────────────────────────────────── */
.tb-timeframes {
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

/* ─── Controls ───────────────────────────────────────────── */
.tb-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
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
