import { Backtester, root } from "../index.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import * as fs from "fs";
import path from "path";

export async function generateChart(this: Backtester) {
  const finishedOrders = this.orders.filter((o) => o.state === "finished");

  let equity = this.state.account_balance;
  let maxEquity = equity;
  const equityCurve: { time: number; equity: number; drawdown: number }[] = [];

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
  const csvPath = path.join(root, "output", "drawdown.png");
  await fs.promises.writeFile(csvPath, buffer);

  return equityCurve;
}
