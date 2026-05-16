export type CommandType =
  | "SUBSCRIBE_STATS"
  | "UNSUBSCRIBE_STATS"
  | "START_BACKTEST"
  | "STOP_BACKTEST";

export interface IncomingMessage {
  command: CommandType;
  payload?: Record<string, unknown>;
}

export interface OutgoingMessage {
  event: string;
  data?: unknown;
  timestamp: string;
}
