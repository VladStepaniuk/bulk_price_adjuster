/**
 * Billing route — manual AppSubscriptionCreate via GraphQL.
 * Works on dev stores with test: true charges.
 * Returns { confirmationUrl } as JSON; client opens it in _top.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const PLANS = {
  BASIC: {
    name: "Standard Plan",
    amount: 12.0,
    currencyCode: "USD",
  },
  PREMIUM: {
    name: "Premium Plan",
    amount: 25.0,
    currencyCode: "USD",
  },
} as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const planKey = (url.searchParams.get("plan") as keyof typeof PLANS) ?? "BASIC";
  const plan = PLANS[planKey] ?? PLANS.BASIC;
  const isTest = process.env.SHOPIFY_BILLING_TEST === "true";

  // returnUrl must go back into the Shopify admin embedded context
  const returnUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;

  try {
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
          name: plan.name,
          returnUrl,
          test: isTest,
          trialDays: 14,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: plan.amount, currencyCode: plan.currencyCode },
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
