import { Candle } from "../../types/index.js";
export declare function calculateRSI(candles: Candle[], period?: number): {
    time: number;
    value: number;
}[];
