import path from "path";
import dotenv from "dotenv";
import database from "./database/client.js";
import { fetchCandles, GetCandlesParams } from "./lib/market/getCandles.js";
import { Env, validateEnv } from "./lib/zod/verifyEnvVars.js";
import { processOrders } from "./lib/order/processOrders.js";
import { detectorRule } from "./lib/rules/detectorRule.js";
import { triggerRule } from "./lib/rules/triggerRule.js";
import { executeOrder } from "./lib/order/executeOrder.js";
import { createSlave } from "./lib/slave/createSlave.js";
import { SlaveState, Interval } from "./types/index.js";
import { startHttpServer } from "./server/index.js";
import { adxRule } from "./lib/rules/adxRule.js";
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
import { CustomError } from "./common/error/customError.js";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class SlaveBot {
  public env: Env;
  public state: SlaveState;
  public orders: Order[];
  private config: any;
  public dataset: Candle[];

  constructor(env: Env) {
    this.env = env;

    ERROR_EVENTS.forEach((event: string) =>
      process.on(event, (err) => {
        logger.error(err);
        process.exit(0);
      })
    );

    const RULES = ["rsi", "adx", "mfi"];

    const timestamp = Date.now();

    this.state = {
      id: this.env.SLAVE_NAME,
      status: "started",
      iteration: 0,
      market: this.env.MARKET as Market,
      symbol: this.env.SYMBOL,
      interval_: this.env.INTERVAL as Interval,
      side: this.env.SIDE as Side,
      account_balance: this.env.ACCOUNT_BALANCE,
      account_risk: this.env.ACCOUNT_RISK,
      stop_loss: this.env.STOP_LOSS,
      take_profit: this.env.TAKE_PROFIT,
      contract_size: this.env.CONTRACT_SIZE,
      precision_: this.env.PRECISION,
      description: this.env.DESCRIPTION,
      executed: false,
      finished: false,
      created_at: timestamp,
      updated_at: timestamp,
      rule_labels: RULES,
      rule_values: RULES.map(() => false),
    };

    this.orders = [];

    this.config = {
      show_plots: this.env.SHOW_PLOTS,
    };

    this.dataset = [];

    database.connect({
      host: this.env.DATABASE_HOST,
      port: this.env.DATABASE_PORT,
      user: this.env.DATABASE_USER,
      password: this.env.DATABASE_PASSWORD,
      database: this.env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 3,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      connectTimeout: 60000,
    });

    startHttpServer(this);
  }

  private async initDatabase() {
    let conn = null;

    try {
      logger.info("🛠️ Connecting to database...");

      conn = await database.client.getConnection();

      await conn.ping();

      const findSlave = await findSlaveById(conn, this.state.id);

      if (findSlave) {
        logger.info("🔄 Resuming " + findSlave.id);
        this.state = findSlave;
      } else {
        logger.info("⚠️ Slave not found, creating...");
        await createSlave(conn, this.state);
      }
    } catch (err: any) {
      throw new CustomError({
        message: "Error configuring the slave table",
        error: err,
        event: "error.slave",
        context: { service: this.env.SLAVE_NAME, function: "initDatabase" },
      });
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

      logger.info(`✅ State saved: ${this.state.rule_values}`);
    } catch (err: any) {
      await conn?.rollback();

      throw new CustomError({
        message: "Error saving state",
        error: err,
        event: "error.slave",
        context: { service: this.env.SLAVE_NAME, function: "save" },
      });
    } finally {
      conn?.release();
    }
  }

  private async getCandles(params: GetCandlesParams): Promise<Candle[]> {
    return withRetry(() => fetchCandles(process.env.MARKET_HOST!, params));
  }

  public async sleep(timeMs: number) {
    logger.info("🕒 Sleeping");
    return await sleep(timeMs);
  }

  public async reset() {
    this.state.rule_values = this.state.rule_values.map(() => false);

    await this.save();
    logger.info("🔄️ Reseted");
  }

  public async run() {
    logger.info("🚀 Starting slave...");

    await this.initDatabase();

    while (true) {
      try {
        this.state.status = "running";
        this.state.iteration++;

        await this.save();

        const getCandlesParams = {
          symbol: this.state.symbol,
          market: this.state.market,
          interval: this.state.interval_,
          window: 500,
        };

        const candles = await this.getCandles(getCandlesParams);

        if (!candles.length) {
          logger.info("⚠️ Warning there are not enough candles");
          continue;
        }

        this.dataset = candles;

        await processOrders.call(this, candles);

        const R0 = await detectorRule.call(this, 0, candles);
        if (!R0) continue;

        const R1 = await adxRule.call(this, 1, candles);
        if (!R1) continue;

        const R2 = await triggerRule.call(this, 2, candles);
        if (!R2) continue;

        await executeOrder.call(this, candles);

        await this.sleep(300_000);
      } catch (formatedError: any) {
        logger.error(formatedError);
        this.state.status = "error";
        await this.sleep(300_000);
      }
    }
  }
}

async function main() {
  try {
    const env = validateEnv();

    const botInstance = new SlaveBot(env);
    await botInstance.run();
  } catch (formatedErrors: any) {
    logger.error(formatedErrors);
  } finally {
    logger.info("🚨 LOOP EXIT 🚨");
  }
}

main();
