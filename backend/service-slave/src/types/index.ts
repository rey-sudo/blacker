export type Status =
  | "started"
  | "running"
  | "paused"
  | "executed"
  | "finished"
  | "error";

export type Side = "LONG" | "SHORT"; 

export type Market = "forex" | "crypto"; 

export type Interval = "4h"; 

export interface BotState {
  id: string;
  status: Status;
  iteration: number;
  market: Market;
  symbol: string;
  interval: Interval;
  side: Side;
  account_balance: number;
  account_risk: number;
  stop_loss: number;
  take_profit: number;
  contract_size: number;
  description: string;
  executed: boolean;
  finished: boolean;
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}
