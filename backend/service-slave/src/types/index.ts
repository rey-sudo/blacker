import { Market, Side } from "@whiterockdev/common";

export type SlaveStatus =
  | "started"
  | "running"
  | "paused"
  | "executed"
  | "finished"
  | "error";


export type Interval = "4h"; 

export interface SlaveState {
  id: string;
  status: SlaveStatus;
  iteration: number;
  market: Market;
  symbol: string;
  interval_: Interval;
  side: Side;
  account_balance: number;
  account_risk: number;
  stop_loss: number;
  take_profit: number;
  contract_size: number;
  precision_: number;
  description: string;
  executed: boolean;
  finished: boolean;
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}
