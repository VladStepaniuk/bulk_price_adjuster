/**
 * Billing API endpoint
 * Uses Shopify Remix SDK billing.request() which throws a redirect Response.
 * We catch it, extract the Location header, and return it as JSON.
 * The client then does window.open(confirmationUrl, '_top') to complete billing.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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

  try {
    // billing.request() throws a redirect Response — never returns normally
    await billing.request({
      plan: planName,
      isTest: process.env.SHOPIFY_BILLING_TEST === "true",
      returnUrl,
    });
    return json({ error: "No redirect from billing" }, { status: 500 });
  } catch (thrown: unknown) {
    // The SDK throws a Response redirect — extract the Location URL
    if (thrown instanceof Response) {
      const location = thrown.headers.get("Location");
      if (location) {
        return json({ confirmationUrl: location });
      }
      // Pass through any other redirect response
      return thrown;
    }
    const message = thrown instanceof Error ? thrown.message : "Billing failed";
    return json({ error: message }, { status: 400 });
  }
};
