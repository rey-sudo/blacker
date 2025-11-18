import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMarketStore = defineStore('market', () => {
  const data = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCandles = async (
    symbol: string,
    source: string,
    interval: string,
    exchange: string
  ) => {
    loading.value = true
    error.value = null

    try {
      const res = await $fetch('/api/market/get-candles', {
        method: 'GET',
        params: { symbol, source, interval, exchange }
      })
      data.value = res

      return res
    } catch (err: any) {
      error.value = err?.message || 'Error desconocido'
      data.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    fetchCandles
  }
})
