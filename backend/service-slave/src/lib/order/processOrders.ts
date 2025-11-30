import { calculateEMA, calculateSqueeze, Candle, generateId } from "@whiterockdev/common";
import { countEMATouches } from "../../rules/mfiRule.js";
import { Alert } from "../../common/types.js";
import { SlaveBot } from "../../index.js";
import { createAlert } from "../../common/lib/createAlert.js";

export async function processOrders(this: SlaveBot, candles: Candle[]) {
  const lastCandle = candles.at(-1);
  if (!lastCandle) return;

  const squeeze = calculateSqueeze(candles);
  const lastSqueeze = squeeze.at(-1)?.color;
  if (!lastSqueeze) return;

  const EMA25 = calculateEMA(candles, 25);
  const lastEma25 = EMA25.at(-1)?.value;
  if (!lastEma25) return;

  const { touches, failedBreakouts } = countEMATouches(candles, EMA25);

  const rule1 = lastSqueeze === "blue";
  const rule2 = touches >= 3 || failedBreakouts >= 4;

  for (const order of this.orders) {
    if (order.status !== "executed") continue;

    const isLong = order.side === "LONG";
    const isShort = order.side === "SHORT";

    if (isLong) {
      if (rule1 || rule2) {
        let alertParams: Alert = {
          id: generateId(),
          type: "order:sell",
          title: "⚠️ SELL NOW ⚠️",
          message: `Sell ${order.symbol} at ${lastCandle.close} or market`,
          notified: false,
          created_at: Date.now(),
          update_at: Date.now(),
        };

        await createAlert(connection, alertParams);
      }
    }
    
  }
}
