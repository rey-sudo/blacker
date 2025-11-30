import { Connection, ResultSetHeader } from "mysql2/promise";

export async function deleteSlaveById(
  connection: Connection,
  id: string,
  schema_v: number
): Promise<ResultSetHeader> {

  const [result] = await connection.execute<ResultSetHeader>(
    "DELETE FROM slaves WHERE id = ? AND schema_v = ?",
    [id, schema_v]
  );

  return result;
}
