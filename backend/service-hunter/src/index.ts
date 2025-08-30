import path from 'path';
import dotenv from 'dotenv';
import retry from 'async-retry';
import Coingecko from '@coingecko/coingecko-typescript';
import { FuturesExchangeInfo, FuturesSymbolExchangeInfo, USDMClient } from 'binance';
import { relativeStrengthIndex } from "./tools/rsi/index.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { sleep } from "./utils/sleep.js";
import { fileURLToPath } from 'url';
import { startHttpServer } from './server/index.js';

dotenv.config();

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, '..');

export interface HunterState {
  status: 'started' | 'stopped' | 'error' | string
  iteration: number
  symbol: string
  validSymbols: string[]
  detectedSymbols: string[]
  updated_at: number
}

export class HunterBot {
  public state: HunterState;
  private config: any;
  private binance: any;

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SHOW_PLOTS",
      "BINANCE_KEY",
      "BINANCE_SECRET",
      "COINGECKO_API_KEY",
      "START_AT"
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
    console.log("🚀 Starting hunter...")

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
  }

  private async getKlines(symbol: string, interval: any, limit: number) {
    return retry(async () => {
      const klines = await this.binance.getKlines({
        symbol,
        interval,
        limit
      });
      return klines;
    }, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
    });
  }

  public async run() {

    await this.setup();

    while (true) {
      try {
        if (this.state.iteration >= this.state.validSymbols.length) {
          this.state.iteration = 0
          this.state.detectedSymbols = []

          console.log("🔄 Reseted");
          await sleep(900_000);
          continue
        }

        const symbol = this.state.validSymbols[this.state.iteration]
        this.state.symbol = symbol

        console.log(`Analizing ${symbol} iteration ${this.state.iteration}`);

        const klines = await this.getKlines(symbol, '4h', 100);
        const result = await relativeStrengthIndex({ klines, mark: 6, filename: 'rsi.png', show: this.config.show_plots });

        if (result) {
          this.state.detectedSymbols.push(symbol)
        }

        console.log(this.state.detectedSymbols)

        this.state.iteration += 1
        this.state.updated_at = Date.now()

        console.log("🕒 Sleeping");
        await sleep(60_000);
      } catch (err: any) {
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
