/**
 * Apply Progress Component
 * Shows progress and results when applying price changes
 */

import { useState } from "react";
import {
  Card,
  BlockStack,
  Text,
  ProgressBar,
  Banner,
  List,
  InlineStack,
  Badge,
  Button,
  Divider,
} from "@shopify/polaris";

export interface ApplyResult {
  total: number;
  successCount: number;
  failureCount: number;
  failures: Array<{
    variantId: string;
    productTitle: string;
    variantTitle: string;
    error: string;
  }>;
  updates?: Array<{
    productTitle: string;
    variantTitle: string;
    oldPrice: number;
    newPrice: number;
  }>;
}

interface ApplyProgressProps {
  result: ApplyResult | null;
  isApplying: boolean;
  progress?: number;
}

function formatPrice(p: number) {
  return `$${p.toFixed(2)}`;
}

function exportFailuresAsCSV(failures: ApplyResult['failures']) {
  const headers = ['Product', 'Variant', 'Error'];
  const rows = failures.map(f => [f.productTitle, f.variantTitle, f.error]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `price-update-failures-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface PriceSummaryProps {
  updates: NonNullable<ApplyResult["updates"]>;
  showAll: boolean;
  onToggle: () => void;
}

function PriceChangeSummary({ updates, showAll, onToggle }: PriceSummaryProps) {
  const grouped: Record<string, typeof updates> = {};
  for (const u of updates) {
    if (!grouped[u.productTitle]) grouped[u.productTitle] = [];
    grouped[u.productTitle].push(u);
  }

  const productNames = Object.keys(grouped);
  const LIMIT = 5;
  const visible = showAll ? productNames : productNames.slice(0, LIMIT);
  const hiddenCount = productNames.length - LIMIT;

  return (
    <BlockStack gap="300">
      <Divider />
      <InlineStack align="space-between">
        <Text as="h3" variant="headingSm">
          Price Changes Summary
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {updates.length} variant{updates.length !== 1 ? "s" : ""} across{" "}
          {productNames.length} product{productNames.length !== 1 ? "s" : ""}
        </Text>
      </InlineStack>

      <BlockStack gap="200">
        {visible.map((productTitle) => {
          const variants = grouped[productTitle];
          const isDecrease = variants[0].newPrice < variants[0].oldPrice;
          return (
            <div
              key={productTitle}
              style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden" }}
            >
              <div
                style={{
                  background: "#f6f6f7",
                  padding: "8px 14px",
                  borderBottom: "1px solid #e1e3e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  {productTitle}
                </Text>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    background: isDecrease ? "#fce8e6" : "#e3f1df",
                    color: isDecrease ? "#c0392b" : "#1a7a1a",
                    borderRadius: "20px",
                    padding: "2px 8px",
                  }}
                >
                  {isDecrease ? "▼ Decreased" : "▲ Increased"}
                </span>
              </div>
              <div style={{ padding: "4px 0" }}>
                {variants.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 14px",
                      borderBottom: i < variants.length - 1 ? "1px solid #f1f2f3" : undefined,
                    }}
                  >
                    <Text as="span" variant="bodySm" tone="subdued">
                      {v.variantTitle === "Default Title" ? "" : v.variantTitle}
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ textDecoration: "line-through", color: "#8c9196", fontSize: "13px" }}>
                        {formatPrice(v.oldPrice)}
                      </span>
                      <span style={{ color: "#8c9196", fontSize: "12px" }}>→</span>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: v.newPrice < v.oldPrice ? "#c0392b" : "#1a7a1a" }}>
                        {formatPrice(v.newPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </BlockStack>

      {productNames.length > LIMIT && (
        <Button variant="plain" onClick={onToggle}>
          {showAll ? "Show less" : `Show ${hiddenCount} more product${hiddenCount !== 1 ? "s" : ""}...`}
        </Button>
      )}
    </BlockStack>
  );
}

export function ApplyProgress({
  result,
  isApplying,
  progress = 0,
}: ApplyProgressProps) {
  const [showAll, setShowAll] = useState(false);

  if (!isApplying && !result) {
    return null;
  }

  return (
    <Card>
      <BlockStack gap="400">
        {isApplying && (
          <>
            <Text as="h2" variant="headingMd">
              Applying Price Changes...
            </Text>
            <ProgressBar progress={progress} />
            <Text as="p" tone="subdued">
              Please wait while we update prices. Do not close this page.
            </Text>
          </>
        )}

        {result && !isApplying && (
          <>
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Apply Complete
              </Text>
              <InlineStack gap="200">
                <Badge tone="success">{`${result.successCount} updated`}</Badge>
                {result.failureCount > 0 && (
                  <Badge tone="critical">{`${result.failureCount} failed`}</Badge>
                )}
              </InlineStack>
            </InlineStack>

            {result.failureCount === 0 ? (
              <BlockStack gap="400">
                <Banner tone="success">
                  <p>All price changes were applied successfully!</p>
                </Banner>
                {result.updates && result.updates.length > 0 && (
                  <PriceChangeSummary
                    updates={result.updates}
                    showAll={showAll}
                    onToggle={() => setShowAll((v) => !v)}
                  />
                )}
              </BlockStack>
            ) : (
              <>
                <Banner tone="warning">
                  <p>
                    {result.successCount} of {result.total} prices were updated.{" "}
                    {result.failureCount} failed.
                  </p>
                </Banner>

                {result.failures.length > 0 && (
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Failed Updates:
                      </Text>
                      <Button 
                        size="slim" 
                        onClick={() => exportFailuresAsCSV(result.failures)}
                      >
                        Export as CSV
                      </Button>
                    </InlineStack>
                    <List type="bullet">
                      {result.failures.slice(0, 10).map((failure, index) => (
                        <List.Item key={index}>
                          {failure.productTitle} - {failure.variantTitle}:{" "}
                          {failure.error}
                        </List.Item>
                      ))}
                      {result.failures.length > 10 && (
                        <List.Item>
                          ...and {result.failures.length - 10} more (download CSV for full list)
                        </List.Item>
                      )}
                    </List>
                  </BlockStack>
                )}
              </>
            )}
          </>
        )}
      </BlockStack>
    </Card>
  );
}
