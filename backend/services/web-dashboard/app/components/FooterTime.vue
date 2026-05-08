<template>
  <div class="footer-backtest-bar">
    <UInputDate
      v-model="value"
      granularity="second"
      size="xs"
      variant="outline"
      separator-icon="lucide:dot"
    />

    <UInputTime
      v-model="time"
      size="xs"
      variant="outline"
      icon="i-lucide-clock"
      granularity="second"
      :hour-cycle="24"
    >
      <template #trailing>
        <span>UTC</span>
      </template>
    </UInputTime>



  </div>
</template>

<script setup lang="ts">
import { CalendarDate, Time } from "@internationalized/date";
import { shallowRef } from "vue";

const value = shallowRef(new CalendarDate(2026, 2, 22));

const time = shallowRef(new Time(12, 30, 10));

</script>

<style lang="css" scoped>
.footer-backtest-bar {
  display: flex;
  gap: 1rem;
}
</style>
