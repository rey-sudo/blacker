import { Connection, RowDataPacket } from "mysql2/promise";

export async function findNewOrders(
  connection: Connection,
): Promise<any[]> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM orders WHERE notified = FALSE`
  );

  return rows || [];
}
