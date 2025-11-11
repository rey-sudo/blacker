import path from 'path';
import dotenv from 'dotenv';
import { relativeStrengthIndex } from "./tools/rsi/index.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { sleep } from "./utils/sleep.js";
import { fileURLToPath } from 'url';
import { startHttpServer } from './server/index.js';
import { redisClient } from './database/index.js';
import { createAlert } from './common/alerts.js';
import { BinanceKlineSimple, HunterState, Timeseries } from './types/index.js';
import twelvedata from "twelvedata";

if (process.env.NODE_ENV !== 'development') {
  dotenv.config();
}

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

      this.redis = redisClient.client

      const symbols = process.env.SYMBOLS!.split(",")

      this.state.validSymbols = symbols

      console.log("✅Configured Symbols: ", symbols)

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

  public async getKlines(
    symbol: string,
    interval: string,
    range: string,
    slice: number
  ): Promise<BinanceKlineSimple[]> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al obtener datos de ${symbol}`);
    }

    const data: any = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error(`Respuesta inválida para el símbolo ${symbol}`);
    }

    const timestamps: number[] = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles: Timeseries[] = timestamps
      .map((t, i) => ({
        time: new Date(t * 1000).toISOString(),
        open: quotes.open?.[i] ?? quotes.close?.[i] ?? 0,
        high: quotes.high?.[i] ?? quotes.close?.[i] ?? 0,
        low: quotes.low?.[i] ?? quotes.close?.[i] ?? 0,
        close: quotes.close?.[i] ?? quotes.open?.[i] ?? 0,
        volume: quotes.volume?.[i] ?? 0,
      }))
      .filter(c =>
        c.open !== 0 &&
        c.close !== 0 &&
        !isNaN(c.open) &&
        !isNaN(c.close)
      );


    const safeSlice = slice > 0 ? -slice : undefined;
    const sliced = candles.slice(safeSlice);

    const klines: BinanceKlineSimple[] = sliced.map(
      ({ time, open, high, low, close, volume }) => [
        new Date(time).getTime(), // openTime (ms)
        open?.toString() ?? "0",
        high?.toString() ?? "0",
        low?.toString() ?? "0",
        close?.toString() ?? "0",
        volume?.toString() ?? "0",
      ]
    );

    console.log(klines.length);
    return klines;
  }

  public async run() {

    await this.setup();

    while (true) {
      try {
        if (this.state.iteration >= this.state.validSymbols.length) {
          this.state.iteration = 0
          this.state.detectedSymbols = []

          console.log("🔄 Reseted");
          await this.sleep(900_000)
          continue
        }

        const symbol: string = this.state.validSymbols[this.state.iteration]
        this.state.symbol = symbol

        console.log(`Analizing ${symbol} iteration ${this.state.iteration}`);

        const klines: BinanceKlineSimple[] = await this.getKlines(symbol, "15m", "7d", 200);

        const rsiParams = { klines, mark: 6, filename: 'rsi.png', show: this.config.show_plots }
        const result = await relativeStrengthIndex(rsiParams);

        if (result) {
          this.state.detectedSymbols.push(symbol)
          await createAlert(this.redis, `RSI alert for ${symbol}`)

        }

        this.state.iteration += 1
        this.state.updated_at = Date.now()

      } catch (err) {
        this.state.status = 'error'
        console.error(err)
      } finally {
        await this.sleep(60_000)
      }
    }
  }
}

async function main() {
  const bot = new HunterBot();
  await bot.run();
}

main();
