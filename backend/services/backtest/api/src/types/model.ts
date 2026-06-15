import z from "zod";

export const TimeframeIntervalSchema = z.enum([
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
  "1w",
]);

export type TimeframeInterval = z.infer<typeof TimeframeIntervalSchema>;

export const TimeframeSchema = z.object({
  interval: TimeframeIntervalSchema,
});

export type Timeframe = z.infer<typeof TimeframeSchema>;

export const CommandType = {
  PING: "PING",
  INIT: "INIT",
  CONFIGURE: "CONFIGURE",
  SUBSCRIBE_STATS: "SUBSCRIBE_STATS",
  UNSUBSCRIBE_STATS: "UNSUBSCRIBE_STATS",
  START_BACKTEST: "START_BACKTEST",
  STOP_BACKTEST: "STOP_BACKTEST",
} as const;

export type CommandType = (typeof CommandType)[keyof typeof CommandType];

export interface InMessage {
  command: CommandType;
  payload?: Record<string, unknown>;
}

export interface OutMessage {
  event: string;
  data?: unknown;
  timestamp: string;
}
