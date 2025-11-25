import { Connection, RowDataPacket } from "mysql2/promise";

export async function findAllOrders(
  connection: Connection,
): Promise<any[]> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM orders`
  );

  return rows || [];
}
