export function generateSeries(price) {
  const data = [];
  for (let i = 0; i < 200; i++) {
    const open = price;
    const high = open + Math.random() * 3;
    const low = open - Math.random() * 3;
    const close = low + Math.random() * (high - low);

    data.push({
      time: 1642427876 + i * 3600,
      open,
      high,
      low,
      close,
    });

    price = close;
  }

   return data
}
