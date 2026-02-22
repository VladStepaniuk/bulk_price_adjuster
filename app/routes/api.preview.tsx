/**
 * Preview API endpoint
 * Returns calculated price changes without modifying database
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchProductsByCollection, fetchAllProducts, fetchProductsByFilter } from "../services/product.server";
import type { FilterType } from "../services/product.server";
import { calculateNewPrice } from "../services/pricing.server";
import type { PriceAdjustmentConfig } from "../services/pricing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { filterType, filterValue, config } = body as { filterType?: FilterType; filterValue?: string; config: any; collectionId?: string };

    if (!config) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Support legacy collectionId as well as new filterType/filterValue
    const ft: FilterType = filterType || (body.collectionId === "all" ? "all" : "collection");
    const fv: string = filterValue || body.collectionId || "";

    // Fetch products
    let products;
    if (ft === "all") {
      products = await fetchAllProducts(admin.graphql);
    } else if (ft === "collection") {
      if (!fv) return json({ error: "Missing collectionId" }, { status: 400 });
      products = await fetchProductsByCollection(admin.graphql, fv);
    } else {
      if (!fv) return json({ error: "Missing filterValue" }, { status: 400 });
      products = await fetchProductsByFilter(admin.graphql, ft, fv);
    }

    // Calculate preview for all variants
    const preview = products.flatMap((product) =>
      product.variants.map((variant) => {
        const oldPrice = parseFloat(variant.price);
        const result = calculateNewPrice(oldPrice, config as PriceAdjustmentConfig);

        return {
          productId: product.id,
          productTitle: product.title,
          variantId: variant.id,
          variantTitle: variant.title,
          oldPrice: result.oldPrice,
          newPrice: result.newPrice,
          valid: result.valid,
          errorMessage: result.errorMessage,
        };
      })
    );

    return json({ preview });
  } catch (error) {
    console.error("Preview error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Preview failed" },
      { status: 500 }
    );
  }
};
