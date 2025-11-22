const fs = require('fs');

class CSVValidator {
  constructor(filename, interval = '15m') {
    this.filename = filename;
    this.interval = interval;
    // Extraer minutos del intervalo (5m, 15m, 1h, etc.)
    this.intervalMinutes = this.parseInterval(interval);
    this.intervalMs = this.intervalMinutes * 60 * 1000;
  }

  parseInterval(interval) {
    // Extraer el número del string (5m -> 5, 1h -> 60, 1d -> 1440)
    if (interval.endsWith('m')) {
      return parseInt(interval);
    } else if (interval.endsWith('h')) {
      return parseInt(interval) * 60;
    } else if (interval.endsWith('d')) {
      return parseInt(interval) * 60 * 24;
    } else if (interval.endsWith('w')) {
      return parseInt(interval) * 60 * 24 * 7;
    }
    return 15; // Default
  }

  validateOHLC(open, high, low, close) {
    const o = parseFloat(open);
    const h = parseFloat(high);
    const l = parseFloat(low);
    const c = parseFloat(close);

    const errors = [];

    // High debe ser el precio más alto
    if (h < o || h < c || h < l) {
      errors.push(`High (${h}) no es el precio más alto`);
    }

    // Low debe ser el precio más bajo
    if (l > o || l > c || l > h) {
      errors.push(`Low (${l}) no es el precio más bajo`);
    }

    // Precios deben ser positivos
    if (o <= 0 || h <= 0 || l <= 0 || c <= 0) {
      errors.push('Precios deben ser positivos');
    }

    return errors;
  }

  validateTimestamps(timestamps) {
    const errors = [];

    for (let i = 1; i < timestamps.length; i++) {
      const current = parseInt(timestamps[i]);
      const previous = parseInt(timestamps[i - 1]);
      
      const diff = current - previous;

      // Debe ser exactamente el intervalo configurado
      if (diff !== this.intervalMs) {
        errors.push({
          line: i + 2, // +2 por header y porque i empieza en 1
          expected: intervalMs,
          actual: diff,
          prevTime: new Date(previous).toISOString(),
          currTime: new Date(current).toISOString()
        });
      }

      // No puede ir hacia atrás
      if (diff < 0) {
        errors.push({
          line: i + 2,
          error: 'Timestamp va hacia atrás en el tiempo',
          prevTime: new Date(previous).toISOString(),
          currTime: new Date(current).toISOString()
        });
      }
    }

    return errors;
  }

  async validate() {
    console.log('🔍 INICIANDO VALIDACIÓN PROFUNDA DEL CSV...\n');
    console.log(`⏱️  Intervalo esperado: ${this.interval} (${this.intervalMinutes} minutos)\n`);

    const content = fs.readFileSync(this.filename, 'utf8');
    const lines = content.split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');

    console.log(`📊 Total de líneas: ${dataLines.length.toLocaleString()}`);
    console.log(`📋 Header: ${header}\n`);

    let ohlcErrors = 0;
    let volumeErrors = 0;
    let priceAnomalies = 0;
    const timestamps = [];
    const prices = [];

    console.log('⏳ Validando cada vela...\n');

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const parts = line.split(',');

      if (parts.length < 12) {
        console.log(`❌ Línea ${i + 2}: Formato incorrecto (${parts.length} columnas)`);
        continue;
      }

      const [timestamp, date, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote] = parts;

      timestamps.push(timestamp);
      prices.push({ open: parseFloat(open), high: parseFloat(high), low: parseFloat(low), close: parseFloat(close) });

      // Validar OHLC
      const ohlcErrs = this.validateOHLC(open, high, low, close);
      if (ohlcErrs.length > 0) {
        ohlcErrors++;
        console.log(`❌ Línea ${i + 2} (${date}):`);
        ohlcErrs.forEach(err => console.log(`   - ${err}`));
        console.log(`   OHLC: O=${open}, H=${high}, L=${low}, C=${close}\n`);
      }

      // Validar volúmenes
      const vol = parseFloat(volume);
      const qVol = parseFloat(quoteVolume);
      if (vol < 0 || qVol < 0) {
        volumeErrors++;
        console.log(`❌ Línea ${i + 2}: Volumen negativo (Vol=${vol}, QVol=${qVol})`);
      }

      // Detectar anomalías de precio (cambios >20% son muy raros)
      if (i > 0) {
        const prevClose = parseFloat(dataLines[i - 1].split(',')[5]);
        const currOpen = parseFloat(open);
        const change = Math.abs((currOpen - prevClose) / prevClose * 100);
        
        if (change > 20) {
          priceAnomalies++;
          console.log(`⚠️  Línea ${i + 2}: Cambio de precio inusual (${change.toFixed(2)}%)`);
          console.log(`   Precio anterior: ${prevClose}, Precio actual: ${currOpen}\n`);
        }
      }
    }

    console.log('⏳ Validando continuidad temporal...\n');
    const timestampErrors = this.validateTimestamps(timestamps);

    // REPORTE FINAL
    console.log('═'.repeat(60));
    console.log('📊 REPORTE FINAL DE VALIDACIÓN');
    console.log('═'.repeat(60));
    console.log(`\n✅ Velas procesadas: ${dataLines.length.toLocaleString()}`);
    console.log(`\n🔴 Errores OHLC: ${ohlcErrors}`);
    console.log(`🔴 Errores de volumen: ${volumeErrors}`);
    console.log(`🔴 Errores de timestamps: ${timestampErrors.length}`);
    console.log(`⚠️  Anomalías de precio: ${priceAnomalies}`);

    if (timestampErrors.length > 0) {
      console.log('\n⚠️  ERRORES DE CONTINUIDAD TEMPORAL:');
      timestampErrors.slice(0, 10).forEach(err => {
        console.log(`   Línea ${err.line}: Gap de ${(err.actual / (1000 * 60)).toFixed(0)} minutos`);
        console.log(`   Desde: ${err.prevTime}`);
        console.log(`   Hasta: ${err.currTime}\n`);
      });
      if (timestampErrors.length > 10) {
        console.log(`   ... y ${timestampErrors.length - 10} errores más\n`);
      }
    }

    // Estadísticas de precio
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    for (const p of prices) {
      minPrice = Math.min(minPrice, p.open, p.high, p.low, p.close);
      maxPrice = Math.max(maxPrice, p.open, p.high, p.low, p.close);
    }

    console.log('\n📈 ESTADÍSTICAS DE PRECIO:');
    console.log(`   Precio mínimo: $${minPrice.toLocaleString()}`);
    console.log(`   Precio máximo: $${maxPrice.toLocaleString()}`);
    console.log(`   Rango: $${(maxPrice - minPrice).toLocaleString()}`);

    console.log('\n' + '═'.repeat(60));
    
    const totalErrors = ohlcErrors + volumeErrors + timestampErrors.length;
    
    if (totalErrors === 0 && priceAnomalies === 0) {
      console.log('🎉 ¡VALIDACIÓN EXITOSA! DATOS 100% COHERENTES Y CONTINUOS');
      console.log('✅ Puedes usar estos datos con total confianza para backtesting');
    } else if (totalErrors === 0 && priceAnomalies > 0) {
      console.log('✅ Datos técnicamente válidos');
      console.log('⚠️  Algunas anomalías de precio detectadas (pueden ser eventos reales)');
    } else {
      console.log('❌ SE DETECTARON ERRORES EN LOS DATOS');
      console.log('⚠️  Revisar los errores antes de usar para backtesting');
    }
    
    console.log('═'.repeat(60) + '\n');

    return {
      totalCandles: dataLines.length,
      ohlcErrors,
      volumeErrors,
      timestampErrors: timestampErrors.length,
      priceAnomalies,
      isValid: totalErrors === 0
    };
  }
}

// Ejecutar validación
// IMPORTANTE: Cambia el intervalo según tu CSV
// Ejemplos:
// - new CSVValidator('btcusdt_5m_1year.csv', '5m')
// - new CSVValidator('btcusdt_15m_1year.csv', '15m')
// - new CSVValidator('ethusdt_1h_1year.csv', '1h')

const validator = new CSVValidator('btcusdt_15m_1year.csv', '15m');
validator.validate().catch(err => {
  console.error('Error en validación:', err.message);
  process.exit(1);
});