/**
 * Billing API endpoint
 * Uses Shopify Managed Pricing — redirects merchant to Shopify's hosted plan selection page.
 * Plan handles must match what was set up in Partner Dashboard Managed Pricing:
 *   standard  → $12/mo
 *   premium   → $25/mo
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const PLAN_HANDLES: Record<string, string> = {
  BASIC: "standard",
  PREMIUM: "premium",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const planKey = (url.searchParams.get("plan") as "BASIC" | "PREMIUM") || "BASIC";
  const planHandle = PLAN_HANDLES[planKey] ?? "standard";

  const shop = session.shop;
  const shopName = shop.replace(".myshopify.com", "");
  const clientId = process.env.SHOPIFY_API_KEY!;
  const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/${clientId}?from_billing=1`;

  try {
    // Shopify Managed Pricing: request a subscription via the billing API
    // using the plan handle defined in Partner Dashboard.
    const billingResponse = await billing.request({
      plan: planHandle,
      isTest: process.env.SHOPIFY_BILLING_TEST === "true",
      returnUrl,
    });

    if (billingResponse?.confirmationUrl) {
      return json({ confirmationUrl: billingResponse.confirmationUrl, error: null });
    }

    return json({ error: "No confirmation URL returned", confirmationUrl: null }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing setup failed";
    return json({ error: message, confirmationUrl: null }, { status: 400 });
  }
};
