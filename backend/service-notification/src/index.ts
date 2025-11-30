import dotenv from "dotenv";
import { database } from "./database/index.js";
import { ERROR_EVENTS, logger } from "@whiterockdev/common";
import { buildOrderMessage } from "./utils/format.js";
import { updateOrder } from "./common/updateOrder.js";
import { findNewOrders } from "./common/findNewOrders.js";
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

    const channel = "@whiterock_latam";

    let orderInterval = setInterval(
      () => listenOrders(database, bot, channel),
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

async function listenOrders(database: any, bot: any, channel: string) {
  let connection: any = null;

  try {
    connection = await database.client.getConnection();
    const orders = await findNewOrders(connection);
    connection?.release();

    logger.info(`📋 CurrentOrders: ${orders.length}`);

    for (const order of orders) {
      let conn2: any = null;
      try {
        conn2 = await database.client.getConnection();
        await conn2.beginTransaction();

        const message = buildOrderMessage(order);

        const send = await bot.telegram.sendMessage(channel, message, {
          parse_mode: "HTML",
        });

        if (!send.message_id) {
          throw new Error("Error sending message");
        }

        await updateOrder(conn2, order.id, { notified: true });

        await conn2.commit();
      } catch (err: any) {
        logger.error(err);
        await conn2.rollback();
      } finally {
        conn2?.release();
      }
    }
  } catch (err: any) {
    logger.error(err);
  }
}
