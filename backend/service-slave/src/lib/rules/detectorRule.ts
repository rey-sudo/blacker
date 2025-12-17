import { calculateRSI, Candle, logger } from "@whiterockdev/common";
import { SlaveBot } from "../../index.js";

export async function detectorRule(
  this: SlaveBot,
  RULE: number,
  candles: Candle[]
): Promise<boolean> {
  try {
    const ruleValue = this.state.rule_values[RULE];

    if (ruleValue === true) return ruleValue;

    const { currentRsi } = calculateRSI(candles);

    logger.info(`RSI:${currentRsi.value}`);

    const rules = {
      0: currentRsi.value <= 33,
    };

    const result = Object.values(rules).every(Boolean);

    if (result === true) {
      this.state.rule_values[RULE] = result;
      
      await this.save();

      return result;
    }

    await this.sleep(300_000);

    return false;
  } catch (err: any) {
    return false;
  }
}
