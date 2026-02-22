import { json } from "@remix-run/node";
import db from "../db.server";
import { fetchProductsByCollection, fetchAllProducts, fetchProductsByFilter, updateProductVariants } from "./product.server";
import type { FilterType } from "./product.server";
import { calculateNewPrice, type PriceAdjustmentConfig } from "./pricing.server";
import { processInBatches } from "../utils/rateLimiter";

/**
 * Execute a price adjustment campaign
 */
export async function executeCampaign(admin: any, campaignId: number) {
  const campaign = await db.adjustmentCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "completed") return;

  // Handle auto-revert campaigns (sale window end — restore prices from original campaign logs)
  if (campaign.type === "auto_revert") {
    if (!campaign.linkedCampaignId) throw new Error("Auto-revert campaign missing linkedCampaignId");

    await db.adjustmentCampaign.update({ where: { id: campaignId }, data: { status: "processing" } });

    try {
      const sourceCampaignId = campaign.linkedCampaignId;
      const sourceCampaign = await db.adjustmentCampaign.findUnique({ where: { id: sourceCampaignId } });
      const logs = await db.adjustmentLog.findMany({ where: { campaignId: sourceCampaignId } });
      const logsWithProduct = logs.filter((l) => l.productId && l.productId !== "");

      const clearCompareAt = sourceCampaign?.compareAtPrice ?? false;
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

      await processInBatches(batches, 5, async (batch) => {
        const result = await updateProductVariants(admin.graphql, batch.productId, batch.variants);
        if (result.success) {
          const batchLogs = logsWithProduct.filter((l) => l.productId === batch.productId);
          await db.adjustmentLog.createMany({
            data: batchLogs.map((l) => ({
              campaignId,
              variantId: l.variantId,
              productId: l.productId,
              productTitle: l.productTitle,
              variantTitle: l.variantTitle,
              oldPrice: l.newPrice,
              newPrice: l.oldPrice,
            })),
          });
        }
      }, 500);

      await db.adjustmentCampaign.update({
        where: { id: campaignId },
        data: { status: "completed", executedAt: new Date() },
      });
      await db.adjustmentCampaign.update({
        where: { id: sourceCampaignId },
        data: { revertedAt: new Date(), revertCampaignId: campaignId },
      });

      return {
        total: logsWithProduct.length,
        successCount: logsWithProduct.length,
        failureCount: 0,
        failures: [],
        updates: logsWithProduct.map((l) => ({
          productTitle: l.productTitle,
          variantTitle: l.variantTitle,
          oldPrice: l.newPrice,
          newPrice: l.oldPrice,
        })),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await db.adjustmentCampaign.update({
        where: { id: campaignId },
        data: { status: "failed", failureReason: reason },
      });
      throw error;
    }
  }

  // Fetch variants already processed (for resume after crash)
  const existingLogs = await db.adjustmentLog.findMany({
    where: { campaignId },
    select: { variantId: true },
  });
  const processedVariantIds = new Set(existingLogs.map((l) => l.variantId));
  if (processedVariantIds.size > 0) {
    // resuming after crash — skipping already-processed variants
  }

  await db.adjustmentCampaign.update({
    where: { id: campaignId },
    data: { status: "processing" },
  });

  try {
    const { shop, collectionId, type, value, strategy, rounding, compareAtPrice: setCompareAt, filterType, filterValue } = campaign;
    
    // Construct config object for calculation
    const config: PriceAdjustmentConfig = {
      adjustmentType: (type === "percentage" ? `PERCENT_${strategy.toUpperCase()}` : `FIXED_${strategy.toUpperCase()}`) as any,
      value: value,
      rounding: (rounding as any) || "NONE",
    };

    // Fetch products using the stored filter
    const ft = (filterType || "collection") as FilterType;
    let products;
    if (ft === "all" || !collectionId && !filterValue) {
      products = await fetchAllProducts(admin.graphql);
    } else if (ft === "collection" && collectionId) {
      products = await fetchProductsByCollection(admin.graphql, collectionId);
    } else if (filterValue) {
      products = await fetchProductsByFilter(admin.graphql, ft, filterValue);
    } else {
      products = await fetchAllProducts(admin.graphql);
    }

    // Prepare product batches
    interface ProductBatch {
      productId: string;
      productTitle: string;
      variants: { id: string; price: string; variantTitle: string; oldPrice: number; newPrice: number }[];
    }

    const productBatchesMap = new Map<string, ProductBatch>();
    
    for (const product of products) {
      const batchVariants: { id: string; price: string; variantTitle: string; oldPrice: number; newPrice: number }[] = [];
      for (const variant of product.variants) {
        if (processedVariantIds.has(variant.id)) continue; // already applied in a prior run
        const oldPrice = parseFloat(variant.price);
        const result = calculateNewPrice(oldPrice, config);

        if (result.valid) {
          batchVariants.push({
            id: variant.id,
            price: result.newPrice.toFixed(2),
            variantTitle: variant.title,
            oldPrice: result.oldPrice,
            newPrice: result.newPrice,
          });
        }
      }

      if (batchVariants.length > 0) {
        productBatchesMap.set(product.id, {
          productId: product.id,
          productTitle: product.title,
          variants: batchVariants,
        });
      }
    }

    const productBatches = Array.from(productBatchesMap.values());
    const totalVariantsCount = Array.from(productBatchesMap.values()).reduce((acc, b) => acc + b.variants.length, 0);

    // Apply updates in batches
    const results = await processInBatches(
      productBatches,
      5,
      async (batch) => {
        const result = await updateProductVariants(
          admin.graphql,
          batch.productId,
          batch.variants.map((v) => ({
            id: v.id,
            price: v.price,
            ...(setCompareAt ? { compareAtPrice: v.oldPrice.toFixed(2) } : {}),
          }))
        );

        if (result.success) {
          await db.adjustmentLog.createMany({
            data: batch.variants.map(v => ({
              campaignId: campaign.id,
              variantId: v.id,
              productId: batch.productId,
              productTitle: batch.productTitle,
              variantTitle: v.variantTitle,
              oldPrice: v.oldPrice,
              newPrice: v.newPrice,
            }))
          });
        }

        return batch.variants.map((v) => ({
          variantId: v.id,
          productTitle: batch.productTitle,
          variantTitle: v.variantTitle,
          oldPrice: v.oldPrice,
          newPrice: v.newPrice,
          success: result.success,
          error: result.errors?.join(", "),
        }));
      },
      500
    );

    // Update campaign status
    await db.adjustmentCampaign.update({
      where: { id: campaign.id },
      data: { 
        status: "completed",
        executedAt: new Date(),
      }
    });

    // Flatten results
    const flatResults = results.flat();
    const failures = flatResults
      .filter((r) => !r.success)
      .map((r) => ({
        variantId: r.variantId,
        productTitle: r.productTitle,
        variantTitle: r.variantTitle,
        error: r.error || "Unknown error",
      }));

    const updates = flatResults
      .filter((r) => r.success)
      .map((r) => ({
        productTitle: r.productTitle,
        variantTitle: r.variantTitle,
        oldPrice: r.oldPrice as number,
        newPrice: r.newPrice as number,
      }));

    // If a revertAt is set (sale window), schedule the paired auto-revert campaign now
    if (campaign.revertAt) {
      const existingAutoRevert = await db.adjustmentCampaign.findFirst({
        where: { linkedCampaignId: campaign.id, type: "auto_revert" },
      });
      if (!existingAutoRevert) {
        await db.adjustmentCampaign.create({
          data: {
            shop: campaign.shop,
            collectionId: campaign.collectionId,
            type: "auto_revert",
            value: campaign.value,
            strategy: campaign.strategy === "increase" ? "decrease" : "increase",
            rounding: campaign.rounding,
            compareAtPrice: campaign.compareAtPrice,
            status: "scheduled",
            scheduledAt: campaign.revertAt,
            linkedCampaignId: campaign.id,
            title: `Auto-revert of #${campaign.id}`,
          },
        });
      }
    }

    return {
      total: totalVariantsCount,
      successCount: flatResults.filter((r) => r.success).length,
      failureCount: failures.length,
      failures,
      updates,
    };

  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await db.adjustmentCampaign.update({
      where: { id: campaign.id },
      data: { status: "failed", failureReason: reason },
    });
    throw error;
  }
}
