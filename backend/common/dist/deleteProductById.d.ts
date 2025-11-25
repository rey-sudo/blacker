import { Connection, ResultSetHeader } from "mysql2/promise";
export declare function deleteProductById(connection: Connection, id: string, schema_v: number): Promise<ResultSetHeader>;
