import { calculateMFI, Candle, calculateEMA } from "@whiterockdev/common";
import { Backtester } from "../index.js";

export async function mfiRule(
  this: Backtester,
  RULE: number,
  candles: Candle[]
): Promise<boolean> {
  if (!this.state.rule_values[RULE]) {
    const { haCandles, smaData } = calculateMFI(candles);

    const lastHeikin = haCandles.at(-1);
    const lastSma = smaData.at(-1);

    const EMA25 = calculateEMA(candles, 25);

    if (lastHeikin && lastSma) {
      const rule1 = lastHeikin.close < 70;
      const rule2 = lastHeikin.close > lastSma.value;

      const { toques, intentosDeRuptura } = countEMATouches(candles, EMA25);

      console.log(toques, intentosDeRuptura);

      const rule3 = toques >= 3 || intentosDeRuptura >= 4;

      this.state.rule_values[RULE] = rule1 && rule2;

      if (!rule1) {
        this.reset();
      }

      if (rule3) {
        console.log("⚠️⚠️⚠️⚠️⚠️EMA25 TOUCHES⚠️⚠️⚠️⚠️⚠️");
        this.reset();
      }
    }
  }

  return this.state.rule_values[RULE];
}

/**
 * @param {Array<Object>} data Array de datos de velas OHLCV.
 * @param {Array<Object>} ema25Data Array de objetos con el valor de la EMA 25, sincronizado con 'data'.
 * @returns {Object} Un objeto con el recuento de toques e intentos de ruptura.
 */
export function countEMATouches(
  data: Candle[],
  ema25Data: any,
  periodosAAnalizar: number = 5
) {
  let toques = 0;
  let intentosDeRuptura = 0;
  // Tolerancia del 0.05% para considerar un "toque" o "cercanía extrema"
  const toleranciaPorcentual = 0.0005;

  // Verificación de sincronización
  if (data.length !== ema25Data.length) {
    console.error(
      "Error: Los arrays de datos (precios) y EMA25 no tienen la misma longitud."
    );
    return { toques: 0, intentosDeRuptura: 0 };
  }

  // --- Lógica para limitar el análisis a los últimos 'periodosAAnalizar' ---

  // 1. Determinar el punto de inicio del análisis.
  // Aseguramos que el punto de inicio no sea menor que 1 (necesitamos el elemento anterior)
  // y que no exceda la longitud total de los datos.
  const inicioAnalisis = Math.max(1, data.length - periodosAAnalizar);

  // Iteramos desde el punto de inicio calculado hasta el final.
  for (let i = inicioAnalisis; i < data.length; i++) {
    const vela = data[i];
    const ma25 = ema25Data[i].value;
    const velaAnterior = data[i - 1]; // Siempre disponible ya que inicioAnalisis >= 1

    // La tolerancia se calcula en base al valor actual de la MA.
    const toleranciaAbsoluta = ma25 * toleranciaPorcentual;

    // --- Criterio 1: Intento de Toque (Cercanía o contacto) ---
    // Se considera toque si el precio mínimo o máximo está dentro del rango de tolerancia de la MA.
    // O si la mecha toca o cruza ligeramente.
    if (
      (Math.abs(vela.high - ma25) <= toleranciaAbsoluta && vela.high >= ma25) ||
      (Math.abs(vela.low - ma25) <= toleranciaAbsoluta && vela.low <= ma25)
    ) {
      toques++;
    }

    // --- Criterio 2: Intención de Romper (Cruza y Cierra en el lado opuesto - Falla) ---

    // 1. Falla Alcista (Quiebra el soporte, pero el precio se mantiene arriba)
    // La vela anterior cerró POR ENCIMA de la MA, la vela actual toca/cruza POR DEBAJO,
    // pero el cierre de la vela actual termina POR ENCIMA de la MA.
    if (velaAnterior.close > ma25 && vela.low < ma25 && vela.close > ma25) {
      intentosDeRuptura++;
    }

    // 2. Falla Bajista (Quiebra la resistencia, pero el precio se mantiene abajo)
    // La vela anterior cerró POR DEBAJO de la MA, la vela actual toca/cruza POR ENCIMA,
    // pero el cierre de la vela actual termina POR DEBAJO de la MA.
    if (velaAnterior.close < ma25 && vela.high > ma25 && vela.close < ma25) {
      intentosDeRuptura++;
    }
  }

  return {
    toques: toques,
    intentosDeRuptura: intentosDeRuptura,
  };
}
