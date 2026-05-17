<template>
  <div class="backtesting-toolbar">

    <!-- LEFT: Symbol -->
    <div class="tb-symbol">
      <span class="symbol-badge">
        BTCUSDT
      </span>
      <span class="symbol-sub">PERPETUAL</span>
    </div>

    <div class="tb-divider" />

    <!-- CENTER-LEFT: State indicators -->
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

    <div class="tb-divider" />

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
          <path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Add</span>
      </button>
    </div>

    <div class="tb-divider" />

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
          <path d="M3 2l7 4-7 4V2z" fill="currentColor"/>
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
          <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor"/>
        </svg>
        <span>Stop</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  tickState:      { type: String, default: 'idle' },
  ohlcvState:     { type: String, default: 'idle' },
  timeframeState: { type: String, default: 'idle' },
  engineState:    { type: String, default: 'idle' },
})

// Playback
const isPlaying = ref(false)

// Timeframes
const timeframes    = ['1m', '5m', '15m', '1h', '4h', '1d']
const activeTimeframe = ref('1h')

// Status helpers
const statusMap = {
  idle:    { status: 'idle',    display: 'IDLE'    },
  ready:   { status: 'ready',   display: 'READY'   },
  running: { status: 'running', display: 'RUNNING' },
  error:   { status: 'error',   display: 'ERROR'   },
  loading: { status: 'loading', display: 'LOADING' },
}

const resolve = (raw) => statusMap[raw] ?? { status: 'idle', display: raw.toUpperCase() }

const states = computed(() => [
  { key: 'tick',      label: 'TICK',   ...resolve(props.tickState)      },
  { key: 'ohlcv',     label: 'OHLCV',  ...resolve(props.ohlcvState)     },
  { key: 'timeframe', label: 'TF',     ...resolve(props.timeframeState) },
  { key: 'engine',    label: 'ENGINE', ...resolve(props.engineState)    },
])
</script>

<style scoped>
/* ─── Fonts ──────────────────────────────────────────────── */

/* ─── Root ───────────────────────────────────────────────── */
.backtesting-toolbar {
  height: 5rem;
  background: var(--backtesting-toolbar-bg, #0d0f14);
  border-bottom: 1px solid rgba(255 255 255 / 0.07);
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 1.25rem;
  overflow: hidden;
  position: relative;
}

/* subtle scanline texture */
.backtesting-toolbar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255 255 255 / 0.012) 2px,
    rgba(255 255 255 / 0.012) 4px
  );
  pointer-events: none;
}

/* ─── Divider ────────────────────────────────────────────── */
.tb-divider {
  width: 1px;
  height: 2.5rem;
  background: rgba(255 255 255 / 0.08);
  margin: 0 1.1rem;
  flex-shrink: 0;
}

/* ─── Symbol ─────────────────────────────────────────────── */
.tb-symbol {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.symbol-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #f0f2f5;
}

.symbol-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f7931a; /* BTC orange */
  box-shadow: 0 0 6px #f7931a99;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px #f7931a99; }
  50%       { opacity: 0.7; box-shadow: 0 0 12px #f7931acc; }
}

.symbol-sub {
  font-size: 0.55rem;
  letter-spacing: 0.15em;
  color: rgba(255 255 255 / 0.3);
  padding-left: 13px;
}

/* ─── States ─────────────────────────────────────────────── */
.tb-states {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.state-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 6px;
  border-radius: 3px;
  border: 1px solid transparent;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  transition: background 0.2s, border-color 0.2s;
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
.state-pill--idle .state-pip   { background: #4a5060; }
.state-pill--idle .state-value { color: #4a5060; }

/* ready */
.state-pill--ready {
  background: rgba(56 189 120 / 0.08);
  border-color: rgba(56 189 120 / 0.18);
}
.state-pill--ready .state-pip   { background: #38bd78; box-shadow: 0 0 5px #38bd7866; }
.state-pill--ready .state-value { color: #38bd78; }

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
.state-pill--running .state-value { color: #3b82f6; }

/* error */
.state-pill--error {
  background: rgba(239 68 68 / 0.1);
  border-color: rgba(239 68 68 / 0.22);
}
.state-pill--error .state-pip   { background: #ef4444; box-shadow: 0 0 5px #ef444466; }
.state-pill--error .state-value { color: #ef4444; }

/* loading */
.state-pill--loading {
  background: rgba(251 191 36 / 0.08);
  border-color: rgba(251 191 36 / 0.18);
}
.state-pill--loading .state-pip {
  background: #fbbf24;
  animation: blink-pip 0.6s ease-in-out infinite;
}
.state-pill--loading .state-value { color: #fbbf24; }

@keyframes blink-pip {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
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
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid rgba(255 255 255 / 0.08);
  background: rgba(255 255 255 / 0.03);
  color: rgba(255 255 255 / 0.4);
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tf-chip:hover {
  background: rgba(255 255 255 / 0.07);
  color: rgba(255 255 255 / 0.7);
  border-color: rgba(255 255 255 / 0.15);
}

.tf-chip--active {
  background: rgba(247 147 26 / 0.15);
  border-color: rgba(247 147 26 / 0.35);
  color: #f7931a;
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