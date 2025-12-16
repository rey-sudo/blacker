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

    const rsiData = calculateRSI(candles);
    const lastRsi = rsiData.at(-1)?.value;

    if (typeof lastRsi !== "number" || Number.isNaN(lastRsi)) {
      throw new Error("lastRsi type error");
    }

    logger.info(`RSI:${lastRsi}`);

    const rules = {
      0: lastRsi <= 33,
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
