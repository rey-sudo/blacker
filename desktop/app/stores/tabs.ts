import { defineStore } from "pinia";

export const useTabsStore = defineStore("tabs", () => {

  const count = ref(0);

  function increase() {
    count.value++;
  }

  function decrease() {
    count.value = Math.max(0, count.value - 1);
  }

  return {
    count,
    increase,
    decrease,
  };
});
