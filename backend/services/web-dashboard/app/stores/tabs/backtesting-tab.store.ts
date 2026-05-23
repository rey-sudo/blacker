export const useBacktestingTabStore = (tab: Tab) =>
  defineStore(`tab/${tab.id}`, () => {
    const id = tab.id;

    const symbol = ref("BTCUSDT");
    const interval = ref("1m");
    const isPaused = ref(false);

    const tabTitle = computed(() => `${symbol.value} - BT`);
    const tabColor = "neutral";

    const start = () => {
      console.log("tabStore: Starting.");
    };

    const stop = () => {
      console.log("tabStore: Stopping.");
    };

    const pause = () => {
      isPaused.value = true;
      console.log("paused");
    };

    const resume = () => {
      isPaused.value = false;
      console.log("resumed");
    };

    const getTab = () => {
      return tab;
    };

    const onMount = () => {};

    const onUnmount = () => {
      pause();
    };

    return {
      tabTitle,
      tabColor,
      symbol,
      interval,
      stop,
      id,
      pause,
      resume,
      isPaused,
      start,
      getTab,
      onMount,
      onUnmount,
    };
  })();
