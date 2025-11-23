type Status =
  | "started"
  | "running"
  | "paused"
  | "executed"
  | "finished"
  | "error";

export interface BotState {
  id: string;
  status: Status;
  iteration: number;
  market: string;
  symbol: string;
  account_balance: number;
  account_risk: number;
  stop_loss: number;
  contract_size: number;
  description: string;
  executed: boolean;
  finished: boolean;
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}
