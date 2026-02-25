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
    throw err;
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
