import type { ActionFunctionArgs } from "@remix-run/node";
import crypto from "crypto";

/**
 * Manually verify Shopify webhook HMAC before processing.
 * Returns 401 if invalid — required by Shopify App Store automated checks.
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

  // This app stores no personal customer data. Nothing to redact.
  return new Response(null, { status: 200 });
};
