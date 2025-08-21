import { createPool, PoolOptions, Pool } from "mysql2/promise";

export class DatabaseWrap {
    private _client?: any;

    get client() {
        if (!this._client) {
            throw new Error("Cannot access the client before connecting");
        }

        return this._client;
    }

    connect(options: PoolOptions): Pool {
        this._client = createPool(options);
        return this.client;
    }
}