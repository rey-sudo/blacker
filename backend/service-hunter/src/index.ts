import path from 'path';
import dotenv from 'dotenv';
import Coingecko from '@coingecko/coingecko-typescript';
import { FuturesExchangeInfo, FuturesSymbolExchangeInfo, USDMClient } from 'binance';
import { relativeStrengthIndex } from "./tools/rsi/index.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { sleep } from "./utils/sleep.js";
import { fileURLToPath } from 'url';
import { startHttpServer } from './server/index.js';
import { withRetry } from './utils/index.js';
import { redisClient } from './database/index.js';
import { createAlert } from './common/alerts.js';
import { HunterState } from './types/index.js';

dotenv.config();

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, '..');

export class HunterBot {
  public state: HunterState;
  private config: any;
  private binance: any;
  private redis: any

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SERVICE_NAME",
      "SHOW_PLOTS",
      "BINANCE_KEY",
      "BINANCE_SECRET",
      "COINGECKO_API_KEY",
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

    this.binance = new USDMClient({
      api_key: process.env.BINANCE_KEY as string,
      api_secret: process.env.BINANCE_SECRET as string
    });

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

      const exchangeInfo: FuturesExchangeInfo = await this.binance.getExchangeInfo();
      const exchangeSymbols: FuturesSymbolExchangeInfo[] = exchangeInfo.symbols ?? [];

      const binanceSymbols = new Set(
        exchangeSymbols
          .filter(
            s =>
              s?.contractType === 'PERPETUAL' &&
              s?.status === 'TRADING' &&
              s?.quoteAsset?.toUpperCase() === 'USDT'
          )
          .map(s => s.symbol.toUpperCase())
      );

      const geckoClient = new Coingecko({
        environment: 'demo',
        demoAPIKey: process.env['COINGECKO_API_KEY']
      });

      const [page1, page2] = await Promise.all([
        geckoClient.coins.markets.get({
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
        }),
        geckoClient.coins.markets.get({
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 2,
        }),
      ]);

      const uniqueGecko = Array.from(
        new Map(
          [...page1, ...page2]
            .filter(({ symbol }) => typeof symbol === 'string')
            .map(e => [e.symbol!.toUpperCase(), e])
        ).values()
      );

      const geckoSymbols = uniqueGecko.map(e => `${e.symbol!.toUpperCase()}USDT`);

      this.state.validSymbols = geckoSymbols.filter(e => binanceSymbols.has(e));

      if (this.state.iteration >= this.state.validSymbols.length) {
        throw new Error('iteration > validSymbol length')
      }

      console.log(`✅ Setup: ${this.state.validSymbols.length} valid symbols`)
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  private async getKlines(symbol: string, interval: any, limit: number) {
    return withRetry(() =>
      this.binance.getKlines({
        symbol,
        interval,
        limit
      })
    )
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
          await this.sleep(900_000)
          continue
        }

        const symbol = this.state.validSymbols[this.state.iteration]
        this.state.symbol = symbol

        console.log(`Analizing ${symbol} iteration ${this.state.iteration}`);

        const klines = await this.getKlines(symbol, '4h', 100);
        const rsiParams = { klines, mark: 6, filename: 'rsi.png', show: this.config.show_plots }
        const result = await relativeStrengthIndex(rsiParams);

        if (result) {
          this.state.detectedSymbols.push(symbol)
          const alert = await createAlert(this.redis, `RSI alert for ${symbol}`)
          console.log(alert)
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
