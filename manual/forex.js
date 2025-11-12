// ============================================
// CALCULADORA DE TRADING PARA FOREX
// MetaTrader 5 - Versión Optimizada
// ============================================

// ═══════════════════════════════════════════
// 📊 CONFIGURACIÓN
// ═══════════════════════════════════════════

const config = {
  capitalTotal: 6700,           // Capital total en USD
  parForex: 'XAUUSD',            // Par de divisas (o XAUUSD para oro)
  precioActual: 4113,            // Precio actual del par
  perdidaMaximaUSD: 50,          // Pérdida máxima aceptada en USD
  esPosicionLarga: true,         // true = LONG (Buy), false = SHORT (Sell)
  porcentajeStopLoss: 1,       // % de distancia al stop loss
  
  // IMPORTANTE: Tamaño del contrato según el instrumento
  // - Pares Forex (EURUSD, GBPUSD, etc): 100,000
  // - Oro XAUUSD: 100 (1 lote = 100 onzas)
  // - Plata XAGUSD: 5,000 (1 lote = 5,000 onzas)
  // Para verificar: MT5 → Click derecho → Especificación → "Contract size"
  tamañoLoteEstandar: 100        // Para oro: 100 onzas
};

// ═══════════════════════════════════════════
// 🔧 VALIDACIONES
// ═══════════════════════════════════════════

function validarConfiguracion(cfg) {
  const errores = [];
  
  if (cfg.capitalTotal <= 0) errores.push("El capital debe ser mayor a 0");
  if (cfg.precioActual <= 0) errores.push("El precio debe ser mayor a 0");
  if (cfg.perdidaMaximaUSD <= 0) errores.push("La pérdida máxima debe ser mayor a 0");
  if (cfg.perdidaMaximaUSD > cfg.capitalTotal) errores.push("La pérdida no puede ser mayor al capital");
  if (cfg.porcentajeStopLoss <= 0 || cfg.porcentajeStopLoss > 50) errores.push("El % de SL debe estar entre 0 y 50");
  if (cfg.tamañoLoteEstandar <= 0) errores.push("El tamaño del lote debe ser mayor a 0");
  
  return errores;
}

// ═══════════════════════════════════════════
// 🧮 FUNCIONES DE CÁLCULO
// ═══════════════════════════════════════════

/**
 * Calcula el precio del stop loss
 * @param {number} precio - Precio actual
 * @param {number} porcentaje - Porcentaje de distancia
 * @param {boolean} esLong - Si es posición larga
 * @returns {number} Precio del stop loss
 */
function calcularStopLoss(precio, porcentaje, esLong) {
  const factor = porcentaje / 100;
  return esLong ? precio * (1 - factor) : precio * (1 + factor);
}

/**
 * Calcula el volumen en lotes para Forex
 * 
 * Fórmula para pares XXX/USD (divisa cotizada es USD):
 * Volumen = Pérdida USD / (Distancia en precio × Tamaño lote estándar)
 * 
 * Ejemplo: EURUSD
 * - Precio: 1.08456, SL: 1.06829 (distancia: 0.01627)
 * - Pérdida máxima: $100
 * - Tamaño lote: 100,000
 * - Volumen = 100 / (0.01627 × 100,000) = 0.06 lotes
 * 
 * @param {number} precioEntrada - Precio de entrada
 * @param {number} precioSL - Precio del stop loss
 * @param {number} perdidaMaxima - Pérdida máxima en USD
 * @param {number} tamañoLote - Tamaño del lote estándar
 * @returns {number} Volumen en lotes
 */
function calcularVolumen(precioEntrada, precioSL, perdidaMaxima, tamañoLote) {
  const distancia = Math.abs(precioEntrada - precioSL);
  
  if (distancia === 0) {
    throw new Error("La distancia al stop loss no puede ser cero");
  }
  
  if (tamañoLote <= 0) {
    throw new Error("El tamaño del lote debe ser mayor a cero");
  }
  
  // Pérdida por lote = Distancia × Tamaño del lote
  const perdidaPorLote = distancia * tamañoLote;
  
  // Volumen = Pérdida máxima / Pérdida por lote
  return perdidaMaxima / perdidaPorLote;
}

/**
 * Ajusta el volumen a formato MT5
 * MT5 solo acepta incrementos de 0.01 lotes
 * @param {number} volumen - Volumen calculado
 * @returns {number} Volumen ajustado
 */
function ajustarVolumenMT5(volumen) {
  const VOLUMEN_MINIMO = 0.01;
  const volumenRedondeado = Math.floor(volumen * 100) / 100;
  return Math.max(VOLUMEN_MINIMO, volumenRedondeado);
}

/**
 * Detecta el número de decimales del par forex
 * @param {number} precio - Precio del par
 * @returns {number} Cantidad de decimales
 */
function detectarDecimales(precio) {
  const precioStr = precio.toString();
  if (!precioStr.includes('.')) return 0;
  const decimales = precioStr.split('.')[1].length;
  
  // Pares con 2 decimales (JPY): 110.25
  // Pares con 4-5 decimales (mayoría): 1.08456
  return decimales;
}

/**
 * Formatea precio según decimales del par
 * @param {number} numero - Número a formatear
 * @param {number} decimales - Decimales a usar
 * @returns {string} Número formateado
 */
function formatearPrecio(numero, decimales) {
  return numero.toFixed(decimales);
}

/**
 * Calcula pips de distancia (informativo)
 * @param {number} distancia - Distancia en precio
 * @param {number} decimales - Decimales del par
 * @returns {number} Distancia en pips
 */
function calcularPips(distancia, decimales) {
  // Para pares con 5 decimales: 1 pip = 0.0001 (4ta decimal)
  // Para pares con 3 decimales (JPY): 1 pip = 0.01 (2da decimal)
  const multiplicador = decimales >= 4 ? 10000 : 100;
  return distancia * multiplicador;
}

// ═══════════════════════════════════════════
// 📊 CÁLCULO PRINCIPAL
// ═══════════════════════════════════════════

function calcularOperacionForex(cfg) {
  // Validar configuración
  const errores = validarConfiguracion(cfg);
  if (errores.length > 0) {
    return { error: true, mensajes: errores };
  }
  
  try {
    // Detectar formato del par
    const decimales = detectarDecimales(cfg.precioActual);
    
    // Cálculos principales
    const precioSL = calcularStopLoss(cfg.precioActual, cfg.porcentajeStopLoss, cfg.esPosicionLarga);
    const volumenCalculado = calcularVolumen(cfg.precioActual, precioSL, cfg.perdidaMaximaUSD, cfg.tamañoLoteEstandar);
    const volumenFinal = ajustarVolumenMT5(volumenCalculado);
    
    // Métricas adicionales
    const distanciaSL = Math.abs(cfg.precioActual - precioSL);
    const distanciaPips = calcularPips(distanciaSL, decimales);
    const porcentajeRiesgo = (cfg.perdidaMaximaUSD / cfg.capitalTotal) * 100;
    const valorPosicion = cfg.precioActual * volumenFinal * cfg.tamañoLoteEstandar;
    const perdidaReal = distanciaSL * volumenFinal * cfg.tamañoLoteEstandar;
    
    return {
      error: false,
      entrada: {
        par: cfg.parForex,
        capital: cfg.capitalTotal,
        precio: cfg.precioActual,
        perdidaMaxima: cfg.perdidaMaximaUSD,
        tipo: cfg.esPosicionLarga ? 'LONG' : 'SHORT',
        stopLossPorcentaje: cfg.porcentajeStopLoss,
        decimales: decimales
      },
      resultados: {
        precioStopLoss: precioSL,
        volumenLotes: volumenFinal,
        distanciaSL: distanciaSL,
        distanciaPips: distanciaPips
      },
      metricas: {
        riesgoPorcentaje: porcentajeRiesgo,
        valorPosicion: valorPosicion,
        perdidaReal: perdidaReal,
        diferenciaPerdida: Math.abs(perdidaReal - cfg.perdidaMaximaUSD)
      }
    };
  } catch (error) {
    return { error: true, mensajes: [error.message] };
  }
}

// ═══════════════════════════════════════════
// 🎯 EJECUTAR CÁLCULO
// ═══════════════════════════════════════════

const resultado = calcularOperacionForex(config);

// ═══════════════════════════════════════════
// 📤 MOSTRAR RESULTADOS
// ═══════════════════════════════════════════

if (resultado.error) {
  console.log("═══════════════════════════════════════════════════");
  console.log("    ⚠️  ERROR EN LA CONFIGURACIÓN");
  console.log("═══════════════════════════════════════════════════");
  resultado.mensajes.forEach(msg => console.log(`❌ ${msg}`));
  console.log("═══════════════════════════════════════════════════");
} else {
  const { entrada, resultados, metricas } = resultado;
  
  console.log("═══════════════════════════════════════════════════");
  console.log("    💱 CALCULADORA FOREX - METATRADER 5");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📊 CONFIGURACIÓN:");
  console.log("---------------------------------------------------");
  console.log(`Par Forex:            ${entrada.par}`);
  console.log(`Capital Total:        $${entrada.capital.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`Precio Actual:        ${formatearPrecio(entrada.precio, entrada.decimales)}`);
  console.log(`Pérdida Máxima:       $${entrada.perdidaMaxima.toFixed(2)}`);
  console.log(`Tipo Posición:        ${entrada.tipo === 'LONG' ? '🟢 LONG (Buy)' : '🔴 SHORT (Sell)'}`);
  console.log(`Stop Loss %:          ${entrada.stopLossPorcentaje}%`);
  console.log(`Formato Par:          ${entrada.decimales} decimales`);
  console.log("");
  console.log("🎯 RESULTADOS PARA MT5:");
  console.log("---------------------------------------------------");
  console.log(`📍 Stop Loss:         ${formatearPrecio(resultados.precioStopLoss, entrada.decimales)}`);
  console.log(`📊 Volumen:           ${resultados.volumenLotes.toFixed(2)} lotes`);
  console.log(`📏 Distancia SL:      ${formatearPrecio(resultados.distanciaSL, entrada.decimales)} (${resultados.distanciaPips.toFixed(1)} pips)`);
  console.log("");
  console.log("💡 ANÁLISIS DE RIESGO:");
  console.log("---------------------------------------------------");
  console.log(`Riesgo del Capital:   ${metricas.riesgoPorcentaje.toFixed(2)}%`);
  console.log(`Valor Posición:       $${metricas.valorPosicion.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`Pérdida Real:         $${metricas.perdidaReal.toFixed(2)}`);
  
  // Advertencia si la pérdida real difiere de la deseada
  if (metricas.diferenciaPerdida > 1) {
    console.log(`⚠️  Diferencia:        $${metricas.diferenciaPerdida.toFixed(2)} (por redondeo MT5)`);
  }
  
  console.log("");
  console.log("📋 INSTRUCCIONES PARA MT5:");
  console.log("---------------------------------------------------");
  console.log(`1. Abre nueva orden en ${entrada.par}`);
  console.log(`2. Tipo: ${entrada.tipo === 'LONG' ? 'Buy' : 'Sell'}`);
  console.log(`3. Volumen: ${resultados.volumenLotes.toFixed(2)}`);
  console.log(`4. Stop Loss: ${formatearPrecio(resultados.precioStopLoss, entrada.decimales)}`);
  console.log("═══════════════════════════════════════════════════");
  
  // Verificación de lógica
  console.log("");
  console.log("🔍 VERIFICACIÓN DE LÓGICA:");
  console.log("---------------------------------------------------");
  console.log(`✓ Precio entrada: ${formatearPrecio(entrada.precio, entrada.decimales)}`);
  console.log(`✓ Precio SL: ${formatearPrecio(resultados.precioStopLoss, entrada.decimales)}`);
  console.log(`✓ Diferencia: ${formatearPrecio(resultados.distanciaSL, entrada.decimales)} (${resultados.distanciaPips.toFixed(1)} pips)`);
  console.log(`✓ Tamaño lote: 100,000 unidades`);
  console.log(`✓ Volumen: ${resultados.volumenLotes.toFixed(2)} lotes`);
  console.log(`✓ Cálculo: ${metricas.perdidaReal.toFixed(2)} = ${formatearPrecio(resultados.distanciaSL, entrada.decimales)} × ${resultados.volumenLotes.toFixed(2)} × 100,000`);
  console.log(`✓ Pérdida objetivo: $${entrada.perdidaMaxima.toFixed(2)}`);
  console.log(`✓ Pérdida real: $${metricas.perdidaReal.toFixed(2)}`);
  console.log("═══════════════════════════════════════════════════");
  
  // Ejemplos de otros pares
  console.log("");
  console.log("💡 EJEMPLOS PARA OTROS PARES:");
  console.log("---------------------------------------------------");
  console.log("• EURUSD, GBPUSD, AUDUSD → 5 decimales (1.08456)");
  console.log("• USDJPY, EURJPY, GBPJPY → 3 decimales (110.256)");
  console.log("• Oro XAUUSD → 2 decimales (1825.50)");
  console.log("═══════════════════════════════════════════════════");
}