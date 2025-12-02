import database from "../../database/client.js";
import {
  calculateEMA,
  Candle,
  generateId,
  logger,
  Order,
  withRetry,
} from "@whiterockdev/common";
import { calculateTakeProfit } from "../../utils/takeProfit.js";
import {
  calcLotSizeCrypto,
  calcLotSizeForex,
} from "./lotSize.js";
import { createOrder } from "./createOrder.js";
import { SlaveBot } from "../../index.js";

export async function executeOrder(this: SlaveBot, candles: Candle[]) {
  const isExecuted = this.state.executed || this.state.finished;

  if (isExecuted) {
    logger.info("✅ Already executed");
    await this.sleep(86_400_000);
    return;
  }

  let takeProfit = null;

  let lotSize = null;
  let stopLoss = null;
  let riskUSD = null;

  const lastCandle = candles.at(-1);

  const ema55Data = calculateEMA(candles, 55);
  const last55ema = ema55Data.at(-1)?.value;

  if (!lastCandle) {
    throw new Error("lastCandle type error");
  }

  if (typeof last55ema !== "number" || Number.isNaN(last55ema)) {
    throw new Error("last55ema type error");
  }

  if (last55ema > lastCandle.close) {
    takeProfit = last55ema;
  } else {
    takeProfit = calculateTakeProfit(
      lastCandle.close,
      this.state.take_profit,
      this.state.side
    );
  }

  if (this.state.market === "crypto") {
    const crypto = calcLotSizeCrypto({
      balance: this.state.account_balance,
      riskPercent: this.state.account_risk,
      stopPercent: this.state.stop_loss,
      entryPrice: lastCandle.close,
      precision: this.state.precision,
      contractSize: this.state.contract_size,
    });

    lotSize = crypto.lotSize;
    stopLoss = crypto.stopLossPrice;
    riskUSD = crypto.riskUSD;
  }

  if (this.state.market === "forex") {
    const forex = calcLotSizeForex({
      balance: this.state.account_balance,
      riskPercent: this.state.account_risk,
      stopPercent: this.state.stop_loss,
      entryPrice: lastCandle.close,
      precision: this.state.precision,
      contractSize: this.state.contract_size,
    });

    lotSize = forex.lotSize;
    stopLoss = forex.stopLossPrice;
    riskUSD = forex.riskUSD;
  }

  for (const e of [takeProfit, lotSize, stopLoss, riskUSD]) {
    if (typeof e !== "number" && Number.isNaN(e))
      throw new Error("Order error: null values");
  }

  // Order execution

  let connection: any = null;

  try {
    connection = await database.client.getConnection();
    await connection.beginTransaction();

    const orderParams: Order = {
      id: generateId(),
      status: "executed"!,
      market: this.state.market,
      slave: this.state.id,
      symbol: this.state.symbol,
      side: this.state.side,
      price: lastCandle.close,
      size: lotSize!,
      stop_loss: stopLoss!,
      take_profit: takeProfit!,
      account_risk: this.state.account_risk,
      risk_usd: riskUSD!,
      notified: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await withRetry(() => createOrder(connection, orderParams));

    await connection.commit();

    this.orders.push(orderParams);

    this.state.executed = true;
    this.state.status = "executed";
    await this.save();
    logger.info("✅ OrderExecuted");

    await this.sleep(86_400_000);
    this.reset();
  } catch (err: any) {
    await connection?.rollback();
    throw err;
  } finally {
    connection?.release();
  }
}
