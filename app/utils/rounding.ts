/**
 * Rounding utilities for price calculations
 */

export type RoundingType = "NONE" | "ROUND_99" | "ROUND_95";

/**
 * Apply rounding to a price
 */
export function applyRounding(price: number, rounding: RoundingType): number {
  switch (rounding) {
    case "ROUND_99":
      return Math.floor(price) + 0.99;
    case "ROUND_95":
      return Math.floor(price) + 0.95;
    case "NONE":
    default:
      return price;
  }
}

/**
 * Round price to 2 decimal places
 */
export function roundToTwoDecimals(price: number): number {
  return Number(price.toFixed(2));
}

/**
 * Validate price value
 */
export function isValidPrice(price: number): boolean {
  return price > 0 && Number.isFinite(price) && !Number.isNaN(price);
}
