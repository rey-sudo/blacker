import mysql from "mysql2/promise";

/**Update model without data verification without error handling */
export const updateOrder = async (
  connection: mysql.Connection,
  id: string,
  data: any
) => {

  const fields = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(", ");

  const query = `
    UPDATE orders
    SET ${fields}
    WHERE id = ?
    `;

  const values = [...Object.values(data), id];

  const [result] = await connection.execute<mysql.ResultSetHeader>(query, values);

  if ('affectedRows' in result && result.affectedRows !== 1) {
    throw new Error('Error updating the order');
  }

  return result;
};
