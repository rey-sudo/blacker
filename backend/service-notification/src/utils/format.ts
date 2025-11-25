export interface Order {
  id: string;
  slave: string;
  symbol: string;
  side: "LONG" | "SHORT";
  price: number;
  size: number;
  stop_loss: number;
  take_profit: number;
  account_risk: number;
  risk_usd: number;
  notified: boolean;
  created_at: number;
  updated_at: number;
}

export function buildOrderMessage(order: Order): string {
  return `
<b>🚨 New Order</b>

<b>🆔 Order:</b> ${order.id}
<b>👤 Slave:</b> ${order.slave}

<b>📊 Symbol:</b> ${order.symbol}
<b>📈 Side:</b> ${order.side === "LONG" ? "LONG ⬆️🟢" : "SHORT ⬇️🔴"}

<b>💵 Entry Price:</b> ${order.price}
<b>📦 Position Size:</b> ${order.size}
<b>🛡 Stop Loss:</b> ${order.stop_loss}
<b>🎯 Take Profit:</b> ${order.take_profit}

<b>⚖️ Account Risk:</b> ${order.account_risk}% (${order.risk_usd} USD)

`;
}
