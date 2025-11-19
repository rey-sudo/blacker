const axios = require('axios');
const fs = require('fs');

class BinanceKlinesDownloader {
  constructor(symbol = 'BTCUSDT', interval = '15m') {
    this.baseURL = 'https://api.binance.com/api/v3/klines';
    this.symbol = symbol;
    this.interval = interval;
    this.limit = 1000;
    this.delayMs = 250;
    this.maxRetries = 3;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchKlines(startTime, endTime, retryCount = 0) {
    try {
      const params = {
        symbol: this.symbol,
        interval: this.interval,
        startTime: startTime,
        endTime: endTime,
        limit: this.limit
      };

      const response = await axios.get(this.baseURL, { 
        params,
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`   ⚠️  Error: ${error.message}. Reintentando en ${waitTime/1000}s... (intento ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(waitTime);
        return this.fetchKlines(startTime, endTime, retryCount + 1);
      }
      console.error(`   ❌ Error después de ${this.maxRetries} intentos: ${error.message}`);
      throw error;
    }
  }

  removeDuplicates(klines) {
    const seen = new Map();
    const unique = [];

    for (const kline of klines) {
      const openTime = kline[0];
      if (!seen.has(openTime)) {
        seen.set(openTime, true);
        unique.push(kline);
      }
    }

    return unique;
  }

  async downloadYearData() {
    console.log('🚀 Iniciando descarga de datos de BTCUSDT 15m (1 año)...\n');

    const endTime = Date.now();
    const startTime = endTime - (365 * 24 * 60 * 60 * 1000);

    console.log(`📅 Período: ${new Date(startTime).toISOString()} hasta ${new Date(endTime).toISOString()}`);
    console.log(`⏱️  Intervalo: ${this.interval}`);
    console.log(`🎯 Par: ${this.symbol}\n`);

    let allKlines = [];
    let currentStartTime = startTime;
    let requestCount = 0;
    let totalCandles = 0;

    // Calcular velas esperadas según el intervalo
    const intervalMinutes = parseInt(this.interval);
    const candlesPerDay = (24 * 60) / intervalMinutes;
    const estimatedCandles = Math.floor(365 * candlesPerDay);
    console.log(`📊 Velas esperadas: ~${estimatedCandles.toLocaleString()}\n`);

    while (currentStartTime < endTime) {
      try {
        requestCount++;
        const progress = ((currentStartTime - startTime) / (endTime - startTime) * 100).toFixed(1);
        console.log(`📡 Request ${requestCount} (${progress}%): Desde ${new Date(currentStartTime).toISOString()}`);

        const klines = await this.fetchKlines(currentStartTime, endTime);

        if (klines.length === 0) {
          console.log('✅ No hay más datos disponibles');
          break;
        }

        allKlines.push(...klines);
        totalCandles += klines.length;

        console.log(`   ✓ Recibidas: ${klines.length} velas | Total acumulado: ${totalCandles.toLocaleString()}`);

        const lastKline = klines[klines.length - 1];
        currentStartTime = lastKline[6] + 1;

        if (klines.length < this.limit) {
          console.log('✅ Última página de datos alcanzada');
          break;
        }

        await this.sleep(this.delayMs);

      } catch (error) {
        console.error(`❌ Error fatal en request ${requestCount}: ${error.message}`);
        throw error;
      }
    }

    console.log(`\n✅ Descarga completada!`);
    console.log(`📊 Total de velas descargadas: ${allKlines.length.toLocaleString()}`);
    console.log(`📡 Total de requests realizados: ${requestCount}`);

    console.log('\n🔧 Procesando datos...');
    const uniqueKlines = this.removeDuplicates(allKlines);
    
    if (uniqueKlines.length < allKlines.length) {
      console.log(`⚠️  Duplicados removidos: ${allKlines.length - uniqueKlines.length}`);
    }

    uniqueKlines.sort((a, b) => a[0] - b[0]);
    console.log('✅ Datos ordenados cronológicamente');

    return uniqueKlines;
  }

  verifyDataIntegrity(klines) {
    console.log('\n🔍 Verificando integridad de datos...\n');

    let gaps = [];
    // Calcular intervalo en milisegundos según el timeframe
    const intervalMinutes = parseInt(this.interval);
    const intervalMs = intervalMinutes * 60 * 1000;

    for (let i = 0; i < klines.length; i++) {
      const currentOpenTime = klines[i][0];

      if (i > 0) {
        const prevOpenTime = klines[i - 1][0];
        const expectedNextOpenTime = prevOpenTime + intervalMs;

        if (currentOpenTime > expectedNextOpenTime) {
          const gapMinutes = (currentOpenTime - expectedNextOpenTime) / (1000 * 60);
          const missingCandles = Math.floor(gapMinutes / intervalMinutes);
          
          gaps.push({
            index: i,
            from: new Date(prevOpenTime + intervalMs).toISOString(),
            to: new Date(currentOpenTime).toISOString(),
            gapMinutes: gapMinutes,
            missingCandles: missingCandles
          });
        }
      }
    }

    console.log(`📊 Total de velas: ${klines.length.toLocaleString()}`);
    console.log(`🕳️  Gaps encontrados: ${gaps.length}`);

    if (gaps.length > 0) {
      console.log('\n⚠️  Gaps detectados:');
      gaps.forEach((gap, idx) => {
        console.log(`   ${idx + 1}. Desde ${gap.from} hasta ${gap.to} (${gap.missingCandles} velas faltantes)`);
      });
      console.log('\n💡 Nota: Los gaps pueden ser normales en períodos de mantenimiento de Binance');
    }

    if (gaps.length === 0) {
      console.log('✅ Datos íntegros: Sin gaps detectados');
    }

    return { gaps };
  }

  async saveToCSV(klines, filename = null) {
    if (!filename) {
      filename = `${this.symbol.toLowerCase()}_${this.interval}_1year.csv`;
    }
    console.log(`\n💾 Guardando datos en ${filename}...`);

    const header = 'timestamp,date,open,high,low,close,volume,close_time,quote_volume,trades,taker_buy_base,taker_buy_quote\n';

    const csvLines = klines.map(k => {
      const date = new Date(k[0]).toISOString();
      return `${k[0]},${date},${k[1]},${k[2]},${k[3]},${k[4]},${k[5]},${k[6]},${k[7]},${k[8]},${k[9]},${k[10]}`;
    });

    const csvContent = header + csvLines.join('\n');

    fs.writeFileSync(filename, csvContent, 'utf8');

    const fileSizeMB = (fs.statSync(filename).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Archivo guardado exitosamente`);
    console.log(`📦 Tamaño: ${fileSizeMB} MB`);
    console.log(`📍 Ubicación: ${filename}`);
    console.log(`📅 Primera vela: ${new Date(klines[0][0]).toISOString()}`);
    console.log(`📅 Última vela: ${new Date(klines[klines.length - 1][0]).toISOString()}`);
  }

  async run() {
    try {
      const startTime = Date.now();

      const klines = await this.downloadYearData();
      this.verifyDataIntegrity(klines);
      await this.saveToCSV(klines);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n⏱️  Tiempo total: ${totalTime} segundos`);
      console.log('🎉 Proceso completado!\n');

    } catch (error) {
      console.error(`\n❌ Error fatal: ${error.message}`);
      process.exit(1);
    }
  }
}

// Ejecutar el downloader
// Puedes cambiar el símbolo y el intervalo aquí:
// Ejemplos:
// - new BinanceKlinesDownloader('BTCUSDT', '5m')
// - new BinanceKlinesDownloader('ETHUSDT', '1h')
// - new BinanceKlinesDownloader('BNBUSDT', '15m')

const downloader = new BinanceKlinesDownloader('BTCUSDT', '15m');
downloader.run();