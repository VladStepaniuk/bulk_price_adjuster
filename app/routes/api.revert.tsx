import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { updateProductVariants } from "../services/product.server";
import { processInBatches } from "../utils/rateLimiter";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { campaignId } = await request.json();

  if (!campaignId) {
    return json({ error: "Missing campaignId" }, { status: 400 });
  }

  // Load the campaign and verify ownership
  const campaign = await db.adjustmentCampaign.findFirst({
    where: { id: campaignId, shop: session.shop, status: "completed" },
  });

  if (!campaign) {
    return json({ error: "Campaign not found or not eligible" }, { status: 404 });
  }

  if (campaign.revertedAt) {
    return json({ error: "This campaign has already been reverted" }, { status: 400 });
  }

  // Load logs
  const logs = await db.adjustmentLog.findMany({ where: { campaignId } });

  if (logs.length === 0) {
    return json({ error: "No log entries found for this campaign" }, { status: 400 });
  }

  // Check productId availability
  const logsWithProduct = logs.filter(l => l.productId && l.productId !== "");
  if (logsWithProduct.length === 0) {
    return json({ error: "This campaign is too old to revert (no product IDs stored)" }, { status: 400 });
  }

  // Group variants by productId — use `id` to match what updateProductVariants expects
  // If the original campaign had compareAtPrice enabled, clear it (null) during revert
  const clearCompareAt = campaign.compareAtPrice;
  const byProduct = new Map<string, { id: string; price: string; compareAtPrice?: string | null }[]>();
  for (const log of logsWithProduct) {
    if (!byProduct.has(log.productId)) byProduct.set(log.productId, []);
    byProduct.get(log.productId)!.push({
      id: log.variantId,
      price: log.oldPrice.toFixed(2),
      ...(clearCompareAt ? { compareAtPrice: null } : {}),
    });
  }

  const batches = Array.from(byProduct.entries()).map(([productId, variants]) => ({ productId, variants }));

  // Create a revert campaign record
  const revertCampaign = await db.adjustmentCampaign.create({
    data: {
      shop: session.shop,
      collectionId: campaign.collectionId,
      type: campaign.type,
      value: campaign.value,
      strategy: campaign.strategy === "increase" ? "decrease" : "increase",
      rounding: campaign.rounding,
      status: "processing",
      title: `Revert of #${campaignId}`,
    },
  });

  // Apply old prices back
  await processInBatches(
    batches,
    5,
    async (batch) => {
      const result = await updateProductVariants(admin.graphql, batch.productId, batch.variants);
      if (result.success) {
        const batchLogs = logsWithProduct.filter(l => l.productId === batch.productId);
        await db.adjustmentLog.createMany({
          data: batchLogs.map(l => ({
            campaignId: revertCampaign.id,
            variantId: l.variantId,
            productId: l.productId,
            productTitle: l.productTitle,
            variantTitle: l.variantTitle,
            oldPrice: l.newPrice,
            newPrice: l.oldPrice,
          })),
        });
      }
    },
    500,
  );

  // Mark revert campaign as completed and stamp the original as reverted
  await db.adjustmentCampaign.update({ where: { id: revertCampaign.id }, data: { status: "completed" } });
  await db.adjustmentCampaign.update({
    where: { id: campaignId },
    data: { revertedAt: new Date(), revertCampaignId: revertCampaign.id },
  });

  return json({ success: true, revertCampaignId: revertCampaign.id });
};
