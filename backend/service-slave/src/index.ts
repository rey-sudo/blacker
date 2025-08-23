import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import retry from 'async-retry';
import database from "./database/client.js";
import serveIndex from 'serve-index';
import { FuturesExchangeInfo, FuturesSymbolExchangeInfo, NewFuturesOrderParams, NewOrderResult, SymbolConfig, SymbolExchangeInfo, USDMClient } from 'binance';
import { relativeStrengthIndex } from "./handlers/rsi/index.js";
import { squeezeMomentumIndicator } from "./handlers/squeeze/index.js";
import { averageDirectionalIndex } from "./handlers/adx/index.js";
import { heikinAshiBars } from "./handlers/heikin/index.js";
import { findSlaveById } from "./utils/findSlaveById.js";
import { ERROR_EVENTS } from "./utils/errors.js";
import { createSlave } from "./utils/createSlave.js";
import { updateSlave } from "./utils/updateSlave.js";
import { sleep } from "./utils/sleep.js";
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';
import { getLogsHandler } from './routes/get-logs.js';

dotenv.config();

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, '..');

interface BotState {
  id: string
  iteration: number
  description: string
  status: 'started' | 'paused' | 'executed' | 'finished' | 'error'
  symbol: string
  symbol_info: FuturesSymbolExchangeInfo | undefined
  executed: boolean
  finished: boolean
  leverage: number
  stop_loss: number
  order_amount: number
  margin_type: string
  created_at: number
  updated_at: number
  rule_labels: string[],
  rule_values: boolean[]
}

function startHttpServer(bot: SlaveBot) {

  const app = express();

  app.use(express.json());

  const botId = bot.state.id

  app.get(`/api/slave/${botId}/get-slave`, (req, res) => {
    res.json(bot.state);
  });

  app.get(`/api/slave/${botId}/get-logs`, getLogsHandler);

  const outputPath = path.join(root, 'output');
  app.use(`/api/slave/${botId}/output`, express.static(outputPath), serveIndex(outputPath, { icons: true }));

  app.get(`/api/slave/${botId}/health`, (req, res) => {
    res.status(200).send('Test OK');
  });

  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  app.listen(3000, () => {
    logger.info('📡 Server listening port 3000');
  });
}

class SlaveBot {
  public state: BotState;
  private config: any;
  private binance: any;

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
      "SLAVE_NAME",
      "SYMBOL",
      "MARGIN_TYPE",
      "ORDER_AMOUNT",
      "STOP_LOSS",
      "LEVERAGE",
      "SHOW_PLOTS",
      "BINANCE_KEY",
      "BINANCE_SECRET"
    ];

    for (const envName of requiredEnvVars) {
      if (!process.env[envName]) {
        throw new Error(`${envName} error`);
      }
    }

    ERROR_EVENTS.forEach((event: string) => process.on(event, (err) => {
      logger.error(err)
      process.exit(1);
    }));

    const SLAVE_NAME = process.env.SLAVE_NAME as string
    const SYMBOL = process.env.SYMBOL as string
    const MARGIN_TYPE = process.env.MARGIN_TYPE as string
    const ORDER_AMOUNT = parseInt(process.env.ORDER_AMOUNT as string, 10)
    const STOP_LOSS = parseFloat(process.env.STOP_LOSS as string)
    const LEVERAGE = parseInt(process.env.LEVERAGE as string, 10)
    const SHOW_PLOTS = process.env.SHOW_PLOTS === 'true'

    this.state = {
      id: SLAVE_NAME,
      iteration: 0,
      description: "description text", //add
      status: 'started',
      symbol: SYMBOL,
      symbol_info: undefined,
      executed: false,
      finished: false,
      leverage: LEVERAGE,
      stop_loss: STOP_LOSS,
      order_amount: ORDER_AMOUNT,
      margin_type: MARGIN_TYPE,
      created_at: Date.now(),
      updated_at: Date.now(),
      rule_labels: ["rsi", "squeeze", "adx", "heikin"],
      rule_values: [false, false, false, false]
    };

    this.config = {
      show_plots: SHOW_PLOTS
    }

    this.binance = new USDMClient({
      api_key: process.env.BINANCE_KEY as string,
      api_secret: process.env.BINANCE_SECRET as string
    });

    database.connect({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT!),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME
    });

    startHttpServer(this);
  }

  private async setup() {
    logger.info("🚀 Starting slave...")

    const exchangeInfo: FuturesExchangeInfo = await this.binance.getExchangeInfo({
      symbol: this.state.symbol
    })

    const symbolInfo = exchangeInfo.symbols.find((item: FuturesSymbolExchangeInfo) => item.symbol === this.state.symbol);

    if (!symbolInfo) {
      throw new Error('❌ Error symbol not found')
    }

    this.state.symbol_info = symbolInfo

    const symbolConfig: SymbolConfig[] = await this.binance.getFuturesSymbolConfig({ symbol: this.state.symbol });

    if (symbolConfig[0].marginType !== this.state.margin_type) {
      await this.binance.setMarginType({
        symbol: this.state.symbol,
        marginType: this.state.margin_type
      })
    }

    if (symbolConfig[0].leverage !== this.state.leverage) {
      await this.binance.setLeverage({
        symbol: this.state.symbol,
        leverage: this.state.leverage
      })
    }

    let connection = null;

    try {
      connection = await database.client.getConnection();
      await connection.beginTransaction();

      const findSlave = await findSlaveById(connection, this.state.id);

      if (findSlave) {
        logger.info("🔄 Resuming " + findSlave.id)
        this.state = findSlave;
      } else {
        logger.info("⚠️ Slave not found, creating...")
        await createSlave(connection, this.state);
      }

      await connection.commit();
    } catch (err: any) {
      await connection?.rollback();
      throw err
    } finally {
      connection?.release();
    }
  }

  private async save() {
    let connection = null;

    try {
      connection = await database.client.getConnection();

      const findSlave = await findSlaveById(connection, this.state.id);

      if (!findSlave) throw new Error('❌ Error slave not found')

      await connection.beginTransaction();

      this.state.updated_at = Date.now();

      await updateSlave(connection, this.state.id, this.state);

      await connection.commit();

      this.state.iteration++

      logger.info("✅ State saved")
    } catch (err: any) {
      await connection?.rollback();
      throw err
    } finally {
      connection?.release();
    }
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
        await this.save();

        if (!this.state.rule_values[0]) {
          const klines = await this.getKlines(this.state.symbol, '4h', 100);

          const rsiParams = { klines, mark: 5, filename: `${this.state.rule_labels[0]}.png`, show: this.config.show_plots }

          this.state.rule_values[0] = await relativeStrengthIndex(rsiParams);

          if (!this.state.rule_values[0]) {
            logger.info("🕒 Sleeping");
            await sleep(300_000);
            continue;
          }
        }

        if (!this.state.rule_values[1]) {
          const klines = await this.getKlines(this.state.symbol, '4h', 200);

          const squeezeParams = { klines, mark: 3, filename: `${this.state.rule_labels[1]}.png`, show: this.config.show_plots }

          this.state.rule_values[1] = await squeezeMomentumIndicator(squeezeParams);

          if (!this.state.rule_values[1]) {
            logger.info("🕒 Sleeping");
            await sleep(300_000);
            continue;
          }
        }

        if (!this.state.rule_values[2]) {
          const klines = await this.getKlines(this.state.symbol, '4h', 100);

          const adxParams = { klines, mark: 4, filename: `${this.state.rule_labels[2]}.png`, show: this.config.show_plots }

          this.state.rule_values[2] = await averageDirectionalIndex(adxParams);

          if (!this.state.rule_values[2]) {
            logger.info("🕒 Sleeping");
            await sleep(300_000);
            continue;
          }
        }

        if (!this.state.rule_values[3]) {
          const klines = await this.getKlines(this.state.symbol, '2h', 200);

          const heikinParams = { klines, mark: 3, filename: `${this.state.rule_labels[3]}.png`, show: this.config.show_plots }

          this.state.rule_values[3] = await heikinAshiBars(heikinParams);

          if (!this.state.rule_values[3]) {
            logger.info("🕒 Sleeping");
            await sleep(300_000);
            continue;
          }
        }

        await this.executeOrder()

      } catch (err: any) {
        this.state.status = 'error'
        logger.error(err)
      }
    }
  }

  public async executeOrder() {
    const { markPrice } = await this.binance.getMarkPrice({ symbol: this.state.symbol });
    const rawPrice = parseFloat(markPrice);

    const symbolInfo = this.state.symbol_info
    if (!symbolInfo) {
      throw new Error('❌ Error symbol info not found')
    }

    const { filters, pricePrecision, quantityPrecision } = symbolInfo;

    const priceFilter = filters.find(f => f.filterType === 'PRICE_FILTER');
    const lotSizeFilter = filters.find(f => f.filterType === 'LOT_SIZE');
    const minNotionalFilter = filters.find(f => f.filterType === 'MIN_NOTIONAL');

    const tickSize = parseFloat(priceFilter?.tickSize as string);
    const stepSize = parseFloat(lotSizeFilter?.stepSize as string);
    const minNotional = parseFloat(minNotionalFilter?.notional as string);

    const quantityRaw = this.state.order_amount / rawPrice;

    const adjust = (value: number, precision: number, decimal: number) =>
      parseFloat((Math.floor(value / precision) * precision).toFixed(decimal));

    const price = adjust(rawPrice, tickSize, pricePrecision);
    const quantity = adjust(quantityRaw, stepSize, quantityPrecision);

    const notional = price * quantity;
    if (notional < minNotional) {
      throw new Error(`❌ Total value (${notional.toFixed(2)} USDT) must be at least ${minNotional} USDT.`);
    }

    const withRetry = (fn: () => Promise<any>) =>
      retry(fn, { retries: 3, minTimeout: 1000, factor: 1.5 });

    //////////////////////////////////////////////////////////////////////////////// CREATE ORDER

    await withRetry(() => this.binance.testOrder({
      symbol: this.state.symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity,
      newOrderRespType: 'RESULT'
    }))

    this.state.executed = true
    await this.save();

    logger.info(`Buy at ${price}`)

    //////////////////////////////////////////////////////////////////////////////// STOP LOSS

    const stopLossPrice = adjust(price * 0.96, tickSize, pricePrecision);

    await withRetry(() => this.binance.testOrder({
      symbol: this.state.symbol,
      side: 'SELL',
      type: 'STOP_MARKET',
      stopPrice: stopLossPrice,
      closePosition: 'true',
      timeInForce: 'GTC',
      workingType: 'MARK_PRICE',
      newOrderRespType: 'RESULT'
    }))

    logger.info(`🛑 STOP LOSS in ${stopLossPrice}`);

    //////////////////////////////////////////////////////////////////////////////// TARGETS

    const targets = [
      { multiplier: 1.02, fraction: 0.25 },
      { multiplier: 1.04, fraction: 0.50 },
      { multiplier: 1.08, fraction: 0.25 }
    ];

    const rawQuantities = targets.map(tp => quantity * tp.fraction);

    const rawTotal = rawQuantities.reduce((a, b) => a + b, 0);
    const correctionFactor = quantity / rawTotal;

    for (let i = 0; i < targets.length; i++) {
      await sleep(1_000)
      const target = targets[i];
      const correctedQty = rawQuantities[i] * correctionFactor;
      const qty = adjust(correctedQty, stepSize, quantityPrecision);
      const stopPrice = adjust(price * target.multiplier, tickSize, pricePrecision);

      await this.binance.testOrder({
        symbol: this.state.symbol,
        side: 'SELL',
        type: 'TAKE_PROFIT_MARKET',
        stopPrice,
        quantity: qty,
        timeInForce: 'GTC',
        workingType: 'MARK_PRICE',
        reduceOnly: 'true',
        newOrderRespType: 'RESULT'
      });

      logger.info(`🎯 Take profit set at ${stopPrice} USDT for ${qty}`);
    }

    this.state.finished = true
    await this.save();

    //////////////////////////////////////////////////////////////////////////////// FINISHED

    logger.info("🕒 Sleeping");
    await sleep(86_400_000)
  }

}

async function main() {
  const bot = new SlaveBot();
  await bot.run();
}

main();
