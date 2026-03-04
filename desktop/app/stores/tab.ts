import { defineStore } from "pinia";
type RawCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  open_time: number;
  close_time: number;
  volume: number;
  symbol: string;
  timeframe: string;
};

type BufferedCandle = {
  close: number;
  close_time: number;
  high: number;
  is_live: boolean;
  low: number;
  open: number;
  open_time: number;
  symbol: string;
  timeframe: string;
  type: "ohlcv";
  volume: number;
};

type LWCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const createTabStore = (tabId: string) =>
  defineStore(`tab-${tabId}`, () => {
    const id: string = tabId;

    const symbol = ref("BTCUSDT");
    const interval = ref("1m");

    const candles: any = ref([]);
    const candle = ref(null);

    const fetching = ref(false);
    const fetchError = ref(null);

    const logicalRange = ref(null);
    const crosshair = ref(null);
    const defaultRightPriceWidth = ref(100);
    const chartSettings = reactive({});
    const indicators = ref([]);

    const ohlcvLiveBuffer = ref<BufferedCandle[]>([]);
    const isPaused = ref(false);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    ///-----------------------------------

    const socket = ref<WebSocket | null>(null);
    const connected = ref(false);
    const lastPrice = ref<number | null>(0);

    const subscribers = new Set<(c: LWCandle) => void>();

    function subscribe(cb: (c: LWCandle) => void) {
      subscribers.add(cb);

      return () => {
        subscribers.delete(cb);
      };
    }

    const getChartData = () => {
      sendFeedCommand({
        action: "open_chart",
        symbol: "BTCUSDT",
        timeframe: "1m",
      });
      console.log("Tabstore: open_chart command sent");
    };

    const handleEvents = (event: any) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === "backend_connected") {
          connected.value = true;
          console.log("Tabstore: ws client connected to the service-feed");
          getChartData();
        }

        if (data.type === "ohlcv_snapshot") {
          candles.value = normalizeToLightweight(data.data);
          ohlcvLiveBuffer.value = [];
        }

        if (data.type === "ohlcv") {
          if (data.is_live) {
            ohlcvLiveBuffer.value.push(data);
          }
        }
      } catch (err) {}
    };

    const connectFeedWebsocket = () => {
      if (socket.value) return;

      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const url = `ws://localhost:3000/api/feed/get-connection`;

      socket.value = new WebSocket(url);

      socket.value.onopen = () => {};

      socket.value.onmessage = (event) => handleEvents(event);

      socket.value.onclose = () => {
        connected.value = false;
        socket.value = null;
        console.log("[WS] desconectado");
      };

      socket.value.onerror = (err: any) => {
        console.error("[WS] error", err);
      };
    };

    const sendFeedCommand = (payload: any) => {
      if (!socket.value || !connected.value) return;
      socket.value.send(JSON.stringify(payload));
    };

    const disconnectFeedWebsocket = () => {
      socket.value?.close();
      socket.value = null;
    };

    const start = () => {
      console.log("tabStore: Starting.");
      startConsuming();
      connectFeedWebsocket();
    };

    const stop = () => {
      console.log("tabStore: Stopping.");
      disconnectFeedWebsocket();
      stopConsuming();
    };

    function ohlcvLiveHandle(data: BufferedCandle) {
      if (subscribers.size === 0) return;

      const ce = normalizeToLightweight(data);
      const lastCandle = candles.value[candles.value.length - 1];

      // Filtro de seguridad cronológica
      if (lastCandle && ce.time < (lastCandle.time as number)) {
        return;
      }

      lastPrice.value = formatPrice(ce.close);

      subscribers.forEach((cb) => cb(ce));
    }

    function consumeNext() {
      if (ohlcvLiveBuffer.value.length > 0) {
        const ce = ohlcvLiveBuffer.value.shift();
        if (ce) ohlcvLiveHandle(ce);
        //console.log("consumido del buffer");
      } else {
        //console.log("no eventos");
      }
    }

    function startConsuming() {
      stopConsuming(); // evitar duplicados

      function schedule() {
        if (!isPaused.value) {
          window.requestIdleCallback((deadline) => {
            for (let i = 1; i <= 100 && deadline.timeRemaining() > 1; i++) {
              consumeNext();
            }
          });
        } else {
          for (let i = 1; i <= 100; i++) {
            consumeNext();
          }
        }

        intervalId = setTimeout(schedule, 0); // recursive loop event
      }

      schedule();
    }

    function stopConsuming() {
      if (intervalId !== null) {
        clearTimeout(intervalId);
        intervalId = null;
      }
    }

    function pause() {
      isPaused.value = true;
      console.log("paused");
    }

    function resume() {
      isPaused.value = false;
      console.log("resumed");
    }

    function getCurrentTab(tabId: string) {
      const tabsStore = useTabsStore();
      return tabsStore.getTabById(tabId);
    }

    return {
      symbol,
      interval,
      lastPrice,
      chartSettings,
      indicators,
      candles,
      fetchError,
      fetching,
      start,
      stop,
      candle,
      subscribe,
      crosshair,
      id,
      logicalRange,
      defaultRightPriceWidth,
      getCurrentTab,
      pause,
      resume,
      isPaused,
    };
  });

function defaultChartSettings() {
  return {
    theme: "dark",
    grid: true,
    priceScale: "right",
  };
}

function formatPrice(price: number): number {
  return parseFloat(price.toFixed(2));
}

export function normalizeToLightweight(
  data: RawCandle | BufferedCandle,
): LWCandle;
export function normalizeToLightweight(
  data: (RawCandle | BufferedCandle)[],
): LWCandle[];
export function normalizeToLightweight(
  data: RawCandle | BufferedCandle | (RawCandle | BufferedCandle)[],
): LWCandle | LWCandle[] {
  const normalize = (c: RawCandle | BufferedCandle): LWCandle => {
    return {
      time: Math.floor(c.open_time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    };
  };

  if (Array.isArray(data)) {
    return data.map(normalize);
  }

  return normalize(data);
}
