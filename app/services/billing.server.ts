/**
 * Billing service - handles subscription management
 * Standard: $12/month · Premium: $25/month · 14-day trial
 * Uses Shopify Remix SDK billing (Managed Pricing)
 */

import { Session } from "@shopify/shopify-api";

/**
 * Check which subscription the shop has via GraphQL
 */
export async function getActiveSubscription(
  admin: any
): Promise<{ plan: "BASIC" | "PREMIUM" | null; id: string | null }> {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        appInstallation {
          activeSubscriptions {
            id
            name
            status
          }
        }
      }`
    );

    const data = await response.json();
    const subscriptions = data?.data?.appInstallation?.activeSubscriptions || [];

    const activeSub = subscriptions.find((sub: any) => sub.status === "ACTIVE");

    if (!activeSub) return { plan: null, id: null };

    // Match against plan names defined in shopify.server.ts
    const name = (activeSub.name ?? "").toLowerCase();
    if (name.includes("premium")) {
      return { plan: "PREMIUM", id: activeSub.id };
    }
    // "Standard" or any other active sub = BASIC
    return { plan: "BASIC", id: activeSub.id };
  } catch {
    return { plan: null, id: null };
  }
}

/**
 * Check if shop has any active subscription
 */
export async function hasActiveSubscription(
  admin: any,
  session: Session
): Promise<boolean> {
  const { plan } = await getActiveSubscription(admin);
  return plan !== null;
}

/**
 * Cancel subscription (for uninstall webhook)
 */
export async function cancelSubscription(
  admin: any,
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation AppSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription { id status }
          userErrors { field message }
        }
      }`,
      { variables: { id: subscriptionId } }
    );

    const data = await response.json();
    const result = data?.data?.appSubscriptionCancel;

    if (result?.userErrors?.length > 0) {
      return { success: false, error: result.userErrors[0].message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cancel failed",
    };
  }
}
