// footprint-bookheatmap-resilient.js
const WebSocket = require('./node_modules/ws');

// -------------------------
// CONFIG
// -------------------------
const API_TOKEN = 'xx'; // Reemplaza con tu token real
const SYMBOL = 'BTCUSDT$ba';           // Símbolo Free plan Crypto
const ITICK_WS_URL = 'wss://api.itick.org/crypto';

// -------------------------
// Estado de datos
// -------------------------
let footprintData = {}; // { precio: volumen }
let depthData = { bids: [], asks: [] }; // depth si llega

// -------------------------
// Conectar WebSocket
// -------------------------
const ws = new WebSocket(ITICK_WS_URL, { headers: { token: API_TOKEN } });

ws.on('open', () => {
  console.log('Conectado al WebSocket Crypto de iTick');

  // Suscribirse a tick, depth y quote (resiliente)
  ws.send(JSON.stringify({
    ac: 'subscribe',
    params: SYMBOL,
    types: 'tick,depth,quote'
  }));
});

// -------------------------
// Manejo de mensajes
// -------------------------
ws.on('message', (msg) => {
  try {
    const data = JSON.parse(msg.toString());

    // Autenticación / Suscripción
    if (data.resAc === 'auth') {
      console.log(data.code === 1 ? 'Autenticado correctamente' : 'Error de autenticación', data.msg);
      if (data.code !== 1) ws.close();
    } else if (data.resAc === 'subscribe') {
      console.log('Suscripción:', data.msg);
    }

    // Tick
    else if (data.data && data.data.type === 'tick') {
      const price = data.data.ld;
      const volume = data.data.v;
      footprintData[price] = (footprintData[price] || 0) + volume;
      console.log(`[TICK] ${SYMBOL} precio:${price} vol:${volume}`);
    }

    // Depth
    else if (data.data && data.data.type === 'depth') {
      depthData = {
        bids: data.data.b || [],
        asks: data.data.a || []
      };
    }

    // Quote
    else if (data.data && data.data.type === 'quote') {
      // Opcional: log de quote
      // console.log(`[QUOTE] ${SYMBOL} o:${data.data.o} h:${data.data.h} l:${data.data.l} ld:${data.data.ld} vol:${data.data.v}`);
    }

    // Pong
    else if (data.resAc === 'pong') {
      // mantener vivo
    }

  } catch (err) {
    console.error('Error parseando mensaje:', err, msg);
  }
});

// -------------------------
// Footprint + Heatmap simple cada 10s
// -------------------------
setInterval(() => {
  if (Object.keys(footprintData).length === 0 && depthData.bids.length === 0 && depthData.asks.length === 0) return;

  console.log('\n--- FOOTPRINT / HEATMAP (10s) ---');

  // 1️⃣ Footprint: ticks acumulados
  Object.keys(footprintData).sort((a,b)=>b-a).forEach(price => {
    const vol = footprintData[price];
    const bars = '#'.repeat(Math.min(50, Math.round(vol * 50)));
    console.log(`[FOOTPRINT] Precio: ${price} | Vol: ${vol} | ${bars}`);
  });

  // 2️⃣ Heatmap: depth si llega, si no usa footprint
  if (depthData.bids.length > 0 || depthData.asks.length > 0) {
    console.log('--- HEATMAP Depth ---');
    console.log('  ASKS:', depthData.asks.map(a => `p:${a.p} v:${a.v}`).join(' | '));
    console.log('  BIDS:', depthData.bids.map(b => `p:${b.p} v:${b.v}`).join(' | '));
  } else {
    console.log('--- HEATMAP Depth no disponible, simulando con ticks ---');
  }

  // Reset footprint
  footprintData = {};

}, 10000);

// -------------------------
// Mantener vivo con ping cada 30s
// -------------------------
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ac: 'ping', params: Date.now() }));
  }
}, 30000);

// -------------------------
// Manejo de errores y cierre
// -------------------------
ws.on('error', (err) => console.error('WebSocket error:', err));
ws.on('close', () => console.log('WebSocket cerrado'));
