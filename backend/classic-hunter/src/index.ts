import path from 'path';
import dotenv from 'dotenv';
import { relativeStrengthIndex } from "./tools/rsi/index.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { sleep } from "./utils/sleep.js";
import { fileURLToPath } from 'url';
import { startHttpServer } from './server/index.js';
import { redisClient } from './database/index.js';
import { createAlert } from './common/alerts.js';
import { HunterState } from './types/index.js';
import { timeseriesToKline } from './utils/format.js';
import twelvedata from "twelvedata";

dotenv.config();

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, '..');


export class HunterBot {
  public state: HunterState;
  private config: any;
  private client: any;
  private redis: any

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SYMBOLS",
      "SHOW_PLOTS",
      "TWELVEDATA_API_KEY",
      "START_AT",
      "REDIS_HOST"
    ];

    for (const envName of requiredEnvVars) {
      if (!process.env[envName]) {
        throw new Error(`${envName} error`);
      }
    }

    ERROR_EVENTS.forEach((event: string) => process.on(event, (err) => {
      console.error(err)
      process.exit(1);
    }));

    const SHOW_PLOTS = process.env.SHOW_PLOTS === 'true'

    const START_AT = parseInt(process.env.START_AT!)

    this.state = {
      status: 'started',
      iteration: START_AT,
      symbol: '',
      validSymbols: [],
      detectedSymbols: [],
      updated_at: Date.now(),
    };

    this.config = {
      show_plots: SHOW_PLOTS
    }

    this.client = twelvedata({ key: "39394ff16ece4c249d9952042a465936" });

    startHttpServer(this);
  }

  private async setup() {
    try {
      console.log("🚀 Starting hunter...")

      await redisClient.connect({
        url: process.env.REDIS_HOST!,
        socket: {
          connectTimeout: 100000,
          keepAlive: 100000,
        } as any,
        service: "service-hunter",
      });

      this.redis = redisClient.client;

      this.state.validSymbols = process.env.SYMBOLS!.split(",")

      if (this.state.iteration >= this.state.validSymbols.length) {
        throw new Error('iteration > validSymbol length')
      }

      console.log(`✅ Setup: ${this.state.validSymbols.length} valid symbols`)
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  public async sleep(ms: number) {
    console.log("🕒 Sleeping");
    await sleep(ms);
  }

  public async run() {

    await this.setup();

    while (true) {
      try {
        if (this.state.iteration >= this.state.validSymbols.length) {
          this.state.iteration = 0
          this.state.detectedSymbols = []

          console.log("🔄 Reseted");
          await this.sleep(300_000)
          continue
        }

        const symbol = this.state.validSymbols[this.state.iteration]
        this.state.symbol = symbol

        console.log(`Analizing ${symbol} iteration ${this.state.iteration}`);

        const params = {
          symbol: symbol,
          interval: "15min",
          outputsize: 200,
        };

        const data = await this.client.timeSeries(params);
        const klines = timeseriesToKline(data.values);

        const rsiParams = { klines, mark: 6, filename: 'rsi.png', show: this.config.show_plots }
        const result = await relativeStrengthIndex(rsiParams);

        if (result) {
          this.state.detectedSymbols.push(symbol)
          await createAlert(this.redis, `RSI alert for ${symbol}`)

        }

        this.state.iteration += 1
        this.state.updated_at = Date.now()

        await this.sleep(60_000)
      } catch (err) {
        this.state.status = 'error'
        console.error(err)
      }
    }
  }
}

async function main() {
  const bot = new HunterBot();
  await bot.run();
}

main();
