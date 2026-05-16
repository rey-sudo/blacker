import { OutgoingMessage } from "../types/model.js";

type StateCallback = (state: OutgoingMessage) => void;
type LiveCandlesCallback = (candles: OutgoingMessage) => void;

export class Backtester {
  public state = "stopped";
  public symbol = null;
  public isRunning = false;
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

  private _getState(): OutgoingMessage {
    const ticksState = 0;
    const ohlcvState = 0;

    const state = {
      backtester: this.state,
      symbol: this.symbol,
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
