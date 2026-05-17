export const useTradingTabStore = (tabId: string) =>
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

    return {
      symbol,
      interval,
      stop,
      id,
      pause,
      resume,
      isPaused,
      start,

      onMount() {
        
      },
      onUnmount() {
        pause();
      },
    };
  })();
