import { BacktestWsService } from "~/services/BacktestWsService"

export default defineNuxtPlugin(() => {
  const backtestWs = new BacktestWsService()

  return {
    provide: {
      backtestWs
    }
  }
})