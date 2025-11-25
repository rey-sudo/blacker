import dotenv from "dotenv";
import { database } from "./database/index.js";
import { ApiError, ERROR_EVENTS, errorHandler } from "./common/errors.js";
import { Telegraf } from "telegraf";

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

    const CHANNEL_ID = "@whiterock_latam";

    function enviarMensajePeriodico() {
      bot.telegram.sendMessage(
        CHANNEL_ID,
        "⏱️ Mensaje automático cada 60 segundos"
      );
    }

    setInterval(enviarMensajePeriodico, 60_000);

    bot.command("post", (ctx) => {
      enviarMensajePeriodico();
      ctx.reply("Mensaje enviado manualmente 👍");
    });

    bot.launch();
    console.log("Bot ejecutándose y enviando mensajes cada 60 segundos…");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
