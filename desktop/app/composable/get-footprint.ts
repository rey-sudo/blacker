export const useFootprint = () => {
  const fetchError = ref<string | null>(null)

  const fetchFootprint = async (params: {
    symbol: string
    market: string
    interval: string
  }) => {
    try {
      fetchError.value = null

      const res: any = await $fetch('/api/market/get-footprint', {
        method: 'GET',
        query: {
          symbol: params.symbol,
          market: params.market,
          interval: params.interval
        }
      })

      return res.data
    } catch (err: any) {
      console.error('Error en fetchFootprint:', err)
      fetchError.value = err?.message || 'Error desconocido'
      throw err
    }
  }

  return {
    fetchFootprint,
    fetchError
  }
}
