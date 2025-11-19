const fs = require('fs');

class MultiTimeframeBacktester {
  constructor(csv5m, csv15m) {
    this.data5m = [];
    this.data15m = [];
    this.csv5m = csv5m;
    this.csv15m = csv15m;
  }

  loadCSV(filename) {
    console.log(`📂 Cargando ${filename}...`);
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n').slice(1);
    
    const data = lines
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = line.split(',');
        return {
          timestamp: parseInt(parts[0]),
          open: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          close: parseFloat(parts[5]),
          volume: parseFloat(parts[6])
        };
      });

    console.log(`✅ Cargadas ${data.length.toLocaleString()} velas\n`);
    return data;
  }

  initialize() {
    console.log('🚀 Inicializando Multi-Timeframe Backtester\n');
    this.data5m = this.loadCSV(this.csv5m);
    this.data15m = this.loadCSV(this.csv15m);
    this.verifySynchronization();
  }

  verifySynchronization() {
    console.log('🔍 Verificando sincronización de timeframes...\n');
    
    const start5m = this.data5m[0].timestamp;
    const start15m = this.data15m[0].timestamp;
    const end5m = this.data5m[this.data5m.length - 1].timestamp;
    const end15m = this.data15m[this.data15m.length - 1].timestamp;

    console.log('📅 5m:  ', new Date(start5m).toISOString(), '→', new Date(end5m).toISOString());
    console.log('📅 15m: ', new Date(start15m).toISOString(), '→', new Date(end15m).toISOString());

    if (start5m <= start15m && end5m >= end15m) {
      console.log('✅ Datasets sincronizados correctamente\n');
    } else {
      console.log('⚠️  Advertencia: Los datasets no están completamente sincronizados\n');
    }
  }

  getWindow15m(endTimestamp, windowSize = 300) {
    let endIndex = -1;
    for (let i = this.data15m.length - 1; i >= 0; i--) {
      if (this.data15m[i].timestamp <= endTimestamp) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1 || endIndex < windowSize - 1) {
      return null;
    }

    const startIndex = endIndex - windowSize + 1;
    return this.data15m.slice(startIndex, endIndex + 1);
  }

  getWindow5m(endTimestamp, windowSize = 300) {
    let endIndex = -1;
    for (let i = this.data5m.length - 1; i >= 0; i--) {
      if (this.data5m[i].timestamp <= endTimestamp) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1 || endIndex < windowSize - 1) {
      return null;
    }

    const startIndex = endIndex - windowSize + 1;
    return this.data5m.slice(startIndex, endIndex + 1);
  }

  indicator1(candles15m) {
    if (!candles15m || candles15m.length !== 300) return null;
    
    console.log(`📊 Indicador 1 (15m): Analizando ${candles15m.length} velas`);
    const lastCandle = candles15m[candles15m.length - 1];
    console.log(`   └─ Close: $${lastCandle.close}`);
    
    const result = Math.floor(lastCandle.close) % 2 === 0;
    console.log(`   └─ Resultado: ${result ? '✅ TRUE' : '❌ FALSE'}\n`);
    return result;
  }

  indicator2(candles15m) {
    if (!candles15m || candles15m.length !== 300) return null;
    
    console.log(`📈 Indicador 2 (15m): Analizando ${candles15m.length} velas`);
    const lastCandle = candles15m[candles15m.length - 1];
    console.log(`   └─ Volume: ${lastCandle.volume.toFixed(2)}`);
    
    const lastDigit = Math.floor(lastCandle.volume) % 10;
    const result = lastDigit > 5;
    
    console.log(`   └─ Último dígito: ${lastDigit}`);
    console.log(`   └─ Resultado: ${result ? '✅ TRUE' : '❌ FALSE'}\n`);
    return result;
  }

  indicator3(candles15m) {
    if (!candles15m || candles15m.length !== 300) return null;
    
    console.log(`🎯 Indicador 3 (15m): Analizando ${candles15m.length} velas`);
    const lastCandle = candles15m[candles15m.length - 1];
    console.log(`   └─ High: $${lastCandle.high} | Low: $${lastCandle.low}`);
    
    const range = lastCandle.high - lastCandle.low;
    const result = range > 100;
    
    console.log(`   └─ Rango: $${range.toFixed(2)}`);
    console.log(`   └─ Resultado: ${result ? '✅ TRUE' : '❌ FALSE'}\n`);
    return result;
  }

  indicator4(candles5m) {
    if (!candles5m || candles5m.length !== 300) return null;
    
    console.log(`⚡ Indicador 4 (5m): Analizando ${candles5m.length} velas`);
    const lastCandle = candles5m[candles5m.length - 1];
    console.log(`   └─ Open: $${lastCandle.open}`);
    
    const lastDigit = Math.floor(lastCandle.open) % 10;
    const result = lastDigit % 2 !== 0;
    
    console.log(`   └─ Último dígito: ${lastDigit} (${result ? 'Impar' : 'Par'})`);
    console.log(`   └─ Resultado: ${result ? '✅ TRUE' : '❌ FALSE'}\n`);
    return result;
  }

  runBacktest() {
    console.log('🎯 INICIANDO BACKTESTING\n' + '═'.repeat(60));

    const referenceData = this.data15m;
    const startIndex = 300;
    const endIndex = referenceData.length;

    console.log(`📊 Rango: ${new Date(referenceData[startIndex].timestamp).toISOString()} → ${new Date(referenceData[endIndex - 1].timestamp).toISOString()}`);
    console.log(`📊 Total a evaluar: ${(endIndex - startIndex).toLocaleString()}\n`);

    const debugMode = true;
    const debugLimit = 5;
    const actualEndIndex = debugMode ? Math.min(startIndex + debugLimit, endIndex) : endIndex;

    console.log(`⚠️  MODO DEBUG: Solo ${debugLimit} velas\n` + '═'.repeat(60) + '\n');

    let signals = [];
    let validSignals = 0;

    for (let i = startIndex; i < actualEndIndex; i++) {
      const currentCandle = referenceData[i];
      const timestamp = currentCandle.timestamp;

      console.log(`\n🔄 VELA #${i - startIndex + 1}`);
      console.log(`📅 ${new Date(timestamp).toISOString()} | Close: $${currentCandle.close}`);
      console.log('─'.repeat(60) + '\n');

      const window15m = this.getWindow15m(timestamp, 300);
      const window5m = this.getWindow5m(timestamp, 300);

      if (!window15m || !window5m) {
        console.log('⚠️  Datos insuficientes\n');
        continue;
      }

      const ind1 = this.indicator1(window15m);
      const ind2 = this.indicator2(window15m);
      const ind3 = this.indicator3(window15m);
      const ind4 = this.indicator4(window5m);

      if (ind1 === null || ind2 === null || ind3 === null || ind4 === null) continue;

      validSignals++;
      const longSignal = ind1 && ind2 && ind3 && ind4;

      console.log('═'.repeat(60));
      console.log(`📊 RESUMEN:`);
      console.log(`   Ind1 (15m): ${ind1 ? '✅' : '❌'} | Ind2 (15m): ${ind2 ? '✅' : '❌'}`);
      console.log(`   Ind3 (15m): ${ind3 ? '✅' : '❌'} | Ind4 (5m):  ${ind4 ? '✅' : '❌'}`);
      console.log(`\n🎯 SEÑAL: ${longSignal ? '✅ LONG' : '❌ NADA'}`);
      console.log('═'.repeat(60));

      if (longSignal) {
        signals.push({
          timestamp,
          date: new Date(timestamp).toISOString(),
          price: currentCandle.close,
          ind1, ind2, ind3, ind4
        });
        console.log('🚀 SEÑAL GUARDADA\n');
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`📊 RESULTADOS: ${validSignals} evaluadas, ${signals.length} señales (${(signals.length / validSignals * 100).toFixed(2)}%)`);
    console.log('💡 Cambia debugMode = false para backtest completo');
    console.log('═'.repeat(60) + '\n');

    return signals;
  }

  exportSignals(signals, filename = 'signals.csv') {
    if (signals.length === 0) {
      console.log('⚠️  No hay señales para exportar\n');
      return;
    }
    const header = 'timestamp,date,price,ind1,ind2,ind3,ind4\n';
    const rows = signals.map(s => `${s.timestamp},${s.date},${s.price},${s.ind1},${s.ind2},${s.ind3},${s.ind4}`).join('\n');
    fs.writeFileSync(filename, header + rows, 'utf8');
    console.log(`✅ ${signals.length} señales → ${filename}\n`);
  }
}

const backtester = new MultiTimeframeBacktester('btcusdt_5m_1year.csv', 'btcusdt_15m_1year.csv');
backtester.initialize();
const signals = backtester.runBacktest();
backtester.exportSignals(signals);