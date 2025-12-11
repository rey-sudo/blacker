<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  price: {
    type: Number,
    required: true
  }
})

const previous = ref(props.price)
const movement = ref('none') // up | down | none
const flash = ref(false)

watch(
  () => props.price,
  (newPrice, oldPrice) => {
    if (oldPrice == null) {
      previous.value = newPrice
      return
    }

    if (newPrice > oldPrice) movement.value = 'up'
    else if (newPrice < oldPrice) movement.value = 'down'
    else movement.value = 'none'

    flash.value = true
    setTimeout(() => (flash.value = false), 120)

    previous.value = newPrice
  }
)

const priceClass = computed(() => ({
  up: movement.value === 'up',
  down: movement.value === 'down',
  none: movement.value === 'none',
  flash: flash.value
}))

const arrow = computed(() => {
  if (movement.value === 'up') return '▲'
  if (movement.value === 'down') return '▼'
  return '•'
})
</script>

<template>
  <span class="price-ticker" :class="priceClass">
    <span class="arrow">{{ arrow }}</span>
    {{ props.price }}
  </span>
</template>

<style scoped>
.price-ticker {
  font-weight: 600;
  transition: color 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.price-ticker.up {
  color: var(--color-green, #00dc82);
}

.price-ticker.down {
  color: var(--color-red, #ff4d4f);
}

.price-ticker.none {
  color: var(--color-neutral-100, #ffffff);
}

.arrow {
  color: inherit;
}

</style>
