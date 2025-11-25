import { Candle, TimeValue } from "../../types/index.js";
interface MFIResponse {
    haCandles: Candle[];
    smaData: TimeValue[];
}
export declare function calculateMFI(allCandles: Candle[]): MFIResponse;
export {};
