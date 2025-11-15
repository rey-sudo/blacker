<template>
  <div>
    <div ref="chartContainer" class="chart-container"></div>
    <div ref="macdContainer" class="macd-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers
} from "lightweight-charts";

const chartContainer = ref(null);
const macdContainer = ref(null);

let candleChart = null;
let macdChart = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!chartContainer.value || !macdContainer.value) {
      console.error("Los contenedores no están disponibles");
      return;
    }

    // ------------------------------------
    // 1️⃣ Datos simulados OHLC
    // ------------------------------------
    const data = [];
    let price = 100;

    for (let i = 0; i < 200; i++) {
      const open = price;
      const high = open + Math.random() * 3;
      const low = open - Math.random() * 3;
      const close = low + Math.random() * (high - low);

      data.push({
        time: 1642427876 + i * 3600,
        open,
        high,
        low,
        close,
      });

      price = close;
    }

    // ------------------------------------
    // 2️⃣ Crear gráfico de velas
    // ------------------------------------
    candleChart = createChart(chartContainer.value, {
      layout: { background: { color: "white" }, textColor: "black" },
      rightPriceScale: { visible: true },
      timeScale: {
        visible: true,
        handleScroll: false,
        handleScale: false,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale: false,
      kineticScroll: false,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    const candleSeries = candleChart.addSeries(CandlestickSeries, {
      upColor: "#4caf50",
      borderUpColor: "#26a69a",
      wickUpColor: "#26a69a",
      downColor: "rgba(0,0,0,0)",
      borderDownColor: "#ef5350",
      wickDownColor: "#ef5350",
      borderVisible: true,
    });

    candleSeries.setData(data);

    const markers = [
      {
        time: data[data.length - 1].time,
        position: "aboveBar",
        color: "green",
        shape: "arrowUp",
        text: "BUY",
      },
    ];

    createSeriesMarkers(candleSeries, markers);
    // ------------------------------------
    // 3️⃣ Crear gráfico MACD (panel inferior)
    // ------------------------------------
    macdChart = createChart(macdContainer.value, {
      layout: { background: { color: "white" }, textColor: "black" },
      rightPriceScale: { visible: true },
      timeScale: { visible: true },
    });

    // ------------------------------------
    // 4️⃣ Funciones EMA y MACD
    // ------------------------------------
    function ema(values, period) {
      const k = 2 / (period + 1);
      let emaPrev = values[0] || 0;
      const result = [{ time: data[0].time, value: emaPrev }];

      for (let i = 1; i < values.length; i++) {
        emaPrev = values[i] * k + emaPrev * (1 - k);
        result.push({ time: data[i].time, value: emaPrev });
      }
      return result;
    }

    function calcMACD(data) {
      const closes = data.map((d) => d.close);

      const ema12 = ema(closes, 12);
      const ema26 = ema(closes, 26);

      const macd = ema12.map((e12, i) => ({
        time: data[i].time,
        value: e12.value - ema26[i].value,
      }));

      const signalRaw = ema(
        macd.map((m) => m.value),
        9
      );
      const signal = signalRaw.map((s, i) => ({
        time: data[i].time,
        value: s.value,
      }));

      const histogram = macd.map((m, i) => ({
        time: data[i].time,
        value: m.value - signal[i].value,
      }));

      const histogramFiltered = histogram.filter((d) => !isNaN(d.value));

      return { macd, signal, histogram: histogramFiltered };
    }

    const { macd, signal, histogram } = calcMACD(data);

    // ------------------------------------
    // 5️⃣ Crear series MACD
    // ------------------------------------
    const macdLine = macdChart.addSeries(LineSeries, {
      color: "blue",
      lineWidth: 2,
    });
    const signalLine = macdChart.addSeries(LineSeries, {
      color: "red",
      lineWidth: 2,
    });

    const histogramSeries = macdChart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
    });

    macdLine.setData(macd.filter((d) => !isNaN(d.value)));
    signalLine.setData(signal.filter((d) => !isNaN(d.value)));
    histogramSeries.setData(histogram);

    // ------------------------------------
    // 6️⃣ Sincronizar timeScale
    // ------------------------------------
    const syncTimeScale = (sourceChart, targetChart) => {
      sourceChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        targetChart.timeScale().setVisibleRange(range);
      });
    };

    syncTimeScale(candleChart, macdChart);
    syncTimeScale(macdChart, candleChart);

    candleChart.timeScale().fitContent();
    macdChart.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar los gráficos:", error);
  }
});

onBeforeUnmount(() => {
  if (candleChart) {
    candleChart.remove();
  }
  if (macdChart) {
    macdChart.remove();
  }
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  width: 1200px;
  height: 500px;
}

.macd-container {
  width: 100%;
  height: 200px;
  margin-top: 10px;
}
</style>
