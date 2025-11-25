import { Connection } from "mysql2/promise";
export declare function findBookById(connection: Connection, id: string): Promise<any>;
