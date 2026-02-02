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

type LWCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const createTabStore = (tabId: string) =>
  defineStore(`tab-${tabId}`, () => {
    const symbol = ref("BTCUSDT");
    const market = ref("crypto");
    const interval = ref("1m");
    const window = ref(500);

    const slaveId = ref("");

    const candles: any = ref([]);
    const candle = ref(null);

    const fetching = ref(false);
    const fetchError = ref(null);

    const nextClose = ref(getNow());

    const historyInterval = ref<NodeJS.Timeout | null>(null);
    const lastInterval = ref<NodeJS.Timeout | null>(null);

    const logicalRange = ref(null);
    const crosshair = ref(null);
    const defaultRightPriceWidth = ref(100);
    const chartSettings = reactive({});
    const indicators = ref([]);

    ///-----------------------------------

    const socket = ref<WebSocket | null>(null);
    const connected = ref(false);
    const messages: any = ref([]);
    const lastPrice = ref<number | null>(0);

    const subscribers = new Map<string, Set<(c: LWCandle) => void>>();

    function subscribe(symbol: string, cb: (c: LWCandle) => void) {
      const set = subscribers.get(symbol) ?? new Set();
      set.add(cb);
      subscribers.set(symbol, set);

      return () => set.delete(cb);
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
        //console.log(data);

        if (data.event === "backend_connected") {
          connected.value = true;
          console.log("Tabstore: ws client connected to the service-feed");
          getChartData();
        }

        if (data.type === "ohlcv_snapshot") {
          candles.value = normalizeToLightweight(data.data);
        }

        if (data.type === "ohlcv") {
          if (data.is_live) {
            const set = subscribers.get(data.symbol);
            if (!set) return;

            for (const cb of set) {
              const ce = normalizeToLightweight(data);
              lastPrice.value = Number(formatPrice(ce.close));
              cb(ce);
            }
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
      connectFeedWebsocket();
    };

    const stop = () => {
      console.log("tabStore: Stopping.");
      disconnectFeedWebsocket();
    };
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
      nextClose,
      logicalRange,
      defaultRightPriceWidth,
    };
  });

function defaultChartSettings() {
  return {
    theme: "dark",
    grid: true,
    priceScale: "right",
  };
}

export function normalizeToLightweight(data: RawCandle): LWCandle;
export function normalizeToLightweight(data: RawCandle[]): LWCandle[];
export function normalizeToLightweight(
  data: RawCandle | RawCandle[],
): LWCandle | LWCandle[] {
  const normalize = (c: RawCandle): LWCandle => ({
    time: Math.floor(c.open_time / 1000), // 🔑 UNIX seconds
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  });

  return Array.isArray(data) ? data.map(normalize) : normalize(data);
}

function formatPrice(price: number): string {
  return price.toFixed(2);
}
