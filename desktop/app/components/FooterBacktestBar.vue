<template>
  <div class="footer-backtest-bar">
    <UInputDate
      v-model="modelValue"
      :min-value="minDate"
      :max-value="maxDate"
      granularity="second"
      size="xs"
    />

    <UInputTime
      v-model="time"
      size="xs"
      icon="i-lucide-clock"
      granularity="second"
      :hour-cycle="24" 
    />

    <USlider size="xs" :default-value="0" style="width: 150px" />

    <UButton
      size="xs"
      icon="i-lucide-step-back"
      color="neutral"
      variant="outline"
    />
    <UButton
      size="xs"
      icon="i-lucide-square"
      color="primary"
      variant="outline"
    />
    <UButton size="xs" icon="i-lucide-play" color="neutral" variant="outline" />
    <UButton
      size="xs"
      icon="i-lucide-step-forward"
      color="neutral"
      variant="outline"
    />
  </div>
</template>

<script setup>
import { CalendarDate, Time } from "@internationalized/date";

const modelValue = shallowRef(new CalendarDate(2023, 9, 10));

const minDate = new CalendarDate(2023, 9, 1);
const maxDate = new CalendarDate(2023, 9, 30);

const time = shallowRef(new Time(12, 30, 10));
</script>

<style lang="css" scoped>
.footer-backtest-bar {
  display: flex;
  gap: 1rem;
}
</style>
