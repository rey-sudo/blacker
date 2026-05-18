export const useBacktestingTabStore = (tabId: string) =>
  defineStore(`tab/${tabId}`, () => {
    const id: string = tabId;

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

    const tabTitle = computed(() => `${symbol.value} - BS`);
    const tabColor = "secondary";
    
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

      onMount() {},
      onUnmount() {
        pause();
      },
    };
  })();
