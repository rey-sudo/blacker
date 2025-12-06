import path from "path";
import dotenv from "dotenv";
import database from "./database/client.js";
import { fetchCandles, GetCandlesParams } from "./lib/market/getCandles.js";
import { processOrders } from "./lib/order/processOrders.js";
import { executeOrder } from "./lib/order/executeOrder.js";
import { createSlave } from "./lib/slave/createSlave.js";
import { SlaveState, Interval } from "./types/index.js";
import { detectorRule } from "./rules/detectorRule.js";
import { startHttpServer } from "./server/index.js";
import { adxRule } from "./rules/adxRule.js";
import { mfiRule } from "./rules/mfiRule.js";
import { fileURLToPath } from "url";
import {
  findSlaveById,
  ERROR_EVENTS,
  updateSlave,
  logger,
  withRetry,
  Candle,
  Market,
  Order,
  Side,
  sleep,
} from "@whiterockdev/common";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class SlaveBot {
  public state: SlaveState;
  public orders: Order[];
  private config: any;
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
      "PRECISION",
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
    const PRECISION = parseInt(process.env.PRECISION!, 10);
    const SHOW_PLOTS = process.env.SHOW_PLOTS === "true";
    const DESCRIPTION = process.env.DESCRIPTION!;
    const DATABASE_HOST = process.env.DATABASE_HOST;
    const DATABASE_PORT = parseInt(process.env.DATABASE_PORT!);
    const DATABASE_USER = process.env.DATABASE_USER;
    const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;
    const DATABASE_NAME = process.env.DATABASE_NAME;

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
      precision_: PRECISION,
      description: DESCRIPTION,
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
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      user: DATABASE_USER,
      password: DATABASE_PASSWORD,
      database: DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 3,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      connectTimeout: 60000,
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
    let conn = null;

    try {
      logger.info("🛠️ Connecting to database...");

      conn = await database.client.getConnection();

      await conn.ping();

      await conn.beginTransaction();

      const findSlave = await findSlaveById(conn, this.state.id);

      if (findSlave) {
        logger.info("🔄 Resuming " + findSlave.id);
        this.state = findSlave;
      } else {
        logger.info("⚠️ Slave not found, creating...");
        await createSlave(conn, this.state);
      }

      await conn.commit();

      this.state.status = "running";
    } catch (err: any) {
      await conn?.rollback();
      throw err;
    } finally {
      conn?.release();
    }
  }

  public async save() {
    let conn = null;

    try {
      conn = await database.client.getConnection();

      await conn.ping();

      const findSlave = await findSlaveById(conn, this.state.id);

      if (!findSlave) throw new Error("❌ Error slave not found");

      await conn.beginTransaction();

      await updateSlave(conn, this.state.id, this.state);

      await conn.commit();

      this.state.updated_at = Date.now();

      logger.info("✅ State saved");
    } catch (err: any) {
      await conn?.rollback();
      throw err;
    } finally {
      conn?.release();
    }
  }

  private async getCandles(params: GetCandlesParams) {
    return withRetry(() => fetchCandles(process.env.MARKET_HOST!, params));
  }

  public async sleep(timeMs: number) {
    logger.info("🕒 Sleeping");
    return await sleep(timeMs);
  }

  public reset() {
    this.state.rule_values = this.state.rule_values.map(() => false);
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
        this.state.iteration++;

        const candles = await this.getCandles(params);

        this.dataset = candles;

        await processOrders.call(this, candles);

        const rule0 = await detectorRule.call(this, 0, candles);

        if (!rule0) {
          await this.save();
          await this.sleep(300_000);
          continue;
        }

        const rule1 = await adxRule.call(this, 1, candles);

        if (!rule1) {
          await this.save();
          await this.sleep(300_000);
          continue;
        }

        const rule2 = await mfiRule.call(this, 2, candles);
        if (!rule2) {
          await this.save();
          await this.sleep(300_000);
          continue;
        }

        await executeOrder.call(this, candles);
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
  logger.info("🚨 LOOP EXIT 🚨");
}

main();
