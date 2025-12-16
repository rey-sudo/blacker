import database from "../../database/client.js";
import { countEMATouches } from "../rules/mfiRule.js";
import { createAlert } from "../../common/lib/createAlert.js";
import { SlaveBot } from "../../index.js";
import {
  Alert,
  calculateEMA,
  calculateSqueeze,
  Candle,
  generateId,
  logger,
} from "@whiterockdev/common";

export async function processOrders(this: SlaveBot, candles: Candle[]) {
  const lastCandle = candles.at(-1);
  if (!lastCandle) return;

  const squeeze = calculateSqueeze(candles);
  const lastSqueezeColor = squeeze.at(-1)?.color;
  if (!lastSqueezeColor) return;

  const EMA25 = calculateEMA(candles, 25);
  const lastEma25 = EMA25.at(-1)?.value;
  if (!lastEma25) return;

  const { touches, failedBreakouts } = countEMATouches(candles, EMA25);

  const rule1 = lastSqueezeColor === "blue";
  const rule2 = touches >= 3 || failedBreakouts >= 4;

  for (const order of this.orders) {
    if (order.status !== "created") continue;

    const isLong = order.side === "LONG";
    const isShort = order.side === "SHORT";

    if (isLong) {
      if (rule1 || rule2) {
        let conn = null;

        try {
          conn = await database.client.getConnection();

          await conn.ping();

          const alertParams: Alert = {
            id: generateId(),
            type: "order:sell",
            title: "⚠️ SELL NOW ⚠️",
            source: this.state.id,
            message: `Sell ${order.symbol} at ${lastCandle.close} or market`,
            notified: false,
            created_at: Date.now(),
            updated_at: Date.now(),
          };

          await createAlert(conn, alertParams);
        } catch (err: any) {
          logger.error({
            message: "Error processing order",
            error: err,
            event: "error.slave",
            context: {
              service: this.env.SLAVE_NAME,
              function: "processOrders",
              orderId: order.id,
              orderSymbol: order.symbol,
            },
          });
        } finally {
          conn?.release();
        }
      }
    }
  }
}
