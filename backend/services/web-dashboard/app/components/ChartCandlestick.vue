<template>
  <div class="chart-container">
    <div id="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { createChart } from "@/packages/src/chart.js";
import { useBacktestingTabStore } from "~/stores/tabs";

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
  timeframe: {
    type: Object,
    required: true,
  },
});

const tabsStore = useTabsStore();
const tab: ComputedRef<Tab | undefined> = computed(() =>
  tabsStore.getTabById(props.tabId),
);
const tabStore = computed(() =>
  tab.value ? useBacktestingTabStore(tab.value as BacktestingTab) : undefined,
);

function generateCandles(
  count: number,
  {
    startPrice = 63332,
    startTs = Date.now(),
    intervalMs = 60_000,
    trend = 0.0001, // tendencia promedio por vela
    volatility = 0.002, // volatilidad
  } = {},
) {
  const candles = [];

  let lastClose = startPrice;

  for (let i = 0; i < count; i++) {
    const open = lastClose;

    // movimiento principal
    const randomMove = (Math.random() - 0.5) * volatility;
    const close = open * (1 + trend + randomMove);

    // mechas proporcionales al movimiento
    const bodySize = Math.abs(close - open);

    const high =
      Math.max(open, close) + bodySize * Math.random() + open * 0.0003;

    const low =
      Math.min(open, close) - bodySize * Math.random() - open * 0.0003;

    // volumen correlacionado con el movimiento
    const volume = 5 + bodySize * 0.5 + Math.random() * 10;

    const start_ts = startTs + i * intervalMs;

    candles.push({
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume: volume.toFixed(5),
      start_ts,
      end_ts: start_ts + intervalMs,
    });

    lastClose = close;
  }

  return candles;
}

function normalizeCandles(candles: any) {
  return candles.map((candle: any) => ({
    t: Math.floor(candle.start_ts / 1000), // timestamp en segundos
    o: Number(candle.open),
    h: Number(candle.high),
    l: Number(candle.low),
    c: Number(candle.close),
    v: Number(candle.volume),
  }));
}

function normalizeCandle(candle: any) {
  return {
    t: Math.floor(candle.start_ts / 1000), // timestamp en segundos
    o: Number(candle.open),
    h: Number(candle.high),
    l: Number(candle.low),
    c: Number(candle.close),
    v: Number(candle.volume),
  };
}

const fakeData = generateCandles(500, {
  startPrice: 63332,
  trend: 0.0002, // alcista
  volatility: 0.013,
});

let chart: any = null;

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
  }
});

onMounted(() => {
  chart = createChart(document.getElementById("chart-area"));

  chart.applyOptions({
    colors: {
      bg: getCssVariable("--chart-background"),
      bg2: getCssVariable("--chart-background"),
      bg3: getCssVariable("--chart-background"),
      bull: "rgb(8, 153, 129)",
      bear: "rgb(242, 54, 69)",
      grid: getCssVariable("--ui-border"),
    },
  });

  chart.setData(normalizeCandles(fakeData));

  chart.addSeries({
    id: "candlestick",
    label: "Candlesticks",
    layer: "background", // Se suele renderizar atrás de los indicadores como las MA

    params: {
      bullColor: { type: "color", label: "Bullish Color", value: "#00c87a" },
      bearColor: { type: "color", label: "Bearish Color", value: "#ff4060" },
      showBodyDetails: {
        type: "boolean",
        label: "Fancy Body fills",
        value: true,
      },
    },

    // Las velas no calculan un indicador nuevo, devuelven directamente el clon de la data OHLC
    compute(data: any[]): any[] {
      return data;
    },

    render(
      ctx: any,
      pane: any,
      engine: any,
      values: any[], // Mapeado a la estructura de datos OHLC
      priceMin: any,
      priceMax: any,
    ): void {
      // 1. Extraer configuraciones dinámicas de los params o usar defaults
      const bullCol = this.params?.bullColor?.value ?? "#00c87a";
      const bearCol = this.params?.bearColor?.value ?? "#ff4060";
      const fancyFill = this.params?.showBodyDetails?.value ?? true;

      // 2. Extraer propiedades de dibujo desde el motor (engine)
      // Nota: Adapté 'this.barWidth' a 'engine.barWidth' (común en estas librerías)
      const barWidth = engine.barWidth ?? 6;
      const bw = Math.max(1, barWidth - 1);
      const hw = Math.max(1, Math.floor(bw / 2));

      ctx.save();

      // 3. Bucle de renderizado optimizado para la vista actual
      for (
        let i = engine.viewStart;
        i < engine.viewEnd && i < engine.data.length;
        i++
      ) {
        const d = engine.data[i]; // Estructura OHLC: { o, h, l, c }
        if (!d) continue;

        // Conversión de coordenadas usando los métodos del engine
        const x = Math.round(engine._xOf(i));
        const yH = Math.round(engine._yOf(d.h, pane, priceMin, priceMax));
        const yL = Math.round(engine._yOf(d.l, pane, priceMin, priceMax));
        const yO = Math.round(engine._yOf(d.o, pane, priceMin, priceMax));
        const yC = Math.round(engine._yOf(d.c, pane, priceMin, priceMax));

        const bull = d.c >= d.o;
        const col = bull ? bullCol : bearCol;

        // --- Dibujo de las Mechas (Wicks) ---
        // +0.5 alinea el trazo de 1px exactamente al centro de los píxeles de la pantalla
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yH);
        ctx.lineTo(x + 0.5, yL);
        ctx.stroke();

        // --- Dibujo del Cuerpo (Body) ---
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(1, Math.abs(yC - yO));

        if (bw >= 2) {
          // Cuerpo sólido exterior
          ctx.fillStyle = col;
          ctx.fillRect(x - hw + 1, bodyTop, bw - 1, bodyH);

          // Efecto visual/relleno translúcido si hay suficiente espacio (Fancy Fill)
          if (fancyFill && bw >= 5 && bodyH > 2) {
            ctx.fillStyle = bull
              ? "rgba(0, 200, 122, 0.25)"
              : "rgba(255, 64, 96, 0.25)";
            ctx.fillRect(x - hw + 2, bodyTop + 1, bw - 3, bodyH - 2);
          }
        } else {
          // Si el zoom es muy lejano, dibuja el cuerpo como una línea vertical de 1px
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 0.5, bodyTop);
          ctx.lineTo(x + 0.5, bodyTop + bodyH);
          ctx.stroke();
        }
      }

      ctx.restore();
    },

    // No requiere lógica incremental compleja ya que el engine refresca la data OHLC nativamente
    updateIncremental(values: any[], data: any[], isNewBar: boolean): void {
      if (isNewBar) {
        values.push(data[data.length - 1]);
      } else {
        values[values.length - 1] = data[data.length - 1];
      }
    },

    // Fila del Tooltip para mostrar los valores OHLC en un formato legible
    tooltipRow(values: any[], i: number): any {
      const d = values[i];
      if (!d) return null;

      const bull = d.c >= d.o;
      const col = bull
        ? (this.params?.bullColor?.value ?? "#00c87a")
        : (this.params?.bearColor?.value ?? "#ff4060");

      return {
        label: "OHLC",
        value: `O:${d.o.toFixed(2)} H:${d.h.toFixed(2)} L:${d.l.toFixed(2)} C:${d.c.toFixed(2)}`,
        color: col,
      };
    },
  });

  chart.addSeries({
    id: "ma",
    label: "MA 20",
    color: "#ffb830",
    layer: "foreground",

    params: {
      period: {
        type: "number",
        label: "Period",
        value: 20,
        min: 2,
        max: 200,
        step: 1,
      },
      color: { type: "color", label: "Color", value: "#ffb830" },
      width: {
        type: "number",
        label: "Width",
        value: 1.3,
        min: 0.5,
        max: 4,
        step: 0.5,
      },
      style: {
        type: "select",
        label: "Style",
        value: "solid",
        options: ["solid", "dashed", "dotted"],
      },
    },

    compute(data: any[]): any[] {
      const period = 20;
      const out: any[] = new Array(data.length).fill(null);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i].c;
        if (i >= period) sum -= data[i - period].c;
        if (i >= period - 1) out[i] = sum / period;
      }
      return out;
    },

    render(
      ctx: any,
      pane: any,
      engine: any,
      values: any[],
      priceMin: any,
      priceMax: any,
      params: any,
    ): void {
      ctx.strokeStyle = "#ffb830";
      ctx.lineWidth = 1.3;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let started = false;
      for (
        let i = engine.viewStart;
        i < engine.viewEnd && i < engine.data.length;
        i++
      ) {
        if (values[i] === null) continue;
        const x = engine._xOf(i);
        const y = engine._yOf(values[i], pane, priceMin, priceMax);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },

    updateIncremental(values: any[], data: any[], isNewBar: boolean): void {
      const period = 20;
      const n = data.length - 1;
      if (isNewBar) values.push(null);
      if (n < period - 1) return;

      let sum = 0;
      for (let j = n - period + 1; j <= n; j++) sum += data[j].c;
      values[n] = sum / period;
    },

    tooltipRow(values: any[], i: number): any {
      if (values[i] === null) return null;
      return { label: "MA20", value: values[i].toFixed(2), color: "#ffb830" };
    },
  });

  chart._updateStatus();

  if (tabStore.value?.subscriber) {
    const unsubscribe = tabStore.value.subscriber((candle: any) => {
      const newCandle = normalizeCandle(candle);
      //console.log(newCandle);
      chart.update(newCandle);
    });
  }
});
</script>

<style lang="css" scoped>
.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
}
</style>
