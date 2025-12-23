import z from "zod";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const CandleSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const CandleArraySchema = z.array(CandleSchema);

export interface TimeValue {
  time: number;
  value: number;
}

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

export type OrderStatus = "created" | "executed" | "finished";

export type Side = "LONG" | "SHORT";

export type Market = "forex" | "crypto";

export type AlertType = "order:sell";

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  source: string;
  message: string;
  notified: boolean;
  created_at: number;
  updated_at: number;
}


