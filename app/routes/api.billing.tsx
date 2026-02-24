/**
 * Billing route — Managed Pricing flow.
 *
 * With Managed Pricing enabled, Shopify hosts the plan selection page.
 * We just redirect the merchant there. No Billing API call needed.
 *
 * Plan selection URL pattern:
 *   https://admin.shopify.com/store/:store_handle/charges/:app_handle/pricing_plans
 *
 * After the merchant selects a plan, Shopify redirects back to the app.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const APP_HANDLE = "bulk-price-editor-2";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopName = session.shop.replace(".myshopify.com", "");
  const planSelectionUrl = `https://admin.shopify.com/store/${shopName}/charges/${APP_HANDLE}/pricing_plans`;

  return redirect(planSelectionUrl);
};
