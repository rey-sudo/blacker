"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisWrapper = void 0;
const redis_1 = require("redis");
class RedisWrapper {
    constructor() {
        this.service = "default";
    }
    get ready() {
        return !!this._client?.isOpen;
    }
    get client() {
        if (!this._client) {
            throw new Error("Cannot access Redis client before connecting");
        }
        return this._client;
    }
    connect(options) {
        this.service = options?.service || "default";
        const redisOptions = { ...options };
        delete redisOptions.service;
        this._client = (0, redis_1.createClient)({
            ...redisOptions,
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 50, 500),
            },
        });
        this.client.on("connected", () => {
            console.log(`[${this.service}] Redis connected!`);
        });
        this._client.on("reconnecting", () => {
            console.warn(`[${this.service}] Redis reconnecting.`);
        });
        this.client.on("error", (err) => {
            console.error(`[${this.service}] Redis error:`, err.message);
        });
        this.client.on("end", () => {
            console.log(`[${this.service}] Redis closed`);
        });
        return this.client.connect();
    }
    async disconnect() {
        if (this._client?.isOpen) {
            await this._client.quit();
            this._client = undefined;
        }
    }
}
exports.RedisWrapper = RedisWrapper;
