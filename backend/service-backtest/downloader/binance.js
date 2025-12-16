const axios = require('axios');
const fs = require('fs');

class BinanceKlinesDownloader {
  constructor(symbol = 'BTCUSDT', interval = '15m', years = 1) {
    this.baseURL = 'https://api.binance.com/api/v3';
    this.symbol = symbol.toUpperCase();
    this.interval = interval;
    this.years = years;
    this.limit = 1000; // Máximo permitido por Binance
    this.delayMs = 250; // 250ms = ~240 req/min (muy por debajo del límite de 6000/min)
    this.maxRetries = 5;
    this.timeout = 30000; // 30 segundos
    
    this.validateParameters();
  }

  validateParameters() {
    const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    
    if (!validIntervals.includes(this.interval)) {
      throw new Error(
        `❌ Intervalo inválido: "${this.interval}"\n` +
        `   Intervalos válidos: ${validIntervals.join(', ')}`
      );
    }
    
    if (!Number.isInteger(this.years) || this.years <= 0 || this.years > 15) {
      throw new Error(
        `❌ Años inválido: "${this.years}"\n` +
        `   Debe ser un número entero entre 1 y 15`
      );
    }

    if (!/^[A-Z]{2,10}USDT?$/.test(this.symbol)) {
      console.warn(`⚠️  Símbolo "${this.symbol}" puede no ser válido. Verifica en Binance.`);
    }
  }

  parseIntervalToMs(interval) {
    const amount = parseInt(interval);
    const unit = interval.replace(/[0-9]/g, '');
    
    const multipliers = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'M': 30.44 * 24 * 60 * 60 * 1000 // Promedio de días en un mes
    };
    
    if (!multipliers[unit]) {
      throw new Error(`❌ Unidad de intervalo no reconocida: "${unit}"`);
    }
    
    return amount * multipliers[unit];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchKlines(startTime, endTime, retryCount = 0) {
    try {
      const response = await axios.get(`${this.baseURL}/klines`, {
        params: {
          symbol: this.symbol,
          interval: this.interval,
          startTime: startTime,
          endTime: endTime,
          limit: this.limit
        },
        timeout: this.timeout,
        validateStatus: (status) => status < 500 // No lanzar error automático en 4xx
      });

      // Manejar rate limit (429)
      if (response.status === 429) {
        if (retryCount >= this.maxRetries) {
          throw new Error(`Rate limit excedido después de ${this.maxRetries} intentos`);
        }
        
        const retryAfter = response.headers['retry-after'] 
          ? parseInt(response.headers['retry-after']) * 1000 
          : Math.pow(2, retryCount) * 1000;
        
        console.log(`   ⚠️  Rate limit (429). Esperando ${(retryAfter/1000).toFixed(1)}s... (intento ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(retryAfter);
        return this.fetchKlines(startTime, endTime, retryCount + 1);
      }

      // Verificar respuesta exitosa
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.data;

    } catch (error) {
      // Detectar IP ban (418)
      if (error.response && error.response.status === 418) {
        const retryAfter = error.response.headers['retry-after'] || 'desconocido';
        throw new Error(
          `🚫 IP BANEADA (418) por violar rate limits.\n` +
          `   Debes esperar: ${retryAfter} segundos\n` +
          `   Contacta a Binance si crees que es un error.`
        );
      }

      // Retry para otros errores
      if (retryCount < this.maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        const errorMsg = error.response?.data?.msg || error.message;
        console.log(`   ⚠️  Error: ${errorMsg}. Reintentando en ${waitTime/1000}s... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(waitTime);
        return this.fetchKlines(startTime, endTime, retryCount + 1);
      }

      throw new Error(`Fallo después de ${this.maxRetries} reintentos: ${error.message}`);
    }
  }

  removeDuplicates(klines) {
    const seen = new Set();
    const unique = [];

    for (const kline of klines) {
      const openTime = kline[0];
      if (!seen.has(openTime)) {
        seen.add(openTime);
        unique.push(kline);
      }
    }

    return unique;
  }

  async downloadData() {
    const endTime = Date.now();
    const startTime = endTime - (this.years * 365 * 24 * 60 * 60 * 1000);

    this.printDownloadHeader(startTime, endTime);

    let allKlines = [];
    let currentStartTime = startTime;
    let lastStartTime = null;
    let requestCount = 0;
    let stuckCount = 0;
    const maxStuckIterations = 3; // Salir si no avanza 3 veces

    const intervalMs = this.parseIntervalToMs(this.interval);
    const estimatedCandles = Math.floor((this.years * 365 * 24 * 60 * 60 * 1000) / intervalMs);
    console.log(`📊 Velas esperadas: ~${estimatedCandles.toLocaleString()}\n`);

    while (currentStartTime < endTime) {
      // Detectar si el timestamp no avanza (loop infinito)
      if (currentStartTime === lastStartTime) {
        stuckCount++;
        if (stuckCount >= maxStuckIterations) {
          console.log('⚠️  No hay más datos históricos disponibles. Finalizando.\n');
          break;
        }
      } else {
        stuckCount = 0;
      }
      lastStartTime = currentStartTime;

      requestCount++;
      const progress = ((currentStartTime - startTime) / (endTime - startTime) * 100).toFixed(1);
      
      process.stdout.write(
        `📡 Request ${requestCount.toString().padStart(4)} ` +
        `[${progress.padStart(5)}%] ` +
        `${new Date(currentStartTime).toISOString().slice(0, 19)}Z`
      );

      try {
        const klines = await this.fetchKlines(currentStartTime, endTime);

        if (klines.length === 0) {
          console.log(' → Sin datos');
          break;
        }

        allKlines.push(...klines);
        console.log(` → ${klines.length} velas (total: ${allKlines.length.toLocaleString()})`);

        // Actualizar startTime para siguiente iteración
        const lastKline = klines[klines.length - 1];
        currentStartTime = lastKline[6] + 1; // close_time + 1ms

        // Si recibimos menos del límite, ya no hay más datos
        if (klines.length < this.limit) {
          console.log('✅ Última página alcanzada\n');
          break;
        }

        await this.sleep(this.delayMs);

      } catch (error) {
        console.log(` → ❌ Error`);
        throw error;
      }
    }

    if (allKlines.length === 0) {
      throw new Error(
        `No se encontraron datos para ${this.symbol} en intervalo ${this.interval}.\n` +
        `   Verifica que el símbolo sea correcto.`
      );
    }

    console.log(`\n✅ Descarga completada: ${allKlines.length.toLocaleString()} velas en ${requestCount} requests\n`);

    return this.processData(allKlines);
  }

  processData(klines) {
    console.log('🔧 Procesando datos...');

    const uniqueKlines = this.removeDuplicates(klines);
    
    if (uniqueKlines.length < klines.length) {
      console.log(`   → Duplicados removidos: ${klines.length - uniqueKlines.length}`);
    }

    uniqueKlines.sort((a, b) => a[0] - b[0]);
    console.log('   → Datos ordenados cronológicamente');
    console.log('✅ Procesamiento completo\n');

    return uniqueKlines;
  }

  verifyDataIntegrity(klines) {
    console.log('🔍 Verificando integridad...\n');

    const intervalMs = this.parseIntervalToMs(this.interval);
    const gaps = [];

    for (let i = 1; i < klines.length; i++) {
      const currentOpenTime = klines[i][0];
      const prevCloseTime = klines[i - 1][6];
      const expectedNextOpenTime = prevCloseTime + 1;

      // Verificar si hay gap (más de 1ms de diferencia es sospechoso)
      const actualGap = currentOpenTime - expectedNextOpenTime;
      
      if (actualGap >= intervalMs) {
        const missingCandles = Math.floor(actualGap / intervalMs);
        
        gaps.push({
          index: i,
          from: new Date(expectedNextOpenTime).toISOString(),
          to: new Date(currentOpenTime).toISOString(),
          missingCandles: missingCandles
        });
      }
    }

    console.log(`📊 Total de velas: ${klines.length.toLocaleString()}`);
    console.log(`📅 Rango: ${new Date(klines[0][0]).toISOString()} → ${new Date(klines[klines.length-1][0]).toISOString()}`);
    console.log(`🕳️  Gaps detectados: ${gaps.length}`);

    if (gaps.length > 0) {
      console.log('\n⚠️  Gaps encontrados:');
      const maxToShow = 10;
      gaps.slice(0, maxToShow).forEach((gap, idx) => {
        console.log(`   ${(idx + 1).toString().padStart(2)}. ${gap.from} → ${gap.to} (${gap.missingCandles} velas faltantes)`);
      });
      
      if (gaps.length > maxToShow) {
        console.log(`   ... y ${gaps.length - maxToShow} gaps adicionales`);
      }
      
      console.log('\n💡 Los gaps son normales durante mantenimiento de Binance o baja liquidez');
    } else {
      console.log('✅ Sin gaps: Datos continuos');
    }

    console.log();
    return { gaps, totalCandles: klines.length };
  }

  async saveToCSV(klines, filename = null) {
    if (!filename) {
      filename = `${this.symbol.toLowerCase()}_${this.interval}_${this.years}y.csv`;
    }

    console.log(`💾 Guardando: ${filename}`);

    const header = 'timestamp,date,open,high,low,close,volume,close_time,quote_volume,trades,taker_buy_base,taker_buy_quote\n';
    
    const csvLines = klines.map(k => {
      const date = new Date(k[0]).toISOString();
      return `${k[0]},${date},${k[1]},${k[2]},${k[3]},${k[4]},${k[5]},${k[6]},${k[7]},${k[8]},${k[9]},${k[10]}`;
    });

    fs.writeFileSync(filename, header + csvLines.join('\n'), 'utf8');

    const stats = fs.statSync(filename);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Archivo guardado (${sizeMB} MB)`);
    console.log(`📍 ${filename}\n`);
  }

  printDownloadHeader(startTime, endTime) {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 BINANCE KLINES DOWNLOADER');
    console.log('='.repeat(70));
    console.log(`🎯 Símbolo:   ${this.symbol}`);
    console.log(`⏱️  Intervalo: ${this.interval}`);
    console.log(`📅 Período:   ${this.years} año${this.years > 1 ? 's' : ''}`);
    console.log(`📆 Desde:     ${new Date(startTime).toISOString()}`);
    console.log(`📆 Hasta:     ${new Date(endTime).toISOString()}`);
    
    const oldestData = new Date('2017-08-17');
    if (new Date(startTime) < oldestData) {
      console.log(`\n⚠️  NOTA: Binance solo tiene datos desde ~${oldestData.toISOString().split('T')[0]}`);
      console.log(`   Se descargarán todos los datos disponibles.`);
    }
    
    console.log('='.repeat(70) + '\n');
  }

  async run() {
    const startTime = Date.now();
    
    try {
      const klines = await this.downloadData();
      this.verifyDataIntegrity(klines);
      await this.saveToCSV(klines);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('='.repeat(70));
      console.log(`🎉 COMPLETADO en ${duration}s`);
      console.log('='.repeat(70) + '\n');

    } catch (error) {
      console.error('\n' + '='.repeat(70));
      console.error('❌ ERROR FATAL');
      console.error('='.repeat(70));
      console.error(error.message);
      console.error('='.repeat(70) + '\n');
      process.exit(1);
    }
  }
}

// ========================================
// CONFIGURACIÓN Y EJECUCIÓN
// ========================================

// Ejemplos de uso:
// new BinanceKlinesDownloader('BTCUSDT', '1m', 1)    // 1 año, 1 minuto
// new BinanceKlinesDownloader('ETHUSDT', '5m', 2)    // 2 años, 5 minutos  
// new BinanceKlinesDownloader('BTCUSDT', '1h', 3)    // 3 años, 1 hora
// new BinanceKlinesDownloader('BNBUSDT', '4h', 5)    // 5 años, 4 horas
// new BinanceKlinesDownloader('SOLUSDT', '1d', 2)    // 2 años, diario

const downloader = new BinanceKlinesDownloader('BTCUSDT', '15m', 2);
downloader.run();