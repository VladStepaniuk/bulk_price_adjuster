import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  let payload: Record<string, unknown>;
  let session: { id: string; scope?: string } | undefined;
  try {
    const result = await authenticate.webhook(request);
    payload = result.payload as Record<string, unknown>;
    session = result.session as { id: string; scope?: string } | undefined;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const current = payload.current as string[];
  if (session) {
    await db.session.update({
      where: { id: session.id },
      data: { scope: current.toString() },
    });
  }
  return new Response();
};
