export function calculateEMAseries(candleData, emaLength) {
  const emaData = [];
  const alpha = 2 / (emaLength + 1);
  let previousEMA = 0;

  for (let i = 0; i < candleData.length; i++) {
    const close = candleData[i].close;

    if (i < emaLength - 1) {
      // Proporciona puntos vacíos hasta que la EMA inicial pueda calcularse
      emaData.push({ time: candleData[i].time });
    } else if (i === emaLength - 1) {
      // La primera EMA se calcula como SMA
      let sum = 0;
      for (let j = 0; j < emaLength; j++) {
        sum += candleData[i - j].close;
      }
      previousEMA = sum / emaLength;
      emaData.push({ time: candleData[i].time, value: previousEMA });
    } else {
      // EMA iterativa
      const emaValue = close * alpha + previousEMA * (1 - alpha);
      previousEMA = emaValue;
      emaData.push({ time: candleData[i].time, value: emaValue });
    }
  }

  return emaData;
}
