import { calculateSqueeze, Candle } from "@whiterockdev/common";
import { Backtester } from "../index.js";

export async function R1_(
  this: Backtester,
  candles: Candle[]
): Promise<boolean> {
  if (!this.state.rule_values[1]) {
    const lastSqueeze = calculateSqueeze(candles).at(-1)?.color;

    if (!lastSqueeze) return !lastSqueeze;

    const rule1 = lastSqueeze === "green";

    this.state.rule_values[1] = rule1;

    return rule1;
  } else {
    return this.state.rule_values[1];
  }
}
