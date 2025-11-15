import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useChartStore = defineStore("chart", () => {
  const count = ref(0);
  const timerange = ref(null);

  const double = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  return { count, double, increment, timerange };
});
