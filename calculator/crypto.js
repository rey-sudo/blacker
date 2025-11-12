// ============================================
// CALCULADORA DE TRADING PARA CRIPTOMONEDAS
// MetaTrader 5 - Versión Optimizada
// ============================================

// ═══════════════════════════════════════════
// 📊 CONFIGURACIÓN
// ═══════════════════════════════════════════

const config = {
  capitalTotal: 6700,           // Capital total en USD
  precioActual: 3434,           // Precio actual de ASSET
  perdidaMaximaUSD: 50,          // Pérdida máxima aceptada en USD
  esPosicionLarga: true,         // true = LONG, false = SHORT
  porcentajeStopLoss: 1,       // % de distancia al stop loss
  
  // IMPORTANTE: Tamaño del contrato según MT5
  // Para encontrarlo: Click derecho en el símbolo → Especificación
  // Busca donde dice "0.01 = X CRYPTO"
  // 
  // Ejemplos reales:
  // - Si dice "0.01 = 10 DASHUSD" → 1 lote = 1000 DASH (usa 1000)
  // - Si dice "0.01 = 0.01 BTCUSD" → 1 lote = 1 BTC (usa 1)
  // - Si dice "0.01 = 0.1 ETHUSD" → 1 lote = 10 ETH (usa 10)
  // - Si dice "0.01 = 1 XRPUSD" → 1 lote = 100 XRP (usa 100)
  //
  // Fórmula: Si "0.01 = X", entonces tamañoContrato = X / 0.01
  tamañoContratoEnUnidades: 10    // Para DASH: 0.01 lotes = 10 DASH, entonces 1 lote = 1000 DASH
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
  if (cfg.tamañoContratoEnUnidades <= 0) errores.push("El tamaño del contrato debe ser mayor a 0");
  
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
 * Calcula el volumen en lotes para crypto en MT5
 * 
 * Fórmula correcta para MT5:
 * Volumen (lotes) = Pérdida USD / (Distancia precio × Tamaño contrato)
 * 
 * Ejemplo 1: BTC donde 1 lote = 1 BTC
 * - Precio: $67,500, SL: $66,150 (distancia $1,350)
 * - Pérdida máxima: $100
 * - Tamaño contrato: 1 BTC
 * - Volumen = 100 / (1350 × 1) = 0.074 lotes
 * 
 * Ejemplo 2: BTC donde 1 lote = 0.01 BTC (mini contrato)
 * - Precio: $67,500, SL: $66,150 (distancia $1,350)
 * - Pérdida máxima: $100
 * - Tamaño contrato: 0.01 BTC
 * - Volumen = 100 / (1350 × 0.01) = 7.41 lotes
 * 
 * @param {number} precioEntrada - Precio de entrada
 * @param {number} precioSL - Precio del stop loss
 * @param {number} perdidaMaxima - Pérdida máxima en USD
 * @param {number} tamañoContrato - Cuántas unidades representa 1 lote
 * @returns {number} Volumen en lotes
 */
function calcularVolumen(precioEntrada, precioSL, perdidaMaxima, tamañoContrato) {
  const distancia = Math.abs(precioEntrada - precioSL);
  
  if (distancia === 0) {
    throw new Error("La distancia al stop loss no puede ser cero");
  }
  
  if (tamañoContrato <= 0) {
    throw new Error("El tamaño del contrato debe ser mayor a cero");
  }
  
  // Pérdida por lote = Distancia × Tamaño del contrato
  const perdidaPorLote = distancia * tamañoContrato;
  
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
 * Formatea números con decimales apropiados
 * @param {number} numero - Número a formatear
 * @param {number} decimalesMin - Decimales mínimos
 * @returns {string} Número formateado
 */
function formatearNumero(numero, decimalesMin = 2) {
  const decimalesActuales = numero.toString().split('.')[1]?.length || 0;
  const decimales = Math.max(decimalesMin, decimalesActuales);
  return numero.toFixed(decimales);
}

// ═══════════════════════════════════════════
// 📊 CÁLCULO PRINCIPAL
// ═══════════════════════════════════════════

function calcularOperacion(cfg) {
  // Validar configuración
  const errores = validarConfiguracion(cfg);
  if (errores.length > 0) {
    return { error: true, mensajes: errores };
  }
  
  try {
    // Cálculos principales
    const precioSL = calcularStopLoss(cfg.precioActual, cfg.porcentajeStopLoss, cfg.esPosicionLarga);
    const volumenCalculado = calcularVolumen(cfg.precioActual, precioSL, cfg.perdidaMaximaUSD, cfg.tamañoContratoEnUnidades);
    const volumenFinal = ajustarVolumenMT5(volumenCalculado);
    
    // Métricas adicionales
    const distanciaSL = Math.abs(cfg.precioActual - precioSL);
    const porcentajeRiesgo = (cfg.perdidaMaximaUSD / cfg.capitalTotal) * 100;
    const valorPosicion = cfg.precioActual * volumenFinal * cfg.tamañoContratoEnUnidades;
    const perdidaReal = distanciaSL * volumenFinal * cfg.tamañoContratoEnUnidades;
    
    return {
      error: false,
      entrada: {
        capital: cfg.capitalTotal,
        precio: cfg.precioActual,
        perdidaMaxima: cfg.perdidaMaximaUSD,
        tipo: cfg.esPosicionLarga ? 'LONG' : 'SHORT',
        stopLossPorcentaje: cfg.porcentajeStopLoss,
        tamañoContrato: cfg.tamañoContratoEnUnidades
      },
      resultados: {
        precioStopLoss: precioSL,
        volumenLotes: volumenFinal,
        distanciaSL: distanciaSL
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

const resultado = calcularOperacion(config);

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
  console.log("    💰 CALCULADORA CRYPTO - METATRADER 5");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📊 CONFIGURACIÓN:");
  console.log("---------------------------------------------------");
  console.log(`Capital Total:        $${entrada.capital.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`Precio Actual:        $${formatearNumero(entrada.precio)}`);
  console.log(`Pérdida Máxima:       ${entrada.perdidaMaxima.toFixed(2)}`);
  console.log(`Tipo Posición:        ${entrada.tipo === 'LONG' ? '🟢 LONG (Compra)' : '🔴 SHORT (Venta)'}`);
  console.log(`Stop Loss %:          ${entrada.stopLossPorcentaje}%`);
  console.log(`Tamaño Contrato:      ${entrada.tamañoContrato} unidad(es) por lote`);
  console.log("");
  console.log("🎯 RESULTADOS PARA MT5:");
  console.log("---------------------------------------------------");
  console.log(`📍 Stop Loss:         $${formatearNumero(resultados.precioStopLoss)}`);
  console.log(`📊 Volumen:           ${resultados.volumenLotes.toFixed(2)} lotes`);
  console.log(`📏 Distancia SL:      $${formatearNumero(resultados.distanciaSL)}`);
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
  console.log(`1. Abre nueva orden`);
  console.log(`2. Tipo: ${entrada.tipo === 'LONG' ? 'Buy' : 'Sell'}`);
  console.log(`3. Volumen: ${resultados.volumenLotes.toFixed(2)}`);
  console.log(`4. Stop Loss: ${formatearNumero(resultados.precioStopLoss)}`);
  console.log("═══════════════════════════════════════════════════");
  
  // Verificación de lógica
  console.log("");
  console.log("🔍 VERIFICACIÓN DE LÓGICA:");
  console.log("---------------------------------------------------");
  console.log(`✓ Precio entrada: $${formatearNumero(entrada.precio)}`);
  console.log(`✓ Precio SL: $${formatearNumero(resultados.precioStopLoss)}`);
  console.log(`✓ Diferencia: ${formatearNumero(resultados.distanciaSL)}`);
  console.log(`✓ Tamaño contrato: ${entrada.tamañoContrato} unidad(es)`);
  console.log(`✓ Volumen: ${resultados.volumenLotes.toFixed(2)} lotes`);
  console.log(`✓ Cálculo: ${metricas.perdidaReal.toFixed(2)} = ${formatearNumero(resultados.distanciaSL)} × ${resultados.volumenLotes.toFixed(2)} × ${entrada.tamañoContrato}`);
  console.log(`✓ Pérdida objetivo: ${entrada.perdidaMaxima.toFixed(2)}`);
  console.log(`✓ Pérdida real: ${metricas.perdidaReal.toFixed(2)}`);
  console.log("═══════════════════════════════════════════════════");
}