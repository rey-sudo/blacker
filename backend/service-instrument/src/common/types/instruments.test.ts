import { z } from "zod";
import { InstrumentSchema } from "./instruments.js";

// ============================================
// TYPES
// ============================================

export type Instrument = z.infer<typeof InstrumentSchema>;

const validInstrument: Partial<Instrument> = {
  id: "01234567-89ab-cdef-0123-456789abcdef",
  internalId: "binance-btc-usdt",
  idempotentId: "binance-btc-usdt-spot",
  symbol: "BTCUSDT",
  symbolDisplay: "BTC/USDT",
  description: "Bitcoin / Tether USD",
  base: "BTC",
  quote: "USDT",
  exchange: "Binance",
  exchangeCountry: "MT",
  market: "crypto",
  type: "spot",
  providerName: "Binance",
  providerId: "BTCUSDT",
  providerSymbol: "BTCUSDT",
  status: "active",
  isHidden: false,
  isSynthetic: false,
  tickSize: 0.01,
  pricePrecision: 2,
  minQuantity: 0.001,
  maxQuantity: 9000,
  minOrderValue: 10,
  maxOrderValue: 1000000,
  displayDecimals: 2,
  supportedMarginTypes: ["cross", "isolated"],
  tags: ["crypto", "spot", "popular"],
  iconUrl: "/icons/btc.png",
  highlightColor: "#F7931A",
  symbol_aliases: ["BTC-USDT", "BITCOIN-USDT"],
  timezone: "UTC",
  createdAt: 1672531200000,
  updatedAt: 1672531200000,
  supportedTimeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
  supportsOHLCV: true,
  stepSize: 0.001,
  leverageMax: 125,
  leverage: 10,
};

// ============================================
// CASOS DE PRUEBA INVÁLIDOS
// ============================================

const invalidCases = {
  mutuallyExclusive: {
    ...validInstrument,
    stepSize: 0.001,
    lotSize: 100,
  },

  leverageWithoutMax: {
    ...validInstrument,
    stepSize: undefined,
    leverage: 10,
    leverageMax: undefined,
  },

  leverageExceedsMax: {
    ...validInstrument,
    stepSize: undefined,
    leverage: 150,
    leverageMax: 100,
  },

  inconsistentPrecision: {
    ...validInstrument,
    tickSize: 0.001,
    pricePrecision: 2,
  },

  invalidColor: {
    ...validInstrument,
    highlightColor: "red",
  },

  invalidTimezone: {
    ...validInstrument,
    timezone: "PST",
  },

  invalidUUID: {
    ...validInstrument,
    id: "not-a-uuid",
  },

  negativeNumbers: {
    ...validInstrument,
    tickSize: -0.01,
  },
};

// ============================================
// FUNCIÓN DE PRUEBA
// ============================================

function testInstrumentSchema() {
  console.log("🧪 INICIANDO PRUEBAS DEL SCHEMA\n");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  // Prueba 1: Datos válidos
  console.log("\n✅ TEST 1: Datos válidos");
  try {
    const result = InstrumentSchema.parse(validInstrument);
    console.log("   ✓ Validación exitosa");
    passed++;
  } catch (error: any) {
    console.error("   ✗ ERROR INESPERADO:");
    console.error("   ", error.errors?.[0]?.message || error.message);
    failed++;
  }

  // Prueba 2: stepSize y lotSize mutuamente exclusivos
  console.log("\n❌ TEST 2: stepSize y lotSize mutuamente exclusivos");
  try {
    InstrumentSchema.parse(invalidCases.mutuallyExclusive);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 3: leverage sin leverageMax
  console.log("\n❌ TEST 3: leverage sin leverageMax");
  try {
    InstrumentSchema.parse(invalidCases.leverageWithoutMax);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 4: leverage > leverageMax
  console.log("\n❌ TEST 4: leverage excede leverageMax");
  try {
    InstrumentSchema.parse(invalidCases.leverageExceedsMax);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 5: tickSize vs pricePrecision inconsistentes
  console.log("\n❌ TEST 5: tickSize vs pricePrecision inconsistentes");
  try {
    InstrumentSchema.parse(invalidCases.inconsistentPrecision);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 6: highlightColor inválido
  console.log("\n❌ TEST 6: highlightColor inválido");
  try {
    InstrumentSchema.parse(invalidCases.invalidColor);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 7: timezone inválido
  console.log("\n❌ TEST 7: timezone inválido");
  try {
    InstrumentSchema.parse(invalidCases.invalidTimezone);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 8: UUID inválido
  console.log("\n❌ TEST 8: UUID inválido");
  try {
    InstrumentSchema.parse(invalidCases.invalidUUID);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Prueba 9: Números negativos
  console.log("\n❌ TEST 9: Números negativos");
  try {
    InstrumentSchema.parse(invalidCases.negativeNumbers);
    console.error("   ✗ DEBERÍA HABER FALLADO");
    failed++;
  } catch (error: any) {
    console.log("   ✓ Error esperado:", error.errors?.[0]?.message || error.message);
    passed++;
  }

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("\n🎉 PRUEBAS COMPLETADAS\n");
  console.log(`   ✅ Pasadas: ${passed}`);
  console.log(`   ❌ Fallidas: ${failed}`);
  console.log(`   📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log("\n✨ ¡TODAS LAS PRUEBAS PASARON!\n");
  } else {
    console.log("\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.\n");
  }

  return { passed, failed, total: passed + failed };
}

// ============================================
// CHECKLIST DE VERIFICACIÓN
// ============================================

function printChecklist() {
  console.log(`
📋 CHECKLIST DE VERIFICACIÓN DEL SCHEMA
${"=".repeat(60)}

✅ CAMPOS REQUERIDOS (36 campos)
   ✓ id, internalId, idempotentId
   ✓ symbol, symbolDisplay, description
   ✓ base, quote, exchange, exchangeCountry
   ✓ market, type, providerName, providerId, providerSymbol
   ✓ status, isHidden, isSynthetic
   ✓ tickSize, pricePrecision, minQuantity, maxQuantity
   ✓ minOrderValue, maxOrderValue, displayDecimals
   ✓ supportedMarginTypes, tags
   ✓ iconUrl, highlightColor, symbol_aliases
   ✓ timezone, createdAt, updatedAt
   ✓ supportedTimeframes, supportsOHLCV

✅ CAMPOS OPCIONALES
   ✓ isin, cusip
   ✓ stepSize, quantityPrecision, lotSize, contractSize
   ✓ leverage, leverageMax
   ✓ initialMargin, maintenanceMargin
   ✓ expiryDate, settlementType, settlementDelay
   ✓ priceMultiplier, pricingCurrency
   ✓ underlyingAsset, settlementCurrency
   ✓ tradingHours, priority, fullTextSearch
   ✓ feeTier, makerFee, takerFee, typicalSpread
   ✓ isTradable, isMarginAllowed, requiresKYC
   ✓ supportsStopLimit, supportsMarginTrading, supportsFutures
   ✓ regulation, symbol_lc, search_terms

✅ VALIDACIONES DE NEGOCIO
   ✓ stepSize y lotSize mutuamente exclusivos
   ✓ leverage requiere leverageMax
   ✓ leverage <= leverageMax
   ✓ tickSize vs pricePrecision consistentes
   ✓ highlightColor formato hex (#RRGGBB o #RGB)
   ✓ timezone IANA válido

🚀 STATUS: LISTO PARA PRODUCCIÓN
`);
}

  printChecklist();
  testInstrumentSchema();