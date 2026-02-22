/**
 * Apply API endpoint
 * Applies price changes with rate limiting and billing check
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchProductsByCollection, fetchAllProducts, updateProductVariants } from "../services/product.server";
import type { FilterType } from "../services/product.server";
import { calculateNewPrice } from "../services/pricing.server";
import { hasActiveSubscription, getActiveSubscription } from "../services/billing.server";
import { processInBatches } from "../utils/rateLimiter";
import db from "../db.server";
import type { PriceAdjustmentConfig } from "../services/pricing.server";
import { executeCampaign } from "../services/campaign.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { filterType, filterValue, config } = body as { filterType?: FilterType; filterValue?: string; config: any; collectionId?: string };

    if (!config) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Support legacy collectionId
    const ft: FilterType = filterType || (body.collectionId === "all" ? "all" : "collection");
    const fv: string = filterValue || body.collectionId || "";
    const collectionIdForDb = ft === "collection" ? fv : null;

    // CRITICAL: Check billing before apply
    const hasSubscription = await hasActiveSubscription(admin, session);
    if (!hasSubscription) {
      return json({ error: "Active subscription required" }, { status: 402 });
    }

    const configData = config as PriceAdjustmentConfig;
    const type = configData.adjustmentType.startsWith("PERCENT") ? "percentage" : "fixed_amount";
    const strategy = configData.adjustmentType.endsWith("INCREASE") ? "increase" : "decrease";

    // Create Campaign record
    const campaign = await db.adjustmentCampaign.create({
      data: {
        shop: session.shop,
        collectionId: collectionIdForDb,
        type,
        value: configData.value,
        strategy,
        rounding: configData.rounding || "NONE",
        compareAtPrice: configData.setCompareAtPrice ?? false,
        status: configData.scheduledAt ? "scheduled" : "processing",
        scheduledAt: configData.scheduledAt ? new Date(configData.scheduledAt) : null,
        revertAt: configData.revertAt ? new Date(configData.revertAt) : null,
        filterType: ft,
        filterValue: ft !== "collection" && ft !== "all" ? fv : null,
      }
    });

    // If scheduled for later, return success immediately
    if (configData.scheduledAt && new Date(configData.scheduledAt) > new Date()) {
      // If a revertAt is also set, pre-create the auto-revert campaign now so it
      // shows as a paired card in the Scheduled page before the sale even starts.
      if (configData.revertAt) {
        await db.adjustmentCampaign.create({
          data: {
            shop: session.shop,
            collectionId: collectionIdForDb,
            type: "auto_revert",
            value: configData.value,
            strategy: strategy === "increase" ? "decrease" : "increase",
            rounding: configData.rounding || "NONE",
            compareAtPrice: configData.setCompareAtPrice ?? false,
            status: "scheduled",
            scheduledAt: new Date(configData.revertAt),
            linkedCampaignId: campaign.id,
            title: `Auto-revert of #${campaign.id}`,
            filterType: ft,
            filterValue: ft !== "collection" && ft !== "all" ? fv : null,
          },
        });
      }
      return json({
        scheduled: true,
        campaignId: campaign.id,
        message: `Plan scheduled for ${new Date(configData.scheduledAt).toLocaleString()}`
      });
    }

    // Execute immediately
    try {
      const result = await executeCampaign(admin, campaign.id);
      return json({
        result: {
          ...result,
          success: true,
          campaignId: campaign.id
        }
      });
    } catch (e) {
      return json({ error: "Execution failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Apply error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Apply failed" },
      { status: 500 }
    );
  }
};

