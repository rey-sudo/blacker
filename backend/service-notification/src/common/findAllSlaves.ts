import { Connection, RowDataPacket } from "mysql2/promise";

export async function findAllSlaves(
  connection: Connection
): Promise<any[]> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM slaves`
  );

  return rows || [];
}
