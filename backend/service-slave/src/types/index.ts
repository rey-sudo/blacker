import { FuturesSymbolExchangeInfo } from "binance"

export interface BotState {
    id: string
    iteration: number
    description: string
    status: 'started' | 'paused' | 'executed' | 'finished' | 'error'
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
