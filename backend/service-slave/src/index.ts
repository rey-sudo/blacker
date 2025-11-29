import path from "path";
import dotenv from "dotenv";
import database from "./database/client.js";
import { createSlave } from "./utils/createSlave.js";
import { fileURLToPath } from "url";
import { SlaveState, Interval } from "./types/index.js";
import { createOrder } from "./utils/createOrder.js";
import { startHttpServer } from "./server/index.js";
import { calculateTakeProfit } from "./utils/takeProfit.js";
import { detectorRule } from "./rules/detectorRule.js";
import { adxRule } from "./rules/adxRule.js";
import { mfiRule } from "./rules/mfiRule.js";
import { Market, Order, OrderStatus, Side } from "./common/types/index.js";
import { calcLotSizeCrypto, calcLotSizeForex } from "./lib/order/lotSize.js";
import {
  findSlaveById,
  ERROR_EVENTS,
  sleep,
  updateSlave,
  logger,
  withRetry,
  Candle,
  generateId,
  calculateEMA,
} from "@whiterockdev/common";
import { fetchCandles, GetCandlesParams } from "./lib/market/getCandles.js";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class SlaveBot {
  public state: SlaveState;
  public orders: Order[];
  private config: any;
  private binance: any;
  public dataset: Candle[];

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SLAVE_NAME",
      "MARKET",
      "SYMBOL",
      "SIDE",
      "ACCOUNT_BALANCE",
      "ACCOUNT_RISK",
      "STOP_LOSS",
      "TAKE_PROFIT",
      "CONTRACT_SIZE",
      "SHOW_PLOTS",
      "DESCRIPTION",
      "MARKET_HOST",
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
    ];

    for (const envName of requiredEnvVars) {
      if (!process.env[envName]) {
        throw new Error(`${envName} error`);
      }
    }

    ERROR_EVENTS.forEach((event: string) =>
      process.on(event, (err) => {
        logger.error(err);
        process.exit(0);
      })
    );

    const SLAVE_NAME = process.env.SLAVE_NAME!;
    const MARKET = process.env.MARKET!;
    const SYMBOL = process.env.SYMBOL!;
    const INTERVAL = process.env.INTERVAL!;
    const SIDE = process.env.SIDE!;
    const ACCOUNT_BALANCE = parseInt(process.env.ACCOUNT_BALANCE!, 10);
    const ACCOUNT_RISK = parseFloat(process.env.ACCOUNT_RISK!);
    const STOP_LOSS = parseFloat(process.env.STOP_LOSS!);
    const TAKE_PROFIT = parseFloat(process.env.TAKE_PROFIT!);
    const CONTRACT_SIZE = parseInt(process.env.CONTRACT_SIZE!, 10);
    const SHOW_PLOTS = process.env.SHOW_PLOTS === "true";

    const RULES = ["rsi", "adx", "mfi"];

    this.state = {
      id: SLAVE_NAME,
      status: "started",
      iteration: 0,
      market: MARKET as Market,
      symbol: SYMBOL,
      interval_: INTERVAL as Interval,
      side: SIDE as Side,
      account_balance: ACCOUNT_BALANCE,
      account_risk: ACCOUNT_RISK,
      stop_loss: STOP_LOSS,
      take_profit: TAKE_PROFIT,
      contract_size: CONTRACT_SIZE,
      description: process.env.DESCRIPTION!,
      executed: false,
      finished: false,
      created_at: Date.now(),
      updated_at: Date.now(),
      rule_labels: RULES,
      rule_values: RULES.map(() => false),
    };

    this.orders = [];

    this.config = {
      show_plots: SHOW_PLOTS,
    };

    this.dataset = [];

    database.connect({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT!),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    startHttpServer(this);
  }

  private async setup() {
    try {
      logger.info("🚀 Starting slave...");

      await this.database();
    } catch (err: any) {
      logger.error(err);
      this.state.status = "error";
      throw err;
    }
  }

  private async database() {
    let connection = null;

    try {
      logger.info("🛠️ Connecting to database...");

      connection = await database.client.getConnection();
      await connection.beginTransaction();

      const slave = await findSlaveById(connection, this.state.id);

      if (slave) {
        logger.info("🔄 Resuming " + slave.id);
        this.state = slave;
      } else {
        logger.info("⚠️ Slave not found, creating...");
        await createSlave(connection, this.state);
      }

      await connection.commit();

      this.state.status = "running";
    } catch (err: any) {
      await connection?.rollback();
      throw err;
    } finally {
      connection?.release();
    }
  }

  private async save() {
    let connection = null;

    try {
      connection = await database.client.getConnection();

      const slave = await findSlaveById(connection, this.state.id);
      if (!slave) throw new Error("❌ Error slave not found");

      await connection.beginTransaction();

      await updateSlave(connection, this.state.id, this.state);

      await connection.commit();

      this.state.updated_at = Date.now();

      this.state.iteration++;

      logger.info("✅ State saved");
    } catch (err: any) {
      await connection?.rollback();
      throw err;
    } finally {
      connection?.release();
    }
  }

  private async getCandles(params: GetCandlesParams) {
    return withRetry(() => fetchCandles(process.env.MARKET_HOST!, params));
  }

  private async sleep(timeMs: number) {
    logger.info("🕒 Sleeping");
    return await sleep(timeMs);
  }

  public reset() {
    this.state.rule_values = this.state.rule_values.map(() => false);
  }

  public async execute(candles: Candle[]) {
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
        contractSize: this.state.contract_size,
      });

      lotSize = crypto.lotSize;
      stopLoss = crypto.stopLossPrice;
      riskUSD = crypto.riskUSD;
    }

    if (this.state.market === "forex") {
      const lastPriceF = 1.1516;

      const forex = calcLotSizeForex({
        balance: this.state.account_balance,
        riskPercent: this.state.account_risk,
        stopPercent: this.state.stop_loss,
        entryPrice: lastPriceF,
        pipSize: 0.0001,
        contractSize: 100_000,
      });

      lotSize = forex.lotSize;
      stopLoss = forex.stopLossPrice;
      riskUSD = forex.riskUSD;
    }

    for (const v of [takeProfit, lotSize, stopLoss, riskUSD]) {
      if (v == null) throw new Error("Order error: null values");
    }

    if (typeof last55ema !== "number" || Number.isNaN(last55ema)) {
      throw new Error("last55ema type error");
    }

    // Order execution

    let connection: any = null;

    try {
      connection = await database.client.getConnection();

      const orderParams: Order = {
        id: generateId(),
        status: "executed" as OrderStatus,
        market: this.state.market,
        slave: this.state.id,
        symbol: this.state.symbol,
        side: this.state.side,
        price: lastCandle.close,
        size: lotSize as number,
        stop_loss: stopLoss as number,
        take_profit: takeProfit as number,
        account_risk: this.state.account_risk,
        risk_usd: riskUSD as number,
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

  public async run() {
    await this.setup();

    while (true) {
      try {
        await this.save();

        //this.processOrders

        const params = {
          symbol: this.state.symbol,
          market: this.state.market,
          interval: this.state.interval_,
          window: 500,
        };

        const candles = await this.getCandles(params);

        this.dataset = [...candles];

        const R0 = await detectorRule.call(this, 0, candles);
        if (!R0) {
          await this.sleep(300_000);
          continue;
        }

        const R1 = await adxRule.call(this, 1, candles);

        if (!R1) {
          await this.sleep(300_000);
          continue;
        }

        const R2 = await mfiRule.call(this, 2, candles);
        if (!R2) {
          await this.sleep(300_000);
          continue;
        }

        await this.execute(candles);
      } catch (err: any) {
        logger.error(err);
        this.state.status = "error";
        await this.sleep(60_000);
      }
    }
  }
}

async function main() {
  const bot = new SlaveBot();
  await bot.run();
}

main();
