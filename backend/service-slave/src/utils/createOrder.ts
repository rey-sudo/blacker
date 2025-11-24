import { Connection } from "mysql2/promise";


export async function createOrder(
  connection: Connection,
  scheme: any
): Promise<any> {

  const columns = Object.keys(scheme);

  const values = Object.values(scheme);

  const query = `
    INSERT INTO orders (${columns.join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
  `;

  const [result] = await connection.execute(query, values);

  if ('affectedRows' in result && result.affectedRows !== 1) {
    throw new Error('Error creating the order');
  }

  return result
}
