<script setup lang="ts">
// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
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
import { useBacktestingTabStore } from "~/stores/tabs/backtesting-tab.store";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },

  timeframes: {
    type: Array as PropType<string[]>,
    required: true,
  },

  activeTimeframe: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  "update:timeframe": [timeframe: string];
}>();

const toast = useToast();

const tabsStore = useTabManager();
const tab = tabsStore.getTabById(props.tabId);
const tabStore = useBacktestingTabStore(tab as BacktestingTab);

//----------------------------------------------------------------------------------------------------------------------
// SLAVE STATE
//----------------------------------------------------------------------------------------------------------------------

interface KeyLabelColor {
  key: string;
  label: string;
  color: any;
}

const slavesStatus = computed<KeyLabelColor[]>(() => [
  {
    key: "master",
    label: "Master",
    color: tabStore.globalState.status === "Ready" ? "success" : "error",
  },
  {
    key: "engine",
    label: "Engine",
    color: tabStore.isEngineConnected ? "success" : "error",
  },
  {
    key: "execution",
    label: "Execution",
    color: false ? "success" : "error",
  },
]);

//----------------------------------------------------------------------------------------------------------------------
// TIMEFRAMES
//----------------------------------------------------------------------------------------------------------------------

const timeframeModalOpen = ref(false);
const timeframeModalTitle = ref("Add Custom Interval");
const timeframeModalItems = ref<SelectItem[]>([
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

async function onStartBacktest() {
  try {
    await tabStore.startBacktest();
  } catch (err: any) {
    toast.add({
      title: "Error starting backtest",
      description: err.data.message,
      icon: "i-lucide-circle-x",
      color: "error",
    });
  }
}

async function onStopBacktest() {
  try {
    await tabStore.stopBacktest();
  } catch (err: any) {
    toast.add({
      title: "Error stopping backtest",
      description: err.data.message,
      icon: "i-lucide-circle-x",
      color: "error",
    });
  }
}
async function onTimeframeAdded() {
  try {
    await tabStore.addTimeframe(timeframeSelected.value);
  } catch (err: any) {
    toast.add({
      title: "Error adding timeframe",
      description: err.data.message,
      icon: "i-lucide-circle-x",
      color: "error",
    });
  }

  timeframeModalOpen.value = false;
}
</script>

<template>
  <div class="backtesting-toolbar">
    <!----------------------------------------------------------------------------------------------------------------------
  WORKER STATES
----------------------------------------------------------------------------------------------------------------------->
    <div class="backtesting-toolbar-slaves">
      <UButton
        v-for="state in slavesStatus"
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
          >Timeframe</UButton
        >

        <template #body>
          <UForm class="space-y-4">
            <UFormField label="Timeframe">
              <USelect
                class="w-full"
                v-model="timeframeSelected"
                size="lg"
                :items="timeframeModalItems"
              />
            </UFormField>
          </UForm>
        </template>

        <template #footer>
          <div class="content w-full flex justify-end gap-2">
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

      <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />

      <UButton
        v-for="timeframe in props.timeframes"
        :key="timeframe"
        color="neutral"
        variant="outline"
        size="sm"
        :class="{
          'bg-neutral-200 dark:bg-neutral-800':
            timeframe === props.activeTimeframe,
        }"
        @click="emit('update:timeframe', timeframe)"
      >
        {{ timeframe }}
      </UButton>
    </div>

    <USeparator orientation="vertical" class="h-10 pl-4 pr-4" />

    <UButton color="neutral" variant="outline" icon="lucide:plus" size="sm"
      >Series</UButton
    >

    <!----------------------------------------------------------------------------------------------------------------------
  BACKTEST CONTROLS
----------------------------------------------------------------------------------------------------------------------->
    <div class="backtesting-toolbar-controls">
      <UButton
        title="Back"
        color="neutral"
        icon="lucide:step-back"
        variant="outline"
        size="sm"
      />
      <UButton
        :disabled="tabStore.isRunning"
        title="Play"
        color="neutral"
        icon="lucide:play"
        @click="onStartBacktest"
        :variant="tabStore.isRunning ? 'solid' : 'outline'"
        :loading="tabStore.isRunning"
        size="sm"
      />

      <UButton
        :disabled="!tabStore.isRunning"
        title="Stop"
        color="neutral"
        icon="lucide:square"
        @click="onStopBacktest"
        :variant="tabStore.isRunning ? 'outline' : 'solid'"
        size="sm"
      />
      <UButton
        title="Next"
        color="neutral"
        icon="lucide:step-forward"
        variant="outline"
        size="sm"
      />
    </div>
  </div>
</template>

<style scoped>
.backtesting-toolbar {
  height: 3rem;
  display: flex;
  overflow: hidden;
  align-items: center;
  padding: 0rem 1rem;
  background: var(--ui-bg);
  box-shadow: var(--card-shadow);
  border-radius: var(--ui-radius);
}

.backtesting-toolbar-slaves {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.backtesting-toolbar-slaves .label {
  color: var(--ui-text-muted);
  font-weight: 500;
}

.backtesting-toolbar-timeframes {
  display: flex;
  align-items: center;
  gap: 4px;
}

.backtesting-toolbar-controls {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 0.5rem;
}
</style>
