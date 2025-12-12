<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  price: {
    type: Number,
    required: true,
  },
});

const color = ref("none"); // "up" | "down" | "none"

watch(
  () => props.price,
  (newPrice, oldPrice) => {
    if (oldPrice == null) return;

    if (newPrice > oldPrice) color.value = "up";
    else if (newPrice < oldPrice) color.value = "down";

    setTimeout(() => (color.value = "none"), 250);
  }
);

</script>

<template>
  <span class="price-ticker" :class="color">
    {{ formatPrice(props.price) }}
  </span>
</template>

<style scoped>
.price-ticker {
  font-weight: 600;
  font-size: var(--font-size-4);
  transition: color 0.25s ease;
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
</style>
