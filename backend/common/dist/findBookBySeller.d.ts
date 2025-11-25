import { Connection } from "mysql2/promise";
export declare function findBookBySeller(connection: Connection, id: string, sellerId: string): Promise<any>;
