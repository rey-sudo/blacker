import { Alert } from "@whiterockdev/common";
import { Connection } from "mysql2/promise";


export async function createAlert(
  connection: Connection,
  scheme: Alert
): Promise<any> {

  const columns = Object.keys(scheme);

  const values = Object.values(scheme);

  const query = `
    INSERT INTO alerts (${columns.join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
  `;

  const [result] = await connection.execute(query, values);

  if ('affectedRows' in result && result.affectedRows !== 1) {
    throw new Error('Error creating the alert');
  }

  return result
}
