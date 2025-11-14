<template>
  <div class="app-grid">
    <div class="chart">Chart Principal</div>

    <div class="indicators">
      <div class="indicator">Indicador 1</div>
      <div class="indicator">Indicador 2</div>
      <div class="indicator">Indicador 3</div>
      <div class="indicator">Indicador 4</div>
    </div>
  </div>
</template>

<script setup></script>

<style>
.app-grid {
  height: 90vh;
  display: grid;
  grid-template-rows: 3fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background-color: #1e1e1e;
  box-sizing: border-box;
}

.chart {
  background-color: #2c2c2c;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-size: 1.5rem;
}

.indicators {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1rem;
}

.indicator {
  background-color: #3a3a3a;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
</style>
