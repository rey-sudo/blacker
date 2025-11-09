import { createClient, RedisClientType, RedisClientOptions } from "redis";

export class RedisWrapper {
  private _client?: RedisClientType<any, any, any>; 
  service: string = "default";

  get ready(): boolean {
    return this._client?.isReady ?? false;
  }

  get client(): RedisClientType<any, any, any> {
    if (!this._client) {
      throw new Error("Cannot access Redis client before connecting");
    }
    return this._client;
  }

  connect(options?: RedisClientOptions & { service?: string }) {
    this.service = options?.service || "default";

    const redisOptions = { ...options };
    delete (redisOptions as any).service;

    this._client = createClient({
      ...redisOptions,
      socket: {
        ...redisOptions.socket,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    }) as RedisClientType<any, any, any>;

    this.client.on("connect", () => {
      console.log(`[${this.service}] Connecting to Redis...`);
    });

    this.client.on("ready", () => {
      console.log(`[${this.service}] Redis ready!`);
    });

    this.client.on("reconnecting", () => {
      console.warn(`[${this.service}] Redis reconnecting...`);
    });

    this.client.on("error", (err) => {
      console.error(`[${this.service}] Redis error:`, err.message);
    });

    this.client.on("end", () => {
      console.log(`[${this.service}] Redis connection closed`);
    });

    return this.client.connect();
  }

  async disconnect() {
    if (this._client?.isOpen) {
      await this.client.close();
      this._client = undefined;
    }
  }
}
