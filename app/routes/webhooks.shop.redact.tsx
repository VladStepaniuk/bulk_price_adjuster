import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: Shop Data Redact
 * Shopify sends this 48 hours after a shop uninstalls the app.
 * We must delete all data associated with the shop.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  let shop: string;
  try {
    const result = await authenticate.webhook(request);
    shop = result.shop;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  try {
    // Delete all shop data in dependency order
    await db.adjustmentLog.deleteMany({
      where: {
        campaign: { shop },
      },
    });

    await db.adjustmentCampaign.deleteMany({ where: { shop } });

    await db.session.deleteMany({ where: { shop } });
  } catch {
    // Still return 200 — Shopify will retry on 5xx
  }

  return new Response(null, { status: 200 });
};
