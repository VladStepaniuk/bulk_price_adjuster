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
        destructive: true,
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
            You are about to update <strong>{variantCount} variant{variantCount !== 1 ? 's' : ''}</strong>.
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Estimated time: {estimatedTime}
          </Text>
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            This action cannot be undone. Are you sure?
          </Text>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
}
