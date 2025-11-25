import { Candle, TimeValue } from "../../types/index.js";
export interface IndicatorOutput {
    adxData: TimeValue[];
    plusDIData: TimeValue[];
    minusDIData: TimeValue[];
    reversalPoints: TimeValue[];
}
export declare function calculateADX(allCandles: Candle[]): IndicatorOutput;
export declare function calculate(candles: Candle[], diLength: number, adxLength: number): {
    adxData: {
        time: number;
        value: number;
    }[];
    plusDIData: {
        time: number;
        value: number;
    }[];
    minusDIData: {
        time: number;
        value: number;
    }[];
    reversalPoints: {
        time: number;
        value: number;
    }[];
} | null;
