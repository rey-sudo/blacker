/**
 * Calculates the exact stop-loss price for any asset (Forex, Crypto, Metals, Indices).
 * @param entryPrice - Current entry price of the asset.
 * @param stopPercent - Stop percentage in normal format (e.g. 4.1, 0.5, 7.25).
 * @param side - "buy" or "sell".
 * @returns The exact StopLoss price.
 */
export function calcStopLossPrice(entryPrice: number, stopPercent: number, side: "buy" | "sell") {
    if (entryPrice <= 0) {
        throw new Error("entryPrice must be greater than 0.");
    }

    // Allow 0% stop (it returns the same entry price)
    if (stopPercent < 0) {
        throw new Error("stopPercent cannot be negative.");
    }

    const stopP = stopPercent / 100;

    if (side === "buy") {
        // Stop-loss is placed below the entry price when buying
        return entryPrice * (1 - stopP);
    } else {
        // Stop-loss is placed above the entry price when selling
        return entryPrice * (1 + stopP);
    }
}
