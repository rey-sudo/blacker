import path from "path";
import dotenv from "dotenv";
import database from "./database/client.js";
import * as fs from "fs";
import csv from "csv-parser";
import { findSlaveById } from "./utils/findSlaveById.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { createSlave } from "./utils/createSlave.js";
import { updateSlave } from "./utils/updateSlave.js";
import { fileURLToPath } from "url";
import { BotState, Candle } from "./types/index.js";
import { startHttpServer } from "./server/index.js";
import { sleep } from "./utils/sleep.js";
import { logger } from "./utils/logger.js";
import { calculateRSI } from "./lib/rsi/rsi.js";
import { calculateSqueeze } from "./lib/squeeze/squeeze.js";
import { calculateADX } from "./lib/adx/adx.js";
import { calculateMFI } from "./lib/mfi/mfi.js";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class Backtester {
  public state: BotState;
  private config: any;

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SLAVE_NAME",
      "SYMBOL",
      "POSITION_RISK",
      "STOP_LOSS",
      "LEVERAGE",
      "SHOW_PLOTS",
      "DESCRIPTION",
      // "DATABASE_HOST",
      // "DATABASE_PORT",
      //"DATABASE_USER",
      //"DATABASE_PASSWORD",
      //"DATABASE_NAME",
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
    const SYMBOL = process.env.SYMBOL!;
    const ACCOUNT_BALANCE = parseInt(process.env.ACCOUNT_BALANCE!, 10);
    const POSITION_RISK = parseFloat(process.env.POSITION_RISK!);
    const STOP_LOSS = parseFloat(process.env.STOP_LOSS!);
    const LEVERAGE = parseInt(process.env.LEVERAGE!, 10);
    const SHOW_PLOTS = process.env.SHOW_PLOTS === "true";

    this.state = {
      id: SLAVE_NAME,
      iteration: 0,
      status: "started",
      executed: false,
      finished: false,
      symbol: SYMBOL,
      account_balance: ACCOUNT_BALANCE,
      position_risk: POSITION_RISK,
      description: process.env.DESCRIPTION!,
      leverage: LEVERAGE,
      stop_loss: STOP_LOSS,
      dataset: [],
      window: 500,
      current_window: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      rule_labels: ["rsi", "squeeze", "adx", "heikin"],
      rule_values: [false, false, false, false],
    };

    this.config = {
      show_plots: SHOW_PLOTS,
    };
    /** 
    database.connect({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT!),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
*/
    startHttpServer(this);
  }

  private async setup() {
    try {
      logger.info("🚀 Starting slave...");

      await this.loadData();
      // await this.setupDatabase();
    } catch (err: any) {
      logger.error(err);
      this.state.status = "error";
      throw err;
    }
  }

  private async loadData(): Promise<void> {
    const csvPath = path.join(root, "input", "btcusdt_15m_1y.csv");

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on("data", (row) => {
          const parsed: Candle = {
            time: Math.floor(Number(row.timestamp) / 1000),
            open: Number(row.open),
            high: Number(row.high),
            low: Number(row.low),
            close: Number(row.close),
            volume: Number(row.volume),
          };

          this.state.dataset.push(parsed);
        })
        .on("end", () => {
          console.log("CSV leído correctamente:");
          console.log(this.state.dataset.length);
          resolve();
        })
        .on("error", (err) => {
          console.error("Error al leer el CSV:", err);
          reject(err);
        });
    });
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

  private async sleep(timeMs: number) {
    logger.info("🕒 Sleeping");
    return await sleep(timeMs);
  }

  private getLast(dataset: Candle[], index: number, window: number): Candle[] {
    if (index < window) return [];

    return dataset.slice(index - window + 1, index + 1);
  }

  public async run() {
    await this.setup();

    const window = 300;

    const startAt = window;

    for (let i = startAt; i < this.state.dataset.length; i++) {
      const currentCandle = this.state.dataset[i];

      const candles = this.getLast(this.state.dataset, i, window);

      this.state.current_window = candles;

      if (candles.length < window) {
        continue;
      }

      try {
        //await this.save();

        if (!this.state.rule_values[0]) {
          const rsiData = calculateRSI(candles);

          const lastRsi = rsiData.at(-1)?.value;

          if (lastRsi) {
            this.state.rule_values[0] = lastRsi < 33;
          }

          if (!this.state.rule_values[0]) {
            continue;
          }
        }

        if (!this.state.rule_values[1]) {
          const squeezeData = calculateSqueeze(candles);

          const lastSqueeze = squeezeData.at(-1)?.color;

          if (lastSqueeze) {
            this.state.rule_values[1] = lastSqueeze === "green";
          }

          if (!this.state.rule_values[1]) {
            continue;
          }
        }

        if (!this.state.rule_values[2]) {
          const keyLevel = 23;

          const { reversalPoints } = calculateADX(candles);

          const lastReversal = reversalPoints.at(-1);

          if (lastReversal) {
            const lastCandle = this.state.dataset[i - 1];

            const rule1 = lastReversal.time === lastCandle.time;

            const rule2 = lastReversal.value > keyLevel;

            this.state.rule_values[2] = rule1 && rule2;
          }

          if (!this.state.rule_values[2]) {
            continue;
          }
        }

        if (!this.state.rule_values[3]) {
          const { haCandles, smaData } = calculateMFI(candles);

          const lastHeikin = haCandles.at(-1);
          const lastSma = smaData.at(-1);

          if (lastHeikin && lastSma) {
            const rule1 = lastHeikin.close < 50;
            const rule2 = lastHeikin.close > lastSma.value;

            this.state.rule_values[3] = rule1 && rule2;
          }

          if (!this.state.rule_values[3]) {
            continue;
          }
        }

        console.log("executed", currentCandle.close);

        //await this.save();
        await this.sleep(3_000);
      } catch (err: any) {
        this.state.status = "error";
        logger.error(err);
      }
    }
  }
}

async function main() {
  const bot = new Backtester();
  await bot.run();
}

main();
