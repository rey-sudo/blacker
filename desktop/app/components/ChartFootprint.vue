<template>
  <canvas ref="canvas" :width="width" :height="height" />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

// ======================
// Props
// ======================
const props = defineProps({
  width: { type: Number, default: 400 },
  height: { type: Number, default: 600 }
})

const canvas = ref(null)

// ======================
// Fake footprint data
// ======================
const candle = {
  open: 102,
  high: 110,
  low: 98,
  close: 108,
  footprint: [
    { price: 110, volume: 20 },
    { price: 109, volume: 35 },
    { price: 108, volume: 80 },
    { price: 107, volume: 120 },
    { price: 106, volume: 95 },
    { price: 105, volume: 60 },
    { price: 104, volume: 40 },
    { price: 103, volume: 25 },
    { price: 102, volume: 15 },
    { price: 101, volume: 10 },
    { price: 100, volume: 8 },
    { price: 99, volume: 5 },
    { price: 98, volume: 0 }
  ]
}

// ======================
// Draw function
// ======================
function draw() {
  const ctx = canvas.value.getContext('2d')
  ctx.clearRect(0, 0, props.width, props.height)

  const padding = 80
  const candleX = props.width / 2
  const candleWidth = 120
  const priceRange = candle.high - candle.low
  const candleHeight = props.height - padding * 2

  const priceToY = price =>
    padding + ((candle.high - price) / priceRange) * candleHeight

  // ======================
  // Wick
  // ======================
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(candleX, priceToY(candle.high))
  ctx.lineTo(candleX, priceToY(candle.low))
  ctx.stroke()

  // ======================
  // Body
  // ======================
  const bodyTop = priceToY(Math.max(candle.open, candle.close))
  const bodyBottom = priceToY(Math.min(candle.open, candle.close))

  ctx.fillStyle = candle.close > candle.open ? '#22c55e' : '#ef4444'
  ctx.fillRect(
    candleX - candleWidth / 2,
    bodyTop,
    candleWidth,
    bodyBottom - bodyTop
  )

  // ======================
  // Footprint horizontal volume bars
  // ======================
  const maxVolume = Math.max(...candle.footprint.map(f => f.volume))
  const barHeight = candleHeight / candle.footprint.length
  const barMaxWidth = candleWidth * 0.9

  candle.footprint.forEach(level => {
    const y = priceToY(level.price)
    const ratio = level.volume / maxVolume
    const barWidth = barMaxWidth * ratio

    // Background guide
    ctx.fillStyle = 'rgba(148,163,184,0.15)'
    ctx.fillRect(
      candleX - barMaxWidth / 2,
      y - barHeight / 2,
      barMaxWidth,
      barHeight
    )

    // Volume bar
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(
      candleX - barMaxWidth / 2,
      y - barHeight / 2,
      barWidth,
      barHeight
    )

    // Volume text
    ctx.fillStyle = '#f8fafc'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(
      level.volume,
      candleX + barMaxWidth / 2 - 4,
      y + 4
    )
  })

  // ======================
  // Price labels
  // ======================
  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px monospace'
  ctx.textAlign = 'right'

  ;[candle.high, candle.open, candle.close, candle.low].forEach(p => {
    ctx.fillText(p.toFixed(0), padding - 10, priceToY(p) + 4)
  })

  ctx.textAlign = 'center'
  ctx.fillText(
    'Vela Footprint – Horizontal Volume Bars (Fake Data)',
    props.width / 2,
    30
  )
}

onMounted(draw)
watch(() => [props.width, props.height], draw)
</script>

<style scoped>
canvas {
  background: #020617;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}
</style>
