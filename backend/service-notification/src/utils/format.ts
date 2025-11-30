import { Order } from "@whiterockdev/common";


export function buildOrderMessage(order: Order): string {
  const orderSize = Number(order.size).toFixed(2);
  const accountRisk = Number(order.account_risk).toFixed(2);
  const riskUSD = Number(order.risk_usd).toFixed(2);
  const price = Number(order.price).toFixed(7);
  const stopLoss = Number(order.stop_loss).toFixed(7);
  const takeProfit = Number(order.take_profit).toFixed(7);

  const isTesting = order.slave === "slave-test";


  return `
<b>${isTesting ? '⚠️ TEST' : '🚨 New Order' }</b>

<b>🆔 Order:</b> ${shortUUID(order.id)}
<b>👤 Slave:</b> ${order.slave}

<b>📊 Symbol:</b> ${order.symbol}
<b>📈 Side:</b> ${order.side === "LONG" ? "LONG ⬆️🟢" : "SHORT ⬇️🔴"}

<b>💵 Entry Price:</b> ${price}
<b>🛡 Stop Loss:</b> ${stopLoss}
<b>🎯 Take Profit:</b> ${takeProfit}
<b>📦 Position Size:</b> ${orderSize}

<b>⚖️ Account Risk:</b> ${accountRisk}% (${riskUSD} USD)

`;
}

export function shortUUID(
  uuid: string,
  startLen: number = 5,
  endLen: number = 5
): string {
  if (uuid.length <= startLen + endLen) return uuid;

  const start = uuid.slice(0, startLen);
  const end = uuid.slice(-endLen);

  return `${start}...${end}`;
}
