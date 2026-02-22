import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * GDPR: Customer Data Request
 * Shopify sends this when a customer requests their data.
 * We must respond within 30 days. We store no personal customer data —
 * only shop-level campaign records — so there is nothing customer-specific to export.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { } = await authenticate.webhook(request);

  // This app stores no personal customer data. Campaigns, logs, and sessions
  // are shop-level records only. No customer PII is collected or stored.

  return new Response(null, { status: 200 });
};
