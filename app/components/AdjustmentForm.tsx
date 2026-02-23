/**
 * Adjustment Form Component
 * Configure price adjustment settings
 */

import { useState } from "react";
import {
  Card,
  Select,
  TextField,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Checkbox,
  Banner,
  Box,
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
  revertAt?: string;
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
    useState<AdjustmentType>("PERCENT_DECREASE");
  const [value, setValue] = useState<string>("10");
  const [rounding, setRounding] = useState<RoundingType>("NONE");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [revertDate, setRevertDate] = useState("");

  const isPremium = currentPlan === "PREMIUM";

  const adjustmentTypeOptions = [
    { label: "Decrease by %", value: "PERCENT_DECREASE" },
    { label: "Increase by %", value: "PERCENT_INCREASE" },
    { label: "Decrease by fixed amount", value: "FIXED_DECREASE" },
    { label: "Increase by fixed amount", value: "FIXED_INCREASE" },
  ];

  const roundingOptions = [
    { label: "No rounding", value: "NONE" },
    { label: "Round to .99", value: "ROUND_99" },
    { label: "Round to .95", value: "ROUND_95" },
  ];

  const isPercent = adjustmentType.startsWith("PERCENT");
  const valueLabel = isPercent ? "%" : "$";

  const handlePreview = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
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
        <Text as="h2" variant="headingMd">
          Step 2 — Price Adjustment
        </Text>

        {/* Inline row: type + value + rounding */}
        <InlineStack gap="300" wrap blockAlign="end">
          <Box minWidth="220px">
            <Select
              label="Adjustment"
              options={adjustmentTypeOptions}
              value={adjustmentType}
              onChange={(val) => setAdjustmentType(val as AdjustmentType)}
              disabled={disabled || loading}
            />
          </Box>
          <Box minWidth="100px">
            <TextField
              label={`Amount (${valueLabel})`}
              type="number"
              value={value}
              onChange={setValue}
              disabled={disabled || loading}
              autoComplete="off"
              suffix={valueLabel}
            />
          </Box>
          <Box minWidth="160px">
            <Select
              label="Rounding"
              options={roundingOptions}
              value={rounding}
              onChange={(val) => setRounding(val as RoundingType)}
              disabled={disabled || loading}
            />
          </Box>
        </InlineStack>

        {/* Scheduling (Premium) */}
        <Box paddingBlockStart="100">
          <BlockStack gap="200">
            <Checkbox
              label={
                isPremium
                  ? "Schedule for later"
                  : "Schedule for later (Premium only)"
              }
              checked={isScheduled}
              onChange={(val) => setIsScheduled(val)}
              disabled={disabled || loading}
            />
            {isScheduled && (
              <BlockStack gap="200">
                {!isPremium && (
                  <Banner tone="info">
                    <p>
                      Scheduling is a <strong>Premium</strong> feature ($25/mo).
                    </p>
                  </Banner>
                )}
                <InlineStack gap="300" wrap blockAlign="end">
                  <Box minWidth="220px">
                    <TextField
                      label="Sale starts at"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={setScheduledDate}
                      disabled={disabled || loading || !isPremium}
                      autoComplete="off"
                    />
                  </Box>
                  <Box minWidth="220px">
                    <TextField
                      label="Auto-revert on (optional)"
                      type="datetime-local"
                      value={revertDate}
                      onChange={setRevertDate}
                      disabled={disabled || loading || !isPremium}
                      autoComplete="off"
                      helpText="Leave blank for a permanent change."
                    />
                  </Box>
                </InlineStack>
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
      </BlockStack>
    </Card>
  );
}
