/**
 * Adjustment Form Component
 * Configure price adjustment settings
 */

import { useState } from "react";
import {
  Card,
  FormLayout,
  Select,
  TextField,
  BlockStack,
  Button,
  Text,
  Checkbox,
  Box,
  Banner,
} from "@shopify/polaris";

export type AdjustmentType =
  | "PERCENT_INCREASE"
  | "PERCENT_DECREASE"
  | "FIXED_INCREASE"
  | "FIXED_DECREASE";

export type RoundingType = "NONE" | "ROUND_99" | "ROUND_95";

export interface AdjustmentConfig {
  adjustmentType: AdjustmentType;
  value: number;
  rounding: RoundingType;
  scheduledAt?: string;
  revertAt?: string;    // Sale window end — auto-revert fires at this time
}

interface AdjustmentFormProps {
  onPreview: (config: AdjustmentConfig) => void;
  disabled?: boolean;
  loading?: boolean;
  currentPlan?: "BASIC" | "PREMIUM" | null;
}

export function AdjustmentForm({
  onPreview,
  disabled = false,
  loading = false,
  currentPlan = "BASIC",
}: AdjustmentFormProps) {
  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("PERCENT_INCREASE");
  const [value, setValue] = useState<string>("10");
  const [rounding, setRounding] = useState<RoundingType>("NONE");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [revertDate, setRevertDate] = useState("");

  const isPremium = currentPlan === "PREMIUM";

  const adjustmentTypeOptions = [
    { label: "Increase by %", value: "PERCENT_INCREASE" },
    { label: "Decrease by %", value: "PERCENT_DECREASE" },
    { label: "Increase by fixed amount", value: "FIXED_INCREASE" },
    { label: "Decrease by fixed amount", value: "FIXED_DECREASE" },
  ];

  const roundingOptions = [
    { label: "No rounding", value: "NONE" },
    { label: "Round to .99", value: "ROUND_99" },
    { label: "Round to .95", value: "ROUND_95" },
  ];

  const handlePreview = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return;
    }

    onPreview({
      adjustmentType,
      value: numValue,
      rounding,
      scheduledAt: isScheduled ? scheduledDate : undefined,
      revertAt: isScheduled && revertDate ? revertDate : undefined,
    });
  };

  const isValueValid = () => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 0;
  };

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Price Adjustment Settings
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Configure how prices should change. Click <strong>Preview Changes</strong> to see the results before anything is updated in your store.
          </Text>
        </BlockStack>
        <FormLayout>
          <Select
            label="Adjustment Type"
            options={adjustmentTypeOptions}
            value={adjustmentType}
            onChange={(val) => setAdjustmentType(val as AdjustmentType)}
            disabled={disabled || loading}
            helpText="Percentage adjustments scale with each product's current price. Fixed adjustments add or subtract a flat dollar amount."
          />

          <TextField
            label={
              adjustmentType.startsWith("PERCENT") ? "Percentage" : "Amount ($)"
            }
            type="number"
            value={value}
            onChange={setValue}
            disabled={disabled || loading}
            autoComplete="off"
            helpText={
              adjustmentType.startsWith("PERCENT")
                ? "Enter percentage (e.g., 10 for 10%)"
                : "Enter dollar amount (e.g., 5.00)"
            }
          />

          <Select
            label="Rounding"
            options={roundingOptions}
            value={rounding}
            onChange={(val) => setRounding(val as RoundingType)}
            disabled={disabled || loading}
            helpText="Optional: Round final prices to .99 or .95"
          />

          <Box paddingBlockStart="200">
            <BlockStack gap="200">
              <Checkbox
                label="Schedule for later (Premium)"
                checked={isScheduled}
                onChange={(val) => setIsScheduled(val)}
                disabled={disabled || loading}
              />
              {isScheduled && (
                <BlockStack gap="200">
                  {!isPremium && (
                    <Banner tone="info">
                      <p>Scheduling is a <strong>Premium</strong> feature. Please upgrade to use this.</p>
                    </Banner>
                  )}
                  <TextField
                    label="Sale starts at"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    disabled={disabled || loading || !isPremium}
                    autoComplete="off"
                    helpText="The price change will be applied automatically at this date and time."
                  />
                  <TextField
                    label="Revert prices back on (optional)"
                    type="datetime-local"
                    value={revertDate}
                    onChange={setRevertDate}
                    disabled={disabled || loading || !isPremium}
                    autoComplete="off"
                    helpText="Leave blank for a permanent price change. Set a date to auto-restore original prices."
                  />
                </BlockStack>
              )}
            </BlockStack>
          </Box>

          <Button
            variant="primary"
            onClick={handlePreview}
            disabled={disabled || loading || !isValueValid()}
            loading={loading}
          >
            Preview Changes
          </Button>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}
