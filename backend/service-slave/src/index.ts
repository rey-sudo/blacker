import path from "path";
import dotenv from "dotenv";
import database from "./database/client.js";
import { findSlaveById } from "./utils/findSlaveById.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { createSlave } from "./utils/createSlave.js";
import { updateSlave } from "./utils/updateSlave.js";
import { sleep } from "./utils/sleep.js";
import { fileURLToPath } from "url";
import { logger } from "./utils/logger.js";
import { BotState } from "./types/index.js";
import { startHttpServer } from "./server/index.js";
import { withRetry } from "./utils/index.js";
import { fetchCandles, GetCandlesParams } from "./lib/market/getCandles.js";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class SlaveBot {
  public state: BotState;
  private config: any;
  private binance: any;

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SLAVE_NAME",
      "MARKET",
      "SYMBOL",
      "ACCOUNT_BALANCE",
      "ACCOUNT_RISK",
      "STOP_LOSS",
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
    const ACCOUNT_BALANCE = parseInt(process.env.ACCOUNT_BALANCE!, 10);
    const ACCOUNT_RISK = parseFloat(process.env.ACCOUNT_RISK!);
    const STOP_LOSS = parseFloat(process.env.STOP_LOSS!);
    const CONTRACT_SIZE = parseInt(process.env.CONTRACT_SIZE!, 10);
    const SHOW_PLOTS = process.env.SHOW_PLOTS === "true";

    this.state = {
      id: SLAVE_NAME,
      status: "started",
      iteration: 0,
      market: MARKET,
      symbol: SYMBOL,
      account_balance: ACCOUNT_BALANCE,
      account_risk: ACCOUNT_RISK,
      stop_loss: STOP_LOSS,
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

      await this.setupDatabase();
    } catch (err: any) {
      logger.error(err);
      this.state.status = "error";
      throw err;
    }
  }

  private async setupDatabase() {
    let connection = null;

    try {
      logger.info("🛠️ Connecting to database...");

      connection = await database.client.getConnection();

      await connection.beginTransaction();

      const findSlave = await findSlaveById(connection, this.state.id);

      if (findSlave) {
        logger.info("🔄 Resuming " + findSlave.id);
        this.state = findSlave;
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

      const findSlave = await findSlaveById(connection, this.state.id);

      if (!findSlave) throw new Error("❌ Error slave not found");

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

  public async createOrder() {
    const isExecuted = this.state.executed || this.state.finished;

    if (isExecuted) {
      logger.info("Already executed");
      await this.sleep(86_400_000);
      return;
    }

    this.state.finished = true;
    this.state.status = "finished";
    await this.save();

    await this.sleep(86_400_000);
  }

  public async run() {
    await this.setup();

    while (true) {
      try {
        await this.save();

        const params = {
          symbol: "BTCUSDT",
          source: "binance",
          interval: "4h",
          exchange: "binance",
        };

        const candles = await this.getCandles(params);

        console.log(candles.length);

        //await this.createOrder()

        console.log("BUY");

        this.state.executed = true;
        this.state.status = "executed";
        this.state.finished = true;
        this.state.status = "finished";
        await this.save();
        await this.sleep(60_000_600);
      } catch (err: any) {
        this.state.status = "error";
        logger.error(err);
      }
    }
  }
}

async function main() {
  const bot = new SlaveBot();
  await bot.run();
}

main();
