<script setup lang="ts">
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

const states = computed(() => [
  { key: "tick", label: "TICK", status: "idle", display: "IDLE" },
  { key: "ohlcv", label: "OHLCV", status: "idle", display: "IDLE" },
  { key: "timeframe", label: "TF", status: "idle", display: "IDLE" },
  { key: "engine", label: "ENGINE", status: "idle", display: "IDLE" },
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
      <div
        v-for="state in states"
        :key="state.key"
        class="state-pill"
        :class="`state-pill--${state.status}`"
      >
        <span class="state-pip" />
        <span class="state-label">{{ state.label }}</span>
        <span class="state-value">{{ state.display }}</span>
      </div>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />

    <!-- CENTER-RIGHT: Timeframe controls -->
    <div class="tb-timeframes">
      <span class="tf-label">TF</span>
      <button
        v-for="tf in timeframes"
        :key="tf"
        class="tf-chip"
        :class="{ 'tf-chip--active': tf === activeTimeframe }"
        @click="activeTimeframe = tf"
      >
        {{ tf }}
      </button>
      <button class="tf-add" title="Add timeframe">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1v8M1 5h8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span>Add</span>
      </button>
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
  border-radius: var(--ui-radius);
  background: var(--backtesting-toolbar-bg);
}

.tb-symbol {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

.symbol-badge {
  gap: 0.25rem;
  display: flex;
  font-weight: 600;
  align-items: center;
  font-size: var(--text-sm);
  letter-spacing: 0.08em;
  color: var(--ui-text);
}

.symbol-sub {
  font-size: calc(var(--text-xs) * 0.75);
  letter-spacing: 0.15em;
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
  font-size: calc(var(--text-xs) * 0.75);
  letter-spacing: 0.06em;
  transition:
    background 0.2s,
    border-color 0.2s;
}

/* pip */
.state-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.state-label {
  color: rgba(255 255 255 / 0.38);
  font-weight: 500;
}

.state-value {
  font-weight: 600;
}

/* idle */
.state-pill--idle {
  background: rgba(255 255 255 / 0.04);
  border-color: rgba(255 255 255 / 0.06);
}
.state-pill--idle .state-pip {
  background: #4a5060;
}
.state-pill--idle .state-value {
  color: #4a5060;
}

/* ready */
.state-pill--ready {
  background: rgba(56 189 120 / 0.08);
  border-color: rgba(56 189 120 / 0.18);
}
.state-pill--ready .state-pip {
  background: #38bd78;
  box-shadow: 0 0 5px #38bd7866;
}
.state-pill--ready .state-value {
  color: #38bd78;
}

/* running */
.state-pill--running {
  background: rgba(59 130 246 / 0.1);
  border-color: rgba(59 130 246 / 0.22);
}
.state-pill--running .state-pip {
  background: #3b82f6;
  box-shadow: 0 0 5px #3b82f666;
  animation: blink-pip 1s ease-in-out infinite;
}
.state-pill--running .state-value {
  color: #3b82f6;
}

/* error */
.state-pill--error {
  background: rgba(239 68 68 / 0.1);
  border-color: rgba(239 68 68 / 0.22);
}
.state-pill--error .state-pip {
  background: #ef4444;
  box-shadow: 0 0 5px #ef444466;
}
.state-pill--error .state-value {
  color: #ef4444;
}

/* loading */
.state-pill--loading {
  background: rgba(251 191 36 / 0.08);
  border-color: rgba(251 191 36 / 0.18);
}
.state-pill--loading .state-pip {
  background: #fbbf24;
  animation: blink-pip 0.6s ease-in-out infinite;
}
.state-pill--loading .state-value {
  color: #fbbf24;
}

@keyframes blink-pip {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
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
