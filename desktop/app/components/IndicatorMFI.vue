<template>
  <div
    ref="container"
    id="mfi-ha-container"
    :style="{
      width: width + 'px',
      height: height + 'px',
      maxWidth: width + 'px',
      maxHeight: height + 'px',
    }"
  ></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  PriceScaleMode,
} from "lightweight-charts";

const props = defineProps({
  width: {
    type: Number,
    required: false,
    default: 800,
  },
  height: {
    type: Number,
    required: false,
    default: 200,
  },
  tabId: {
    type: String,
    required: true,
  },
  mfiLength: {
    type: Number,
    required: false,
    default: 14,
  },
  smaLength: {
    type: Number,
    required: false,
    default: 14,
  },
});

const useTabStore = createTabStore(props.tabId);
const tabStore = useTabStore();

const container = ref(null);

let indicator = null;
let haCandleSeries = null;
let smaSeries = null;
let level80Series = null;
let level50Series = null;
let level20Series = null;

onMounted(async () => {
  try {
    await nextTick();

    if (!container.value) {
      console.error("El contenedor no está disponible");
      return;
    }

    indicator = createChart(container.value, {
      layout: {
        background: { color: "transparent" },
        textColor: colors.text.primary,
      },
      rightPriceScale: {
        visible: true,
        minimumWidth: tabStore.defaultRightPriceWidth,
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        visible: true,
        handleScroll: false,
        handleScale: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        barSpacing: 10,
        rightOffset: 20,
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
    });

    watch(
      () => [props.width, props.height],
      ([w, h]) => {
        if (indicator) {
          indicator.applyOptions({ width: w, height: h });
        }
      }
    );

    watch(
      () => tabStore.logicalRange,
      (range) => {
        if (range) {
          indicator.timeScale().setVisibleLogicalRange({
            from: range.from,
            to: range.to,
          });
        }
      }
    );

    haCandleSeries = indicator.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "transparent",
      wickDownColor: "transparent",
    });

    watch(
      () => tabStore.crosshair,
      (value) => {
        if (!value || !value.time) {
          indicator.clearCrosshairPosition();
          return;
        }

        indicator.setCrosshairPosition(null, value.time, haCandleSeries);
      }
    );

    smaSeries = indicator.addSeries(LineSeries, {
      color: colors.yellow,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    level80Series = indicator.addSeries(LineSeries, {
      color: "#787B86",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    level50Series = indicator.addSeries(LineSeries, {
      color: "rgba(120, 123, 134, 0.5)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    level20Series = indicator.addSeries(LineSeries, {
      color: "#787B86",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    watch(
      () => tabStore.candle,
      (candle) => {
        if (tabStore.candles) {
          const allCandles = [...tabStore.candles.slice(0, -1), candle];

          const result = calculateMFIHeikinAshi(
            allCandles,
            props.mfiLength,
            props.smaLength
          );

          if (!result) return;

          const { haCandles, smaData } = result;

          haCandleSeries.setData(haCandles);
          smaSeries.setData(smaData);

          if (haCandles.length > 0) {
            const first = haCandles[0].time;
            const last = haCandles[haCandles.length - 1].time;

            level80Series.setData([
              { time: first, value: 80 },
              { time: last, value: 80 },
            ]);

            level50Series.setData([
              { time: first, value: 50 },
              { time: last, value: 50 },
            ]);

            level20Series.setData([
              { time: first, value: 20 },
              { time: last, value: 20 },
            ]);
          }
        }
      }
    );

    indicator.timeScale().fitContent();
  } catch (error) {
    console.error("Error al inicializar el gráfico MFI HA:", error);
  }
});

onBeforeUnmount(() => {
  if (indicator) {
    indicator.remove();
  }
});

function calculateMFI(candles, length) {
  if (!candles || candles.length < length + 1) return [];

  const mfi = new Array(candles.length);

  const typicalPrice = candles.map((c) => (c.high + c.low + c.close) / 3);

  const rawMoneyFlow = candles.map((c, i) => {
    const volume = c.volume || (c.high - c.low) * 1000;
    return typicalPrice[i] * volume;
  });

  for (let i = 0; i < candles.length; i++) {
    if (i < length) {

      mfi[i] = 50;
      continue;
    }

    let positiveFlow = 0;
    let negativeFlow = 0;


    for (let j = i - length + 1; j <= i; j++) {
      if (typicalPrice[j] > typicalPrice[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else if (typicalPrice[j] < typicalPrice[j - 1]) {
        negativeFlow += rawMoneyFlow[j];
      }
    }

    if (negativeFlow === 0) {
      mfi[i] = 100;
    } else if (positiveFlow === 0) {
      mfi[i] = 0;
    } else {
      const moneyFlowRatio = positiveFlow / negativeFlow;
      mfi[i] = 100 - 100 / (1 + moneyFlowRatio);
    }
  }

  return mfi;
}


function calculateSMA(data, length) {
  if (!data || data.length < length) return [];

  const sma = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {

      sma[i] = data[i];
    } else {
      let sum = 0;
      for (let j = 0; j < length; j++) {
        sum += data[i - j];
      }
      sma[i] = sum / length;
    }
  }

  return sma;
}

function calculateMFIHeikinAshi(candles, mfiLength, smaLength) {
  if (!candles || candles.length < Math.max(mfiLength, smaLength) + 1) {
    return null;
  }


  const mfi = calculateMFI(candles, mfiLength);

  const mfiSMA = calculateSMA(mfi, smaLength);

  const haCandles = [];
  let ha_open = null;
  let prev_ha_close = null;

  for (let i = 0; i < candles.length; i++) {
    const mf = mfi[i];
    let ha_close;


    if (ha_open === null) {
      ha_open = mf;
      ha_close = mf;
    } else {

      ha_close = (mf + ha_open) / 2;
    }

 
    const ha_high = Math.max(Math.max(ha_close, ha_open), mf);
    const ha_low = Math.min(Math.min(ha_close, ha_open), mf);

    haCandles.push({
      time: candles[i].time,
      open: Number(ha_open.toFixed(2)),
      high: Number(ha_high.toFixed(2)),
      low: Number(ha_low.toFixed(2)),
      close: Number(ha_close.toFixed(2)),
    });


    if (prev_ha_close === null) {
      ha_open = mf;
    } else {
      ha_open = (ha_open + prev_ha_close) / 2;
    }

    prev_ha_close = ha_close;
  }


  const smaData = mfiSMA.map((value, i) => ({
    time: candles[i].time,
    value: Number(value.toFixed(2)),
  }));

  return { haCandles, smaData };
}
</script>

<style scoped></style>
