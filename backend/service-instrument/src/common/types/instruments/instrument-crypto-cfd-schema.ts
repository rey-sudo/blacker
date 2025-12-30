import { Decimal } from "decimal.js";

/** * ENUMS PARA LÓGICA DE ESTADO Y EJECUCIÓN
 */
export enum InstrumentStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  HALT = "HALT", // Suspensión por volatilidad o mantenimiento
  CLOSE_ONLY = "CLOSE_ONLY", // Solo permite cerrar posiciones (útil en periodos de liquidación)
}

export interface MarginTier {
  tier: number;
  upperBound: Decimal; // Valor nocional máximo para este tier
  maintenanceMarginRate: Decimal; // Margen para evitar stop-out (ej. 0.05)
  maxLeverage: Decimal; // Apalancamiento máximo permitido (ej. 20)
}

/**
 * INSTRUMENTO CRYPTO CFD PARA PROP FIRM
 */
export interface InstrumentCryptoCFD {
  // --- IDENTIFICACIÓN ---
  id: string;
  symbol: string; // ej. BTC-USD-PERP
  ticker: string; // ej. Bitcoin / US Dollar
  version: number; // Control de concurrencia
  status: InstrumentStatus;

  // --- UNIDADES Y PRECISIÓN ---
  baseCurrency: string;
  quoteCurrency: string;
  settlementCurrency: string; // ej. USDC o USD (cuenta del trader)
  contractSize: Decimal; // ej. 1 BTC o 1000 satoshis
  pricePrecision: number; // Decimales en precio
  quantityPrecision: number; // Decimales en cantidad
  tickSize: Decimal; // Movimiento mínimo de precio (ej. 0.5)
  stepSize: Decimal; // Movimiento mínimo de cantidad (ej. 0.001)

  // --- REGLAS DE EJECUCIÓN SIMULADA (CORE DE PROP FIRM) ---
  simulationRules: {
    // Spread adicional sobre el precio de mercado para simular costos de liquidez
    spreadMarkupBps: number;
    // Modelo de Slippage: Fijo o basado en tamaño de orden
    slippageModel: "FIXED" | "DYNAMIC_VOLATILITY" | "ORDER_BOOK_DEPTH";
    fixedSlippageBps: number;
    // Protección contra "fat-finger" o manipulación
    maxOrderQuantity: Decimal;
    minNotional: Decimal;
    // Permite rechazar órdenes durante noticias de alto impacto (simulado)
    blockTradingDuringNews: boolean;
  };

  // --- GESTIÓN DE RIESGO DE LA FIRMA ---
  riskParams: {
    marginTiers: MarginTier[];
    liquidationFee: Decimal; // Penalización por llegar al stop-out
    // Drawdown específico: ¿Este activo contribuye de forma distinta al riesgo?
    riskWeight: Decimal; // ej. 1.0 (normal), 2.0 (muy volátil)
    // Límite de exposición total de la firma en este símbolo
    maxTotalOpenInterest: Decimal;
    // Límite máximo de lotes por trader individual
    maxPositionSizePerTrader: Decimal;
  };

  // --- HORARIOS DE MERCADO (CRÍTICO PARA EVALUACIONES) ---
  marketHours: {
    timezone: string; // ej. "UTC"
    tradingSessions: {
      day: number; // 0-6 (Dom-Sab)
      open: string; // "00:00"
      close: string; // "23:59"
    }[];
    // ¿Se deben cerrar las posiciones forzosamente el viernes al cierre?
    forceCloseOnWeekend: boolean;
    // Margen de tiempo para reabrir tras mantenimiento (en segundos)
    reopenDelaySeconds: number;
  };

  // --- FUNDING Y SWAPS (CFDS PERPETUOS) ---
  fundingConfig: {
    fundingIntervalHours: number; // Típicamente 8
    interestRateDefault: Decimal; // Tasa base (ej. 0.0001)
    fundingCap: Decimal;
    fundingFloor: Decimal;
  };

  // --- INFRAESTRUCTURA Y AUDITORÍA ---
  infrastructure: {
    shardId: string; // Instancia del motor que procesa este activo
    indexPriceSources: string[]; // Oráculos (Binance, Coinbase, Kraken)
    stalePriceTimeoutMs: number; // Tiempo antes de considerar el precio "muerto"
    ledgerAccountId: string; // Cuenta contable interna
  };

  // Dentro de riskParams
  maxConcentrationRatio: Decimal; // % máximo que este activo puede ocupar en el drawdown total
  allowHedging: boolean; // ¿Permitir posiciones opuestas en este símbolo?

  // Dentro de simulationRules
  executionLatencyMs: {
    // Simular latencia de red real
    min: number;
    max: number;
  };

  // Nueva sección: Límites de Protección de la Firma
  exposureLimits: {
    netDirectionalExposure: Decimal; // Límite de cuánto puede estar la firma "Long" vs "Short" en total
    circuitBreakerThreshold: Decimal; // Caída % en X tiempo para auto-HALT
  };

// Añadir dentro de InstrumentCryptoCFD
  
  advancedRiskControl: {
    // Protección contra arbitraje de latencia
    maxPriceUpdateDelayMs: number; 
    // Evita que un solo trader mueva el precio simulado de la firma
    impactNominalAmount: Decimal;  
    // Porcentaje de drawdown relativo que este activo permite
    maxDrawdownContribution: number; 
  };

  feeStructure: {
    commissionType: 'FIXED' | 'PERCENTAGE' | 'PER_LOT';
    openFee: Decimal;
    closeFee: Decimal;
    overnightFee: Decimal; // Swap tradicional si no es perpetuo
  };

  softRules: {
    // ¿Se permite el trading durante el fin de semana para este activo?
    allowWeekendTrading: boolean;
    // ¿Se requiere Stop Loss obligatorio para abrir posición?
    requireStopLoss: boolean;
  };


  lastUpdated: Date;
  updatedBy: string;
}
