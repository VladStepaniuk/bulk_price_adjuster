/**
 * Server-side price calculation engine
 * All price calculations MUST happen here - NO business logic in frontend
 */

export type AdjustmentType =
  | "PERCENT_INCREASE"
  | "PERCENT_DECREASE"
  | "FIXED_INCREASE"
  | "FIXED_DECREASE";

export type RoundingType = "NONE" | "ROUND_99" | "ROUND_95";

export interface PriceAdjustmentConfig {
  adjustmentType: AdjustmentType;
  value: number;
  rounding: RoundingType;
  scheduledAt?: string;
  revertAt?: string;       // Sale window end datetime
  setCompareAtPrice?: boolean;
}

export interface PriceCalculationResult {
  oldPrice: number;
  newPrice: number;
  valid: boolean;
  errorMessage?: string;
}

/**
 * Validates adjustment configuration
 */
export function validateAdjustmentConfig(
  config: PriceAdjustmentConfig
): { valid: boolean; error?: string } {
  if (config.value < 0) {
    return { valid: false, error: "Value cannot be negative" };
  }

  if (
    config.adjustmentType === "PERCENT_INCREASE" ||
    config.adjustmentType === "PERCENT_DECREASE"
  ) {
    if (config.value > 1000) {
      return { valid: false, error: "Percentage must not exceed 1000%" };
    }
  }

  if (
    config.adjustmentType === "FIXED_INCREASE" ||
    config.adjustmentType === "FIXED_DECREASE"
  ) {
    if (config.value > 10000) {
      return { valid: false, error: "Fixed amount must not exceed 10000" };
    }
  }

  return { valid: true };
}

/**
 * Calculate new price based on adjustment configuration
 * Returns result with validation status
 */
export function calculateNewPrice(
  oldPrice: number,
  config: PriceAdjustmentConfig
): PriceCalculationResult {
  try {
    // Validate config first
    const configValidation = validateAdjustmentConfig(config);
    if (!configValidation.valid) {
      return {
        oldPrice,
        newPrice: oldPrice,
        valid: false,
        errorMessage: configValidation.error,
      };
    }

    let newPrice: number;

    // Apply adjustment based on type
    switch (config.adjustmentType) {
      case "PERCENT_INCREASE":
        newPrice = oldPrice * (1 + config.value / 100);
        break;
      case "PERCENT_DECREASE":
        newPrice = oldPrice * (1 - config.value / 100);
        break;
      case "FIXED_INCREASE":
        newPrice = oldPrice + config.value;
        break;
      case "FIXED_DECREASE":
        newPrice = oldPrice - config.value;
        break;
      default:
        throw new Error(`Unknown adjustment type: ${config.adjustmentType}`);
    }

    // Apply rounding if specified
    if (config.rounding === "ROUND_99") {
      newPrice = Math.floor(newPrice) + 0.99;
    } else if (config.rounding === "ROUND_95") {
      newPrice = Math.floor(newPrice) + 0.95;
    }

    // Validate result price
    if (newPrice <= 0) {
      return {
        oldPrice,
        newPrice: oldPrice,
        valid: false,
        errorMessage: "Resulting price must be greater than 0",
      };
    }

    // Round to 2 decimal places
    newPrice = Number(newPrice.toFixed(2));

    return {
      oldPrice,
      newPrice,
      valid: true,
    };
  } catch (error) {
    return {
      oldPrice,
      newPrice: oldPrice,
      valid: false,
      errorMessage: error instanceof Error ? error.message : "Calculation error",
    };
  }
}

/**
 * Calculate prices for multiple variants
 */
export function calculateBulkPrices(
  variants: Array<{ id: string; price: number }>,
  config: PriceAdjustmentConfig
): Array<PriceCalculationResult & { variantId: string }> {
  return variants.map((variant) => ({
    variantId: variant.id,
    ...calculateNewPrice(variant.price, config),
  }));
}
