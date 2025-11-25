import { Connection, ResultSetHeader } from "mysql2/promise";
export declare function deleteBookById(connection: Connection, id: string): Promise<ResultSetHeader>;
