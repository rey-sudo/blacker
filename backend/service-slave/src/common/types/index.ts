export interface Order {
  id: string;
  status: OrderStatus;
  market: Market;
  slave: string;
  symbol: string;
  side: Side;
  price: number;
  size: number;
  stop_loss: number;
  take_profit: number;
  account_risk: number;
  risk_usd: number;
  notified: boolean;
  created_at: number;
  updated_at: number;
}

export type OrderStatus = "executed";

export type Side = "LONG" | "SHORT";

export type Market = "forex" | "crypto";
