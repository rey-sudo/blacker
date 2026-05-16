import { OutgoingMessage } from "../types/model.js";

type StatsCallback = (stats: OutgoingMessage) => void;

export class Backtester {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private onStats?: StatsCallback;

  get running(): boolean {
    return this.isRunning;
  }

  public stats(callback: StatsCallback) {
    this.onStats = callback;
  }

  public start() {
    if (this.isRunning) return;

    this.isRunning = true;

    this.interval = setInterval(() => {
      this.onStats?.(this._generateStats());
    }, 1000);
  }

  public stop() {
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private _generateStats(): OutgoingMessage {
    const stateMessage = {
      event: "STATE",
      data: {
        message: `stats ${Date.now()}`,
      },
      timestamp: new Date().toISOString(),
    };

    return stateMessage;
  }
}
