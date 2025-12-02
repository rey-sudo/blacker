function toDecimalPercent(p: number) {
  return p / 100;
}

export interface ForexParams {
  balance: number;
  riskPercent: number;   // Ej: 1 = 1%
  stopPercent: number;   // Ej: 1 = 1%
  entryPrice: number;
  precision: number;     // MT5 digits/precision: 5 para EURUSD, 3 para USDJPY, etc.
  contractSize: number;  // Generalmente 100000 (1 Lote estándar FX)
}

export function calcLotSizeForex(params: ForexParams) {
  const {
    balance,
    riskPercent,
    stopPercent,
    entryPrice,
    precision,
    contractSize,
  } = params;

  // pipSize basado 100% en MT5 (precision)
  const pipSize = 1 / Math.pow(10, precision);

  const riskP = toDecimalPercent(riskPercent);
  const stopP = toDecimalPercent(stopPercent);

  const riskUSD = balance * riskP;

  // 📌 FOREX: pipValue depende del precio
  const pipValuePerLot = (contractSize * pipSize) / entryPrice;

  // cuántos pips hay en el stop
  const pipsStop = (entryPrice * stopP) / pipSize;

  // pérdida por lote
  const lossPerLot = pipsStop * pipValuePerLot;

  // tamaño de lote recomendado
  const lotSize = riskUSD / lossPerLot;

  // precio del stop-loss final
  const stopLossPrice = entryPrice * (1 - stopP);

  return {
    pipSize,
    pipValuePerLot,
    pipsStop,
    lossPerLot,
    lotSize,
    riskUSD,
    stopLossPrice,
  };
}


export interface CryptoParams {
  balance: number;
  riskPercent: number;   // Ej: 1 = 1%
  stopPercent: number;   // Ej: 1 = 1%
  entryPrice: number;
  precision: number;     // MT5 precision (2 para BTCUSD normalmente)
  contractSize: number;  // Suele ser 1 en BTCUSD CFD
}


export function calcLotSizeCrypto(params: CryptoParams) {
  const {
    balance,
    riskPercent,
    stopPercent,
    entryPrice,
    precision,
    contractSize,
  } = params;

  // pipSize derivado automáticamente de MT5 precision
  const pipSize = 1 / Math.pow(10, precision);

  const riskP = toDecimalPercent(riskPercent);
  const stopP = toDecimalPercent(stopPercent);

  const riskUSD = balance * riskP;

  // 📌 CRYPTO CFD: pipValue = pipSize * contractSize
  const pipValuePerLot = pipSize * contractSize;

  // cuántos pips representa el stop
  const pipsStop = (entryPrice * stopP) / pipSize;

  // pérdida por lote
  const lossPerLot = pipsStop * pipValuePerLot;

  // lotaje
  const lotSize = riskUSD / lossPerLot;

  // cálculo del SL final
  const stopLossPrice = entryPrice * (1 - stopP);

  return {
    pipSize,
    pipValuePerLot,
    pipsStop,
    lossPerLot,
    lotSize,
    riskUSD,
    stopLossPrice,
  };
}
