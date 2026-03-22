export function generate4h(bars = 500, seed = 42) {
  const BAR = 4 * 3600;
  const DAY = 86400;
  const dow = (ts) => Math.floor(ts / DAY + 4) % 7; // 0=Sun … 6=Sat
  const hUTC = (ts) => Math.floor((ts % DAY) / 3600); // 0–23
  const SLOTS = new Set([0, 4, 8, 12, 16]);

  // First valid slot: 2022-01-03 00:00:00 UTC (Monday)
  let ts = 1641168000;
  while (dow(ts) === 0 || dow(ts) === 6) ts += DAY;

  const nextSlot = (ts) => {
    do {
      ts += BAR;
    } while (!SLOTS.has(hUTC(ts)) || dow(ts) === 0 || dow(ts) === 6);
    return ts;
  };

  let price = 180;
  let vol = 8e6;
  let rng = seed;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };

  const data = [];
  for (let i = 0; i < bars; i++) {
    const trend = Math.sin(i / 300) * 0.0002 + 0.00004;
    const noise = (rand() - 0.49) * 0.012;
    const open = price;
    const close = Math.max(1, open + open * (trend + noise));
    const hi = Math.max(open, close) + open * (rand() * 0.008 + 0.001);
    const lo = Math.min(open, close) - open * (rand() * 0.008 + 0.001);
    vol = Math.max(500_000, vol * (0.75 + rand() * 0.5));
    data.push({
      t: ts,
      o: +open.toFixed(2),
      h: +hi.toFixed(2),
      l: +lo.toFixed(2),
      c: +close.toFixed(2),
      v: Math.round(vol),
    });
    price = close;
    ts = nextSlot(ts);
  }
  return data;
}
