import dotenv from "dotenv";
import database from "./database/client.js";
import { calcLotSizeCrypto, calcLotSizeForex } from "./lib/order/lotSize.js";
import { generateId, Market, Order, withRetry } from "@whiterockdev/common";
import { createOrder } from "./lib/order/createOrder.js";

dotenv.config({ path: ".env.development" });

database.connect({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT!),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

const SYMBOL = "BTCUSDT";
const ACCOUNT_BALANCE = 10_000;
const MARKET: Market = "crypto";
const ENTRY_PRICE = 86671;
const ACCOUNT_RISK = 0.5;
const STOP_LOSS = 4.2;
const CONTRACT_SIZE = 1;
const TAKE_PROFIT = 87600;

let connection: any = null;

async function main() {
  try {
    console.log("start");
    connection = await database.client.getConnection();

    let lotSize = null;
    let stopLoss = null;
    let riskUSD = null;

    if (MARKET === "crypto") {
      const btc = calcLotSizeCrypto({
        balance: ACCOUNT_BALANCE,
        riskPercent: ACCOUNT_RISK,
        stopPercent: STOP_LOSS,
        entryPrice: ENTRY_PRICE,
        contractSize: CONTRACT_SIZE,
      });

      lotSize = btc.lotSize;
      stopLoss = btc.stopLossPrice;
      riskUSD = btc.riskUSD;
    }

    if (MARKET === "forex") {
      const lastPriceF = 1.1516;

      const forex = calcLotSizeForex({
        balance: ACCOUNT_BALANCE,
        riskPercent: ACCOUNT_RISK,
        stopPercent: STOP_LOSS,
        entryPrice: ENTRY_PRICE,
        pipSize: 0.0001,
        contractSize: 100_000,
      });

      lotSize = forex.lotSize;
      stopLoss = forex.stopLossPrice;
      riskUSD = forex.riskUSD;
    }

    const orderParams: Order = {
      id: generateId(),
      status: "executed",
      market: MARKET,
      slave: "slave-test",
      symbol: SYMBOL,
      side: "LONG",
      price: ENTRY_PRICE,
      size: lotSize!,
      stop_loss: stopLoss!,
      take_profit: TAKE_PROFIT,
      account_risk: ACCOUNT_RISK,
      risk_usd: riskUSD!,
      notified: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await withRetry(() => createOrder(connection, orderParams));

    await connection.commit();
    console.log("end");
  } catch (err: any) {
    await connection?.rollback();
    throw err;
  } finally {
    connection?.release();
  }
}

main();
