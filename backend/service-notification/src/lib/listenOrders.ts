import { logger } from "@whiterockdev/common";
import { findNewOrders } from "../common/findNewOrders.js";
import { buildOrderMessage } from "../utils/format.js";
import { updateOrder } from "../common/updateOrder.js";

export async function listenOrders(database: any, bot: any, channel: string) {
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
