// btc-trades-stream.js

const WebSocket = require("ws");

const WS_URL = "wss://api.hyperliquid.xyz/ws";

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("✅ Conectado a Hyperliquid");

  ws.send(
    JSON.stringify({
      method: "subscribe",
      subscription: {
        type: "trades",
        coin: "BTC",
      },
    }),
  );

  console.log("📡 Suscrito a trades BTC");
});

ws.on("message", (raw) => {
  try {
    const msg = JSON.parse(raw);

    if (msg.channel !== "trades") return;

    for (const trade of msg.data) {
      const tick = {
        ts: trade.time,
        tradeId: trade.tid,
        price: Number(trade.px),
        size: Number(trade.sz),
        side: trade.side === "B" ? "BUY" : "SELL",
      };

      console.log(tick);
    }
  } catch (err) {
    console.error("Error procesando mensaje:", err);
  }
});

ws.on("close", () => {
  console.log("❌ WebSocket cerrado");
});

ws.on("error", (err) => {
  console.error("❌ Error WebSocket:", err);
});

/**
 * 
 * 
 {
  ts: 1781614628172,
  iso: '2026-06-16T12:57:08.172Z',
  price: 66419,
  size: 0.00017,
  side: 'SELL'        
}

 */
