/**
 * Product Selector Component
 * Filter products by collection, vendor, product type, or tag
 */

import { useState } from "react";
import {
  Select,
  Card,
  BlockStack,
  Text,
  TextField,
  InlineStack,
  Button,
  Badge,
  Box,
} from "@shopify/polaris";
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

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: "All Products", value: "all" },
  { label: "Collection", value: "collection" },
  { label: "Vendor", value: "vendor" },
  { label: "Product Type", value: "productType" },
  { label: "Tag", value: "tag" },
];

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

  const handleModeChange = (val: FilterType) => {
    if (val === "all") {
      onSelectFilter("all", "all");
    } else {
      onSelectFilter(val, "");
    }
  };

  const variantLabel =
    productCount !== undefined && productCount > 0
      ? `${productCount} variant${productCount !== 1 ? "s" : ""}`
      : null;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Step 1 — Target Products
          </Text>
          {variantLabel && (
            <Badge tone="success">{variantLabel}</Badge>
          )}
        </InlineStack>

        {/* Filter pills */}
        <InlineStack gap="200" wrap>
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={filterType === opt.value ? "primary" : "secondary"}
              size="slim"
              disabled={loading}
              onClick={() => handleModeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </InlineStack>

        {/* Secondary selector for non-all filters */}
        {filterType === "collection" && (
          <Select
            label="Collection"
            options={collectionOptions}
            value={filterValue || ""}
            onChange={(val) => val && onSelectFilter("collection", val)}
            disabled={loading}
            helpText="Only products in this collection will be adjusted."
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
              helpText="Enter the exact vendor name as it appears in Shopify."
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
              helpText="Enter the exact product type as it appears in Shopify."
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
            helpText='Enter a tag exactly as it appears in Shopify, e.g. "sale" or "summer-2026".'
          />
        )}
      </BlockStack>
    </Card>
  );
}
