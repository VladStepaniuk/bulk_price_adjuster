/**
 * Billing API endpoint
 * Creates subscription and returns confirmation URL
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createBillingSubscription } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const shop = session.shop;

  // Build the return URL pointing to the Shopify Admin so the app reloads
  // embedded (not standalone), avoiding the auth/login redirect loop.
  const shopName = shop.replace(".myshopify.com", "");
  const clientId = process.env.SHOPIFY_API_KEY!;
  const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/${clientId}?from_billing=1`;

  const planType = (url.searchParams.get("plan") as "BASIC" | "PREMIUM") || "BASIC";

  const result = await createBillingSubscription(admin, session, returnUrl, planType);

  if (result.error) {
    return json({ error: result.error, confirmationUrl: null }, { status: 400 });
  }

  if (result.confirmationUrl) {
    return json({ confirmationUrl: result.confirmationUrl, error: null });
  }

  return json({ error: "Failed to create subscription", confirmationUrl: null }, { status: 500 });
};
