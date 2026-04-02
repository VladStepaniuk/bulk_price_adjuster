/**
 * Billing / Plans page for Bulk Price Editor
 * Requirement 1.2.3: Must allow upgrade AND downgrade in-app without reinstall
 */

import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, Badge, BlockStack, InlineStack, Divider, Banner, Modal, Box } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getActiveSubscription, cancelSubscription } from "../services/billing.server";
import { useState, useEffect } from "react";

const PLANS = [
  {
    key: "BASIC",
    name: "Standard Plan",
    amount: 12,
    description: "Perfect for small stores getting started with bulk pricing.",
    features: [
      "Bulk edit up to 1,000 products",
      "Schedule price changes",
      "Price history & revert",
      "Basic support",
    ],
  },
  {
    key: "PREMIUM",
    name: "Premium Plan",
    amount: 25,
    description: "For growing stores that need more power and flexibility.",
    features: [
      "Unlimited products",
      "Advanced scheduling",
      "Priority support",
      "CSV export",
      "All Standard features",
    ],
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { plan: currentPlan, id: subscriptionId } = await getActiveSubscription(admin);
  return json({ currentPlan, subscriptionId });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "cancel") {
    const subscriptionId = formData.get("subscriptionId") as string;
    if (!subscriptionId) return json({ error: "No subscription to cancel" }, { status: 400 });
    const result = await cancelSubscription(admin, subscriptionId);
    if (!result.success) return json({ error: result.error }, { status: 400 });
    return json({ ok: true, message: "Subscription cancelled. You are now on the free plan." });
  }

  if (intent === "upgrade" || intent === "downgrade") {
    const planKey = formData.get("plan") as string;
    const planDef = PLANS.find((p) => p.key === planKey);
    if (!planDef) return json({ error: "Invalid plan" }, { status: 400 });

    const isTest = process.env.SHOPIFY_BILLING_TEST === "true";
    const returnUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;

    const response = await admin.graphql(
      `#graphql
      mutation CreateSubscription(
        $name: String!
        $returnUrl: URL!
        $test: Boolean
        $trialDays: Int
        $lineItems: [AppSubscriptionLineItemInput!]!
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          trialDays: $trialDays
          lineItems: $lineItems
        ) {
          confirmationUrl
          userErrors { field message }
        }
      }`,
      {
        variables: {
          name: planDef.name,
          returnUrl,
          test: isTest,
          trialDays: 14,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: planDef.amount, currencyCode: "USD" },
                  interval: "EVERY_30_DAYS",
                },
              },
            },
          ],
        },
      }
    );

    const data = await response.json();
    const result = data?.data?.appSubscriptionCreate;
    if (result?.userErrors?.length > 0) return json({ error: result.userErrors[0].message }, { status: 400 });
    if (result?.confirmationUrl) return json({ confirmationUrl: result.confirmationUrl });
    return json({ error: "No confirmation URL returned" }, { status: 500 });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
};

export default function BillingPage() {
  const { currentPlan, subscriptionId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const navigate = useNavigate();
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; intent: string; plan: string; label: string }>({ open: false, intent: "", plan: "", label: "" });

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      window.top!.location.href = fetcher.data.confirmationUrl;
    }
    if (fetcher.data?.ok) {
      navigate(".", { replace: true });
    }
  }, [fetcher.data]);

  const planOrder: Record<string, number> = { null: 0, BASIC: 1, PREMIUM: 2 };
  const currentRank = planOrder[currentPlan ?? "null"] ?? 0;

  const handleAction = (intent: string, planKey: string, label: string) => {
    setConfirmModal({ open: true, intent, plan: planKey, label });
  };

  const confirmAction = () => {
    const fd = new FormData();
    fd.set("intent", confirmModal.intent);
    fd.set("plan", confirmModal.plan);
    if (confirmModal.intent === "cancel" && subscriptionId) fd.set("subscriptionId", subscriptionId);
    fetcher.submit(fd, { method: "POST" });
    setConfirmModal({ open: false, intent: "", plan: "", label: "" });
  };

  const isLoading = fetcher.state !== "idle";

  return (
    <Page
      title="Plans & Billing"
      backAction={{ content: "Back", onAction: () => navigate("/app") }}
    >
      <Layout>
        {fetcher.data?.error && (
          <Layout.Section>
            <Banner tone="critical">{fetcher.data.error}</Banner>
          </Layout.Section>
        )}
        {fetcher.data?.message && (
          <Layout.Section>
            <Banner tone="success">{fetcher.data.message}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Text as="p" tone="subdued">
            Upgrade or downgrade your plan at any time. Changes take effect immediately after confirmation.
          </Text>
        </Layout.Section>

        <Layout.Section>
          <InlineStack gap="400" align="start" blockAlign="stretch" wrap={false}>
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const planRank = planOrder[plan.key];
              const isUpgrade = planRank > currentRank;
              const isDowngrade = planRank < currentRank;

              return (
                <Box
                  key={plan.key}
                  borderWidth="025"
                  borderColor={isCurrent ? "border-success" : "border"}
                  borderRadius="300"
                  padding="500"
                  background={isCurrent ? "bg-surface-success" : "bg-surface"}
                  minWidth="280px"
                >
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">{plan.name}</Text>
                      {isCurrent && <Badge tone="success">Current plan</Badge>}
                    </InlineStack>

                    <Text as="p" variant="headingXl">${plan.amount}<Text as="span" variant="bodyMd" tone="subdued">/mo</Text></Text>

                    <Text as="p" tone="subdued">{plan.description}</Text>

                    <Divider />

                    <BlockStack gap="200">
                      {plan.features.map((f) => (
                        <InlineStack key={f} gap="200" blockAlign="center">
                          <Text as="span" tone="success">✓</Text>
                          <Text as="span">{f}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>

                    {!isCurrent && (
                      <Button
                        variant={isUpgrade ? "primary" : "secondary"}
                        tone={isDowngrade ? "critical" : undefined}
                        loading={isLoading}
                        onClick={() => handleAction(isUpgrade ? "upgrade" : "downgrade", plan.key, isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`)}
                        fullWidth
                      >
                        {isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
                      </Button>
                    )}

                    {isCurrent && currentPlan !== null && (
                      <Button
                        variant="plain"
                        tone="critical"
                        loading={isLoading}
                        onClick={() => handleAction("cancel", "", "Cancel subscription")}
                        fullWidth
                      >
                        Cancel subscription
                      </Button>
                    )}
                  </BlockStack>
                </Box>
              );
            })}
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Text as="p" tone="subdued" variant="bodySm">
            All plans include a 14-day free trial. Charges appear in your Shopify admin under Apps → Billing.
          </Text>
        </Layout.Section>
      </Layout>

      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, intent: "", plan: "", label: "" })}
        title="Confirm plan change"
        primaryAction={{ content: "Confirm", onAction: confirmAction, loading: isLoading, destructive: confirmModal.intent === "cancel" || confirmModal.intent === "downgrade" }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirmModal({ open: false, intent: "", plan: "", label: "" }) }]}
      >
        <Modal.Section>
          <Text as="p">
            {confirmModal.intent === "cancel"
              ? "Are you sure you want to cancel your subscription? You will lose access to paid features immediately."
              : confirmModal.intent === "downgrade"
              ? `Are you sure you want to downgrade to ${PLANS.find(p => p.key === confirmModal.plan)?.name}? Some features may no longer be available.`
              : `You will be redirected to Shopify to confirm your upgrade to ${PLANS.find(p => p.key === confirmModal.plan)?.name}.`}
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
