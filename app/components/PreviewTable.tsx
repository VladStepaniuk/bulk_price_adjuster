/**
 * Preview Table Component
 * Shows price changes before applying
 */

import {
  Card,
  DataTable,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Banner,
} from "@shopify/polaris";

export interface PreviewItem {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  oldPrice: number;
  newPrice: number;
  valid: boolean;
  errorMessage?: string;
}

interface PreviewTableProps {
  items: PreviewItem[];
}

export function PreviewTable({ items }: PreviewTableProps) {
  const rows = items.map((item) => [
    item.productTitle,
    item.variantTitle,
    `$${item.oldPrice.toFixed(2)}`,
    item.valid ? (
      `$${item.newPrice.toFixed(2)}`
    ) : (
      <InlineStack gap="200" blockAlign="center">
        <Text as="span" tone="critical">
          Error
        </Text>
        <Badge tone="critical">Invalid</Badge>
      </InlineStack>
    ),
    item.valid ? (
      <Badge tone="success">Valid</Badge>
    ) : (
      <Text as="span" tone="critical">
        {item.errorMessage || "Invalid price"}
      </Text>
    ),
  ]);

  const validCount = items.filter((i) => i.valid).length;
  const invalidCount = items.filter((i) => !i.valid).length;
  
  // Calculate if any price changes are > 50%
  const largeChanges = items.filter((i) => {
    if (!i.valid) return false;
    const percentChange = Math.abs(((i.newPrice - i.oldPrice) / i.oldPrice) * 100);
    return percentChange > 50;
  });

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Price Preview - {validCount} variant{validCount !== 1 ? 's' : ''} ready
          </Text>
          <InlineStack gap="200">
            <Badge tone="success">{`${validCount} valid`}</Badge>
            {invalidCount > 0 && (
              <Badge tone="critical">{`${invalidCount} invalid`}</Badge>
            )}
          </InlineStack>
        </InlineStack>

        {largeChanges.length > 0 && (
          <Banner tone="warning">
            ⚠️ {largeChanges.length} variant{largeChanges.length !== 1 ? 's have' : ' has'} price changes greater than 50%. Please review carefully.
          </Banner>
        )}

        <DataTable
          columnContentTypes={["text", "text", "numeric", "numeric", "text"]}
          headings={["Product", "Variant", "Current Price", "New Price", "Status"]}
          rows={rows}
        />

        {invalidCount > 0 && (
          <Text as="p" tone="critical">
            Some price changes are invalid and will be skipped when applying.
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
