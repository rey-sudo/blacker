import z from "zod";
import { OutMessage, Timeframe, TimeframeSchema } from "../types/model.js";
import { now } from "../utils/now.js";

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
  tick_state: number;
  engine_state: number;
}

type StateCallback = (state: OutMessage) => void;
type LiveCandlesCallback = (candles: OutMessage) => void;

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
  private onLiveCandles?: LiveCandlesCallback;

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

  public subscribeLiveCandles(callback: LiveCandlesCallback) {
    this.onLiveCandles = callback;
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
  }

  /**
   * Variable parameters for backtesting.
   * @param params
   * @returns
   */
  public start(params: StartParams) {
    if (!this.initialized) return;

    if (this.running) return;

    this.timeframes = params.timeframes;
    this.state = "running";
  }

  public stop() {
    this.state = "stopped";
  }

  public close() {
    this.state = "closed";

    this._unwatchState();
  }

  //------------------------------------------------------------------------------------------------
  // PRIVATE
  //------------------------------------------------------------------------------------------------

  private _watchState() {
    this.statsInterval = setInterval(() => {
      this.onStats?.(this._getState());
    }, 1000);
  }

  private _unwatchState() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private _getState(): OutMessage {
    const tickState = 1;
    const engineState = 0;

    const globalState: GlobalState = {
      state: this.state,
      initialized: this.initialized,
      symbol: this.symbol,
      timeframes: this.timeframes,
      tick_state: tickState,
      engine_state: engineState,
    };

    const stateMessage = {
      event: "STATE",
      data: globalState,
      timestamp: now(),
    };

    console.log(JSON.stringify(stateMessage));

    return stateMessage;
  }
}
