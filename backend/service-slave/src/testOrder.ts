import { generateId, withRetry } from "@whiterockdev/common";
import { createOrder } from "./utils/createOrder.js";
import database from "./database/client.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

database.connect({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT!),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

let connection: any = null;

async function main() {
  try {
    console.log("start");
    connection = await database.client.getConnection();

    await withRetry(() =>
      createOrder(connection, {
        id: generateId(),
        slave: "slave-test",
        symbol: "BTCUSDT",
        side: "LONG",
        price: 87599,
        size: 0.01,
        stop_loss: 84599,
        take_profit: 87600,
        account_risk: 0.5,
        risk_usd: 50,
        notified: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
    );

    await connection.commit();
  } catch (err: any) {
    await connection?.rollback();
    throw err;
  } finally {
    connection?.release();
  }
}

main();
