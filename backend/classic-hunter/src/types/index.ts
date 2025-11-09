export interface HunterState {
  status: 'started' | 'stopped' | 'error' | string
  iteration: number
  symbol: string
  validSymbols: string[]
  detectedSymbols: string[]
  updated_at: number
}