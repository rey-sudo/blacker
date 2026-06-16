// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey - https://github.com/rey-sudo
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import z from "zod";
import { OutMessage, Timeframe, TimeframeSchema } from "../types/model.js";
import { now } from "../utils/now.js";
import { getRedisClient } from "./redis-client.js";
import { app } from "../server.js";

export type BacktesterState =
  | "pending"
  | "init"
  | "running"
  | "stopped"
  | "closed";

export interface GlobalState {
  state: BacktesterState;
  initialized: boolean;
  symbol: null | string;
  timeframes: Timeframe[];
  tick_state: boolean;
  engine_state: boolean;
}

type StateCallback = (state: OutMessage) => void;
type EngineUpdatesCallback = (candles: OutMessage) => void;

//--------------------------------------------------------------------------------------------------
// COMMAND PARAMS
//--------------------------------------------------------------------------------------------------

export const StartParamsSchema = z.object({
  timeframes: z.array(TimeframeSchema),
});

export type StartParams = z.infer<typeof StartParamsSchema>;

export const InitParamsSchema = z.object({
  symbol: z.string(),
});

export type InitParams = z.infer<typeof InitParamsSchema>;

//--------------------------------------------------------------------------------------------------
// BACKTESTER CLASS
//--------------------------------------------------------------------------------------------------

export class Backtester {
  public state: BacktesterState = "pending";
  public initialized: boolean = false;
  public symbol: null | string = null;
  public timeframes: Timeframe[] = [];

  private statsInterval: NodeJS.Timeout | null = null;

  private onStats?: StateCallback;
  private onEngineUpdate?: EngineUpdatesCallback;

  //------------------------------------------------------------------------------------------------
  // GETTERS
  //------------------------------------------------------------------------------------------------

  get running(): boolean {
    return this.state === "running";
  }

  //------------------------------------------------------------------------------------------------
  // SUBSCRIPTIONS
  //------------------------------------------------------------------------------------------------

  public subscribeState(callback: StateCallback) {
    this.onStats = callback;
  }

  public subscribeEngineUpdates(callback: EngineUpdatesCallback) {
    this.onEngineUpdate = callback;
  }

  //------------------------------------------------------------------------------------------------
  // CONTROL
  //------------------------------------------------------------------------------------------------

  /**
   * Immutable parameters for backtesting.
   * @param params
   * @returns
   */
  public init(params: InitParams) {
    if (this.initialized) return;

    this.state = "init";
    this.initialized = true;
    this.symbol = params.symbol;

    this._watchState();
    this._listenEngine();
  }

  /**
   * Variable parameters for backtesting.
   * @param params
   * @returns
   */
  public async start(params: StartParams) {
    if (!this.initialized) return;
    if (this.running) return;

    const redis = await getRedisClient();

    await redis.xAdd("backtester:commands", "*", {
      command: "START_BACKTESTING",
      payload: JSON.stringify(params),
    });

    this.state = "running";
    this.timeframes = params.timeframes;

    app.log.info("START_BACKTESTING command sent to consumers.");
  }

  public async stop() {
    const redis = await getRedisClient();

    await redis.xAdd("backtester:commands", "*", {
      command: "STOP_BACKTESTING",
      payload: JSON.stringify({}),
    });

    this.state = "stopped";

    app.log.info("STOP_BACKTESTING command sent to consumers.");
  }

  public close() {
    this.state = "closed";

    this._unwatchState();
  }

  //------------------------------------------------------------------------------------------------
  // PRIVATE
  //------------------------------------------------------------------------------------------------

  private _watchState() {
    this.statsInterval = setInterval(async () => {
      const s = await this._getState();
      this.onStats?.(s);
    }, 1000);
  }

  private _unwatchState() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async _listenEngine() {
    const redis = await getRedisClient();

    const stream = "backtester:engine:stream";
    const group = "node_consumers";
    const consumer = "worker_1";

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await redis.xGroupCreate(stream, group, "0", { MKSTREAM: true });
    } catch (error: any) {
      if (!error?.message?.includes("BUSYGROUP")) throw error;
    }

    console.log(`Escuchando stream '${stream}' como '${consumer}'...`);

    while (true) {
      try {
        const response = await redis
          .withCommandOptions({})
          .xReadGroup(group, consumer, [{ key: stream, id: ">" }], {
            COUNT: 1,
            BLOCK: 1000,
          });

        const messages = response?.[0]?.messages;
        if (!messages?.length) continue;

        for (const { id, message } of messages) {
          const engineState = JSON.parse(message.state_data);

          const status = {
            event: "ENGINE",
            data: { engineState },
            timestamp: now(),
          };

          void this.onEngineUpdate?.(status);
          
          await redis.xAck(stream, group, id);
        }
      } catch (error) {
        console.error("Error al leer el stream:", error);
        await sleep(1000);
      }
    }
  }

  private async _getState(): Promise<OutMessage> {
    let tickState = false;
    let engineState = false;

    try {
      const redis = await getRedisClient();

      const [tick, engine] = await Promise.all([
        redis.exists("backtester:tick:alive"),
        redis.exists("backtester:engine:alive"),
      ]);

      tickState = tick === 1;
      engineState = engine === 1;
    } catch (err) {
      console.error("Redis error:", err);
    }

    const stateMessage = {
      event: "STATE",
      data: {
        state: this.state,
        initialized: this.initialized,
        symbol: this.symbol,
        timeframes: this.timeframes,
        tick_state: tickState,
        engine_state: engineState,
      } as GlobalState,
      timestamp: now(),
    };

    return stateMessage;
  }
}
