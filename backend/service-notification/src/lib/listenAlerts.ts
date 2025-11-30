import { logger } from "@whiterockdev/common";
import { findNewAlerts } from "../common/findNewAlerts.js";
import { updateAlert } from "../common/updateAlert.js";
import { buildAlertMessage } from "../utils/format.js";

export async function listenAlerts(database: any, bot: any, channel: string) {
  let connection: any = null;

  try {
    connection = await database.client.getConnection();
    const alerts = await findNewAlerts(connection);
    connection?.release();

    logger.info(`📋 CurrentAlerts: ${alerts.length}`);

    for (const alert of alerts) {
      let conn2: any = null;
      try {
        conn2 = await database.client.getConnection();
        await conn2.beginTransaction();

        const message = buildAlertMessage(alert);

        const send = await bot.telegram.sendMessage(channel, message, {
          parse_mode: "HTML",
        });

        if (!send.message_id) {
          throw new Error("Error sending message");
        }

        await updateAlert(conn2, alert.id, { notified: true });

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
