import { FuturesSymbolExchangeInfo } from "binance"

type Status = "started" | "running" | "paused" | "executed" | "finished" | "error";

export interface BotState {
    id: string
    iteration: number
    description: string
    broker: string
    status: Status
    symbol: string
    symbol_info: FuturesSymbolExchangeInfo | undefined
    executed: boolean
    finished: boolean
    leverage: number
    stop_loss: number
    order_amount: number
    margin_type: string
    created_at: number
    updated_at: number
    rule_labels: string[],
    rule_values: boolean[]
}
