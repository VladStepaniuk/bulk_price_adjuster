import type { ActionFunctionArgs } from "@remix-run/node";
import crypto from "crypto";
import db from "../db.server";

/**
 * Manually verify Shopify webhook HMAC before processing.
 * Returns 401 if invalid — required by Shopify App Store automated checks.
 * Deletes all shop data 48h after uninstall.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const secret = process.env.SHOPIFY_API_SECRET ?? "";

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const valid = crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader.padEnd(digest.length))
  );

  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { domain?: string };
  const shop = payload.domain;

  if (shop) {
    try {
      await db.adjustmentLog.deleteMany({ where: { campaign: { shop } } });
      await db.adjustmentCampaign.deleteMany({ where: { shop } });
      await db.session.deleteMany({ where: { shop } });
    } catch {
      // Still return 200 — Shopify will retry on 5xx
    }
  }

  return new Response(null, { status: 200 });
};
