import dotenv from "dotenv";
import { database } from "./database/index.js";
import { ApiError, ERROR_EVENTS, errorHandler } from "./common/errors.js";
import { Telegraf } from "telegraf";
import { buildOrderMessage, Order } from "./utils/format.js";

dotenv.config({ path: ".env.development" });

const main = async () => {
  try {
    const requiredEnvVars = [
      "NODE_ENV",
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
      "REDIS_CACHE_HOST",
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`${varName} error`);
      }
    }

    ERROR_EVENTS.forEach((e: string) =>
      process.on(e, (err) => {
        console.error(err);
        process.exit(1);
      })
    );

    const databasePort = parseInt(process.env.DATABASE_PORT!);

    database.connect({
      host: process.env.DATABASE_HOST,
      port: databasePort,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    const bot = new Telegraf("8390139140:AAFTxUQ1nhew8ottzQBuFiEFeSoWRWidIc0");

    const channel = "@whiterock_latam";

    let orderInterval = null;

    orderInterval = setInterval(() => watchOrders(bot, channel), 60_000);

    bot.launch();
    console.log("Running...");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();

async function watchOrders(bot: any, channel: string) {
  const order: Order = {
    id: "ORD-001",
    slave: "bot-1",
    symbol: "BTCUSDT",
    side: "LONG",
    price: 45000.5,
    size: 0.01,
    stop_loss: 44000,
    take_profit: 47000,
    account_risk: 0.02,
    risk_usd: 50,
    notified: false,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const message = buildOrderMessage(order);

  await bot.telegram.sendMessage(channel, message, {
    parse_mode: "HTML",
  });
}
