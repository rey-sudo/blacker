import { Connection } from "mysql2/promise";
export declare function findSlaveById(connection: Connection, id: string): Promise<any>;
