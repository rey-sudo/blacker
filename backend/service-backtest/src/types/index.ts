type Status =
  | "started"
  | "running"
  | "paused"
  | "executed"
  | "finished"
  | "error";

export interface State {
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
  take_profit: number;
  stop_loss: number;
  dataset: Candle[];
  window: number;
  current_window: Candle[];
  created_at: number;
  updated_at: number;
  rule_labels: string[];
  rule_values: boolean[];
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TimeValue {
  time: number;
  value: number;
}

export type OrderType = "market" | "limit";

export type OrderState = "executed" | "finished";

export type OrderSide = "long" | "short";

export interface Order {
  type: OrderType;
  side: OrderSide;
  state: OrderState;
  price: number;
  quantity: number;
  take_profit: number;
  stop_loss: number;
  pnl?: number;
  close_reason?: "take_profit" | "stop_loss";
  close_price?: number;
  closed_at?: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdown: number;
}
