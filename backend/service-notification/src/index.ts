import dotenv from "dotenv";
import { database } from "./database/index.js";
import { ERROR_EVENTS } from "@whiterockdev/common";
import { listenAlerts } from "./lib/listenAlerts.js";
import { listenOrders } from "./lib/listenOrders.js";
import { Telegraf } from "telegraf";

dotenv.config({ path: ".env.production" });

const main = async () => {
  try {
    const requiredEnvVars = [
      "NODE_ENV",
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
      "TELEGRAM_API_KEY",
      "TELEGRAM_CHANNEL"
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

    const bot = new Telegraf(process.env.TELEGRAM_API_KEY!);

    const channel = process.env.TELEGRAM_CHANNEL!;

    let orderInterval = setInterval(
      () => listenOrders(database, bot, channel),
      10_000
    );

    let alertInterval = setInterval(
      () => listenAlerts(database, bot, channel),
      10_000
    );

    bot.launch();
    console.log("Running...");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();




