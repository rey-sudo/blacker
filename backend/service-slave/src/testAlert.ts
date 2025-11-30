import dotenv from "dotenv";
import database from "./database/client.js";
import { Alert, generateId, logger } from "@whiterockdev/common";
import { createAlert } from "./common/lib/createAlert";

dotenv.config({ path: ".env.development" });

database.connect({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT!),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

const SYMBOL = "BTCUSDT";
const PRICE = 98000;

async function main() {
  let connection = null;

  try {
    connection = await database.client.getConnection();

    const alertParams: Alert = {
      id: generateId(),
      type: "order:sell",
      title: "⚠️ SELL NOW ⚠️",
      source: "slave-test",
      message: `Sell ${SYMBOL} at ${PRICE} or market`,
      notified: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await createAlert(connection, alertParams);
  } catch (err: any) {
    await connection?.rollback();
    logger.error(err);
  } finally {
    connection?.release();
  }
}

main();
