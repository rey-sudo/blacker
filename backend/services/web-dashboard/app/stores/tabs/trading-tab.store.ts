export const useTradingTabStore = (tab: Tab) =>
  defineStore(`tab/${tab.id}`, () => {
    const id: string = tab.id;

    const tabTitle = computed(() => `${symbol.value} - ${interval.value}`);
    const tabColor = "primary";

    const symbol = ref("BTCUSDT");
    const interval = ref("1m");
    const isPaused = ref(false);

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
      onMount() {},
      onUnmount() {
        pause();
      },
    };
  })();
