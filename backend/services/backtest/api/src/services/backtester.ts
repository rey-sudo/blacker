import z from "zod";
import { OutMessage, Timeframe, TimeframeSchema } from "../types/model.js";
import { now } from "../utils/now.js";

type StateCallback = (state: OutMessage) => void;
type LiveCandlesCallback = (candles: OutMessage) => void;

export type BacktesterState = "running" | "stopped";

export interface GlobalState {
  state: BacktesterState;
  symbol: null | string;
  timeframes: Timeframe[];
  tick_state: number;
  engine_state: number;
}

export const StartParamsSchema = z.object({
  symbol: z.string(),
  timeframes: z.array(TimeframeSchema),
});

export type StartParams = z.infer<typeof StartParamsSchema>;

export class Backtester {
  public state: BacktesterState = "stopped";
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

  public start(params: StartParams) {
    if (this.running) return;

    this.symbol = params.symbol;
    this.timeframes = params.timeframes;
    this.state = "running";

    this._watchState();
  }

  public stop() {
    this.state = "stopped";

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
    const tickState = 0;
    const engineState = 0;

    const globalState: GlobalState = {
      state: this.state,
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
