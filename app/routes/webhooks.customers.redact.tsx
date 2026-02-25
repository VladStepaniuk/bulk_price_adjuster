import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * GDPR: Customer Data Redact
 * Shopify sends this 10 days after a customer requests deletion.
 * We store no personal customer data, so there is nothing to delete.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    await authenticate.webhook(request);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  // This app stores no personal customer data. Nothing to redact.

  return new Response(null, { status: 200 });
};
