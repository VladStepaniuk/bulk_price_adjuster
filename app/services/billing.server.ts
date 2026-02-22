/**
 * Billing service - handles subscription management
 * £12/month with 14-day trial
 * Blocks apply action only, not preview
 */

import { BillingInterval, shopifyApp } from "@shopify/shopify-app-remix/server";
import { Session } from "@shopify/shopify-api";

const PLAN_BASIC = "Standard Plan";
const PLAN_PREMIUM = "Premium Plan";

export const BILLING_PLANS = {
  BASIC: {
    name: PLAN_BASIC,
    amount: 12.00,
    interval: BillingInterval.Every30Days,
    trialDays: 14,
  },
  PREMIUM: {
    name: PLAN_PREMIUM,
    amount: 25.00,
    interval: BillingInterval.Every30Days,
    trialDays: 14,
  }
};

/**
 * Check which subscription the shop has
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

    if (activeSub.name === PLAN_PREMIUM) {
      return { plan: "PREMIUM", id: activeSub.id };
    }
    
    return { plan: "BASIC", id: activeSub.id };
  } catch (error) {
    console.error("Error checking subscription:", error);
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
 * Create billing subscription
 */
export async function createBillingSubscription(
  admin: any,
  session: Session,
  returnUrl: string,
  planType: "BASIC" | "PREMIUM" = "BASIC"
): Promise<{ confirmationUrl?: string; error?: string }> {
  try {
    const plan = BILLING_PLANS[planType];
    const response = await admin.graphql(
      `#graphql
      mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $trialDays: Int, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          trialDays: $trialDays
          lineItems: $lineItems
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          name: plan.name,
          returnUrl,
          test: true, // Set to false for production
          trialDays: plan.trialDays,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: plan.amount, currencyCode: "USD" },
                  interval: plan.interval,
                },
              },
            },
          ],
        },
      }
    );

    const data = await response.json();
    const result = data?.data?.appSubscriptionCreate;

    if (result?.userErrors && result.userErrors.length > 0) {
      return { error: result.userErrors[0].message };
    }

    return { confirmationUrl: result?.confirmationUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Billing setup failed",
    };
  }
}

/**
 * Cancel subscription (for uninstall)
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
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: { id: subscriptionId },
      }
    );

    const data = await response.json();
    const result = data?.data?.appSubscriptionCancel;

    if (result?.userErrors && result.userErrors.length > 0) {
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
