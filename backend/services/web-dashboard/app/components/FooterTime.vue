<template>
  <div class="footer-time">
    <UInputDate
      v-model="value"
      granularity="second"
      size="xs"
      icon="lucide:calendar"
      variant="ghost"
    />

    <UInputTime
      v-model="time"
      size="xs"
      variant="ghost"
      icon="lucide:clock"
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
.footer-time {
  display: flex;
  gap: 1rem;
}
</style>
