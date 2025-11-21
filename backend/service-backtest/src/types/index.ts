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
  dataset: Candle[];
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
