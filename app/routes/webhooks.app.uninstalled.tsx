import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  let shop: string;
  let session: { id: string } | undefined;

  try {
    const result = await authenticate.webhook(request);
    shop = result.shop;
    session = result.session as { id: string } | undefined;
  } catch (err) {
    if (err instanceof Response) return err;
    // HMAC or parse failure — still return 200 to stop retries
    return new Response(null, { status: 200 });
  }

  try {
    // Clean up session data; safe to run even if already deleted
    await db.session.deleteMany({ where: { shop } });
  } catch {
    // DB error — don't let it cause a 500; Shopify would keep retrying
  }

  return new Response(null, { status: 200 });
};
