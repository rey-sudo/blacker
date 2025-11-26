/**
 * Applies a discount to a price and returns the final price.
 * @param price - Original price of the item.
 * @param discount - Discount to apply in percentage (0 to 100).
 * @returns Price with the discount applied.
 */
export function applyDiscount(price: number, discount: number): number {
    if (discount < 0 || discount > 100) {
        throw new Error("Discount must be between 0 and 100");
    }
    const discountAmount = (price * discount) / 100;
    const finalPrice = price - discountAmount;
    return parseFloat(finalPrice.toFixed(2)); // rounds to 2 decimals
}


/**
 * Applies a percentage increase to a price and returns the final price.
 * @param price - Current price of the item.
 * @param percentage - Percentage to add (e.g., 10 for 10%).
 * @returns Price with the percentage added.
 */
export function addPercentage(price: number, percentage: number): number {
    if (percentage < 0) {
        throw new Error("Percentage must be 0 or greater");
    }
    const increaseAmount = (price * percentage) / 100;
    const finalPrice = price + increaseAmount;
    return parseFloat(finalPrice.toFixed(2)); // rounds to 2 decimals
}
