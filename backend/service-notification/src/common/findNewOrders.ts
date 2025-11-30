import { Order } from "@whiterockdev/common";
import { Connection, RowDataPacket } from "mysql2/promise";

export async function findNewOrders(connection: Connection): Promise<Order[]> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM orders WHERE notified = FALSE`
  );

  if (rows) {
    return rows as Order[];
  }

  return [];
}
