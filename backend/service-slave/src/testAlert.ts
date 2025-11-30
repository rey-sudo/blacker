import database from "./database/client.js";
import { generateId, logger } from "@whiterockdev/common";
import { createAlert } from "./common/lib/createAlert";
import { Alert } from "./common/types.js";

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
      update_at: Date.now(),
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
