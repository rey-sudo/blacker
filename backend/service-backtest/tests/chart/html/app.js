import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
} from "https://esm.sh/lightweight-charts";

let ws = null;

let worker_state = null;

function connectWebSocket() {
  ws = new WebSocket("ws://localhost:8765");

  ws.onopen = () => {
    console.log("WebSocket connected");
  };

  ws.onmessage = (event) => {
    //console.log("Message received:", event.data);
    worker_state = JSON.parse(event.data);
    console.log(worker_state);
    render();
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.warn("WebSocket disconnected");
    ws = null;
  };
}

const symbol = "BTCUSDT";

function addSymbol() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not connected");
    return;
  }

  const command = {
    context_id: "123",
    command: "Setup",
    params: `{\n  "symbol": "${symbol}"\n}`,
  };

  ws.send(JSON.stringify(command));
  console.log("Command sent:", command);
}

function addTimeframe() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not connected");
    return;
  }

  const command = {
    context_id: "123",
    command: "AddTimeframe",
    params: `{\n  "timeframe": "H1"\n}`,
  };

  ws.send(JSON.stringify(command));
  console.log("Command sent:", command);
}

function nextTimeframeCandle() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not connected");
    return;
  }

  const command = {
    context_id: "123",
    command: "NextTimeframeCandle",
    params: `{\n  "timeframe": "H1"\n}`,
  };

  ws.send(JSON.stringify(command));
  console.log("Command sent:", command);
}

function backTimeframeCandle() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not connected");
    return;
  }

  const command = {
    context_id: "123",
    command: "BackTimeframeCandle",
    params: `{\n  "timeframe": "H1"\n}`,
  };

  ws.send(JSON.stringify(command));
  console.log("Command sent:", command);
}

document.getElementById("addSymbol").addEventListener("click", addSymbol);
document.getElementById("addTimeframe").addEventListener("click", addTimeframe);

connectWebSocket();

//===========================================================================

function generateFakeOHLCV(
  length,
  {
    startPrice = 100,
    startDate = "2024-01-01",
    volatility = 0.02, // 2% por vela
    volumeBase = 1200,
  } = {},
) {
  const data = [];
  let lastClose = startPrice;
  let currentDate = new Date(startDate);

  for (let i = 0; i < length; i++) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const changePercent = Math.random() * volatility * direction;
    const close = lastClose * (1 + changePercent);

    const open = lastClose;
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

    const volume =
      volumeBase +
      Math.floor(Math.random() * volumeBase * 0.6) +
      (Math.random() > 0.9 ? volumeBase * 2 : 0);

    data.push({
      time: currentDate.toISOString().slice(0, 10), // YYYY-MM-DD
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(volume),
    });

    lastClose = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

const data = generateFakeOHLCV(1000);

const container = document.getElementById("chart");

const chart = createChart(container, {
  width: container.clientWidth,
  height: container.clientHeight,
  layout: {
    background: { color: "#0f1115" },
    textColor: "#d1d4dc",
  },
  grid: {
    vertLines: {
      color: "#1f2430",
      style: 1,
      visible: true,
    },
    horzLines: {
      color: "#1f2430",
      style: 1,
      visible: true,
    },
  },
  timeScale: {
    barSpacing: 6,
    timeVisible: true,
    minBarSpacing: 2,
    rightOffset: 20,
  },
});

const candles = chart.addSeries(CandlestickSeries, {
  priceScaleId: "right",
});

candles.setData(
  data.map((d) => ({
    time: d.time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  })),
);

chart.timeScale().fitContent();

chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (!range) return;

  //console.log(range);

  if (range.from < 10) {
    //loadMoreHistory();
  }
});

/* =========================
     REPLAY STATE
     ========================= */
let currentIndex = 0;
let isPlaying = false;
let playInterval = null;

let forwardInterval = null;
let backInterval = null;

let iterationSpeed = 400; // ms

let backTimeout = null;
let isSteppingBack = false;
let backDelay = 400;
const backMinDelay = 40;
const backAcceleration = 0.85;

let forwardTimeout = null;
let isSteppingForward = false;
let forwardDelay = 400; // inicio
const forwardMinDelay = 40; // límite rápido
const forwardAcceleration = 0.85;

candles.setData([]);

function render() {
  const result = worker_state.timeframes.H1.ohlcv_history.map((item) => ({
    ...item,
    time: item.timestamp / 1_000_000, // micro → seconds
  }));

  candles.setData(result);
  //chart.timeScale().fitContent();
}

/* =========================
     CONTROLS LOGIC
     ========================= */
function stepForward() {
  nextTimeframeCandle();
}

function stepBack() {
  backTimeframeCandle();
}

function play() {
  if (isPlaying) return;
  isPlaying = true;
  playPauseBtn.textContent = "⏸";

  playInterval = setInterval(() => {
    if (currentIndex >= data.length) {
      pause();
      return;
    }
    stepForward();
  }, iterationSpeed); // velocidad replay
}

function pause() {
  isPlaying = false;
  playPauseBtn.textContent = "▶️";
  clearInterval(playInterval);
}

function togglePlayPause() {
  isPlaying ? pause() : play();
}

function stopStepBack() {
  isSteppingBack = false;
  clearTimeout(backTimeout);
  backTimeout = null;
}

function startStepBack() {
  if (isSteppingBack) return;
  pause();
  stopStepForward();
  isSteppingBack = true;
  backDelay = 400; // reset cada vez

  function tick() {
    if (!isSteppingBack) return;

    stepBack();

    backDelay = Math.max(backMinDelay, backDelay * backAcceleration);

    backTimeout = setTimeout(tick, backDelay);
  }

  tick();
}

function stopStepForward() {
  isSteppingForward = false;
  clearTimeout(forwardTimeout);
  forwardTimeout = null;
}

function startStepForward() {
  if (isSteppingForward) return;

  stopStepBack(); // ⛔ no back + forward
  pause(); // ⛔ no play automático

  isSteppingForward = true;
  forwardDelay = 400; // reset cada vez

  function tick() {
    if (!isSteppingForward) return;

    if (currentIndex >= data.length) {
      stopStepForward();
      return;
    }

    stepForward();

    forwardDelay = Math.max(
      forwardMinDelay,
      forwardDelay * forwardAcceleration,
    );

    forwardTimeout = setTimeout(tick, forwardDelay);
  }

  tick();
}

const stepBackBtn = document.getElementById("stepBack");
const playPauseBtn = document.getElementById("playPause");
const stepForwardBtn = document.getElementById("stepForward");

playPauseBtn.addEventListener("click", togglePlayPause);

stepBackBtn.addEventListener("pointerdown", startStepBack);
stepBackBtn.addEventListener("pointerup", stopStepBack);
stepBackBtn.addEventListener("pointerleave", stopStepBack);

stepForwardBtn.addEventListener("pointerdown", startStepForward);
stepForwardBtn.addEventListener("pointerup", stopStepForward);
stepForwardBtn.addEventListener("pointerleave", stopStepForward);

const speedLabel = document.getElementById("speedLabel");
const speedRange = document.getElementById("speedRange");

speedRange.addEventListener("input", (e) => {
  iterationSpeed = Number(e.target.value);
  speedLabel.textContent = `${iterationSpeed} ms`;

  // si está reproduciendo, reiniciamos intervalos
  if (isPlaying) {
    pause();
    play();
  }

  if (isSteppingForward) {
    stopStepForward();
    startStepForward();
  }

  if (isSteppingBack) {
    stopStepBack();
    startStepBack();
  }
});

/* =========================
     RESIZE HANDLING
     ========================= */
window.addEventListener("resize", () => {
  chart.applyOptions({
    width: container.clientWidth,
    height: container.clientHeight,
  });
});

const test = () => {
  iterationSpeed = 0;
  togglePlayPause();
};
