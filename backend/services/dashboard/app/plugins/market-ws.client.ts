import { MarketWsService } from "~/services/MarketWsService"

export default defineNuxtPlugin(() => {
  const marketWs = new MarketWsService()

  return {
    provide: {
      marketWs
    }
  }
})