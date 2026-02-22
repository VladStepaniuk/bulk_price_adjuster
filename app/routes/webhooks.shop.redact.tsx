import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: Shop Data Redact
 * Shopify sends this 48 hours after a shop uninstalls the app.
 * We must delete all data associated with the shop.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} — deleting all data for shop: ${shop}`);

  try {
    // Delete all shop data in dependency order
    await db.adjustmentLog.deleteMany({
      where: {
        campaign: { shop },
      },
    });

    await db.adjustmentCampaign.deleteMany({ where: { shop } });

    await db.session.deleteMany({ where: { shop } });

    console.log(`[GDPR] Shop redact complete for: ${shop}`);
  } catch (err) {
    console.error(`[GDPR] Shop redact failed for ${shop}:`, err);
    // Still return 200 — Shopify will retry on 5xx
  }

  return new Response(null, { status: 200 });
};
