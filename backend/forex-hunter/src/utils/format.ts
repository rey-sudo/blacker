type TwelveDataCandle = {
  datetime: string;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
};

type BinanceKlineSimple = [number, string, string, string, string];

export function timeseriesToKline(
  candles: TwelveDataCandle[]
): BinanceKlineSimple[] {
  return candles.reverse().map(({ datetime, open, high, low, close }) => [
    new Date(datetime.replace(' ', 'T') + 'Z').getTime(), 
    open.toString(),
    high.toString(),
    low.toString(),
    close.toString(),
  ]);
}
