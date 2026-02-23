/**
 * Billing API endpoint — uses raw AppSubscriptionCreate GraphQL mutation.
 * 
 * Shopify Managed Pricing is enabled in Partner Dashboard with handles:
 *   standard → $12/mo  (14-day trial)
 *   premium  → $25/mo  (14-day trial)
 * 
 * The SDK's billing.request() also calls AppSubscriptionCreate but wraps it
 * in its own plan-name lookup which fails when Managed Pricing is active.
 * We call the mutation directly with the plan handle instead.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const PLAN_HANDLES: Record<string, string> = {
  BASIC: "standard",
  PREMIUM: "premium",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan") ?? "BASIC";
  const planHandle = PLAN_HANDLES[planKey] ?? "standard";
  const isTest = process.env.SHOPIFY_BILLING_TEST === "true";

  const shop = session.shop;
  const shopName = shop.replace(".myshopify.com", "");
  const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/bulk-price-editor-2`;

  try {
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
          appSubscription { id status }
          confirmationUrl
          userErrors { field message }
        }
      }`,
      {
        variables: {
          name: planHandle === "premium" ? "Premium" : "Standard",
          returnUrl,
          test: isTest,
          trialDays: 14,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: planHandle === "premium" ? 25.00 : 12.00,
                    currencyCode: "USD",
                  },
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

    if (result?.userErrors?.length > 0) {
      return json({ error: result.userErrors[0].message }, { status: 400 });
    }

    if (result?.confirmationUrl) {
      return json({ confirmationUrl: result.confirmationUrl });
    }

    return json({ error: "No confirmation URL returned" }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing failed";
    return json({ error: message }, { status: 400 });
  }
};
