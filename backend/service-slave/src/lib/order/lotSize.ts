function toDecimalPercent(value: number): number {
  return value / 100;
}

interface ForexParams {
  balance: number;
  riskPercent: number; // Ej: 0.5 (0.5%)
  stopPercent: number; // Ej: 4.1 (4.1%)
  entryPrice: number;
  pipSize: number;
  contractSize: number; // Default: 100000 (Forex standard)
}

interface CryptoParams {
  balance: number;
  riskPercent: number; // Ej: 0.5 (0.5%)
  stopPercent: number; // Ej: 4.1 (4.1%)
  entryPrice: number;
  contractSize: number; // Default: 1
}

export function calcLotSizeForex(params: ForexParams) {
  const {
    balance,
    riskPercent,
    stopPercent,
    entryPrice,
    pipSize,
    contractSize,
  } = params;

  const riskP = toDecimalPercent(riskPercent);
  const stopP = toDecimalPercent(stopPercent);

  const riskUSD = balance * riskP;

  const pipValuePerLot = (contractSize * pipSize) / entryPrice;

  const pipsStop = (entryPrice * stopP) / pipSize;

  const lossPerLot = pipsStop * pipValuePerLot;

  const lotSize = riskUSD / lossPerLot;

  const stopLossPrice = entryPrice * (1 - stopP);

  return {
    riskUSD,
    pipsStop,
    pipValuePerLot,
    lossPerLot,
    lotSize,
    stopLossPrice,
  };
}

export function calcLotSizeCrypto(params: CryptoParams) {
  const {
    balance,
    riskPercent,
    stopPercent,
    entryPrice,
    contractSize = 1,
  } = params;

  const riskP = toDecimalPercent(riskPercent);
  const stopP = toDecimalPercent(stopPercent);

  const riskUSD = balance * riskP;

  const lossPerLot = entryPrice * stopP * contractSize;

  const lotSize = riskUSD / lossPerLot;

  const stopLossPrice = entryPrice * (1 - stopP);
  return {
    riskUSD,
    lossPerLot,
    lotSize,
    stopLossPrice
  };
}
