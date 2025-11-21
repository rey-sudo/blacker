type Status =
  | "started"
  | "running"
  | "paused"
  | "executed"
  | "finished"
  | "error";

export interface BotState {
  id: string;
  iteration: number;
  status: Status;
  executed: boolean;
  finished: boolean;
  symbol: string;
  account_balance: number;
  position_risk: number;
  description: string;
  leverage: number;
  stop_loss: number;
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}

export interface Candle {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: number;
  quote_volume: number;
  trades: number;
  taker_buy_base: number;
  taker_buy_quote: number;
}
