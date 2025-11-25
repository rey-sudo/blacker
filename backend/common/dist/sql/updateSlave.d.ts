import mysql from "mysql2/promise";
/**Update model without data verification without error handling */
export declare const updateSlave: (connection: mysql.Connection, id: string, data: any) => Promise<mysql.ResultSetHeader>;
