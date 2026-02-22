import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useRevalidator } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const scheduled = await db.adjustmentCampaign.findMany({
    where: { 
      shop: session.shop,
      status: "scheduled"
    },
    orderBy: { scheduledAt: "asc" },
  });

  return json({ scheduled });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");
  const intent = formData.get("intent");

  if (intent === "cancel" && id) {
    const numId = parseInt(id as string);
    await db.adjustmentCampaign.update({
      where: { id: numId, shop: session.shop },
      data: { status: "canceled" },
    });
    // Cascade cancel any paired auto-revert campaign
    await db.adjustmentCampaign.updateMany({
      where: { linkedCampaignId: numId, shop: session.shop, status: "scheduled" },
      data: { status: "canceled" },
    });
    return json({ success: true });
  }

  return json({ success: false });
};

const Countdown = ({ target, onExpire }: { target: string; onExpire?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    let expired = false;
    const calculate = () => {
      const now = new Date().getTime();
      const end = new Date(target).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Starting shortly...");
        if (!expired) {
          expired = true;
          onExpire?.();
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours}h ${minutes}m ${seconds}s remaining`
      );
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [target, onExpire]);

  return <Text variant="bodyMd" fontWeight="bold" as="span">{timeLeft}</Text>;
};

export default function ScheduledPage() {
  const { scheduled } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const { revalidate } = useRevalidator();

  const handleExpire = useCallback(() => {
    let attempts = 0;
    const poll = () => {
      attempts++;
      revalidate();
      if (attempts < 12) setTimeout(poll, 5000);
    };
    setTimeout(poll, 5000);
  }, [revalidate]);

  const handleCancel = (id: number) => {
    if (confirm("Are you sure you want to cancel this scheduled update? Any paired auto-revert will also be cancelled.")) {
      submit({ id: id.toString(), intent: "cancel" }, { method: "post" });
    }
  };

  // Build pairs: main campaigns + their linked auto-reverts
  const autoReverts = scheduled.filter(c => c.type === "auto_revert");
  const mainCampaigns = scheduled.filter(c => c.type !== "auto_revert");

  // Pair each main with its auto-revert (if scheduled)
  type CampaignRow = typeof scheduled[0];
  const pairs: { main: CampaignRow; revert: CampaignRow | null }[] = mainCampaigns.map(main => ({
    main,
    revert: autoReverts.find(r => r.linkedCampaignId === main.id) ?? null,
  }));

  // Standalone auto-reverts (parent already ran, revert still pending)
  const pairedRevertIds = new Set(pairs.map(p => p.revert?.id).filter(Boolean));
  const standaloneReverts = autoReverts.filter(r => !pairedRevertIds.has(r.id));

  const nextMain = pairs[0]?.main ?? null;

  const formatLabel = (c: CampaignRow) =>
    `${c.strategy === "increase" ? "Increase" : "Decrease"} by ${c.value}${c.type === "percentage" ? "%" : " USD"}`;

  const filterScopeLabel = (c: CampaignRow) => {
    const ft = c.filterType;
    const fv = c.filterValue;
    if (!ft || ft === "all") return "All Products";
    if (ft === "collection") return "Collection based";
    if (ft === "vendor") return `Vendor: ${fv}`;
    if (ft === "productType") return `Product type: ${fv}`;
    if (ft === "tag") return `Tag: ${fv}`;
    return c.collectionId ? "Collection based" : "All Products";
  };

  const isCancelling = (id: number) =>
    navigation.state === "submitting" && navigation.formData?.get("id") === id.toString();

  return (
    <Page
      title="Scheduled Price Changes"
      subtitle="Price changes below are queued to run automatically. Each card shows the sale adjustment paired with its optional auto-revert. Cancel at any time before the scheduled time."
    >
      <Layout>
        {nextMain && nextMain.scheduledAt && (
          <Layout.Section>
            <Banner title="Next Scheduled Update" tone="info">
              <BlockStack gap="100">
                <Text as="p">
                  {formatLabel(nextMain)} — {filterScopeLabel(nextMain)}
                </Text>
                <Countdown target={nextMain.scheduledAt.toString()} onExpire={handleExpire} />
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {pairs.length === 0 && standaloneReverts.length === 0 ? (
            <Card>
              <div style={{ padding: "40px", textAlign: "center" }}>
                <Text variant="bodyMd" tone="subdued" as="p">No scheduled price changes</Text>
              </div>
            </Card>
          ) : (
            <BlockStack gap="400">
              {pairs.map(({ main, revert }) => (
                <Card key={main.id}>
                  <BlockStack gap="300">
                    {/* Main campaign row */}
                    <InlineStack align="space-between" blockAlign="start">
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {formatLabel(main)}
                          </Text>
                          <Badge tone="attention">Scheduled</Badge>
                        </InlineStack>
                        <Text variant="bodySm" tone="subdued" as="p">
                          {filterScopeLabel(main)}
                        </Text>
                        <Text variant="bodySm" tone="subdued" as="p">
                          Sale starts: {main.scheduledAt ? new Date(main.scheduledAt).toLocaleString() : "—"}
                        </Text>
                        {main.scheduledAt && (
                          <Box paddingBlockStart="100">
                            <Countdown target={main.scheduledAt.toString()} onExpire={handleExpire} />
                          </Box>
                        )}
                      </BlockStack>
                      <Button
                        tone="critical"
                        variant="secondary"
                        onClick={() => handleCancel(main.id)}
                        loading={isCancelling(main.id)}
                      >
                        Cancel{revert ? " sale & revert" : ""}
                      </Button>
                    </InlineStack>

                    {/* Paired auto-revert row */}
                    {revert && revert.scheduledAt && (
                      <>
                        <Divider />
                        <Box paddingInlineStart="400">
                          <InlineStack align="space-between" blockAlign="start">
                            <BlockStack gap="100">
                              <InlineStack gap="200" blockAlign="center">
                                <Text variant="bodySm" fontWeight="semibold" as="p">
                                  Auto-revert: prices restore after sale ends
                                </Text>
                                <Badge tone="info">Auto-revert</Badge>
                              </InlineStack>
                              <Text variant="bodySm" tone="subdued" as="p">
                                Prices revert: {new Date(revert.scheduledAt).toLocaleString()}
                              </Text>
                              <Box paddingBlockStart="100">
                                <Countdown target={revert.scheduledAt.toString()} onExpire={handleExpire} />
                              </Box>
                            </BlockStack>
                          </InlineStack>
                        </Box>
                      </>
                    )}
                  </BlockStack>
                </Card>
              ))}

              {standaloneReverts.map(revert => (
                <Card key={revert.id}>
                  <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                          {revert.title || "Auto-revert"}
                        </Text>
                        <Badge tone="info">Auto-revert</Badge>
                      </InlineStack>
                      <Text variant="bodySm" tone="subdued" as="p">
                        {filterScopeLabel(revert)}
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="p">
                        Prices revert: {revert.scheduledAt ? new Date(revert.scheduledAt).toLocaleString() : "—"}
                      </Text>
                      {revert.scheduledAt && (
                        <Box paddingBlockStart="100">
                          <Countdown target={revert.scheduledAt.toString()} onExpire={handleExpire} />
                        </Box>
                      )}
                    </BlockStack>
                    <Button
                      tone="critical"
                      variant="secondary"
                      onClick={() => handleCancel(revert.id)}
                      loading={isCancelling(revert.id)}
                    >
                      Cancel
                    </Button>
                  </InlineStack>
                </Card>
              ))}
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
