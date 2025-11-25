import { Side } from "../types";

export function calculateTakeProfit(
    price: number,
    percentage: number,
    type: Side
): number {
    if (percentage < 0) {
        throw new Error("Percentage must be positive");
    }

    let takeProfit: number;

    if (type === "LONG") {
        takeProfit = price * (1 + percentage / 100);
    } else {
        takeProfit = price * (1 - percentage / 100);
    }

    return parseFloat(takeProfit.toFixed(2));
}
