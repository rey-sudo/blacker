import path from "path";
import dotenv from "dotenv";
import database from "./database/client.js";
import {
  findSlaveById,
  ERROR_EVENTS,
  sleep,
  updateSlave,
  logger,
  withRetry,
  calculateRSI,
  calculateSqueeze,
  calculateADX,
  calculateMFI,
  Candle,
  generateId,
} from "@whiterockdev/common";
import {
  fetchCandle,
  fetchCandles,
  GetCandlesParams,
} from "./lib/market/getCandles.js";
import { createSlave } from "./utils/createSlave.js";
import { fileURLToPath } from "url";
import { BotState, Interval, Market, Side } from "./types/index.js";
import { calcLotSizeCrypto, calcLotSizeForex } from "./lib/order/lotSize.js";
import { createOrder } from "./utils/createOrder.js";
import { startHttpServer } from "./server/index.js";
import { calculateEMA } from "./common/lib/ema/ema.js";
import { applyDiscount } from "./utils/applyDiscount.js";
import { calculateTakeProfit } from "./utils/takeProfit.js";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class SlaveBot {
  public state: BotState;
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
      rule_labels: ["rsi", "squeeze", "adx", "heikin"],
      rule_values: [false, false, false, false],
    };

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

  private async getCandle(params: GetCandlesParams) {
    return withRetry(() => fetchCandle(process.env.MARKET_HOST!, params));
  }

  private async sleep(timeMs: number) {
    logger.info("🕒 Sleeping");
    return await sleep(timeMs);
  }

  private getRule(index: number) {
    return this.state.rule_values[index];
  }

  private setRule(index: number, value: boolean) {
    return (this.state.rule_values[index] = value);
  }

  public async execute(candles: Candle[], lastCandle: Candle) {
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

    const EMA55 = calculateEMA(candles, 55).at(-1)?.value;

    if (EMA55 && EMA55 > lastCandle.close) {
      takeProfit = applyDiscount(EMA55, 0.6);
    } else {
      takeProfit = calculateTakeProfit(
        lastCandle.close,
        this.state.take_profit,
        this.state.side
      );
    }

    if (this.state.market === "crypto") {
      const btc = calcLotSizeCrypto({
        balance: this.state.account_balance,
        riskPercent: this.state.account_risk,
        stopPercent: this.state.stop_loss,
        entryPrice: lastCandle.close,
        contractSize: this.state.contract_size,
      });

      lotSize = btc.lotSize;
      stopLoss = btc.stopLossPrice;
      riskUSD = btc.riskUSD;
    } else if (this.state.market === "forex") {
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

    let connection: any = null;

    try {
      connection = await database.client.getConnection();

      await withRetry(() =>
        createOrder(connection, {
          id: generateId(),
          slave: this.state.id,
          symbol: this.state.symbol,
          side: this.state.side,
          price: lastCandle.close,
          size: lotSize,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          account_risk: this.state.account_risk,
          risk_usd: riskUSD,
          notified: false,
          created_at: Date.now(),
          updated_at: Date.now(),
        })
      );

      await connection.commit();

      this.state.executed = true;
      this.state.status = "executed";
      await this.save();

      logger.info("✅ OrderExecuted")

    } catch (err: any) {
      await connection?.rollback();
      throw err;
    } finally {
      connection?.release();
    }

    this.state.finished = true;
    this.state.status = "finished";
    await this.save();
    await this.sleep(86_400_000);
  }

  public async run() {
    await this.setup();

    const params = {
      symbol: this.state.symbol,
      market: this.state.market,
      interval: this.state.interval_,
      window: 500,
    };

    while (true) {
      try {
        await this.save();

        const candles = await this.getCandles(params);
        const lastCandle = await this.getCandle(params);

        this.dataset = [...candles, lastCandle];

        if (!this.getRule(0)) {
          const lastRsi = calculateRSI(candles).at(-1)?.value;

          if (typeof lastRsi !== "number" || Number.isNaN(lastRsi)) {
            throw new Error("lastRsi value typeError");
          }

          const rule1 = lastRsi < 35;

          this.setRule(0, rule1);

          logger.info(`RSI:${lastRsi}`);

          if (!this.getRule(0)) {
            await this.sleep(300_000);
            continue;
          }
        }

        if (!this.getRule(1)) {
          const lastSqueeze = calculateSqueeze(candles).at(-1)?.color;

          if (!lastSqueeze) continue;

          const rule1 = lastSqueeze === "green";

          this.setRule(1, rule1);

          if (!this.getRule(1)) {
            await this.sleep(300_000);
            continue;
          }
        }

        if (!this.getRule(2)) {
          const keyLevel = 23;

          const { reversalPoints } = calculateADX(candles);

          const lastReversal = reversalPoints.at(-1);

          if (lastReversal) {
            const rule1 = lastReversal.time === lastCandle.time;

            const rule2 = lastReversal.value > keyLevel;

            this.setRule(2, rule1 && rule2);
          }

          if (!this.getRule(2)) {
            await this.sleep(300_000);
            continue;
          }
        }

        if (!this.getRule(3)) {
          const { haCandles, smaData } = calculateMFI(candles);

          const lastHeikin = haCandles.at(-1);
          const lastSma = smaData.at(-1);

          if (lastHeikin && lastSma) {
            const rule1 = lastHeikin.close < 45;
            const rule2 = lastHeikin.close > lastSma.value;

            this.setRule(3, rule1 && rule2);
          }

          if (!this.getRule(3)) {
            await this.sleep(60_000);
            continue;
          }
        }

        await this.execute(candles, lastCandle);
      } catch (err: any) {
        this.state.status = "error";
        logger.error(err);
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
