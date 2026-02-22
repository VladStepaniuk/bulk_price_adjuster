/**
 * Product Selector Component
 * Filter products by collection, vendor, product type, or tag
 */

import { useState } from "react";
import { Select, Card, BlockStack, Text, TextField, InlineStack } from "@shopify/polaris";
import type { FilterType } from "../services/product.server";

interface Collection {
  id: string;
  title: string;
}

interface ProductSelectorProps {
  collections: Collection[];
  vendors: string[];
  productTypes: string[];
  filterType: FilterType | null;
  filterValue: string | null;
  onSelectFilter: (filterType: FilterType, filterValue: string) => void;
  loading?: boolean;
  productCount?: number;
}

export function ProductSelector({
  collections,
  vendors,
  productTypes,
  filterType,
  filterValue,
  onSelectFilter,
  loading = false,
  productCount,
}: ProductSelectorProps) {
  const [tagInput, setTagInput] = useState("");

  const filterModeOptions = [
    { label: "Filter by...", value: "" },
    { label: "Collection", value: "collection" },
    { label: "All Products", value: "all" },
    { label: "Vendor", value: "vendor" },
    { label: "Product Type", value: "productType" },
    { label: "Tag", value: "tag" },
  ];

  const collectionOptions = [
    { label: "Select a collection", value: "" },
    ...collections.map((c) => ({ label: c.title, value: c.id })),
  ];

  const vendorOptions = [
    { label: "Select a vendor", value: "" },
    ...vendors.map((v) => ({ label: v, value: v })),
  ];

  const productTypeOptions = [
    { label: "Select a product type", value: "" },
    ...productTypes.map((t) => ({ label: t, value: t })),
  ];

  const handleModeChange = (val: string) => {
    if (val === "all") {
      onSelectFilter("all", "all");
    } else if (val === "collection" || val === "vendor" || val === "productType" || val === "tag") {
      // Just update mode, wait for value selection
      onSelectFilter(val as FilterType, "");
    }
  };

  const currentMode = filterType || "";

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Target Products</Text>

        <Select
          label="Filter by"
          options={filterModeOptions}
          value={currentMode}
          onChange={handleModeChange}
          disabled={loading}
          helpText="Narrow down which products will be affected. Choose 'All Products' to adjust your entire catalogue, or pick a specific collection, vendor, product type, or tag."
        />

        {filterType === "collection" && (
          <Select
            label="Collection"
            options={collectionOptions}
            value={filterValue || ""}
            onChange={(val) => val && onSelectFilter("collection", val)}
            disabled={loading}
            helpText="Only products in this Shopify collection will be adjusted. Collections are managed in your Shopify admin under Products → Collections."
          />
        )}

        {filterType === "vendor" && (
          vendors.length > 0 ? (
            <Select
              label="Vendor"
              options={vendorOptions}
              value={filterValue || ""}
              onChange={(val) => val && onSelectFilter("vendor", val)}
              disabled={loading}
            />
          ) : (
            <TextField
              label="Vendor name"
              value={filterValue || ""}
              onChange={(val) => onSelectFilter("vendor", val)}
              disabled={loading}
              autoComplete="off"
              helpText="Enter the exact vendor name as it appears in Shopify"
            />
          )
        )}

        {filterType === "productType" && (
          productTypes.length > 0 ? (
            <Select
              label="Product Type"
              options={productTypeOptions}
              value={filterValue || ""}
              onChange={(val) => val && onSelectFilter("productType", val)}
              disabled={loading}
            />
          ) : (
            <TextField
              label="Product Type"
              value={filterValue || ""}
              onChange={(val) => onSelectFilter("productType", val)}
              disabled={loading}
              autoComplete="off"
              helpText="Enter the exact product type as it appears in Shopify"
            />
          )
        )}

        {filterType === "tag" && (
          <TextField
            label="Tag"
            value={filterValue || ""}
            onChange={(val) => onSelectFilter("tag", val)}
            disabled={loading}
            autoComplete="off"
            helpText='Enter a tag exactly as it appears in Shopify (case-sensitive), e.g. "sale" or "summer-2026". Tags can be added to products in your Shopify admin under Products → [product] → Tags.'
          />
        )}

        {productCount !== undefined && productCount > 0 && (
          <Text as="p" tone="success">
            ✓ {productCount} variant{productCount !== 1 ? "s" : ""} found
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
