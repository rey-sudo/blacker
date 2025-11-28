import path from "path";
import dotenv from "dotenv";
import * as fs from "fs";
import csv from "csv-parser";
import { ERROR_EVENTS } from "./utils/errors.js";
import { fileURLToPath } from "url";
import { State, Candle, Order } from "./types/index.js";
import { startHttpServer } from "./server/index.js";
import { sleep } from "./utils/sleep.js";
import { logger } from "./utils/logger.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { detectorRule } from "./rules/detectorRule.js";
import { countEMATouches, mfiRule } from "./rules/mfiRule.js";
import { calculateSqueeze } from "./common/squeeze.js";
import { adxRule } from "./rules/adxRule.js";
import { calculateEMA } from "@whiterockdev/common";

dotenv.config({ path: ".env.development" });

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, "..");

export class Backtester {
  public state: State;
  public orders: Order[];
  public config: any;

  constructor() {
    const requiredEnvVars = [
      "NODE_ENV",
      "SLAVE_NAME",
      "SYMBOL",
      "POSITION_RISK",
      "TAKE_PROFIT",
      "STOP_LOSS",
      "LEVERAGE",
      "SHOW_PLOTS",
      "DESCRIPTION",
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
    const TAKE_PROFIT = parseFloat(process.env.TAKE_PROFIT!);
    const STOP_LOSS = parseFloat(process.env.STOP_LOSS!);
    const LEVERAGE = parseInt(process.env.LEVERAGE!, 10);
    const SHOW_PLOTS = process.env.SHOW_PLOTS === "true";

    const RULES = ["rsi", "adx", "mfi"];

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
      take_profit: TAKE_PROFIT,
      stop_loss: STOP_LOSS,
      dataset: [],
      window: 500,
      current_window: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      rule_labels: RULES,
      rule_values: RULES.map(() => false),
    };

    this.orders = [];

    this.config = {
      show_plots: SHOW_PLOTS,
      filename: process.env.FILENAME!,
    };

    startHttpServer(this);
  }

  private async setup() {
    try {
      logger.info("🚀 Starting slave...");

      await this.loadData();
    } catch (err: any) {
      logger.error(err);
      this.state.status = "error";
      throw err;
    }
  }

  private async loadData(): Promise<void> {
    const csvPath = path.join(root, "downloader", this.config.filename);

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

  private async sleep(timeMs: number) {
    logger.info("🕒 Sleeping");
    return await sleep(timeMs);
  }

  private getLast(dataset: Candle[], index: number, window: number): Candle[] {
    if (index < window) return [];

    return dataset.slice(index - window + 1, index + 1);
  }

  private async processOrders(candles: Candle[], currentCandle: Candle) {
    const lastSqueeze = calculateSqueeze(candles).at(-1)?.color;

    if (!lastSqueeze) return !lastSqueeze;

    const rule1 = lastSqueeze === "blue";

    const EMA25 = calculateEMA(candles, 25);
    const { toques, intentosDeRuptura } = countEMATouches(candles, EMA25);

    const rule4 = toques >= 3 || intentosDeRuptura >= 4;

    for (const order of this.orders) {
      if (order.state !== "executed") continue;

      let closeInfo: {
        reason: "stop_loss" | "take_profit";
        price: number;
      } | null = null;

      const isLong = order.side === "long";
      const isShort = order.side === "short";

      if (isLong) {
        if (currentCandle.low <= order.stop_loss) {
          closeInfo = { reason: "stop_loss", price: order.stop_loss };
        } else if (rule1 || rule4) {
          const closeAt = rule4 ? EMA25.at(-1)?.value! : currentCandle.high;
          closeInfo = { reason: "take_profit", price: closeAt };
        }
      }

      if (isShort) {
        if (currentCandle.high >= order.stop_loss) {
          closeInfo = { reason: "stop_loss", price: order.stop_loss };
        } else if (currentCandle.low <= order.take_profit) {
          closeInfo = { reason: "take_profit", price: order.take_profit };
        }
      }

      if (closeInfo) {
        order.state = "finished";
        order.close_reason = closeInfo.reason;
        order.close_price = closeInfo.price;
        order.closed_at = currentCandle.time;

        if (isLong) {
          order.pnl = (closeInfo.price - order.price) * order.quantity;
        } else {
          order.pnl = (order.price - closeInfo.price) * order.quantity;
        }

        console.log(order);
      }
    }
  }

  private async generateChart() {
    const finishedOrders = this.orders.filter((o) => o.state === "finished");

    let equity = this.state.account_balance;
    let maxEquity = equity;
    const equityCurve: { time: number; equity: number; drawdown: number }[] =
      [];

    let wins = 0;
    let losses = 0;
    let totalPnl = 0;

    for (const order of finishedOrders) {
      const pnl = order.pnl ?? 0;
      equity += pnl;
      totalPnl += pnl;

      if (pnl > 0) wins++;
      if (pnl < 0) losses++;

      if (equity > maxEquity) maxEquity = equity;
      const drawdown = maxEquity - equity;

      equityCurve.push({
        time: (order.closed_at ?? Date.now()) * 1000,
        equity,
        drawdown,
      });
    }

    const averagePnl =
      finishedOrders.length > 0 ? totalPnl / finishedOrders.length : 0;
    const winrate =
      finishedOrders.length > 0 ? (wins / finishedOrders.length) * 100 : 0;

    console.log("===== RESUMEN BACKTEST =====");
    console.log("Total PnL:", totalPnl.toFixed(2), "USD");
    console.log("Trades:", finishedOrders.length);
    console.log("Wins:", wins);
    console.log("Losses:", losses);
    console.log("Average PnL per trade:", averagePnl.toFixed(2), "USD");
    console.log("Winrate:", winrate.toFixed(2) + "%");
    console.log("=============================");

    const width = 1200;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: "white",
    });

    const config: any = {
      type: "line",
      data: {
        labels: equityCurve.map((p) => new Date(p.time).toLocaleString()),
        datasets: [
          {
            label: "Equity",
            data: equityCurve.map((p) => p.equity),
            borderColor: "green",
            fill: false,
            tension: 0.1,
          },
          {
            label: "Key Level 0",
            data: equityCurve.map(() => this.state.account_balance),
            borderColor: "gray",
            borderDash: [5, 5],
            fill: false,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: this.config.filename,
          },
        },
        scales: {
          x: { display: true },
          y: { display: true },
        },
      },
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    await fs.promises.writeFile("output/dropdown.png", buffer);

    return equityCurve;
  }

  private execute(candles: Candle[], currentCandle: Candle) {
    let takeProfit = null;

    const EMA55 = calculateEMA(candles, 55).at(-1)?.value;

    const riskPct = this.state.position_risk;
    const riskUsd = (this.state.account_balance * riskPct) / 100;

    const tp_pct = this.state.take_profit;
    const sl_pct = this.state.stop_loss;
    const tp_decimal = tp_pct / 100;
    const sl_decimal = sl_pct / 100;

    const stopDistance = currentCandle.close * sl_decimal;
    const quantity = riskUsd / stopDistance;

    if (EMA55) {
      takeProfit = EMA55;
    } else {
      takeProfit = currentCandle.close * (1 + tp_decimal);
    }

    const order: Order = {
      type: "market",
      side: "long",
      state: "executed",
      price: currentCandle.close,
      quantity,
      take_profit: takeProfit,
      stop_loss: currentCandle.close * (1 - sl_decimal),
    };

    this.orders.push(order);
  }

  public reset() {
    this.state.rule_values = this.state.rule_values.map(() => false);
  }

  public async run() {
    await this.setup();

    const window = 500;

    const startAt = window;

    for (let i = startAt; i < this.state.dataset.length; i++) {
      const currentCandle = this.state.dataset[i];

      const candles = this.getLast(this.state.dataset, i, window);

      this.state.current_window = candles;

      if (candles.length < window) {
        continue;
      }

      try {
        //await this.sleep(1_000);

        await this.processOrders(candles, currentCandle);

        const R0 = await detectorRule.call(this, 0, candles);
        if (!R0) continue;

        const R1 = await adxRule.call(this, 1, candles);
        if (!R1) continue;

        const R2 = await mfiRule.call(this, 2, candles);
        if (!R2) continue;


        this.execute(candles, currentCandle);
        this.reset();

        console.log("✅ EXECUTED");
      } catch (err: any) {
        this.state.status = "error";
        logger.error(err);
      }
    }

    await this.generateChart();
  }
}

async function main() {
  const backtester = new Backtester();
  await backtester.run();
}

main();
