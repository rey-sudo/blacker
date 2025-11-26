import { calculateSqueeze, Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";

export async function R1_(
  this: Backtester,
  candles: Candle[]
): Promise<boolean> {
  const RULE = 1;

  if (!this.state.rule_values[RULE]) {
    const lastSqueeze = calculateSqueeze(candles).at(-1)?.color;

    if (!lastSqueeze) return !lastSqueeze;

    const rule1 = lastSqueeze === "green";

    this.state.rule_values[RULE] = rule1;
  }

  return this.state.rule_values[RULE];
}
