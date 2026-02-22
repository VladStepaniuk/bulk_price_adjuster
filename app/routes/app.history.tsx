import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Banner,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const campaigns = await db.adjustmentCampaign.findMany({
    where: { 
      shop: session.shop,
      status: { in: ["completed", "failed", "processing"] }
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { logs: true } }
    }
  });

  const failedCampaigns = campaigns.filter(c => c.status === "failed");

  return json({ campaigns, failedCampaigns });
};

export default function HistoryPage() {
  const { campaigns, failedCampaigns } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const revalidator = useRevalidator();
  const [revertingId, setRevertingId] = useState<number | null>(null);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await shopify.idToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) },
    });
  }, [shopify]);

  const handleRevert = useCallback(async (id: number) => {
    if (!confirm("This will restore all prices from this adjustment back to their previous values. Continue?")) return;
    setRevertingId(id);
    try {
      const res = await authFetch("/api/revert", {
        method: "POST",
        body: JSON.stringify({ campaignId: id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        shopify.toast.show(data.error || "Revert failed", { isError: true });
      } else {
        shopify.toast.show("Prices successfully reverted");
        revalidator.revalidate();
      }
    } catch (e) {
      shopify.toast.show("Revert failed — network error", { isError: true });
    } finally {
      setRevertingId(null);
    }
  }, [authFetch, shopify, revalidator]);

  // Most recent completed, non-reverted, non-revert-record campaign is eligible
  const revertableId = campaigns.find(
    c => c.status === "completed" && !c.revertedAt && !c.title?.startsWith("Revert") && c.type !== "auto_revert" && c._count.logs > 0
  )?.id;

  return (
    <Page
      title="Adjustment History"
      subtitle="A record of all completed price adjustments. The most recent completed adjustment (shown with a Revert button) can be rolled back to restore original prices."
    >
      <Layout>
        {failedCampaigns.length > 0 && (
          <Layout.Section>
            <Banner
              title={`${failedCampaigns.length} campaign${failedCampaigns.length > 1 ? "s" : ""} failed`}
              tone="critical"
            >
              <BlockStack gap="100">
                {failedCampaigns.map(c => (
                  <Text as="p" variant="bodySm" key={c.id}>
                    <strong>#{c.id} {c.title || "Price adjustment"}</strong>
                    {c.failureReason ? ` — ${c.failureReason}` : ""}
                  </Text>
                ))}
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card padding="0">
            <ResourceList
              resourceName={{ singular: "campaign", plural: "campaigns" }}
              items={campaigns}
              emptyState={
                <BlockStack gap="400" align="center">
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">No price changes yet</Text>
                  </div>
                </BlockStack>
              }
              renderItem={(item) => {
                const { id, createdAt, executedAt, type, value, strategy, status, _count, collectionId, filterType, filterValue, title, revertedAt, revertCampaignId } = item;
                const filterScopeLabel = () => {
                  if (!filterType || filterType === "all") return "All Products";
                  if (filterType === "collection") return "Collection based";
                  if (filterType === "vendor") return `Vendor: ${filterValue}`;
                  if (filterType === "productType") return `Product type: ${filterValue}`;
                  if (filterType === "tag") return `Tag: ${filterValue}`;
                  return collectionId ? "Collection based" : "All Products";
                };
                const date = new Date(executedAt || createdAt).toLocaleString("en-GB");
                const isRevertRecord = !!(title?.startsWith("Revert") || title?.startsWith("Auto-revert") || type === "auto_revert");
                const isReverted = !!revertedAt;
                const isRevertable = revertableId === id;
                const isThisReverting = revertingId === id;

                const displayTitle = isRevertRecord
                  ? title
                  : `${strategy === "increase" ? "Increase" : "Decrease"} by ${value}${type === "percentage" ? "%" : " USD"}`;

                return (
                  <ResourceItem
                    id={id.toString()}
                    url={`/app/history/${id}`}
                    accessibilityLabel={`View details for adjustment on ${date}`}
                  >
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                          {displayTitle}
                        </Text>
                        <InlineStack gap="200">
                          {isReverted && (
                            <Badge tone="warning">Reverted</Badge>
                          )}
                          {isRevertRecord && (
                            <Badge tone="info">Revert</Badge>
                          )}
                          <Badge tone={status === "completed" ? "success" : "attention"}>
                            {status}
                          </Badge>
                          {isRevertable && (
                            <Button
                              tone="critical"
                              variant="secondary"
                              size="slim"
                              loading={isThisReverting}
                              onClick={(e) => { e.stopPropagation(); handleRevert(id); }}
                            >
                              Revert
                            </Button>
                          )}
                        </InlineStack>
                      </InlineStack>
                      <InlineStack gap="400">
                        <Text variant="bodySm" as="p" tone="subdued">{date}</Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          {filterScopeLabel()}
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          {_count.logs} variants modified
                        </Text>
                        {isReverted && (
                          <Text variant="bodySm" as="p" tone="caution">
                            Reverted on {new Date(revertedAt).toLocaleString("en-GB")}
                          </Text>
                        )}
                      </InlineStack>
                    </BlockStack>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
