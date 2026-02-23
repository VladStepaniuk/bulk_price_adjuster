/**
 * Billing API endpoint
 * Uses Shopify Remix SDK billing.request() — throws a redirect to Shopify's confirmation page.
 * Plans are defined in shopify.server.ts billing config.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, PLAN_STANDARD, PLAN_PREMIUM } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan") ?? "BASIC";
  const planName = planKey === "PREMIUM" ? PLAN_PREMIUM : PLAN_STANDARD;

  const shop = session.shop;
  const shopName = shop.replace(".myshopify.com", "");
  const clientId = process.env.SHOPIFY_API_KEY!;
  const returnUrl = `https://admin.shopify.com/store/${shopName}/apps/${clientId}`;

  // billing.request() throws a redirect response to Shopify's billing confirmation page.
  // It never returns — the redirect is the response.
  return billing.request({
    plan: planName,
    isTest: process.env.SHOPIFY_BILLING_TEST === "true",
    returnUrl,
  });
};
