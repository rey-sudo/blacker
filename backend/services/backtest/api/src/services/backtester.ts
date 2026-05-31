import { OutMessage } from "../types/model.js";

type StateCallback = (state: OutMessage) => void;
type LiveCandlesCallback = (candles: OutMessage) => void;

export class Backtester {
  public state: string = "stopped";
  public symbol: null | string = null;
  public timeframes: string[] = [];
  public isRunning: boolean = false;

  private stateInterval: NodeJS.Timeout | null = null;
  private onStats?: StateCallback;
  private onLiveCandles?: LiveCandlesCallback;

  //------------------------------------------------------------------------------------------------
  // GETTERS
  //------------------------------------------------------------------------------------------------

  get running(): boolean {
    return this.isRunning;
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

  public start() {
    if (this.isRunning) return;

    this.isRunning = true;

    this._watchState();
  }

  public stop() {
    this.isRunning = false;

    this._unwatchState();
  }

  //------------------------------------------------------------------------------------------------
  // PRIVATE
  //------------------------------------------------------------------------------------------------

  private _watchState() {
    this.stateInterval = setInterval(() => {
      this.onStats?.(this._getState());
    }, 1000);
  }

  private _unwatchState() {
    if (this.stateInterval) {
      clearInterval(this.stateInterval);
      this.stateInterval = null;
    }
  }

  private _getState(): OutMessage {
    const ticksState = 0;
    const ohlcvState = 0;

    const state = {
      backtester: this.state,
      symbol: this.symbol,
      timeframes: this.timeframes,
      ticks_state: ticksState,
      ohlcv_state: ohlcvState,
    };

    const stateMessage = {
      event: "STATE",
      data: state,
      timestamp: new Date().toISOString(),
    };

    return stateMessage;
  }
}
