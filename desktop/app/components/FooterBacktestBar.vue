<template>
  <div class="footer-backtest-bar">
    <UInputDate v-model="value" granularity="second" size="xs" range separator-icon="lucide:dot" />

    <UInputTime
      v-model="time"
      size="xs"
      icon="i-lucide-clock"
      granularity="second"
      :hour-cycle="24"
    >
      <template #trailing>
        <span>UTC</span>
      </template>
    </UInputTime>

    <UButton
      size="xs"
      icon="material-symbols:skip-previous"
      color="neutral"
      variant="outline"
    />
    <UButton size="xs" icon="material-symbols:play-arrow-rounded" color="neutral" variant="outline" />
    <UButton
      size="xs"
      icon="material-symbols:skip-next"
      color="neutral"
      variant="outline"
    />

    <USlider size="xs" :default-value="0" style="width: 10rem" />
    <UButton size="xs" label="x1" color="neutral" variant="outline" />
  </div>
</template>

<script setup lang="ts">
import { CalendarDate, Time } from "@internationalized/date";
import { shallowRef, onUnmounted } from "vue";

const value = shallowRef({
  start: new CalendarDate(2022, 2, 3),
  end: new CalendarDate(2024, 2, 20),
});

const time = shallowRef(new Time(12, 30, 10));

let intervalId: ReturnType<typeof setInterval> | null = null;

function startTimeSimulation(stepSeconds = 1, tickMs = 1000) {
  if (intervalId) return;

  intervalId = setInterval(() => {
    const t = time.value;

    let seconds = t.second + stepSeconds;
    let minutes = t.minute;
    let hours = t.hour;
    let daysToAdd = 0;

    if (seconds >= 60) {
      minutes += Math.floor(seconds / 60);
      seconds %= 60;
    }

    if (minutes >= 60) {
      hours += Math.floor(minutes / 60);
      minutes %= 60;
    }

    if (hours >= 24) {
      daysToAdd = Math.floor(hours / 24);
      hours %= 24;
    }

    time.value = new Time(hours, minutes, seconds);

    if (daysToAdd > 0) {
      value.value = {
        start: value.value.start.add({ days: daysToAdd }),
        end: value.value.end.add({ days: daysToAdd }),
      };
    }
  }, tickMs);
}

function stopTimeSimulation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

onMounted(() => {
  startTimeSimulation(3600, 1000);
});

onUnmounted(stopTimeSimulation);
</script>

<style lang="css" scoped>
.footer-backtest-bar {
  display: flex;
  gap: 1rem;
}
</style>
