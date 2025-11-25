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