export interface HunterState {
  status: 'started' | 'stopped' | 'error' | string
  iteration: number
  symbol: string
  validSymbols: string[]
  detectedSymbols: string[]
  updated_at: number
}

export type Timeseries = {
  time: string;  // ISO 8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type BinanceKlineSimple = [number, string, string, string, string, string];
