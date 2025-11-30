import { Alert } from "@whiterockdev/common";
import { Connection, RowDataPacket } from "mysql2/promise";

export async function findNewAlerts(connection: Connection): Promise<Alert[]> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM alerts WHERE notified = FALSE`
  );

  if (rows) {
    return rows as Alert[];
  }

  return [];
}
