/**
 * Confirmation Modal Component
 * Shows before applying price changes
 */

import { Modal, TextContainer, Text } from "@shopify/polaris";

interface ConfirmationModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  variantCount: number;
  estimatedTime: string;
}

export function ConfirmationModal({
  open,
  onConfirm,
  onCancel,
  variantCount,
  estimatedTime,
}: ConfirmationModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Confirm Price Changes"
      primaryAction={{
        content: "Apply Changes",
        onAction: onConfirm,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onCancel,
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <Text as="p" variant="bodyMd">
            Prices will update for <strong>{variantCount} variant{variantCount !== 1 ? "s" : ""}</strong> in your store.
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Estimated time: {estimatedTime}
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            You can restore original prices from the <strong>History</strong> page at any time.
          </Text>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
}
