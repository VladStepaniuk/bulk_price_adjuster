/**
 * Main App Page - Bulk Price Editor
 * Strict MVP: No scheduling, history, or advanced features
 */

import { useState, useCallback, useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  BlockStack,
  Button,
  Banner,
  InlineStack,
  Text,
  Box,
  Card,
  Badge,
  Collapsible,
  Link,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { fetchCollections, fetchProductVendors, fetchProductTypes } from "../services/product.server";
import type { FilterType } from "../services/product.server";
import { hasActiveSubscription, getActiveSubscription } from "../services/billing.server";
import { ProductSelector } from "../components/ProductSelector";
import { AdjustmentForm, type AdjustmentConfig } from "../components/AdjustmentForm";
import { PreviewTable, type PreviewItem } from "../components/PreviewTable";
import { ApplyProgress, type ApplyResult } from "../components/ApplyProgress";
import { ConfirmationModal } from "../components/ConfirmationModal";

interface LoaderData {
  collections: Array<{ id: string; title: string }>;
  vendors: string[];
  productTypes: string[];
  hasSubscription: boolean;
  currentPlan: "BASIC" | "PREMIUM" | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch collections
  const [collections, vendors, productTypes] = await Promise.all([
    fetchCollections(admin.graphql),
    fetchProductVendors(admin.graphql),
    fetchProductTypes(admin.graphql),
  ]);

  // Check billing status
  const { plan: currentPlan } = await getActiveSubscription(admin);
  const hasSubscription = currentPlan !== null;

  return json<LoaderData>({
    collections,
    vendors,
    productTypes,
    hasSubscription,
    currentPlan,
  });
};

export default function Index() {
  const { collections, vendors, productTypes, hasSubscription, currentPlan } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const shopify = useAppBridge();

  const [isHydrated, setIsHydrated] = useState(false);
  const [filterType, setFilterType] = useState<FilterType | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AdjustmentConfig | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [productCount, setProductCount] = useState<number | undefined>(undefined);
  const [previewEmpty, setPreviewEmpty] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const isFilterReady = filterType === "all" || (filterType !== null && !!filterValue);

  // Set hydrated state
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Helper to get session token for authenticated fetch calls
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await shopify.idToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  }, [shopify]);

  // Check for successful subscription redirect or cancellation
  useEffect(() => {
    const isFromBilling = searchParams.get("from_billing");
    const chargeId = searchParams.get("charge_id");

    if (isFromBilling) {
      if (hasSubscription && chargeId) {
        shopify.toast.show("Thank you for subscribing! Price Adjuster Pro is now active.", {
          duration: 5000,
        });
      } else if (!hasSubscription && !chargeId) {
        // Merchant likely canceled or the subscription wasn't completed
        shopify.toast.show("Subscription setup canceled. You can still preview price changes.", {
          duration: 3000,
        });
      }
      
      // Clean up the URL to prevent repeating toasts
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("charge_id");
      newParams.delete("from_billing");
      window.history.replaceState({}, "", `${window.location.pathname}?${newParams.toString()}`);
    }
  }, [hasSubscription, searchParams, shopify]);

  // Handle subscribe — navigates top frame to billing route which redirects to Shopify billing page
  const handleSubscribe = useCallback((plan: string = "BASIC") => {
    // billing.request() server-side throws a redirect — navigate the top frame directly
    const billingUrl = `/api/billing?plan=${plan}`;
    window.open(billingUrl, '_top');
  }, []);

  // Handle collection selection
  const handleSelectFilter = useCallback(async (ft: FilterType, fv: string) => {
    setFilterType(ft);
    setFilterValue(fv || null);
    setPreviewItems([]);
    setApplyResult(null);
    setProductCount(undefined);
    setPreviewEmpty(false);

    const ready = ft === "all" || (ft !== null && !!fv);
    if (!ready) return;

    setLoading(true);
    try {
      const response = await authFetch("/api/preview", {
        method: "POST",
        body: JSON.stringify({
          filterType: ft,
          filterValue: ft === "all" ? "all" : fv,
          config: { adjustmentType: "PERCENT_INCREASE", value: 1, rounding: "NONE" },
        }),
      });
      const data = await response.json();
      setProductCount(data.preview?.length || 0);
    } catch (err) {
      // count fetch failed silently
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Handle preview
  const handlePreview = useCallback(async (config: AdjustmentConfig) => {
    if (!isFilterReady) return;

    setLoading(true);
    setCurrentConfig(config);
    setApplyResult(null);

    try {
      const response = await authFetch("/api/preview", {
        method: "POST",
        body: JSON.stringify({
          filterType,
          filterValue: filterType === "all" ? "all" : filterValue,
          config,
        }),
      });

      if (!response.ok) {
        await response.text(); // consume body
        throw new Error(`Preview failed (${response.status})`);
      }

      const data = await response.json();
      const items = data.preview || [];
      setPreviewItems(items);
      setProductCount(items.length);
      setPreviewEmpty(items.length === 0);
    } catch (error) {
      setPreviewItems([]);
      setProductCount(0);
      setPreviewEmpty(false);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterValue, isFilterReady, authFetch]);

  // Handle apply
  const handleApplyClick = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleConfirmApply = useCallback(async () => {
    setShowConfirmModal(false);
    
    if (!isFilterReady || !currentConfig || !hasSubscription) {
      return;
    }

    setApplying(true);

    try {
      const response = await authFetch("/api/apply", {
        method: "POST",
        body: JSON.stringify({
          filterType,
          filterValue: filterType === "all" ? "all" : filterValue,
          config: currentConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Apply failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.scheduled) {
        shopify.toast.show(data.message);
        setApplyResult(null); // Clear progress if any
      } else {
        setApplyResult(data.result);
      }
      
      setPreviewItems([]);
    } catch (error) {
      setApplyResult({
        total: 0,
        successCount: 0,
        failureCount: 1,
        failures: [{
          variantId: "",
          productTitle: "Network Error",
          variantTitle: "",
          error: error instanceof Error ? error.message : "Failed to apply changes. Please check your connection and try again.",
        }],
      });
    } finally {
      setApplying(false);
    }
  }, [filterType, filterValue, isFilterReady, currentConfig, hasSubscription, authFetch, shopify]);

  const canApply = previewItems.length > 0 && previewItems.some(i => i.valid);
  const validCount = previewItems.filter(i => i.valid).length;

  const estimatedTime = validCount > 0
    ? `${Math.ceil((validCount / 10) * 0.5)} - ${Math.ceil((validCount / 10) * 0.5) + 1} seconds`
    : "0 seconds";

  if (!isHydrated) return null;

  return (
    <Page>
      <TitleBar title="Bulk Price Editor" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">

            {/* Slim subscription strip — only shows when no plan active */}
            {!hasSubscription && (
              <Card>
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      14-day free trial — no credit card required to preview
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Subscribe to apply changes to your store.{" "}
                      <span
                        style={{ cursor: "pointer", textDecoration: "underline", color: "#2c6ecb" }}
                        onClick={() => setShowHowItWorks((v) => !v)}
                      >
                        {showHowItWorks ? "Hide guide" : "How it works"}
                      </span>
                    </Text>
                  </BlockStack>
                  <InlineStack gap="200">
                    <Button variant="primary" size="slim" onClick={() => handleSubscribe("BASIC")}>
                      Standard — $12/mo
                    </Button>
                    <Button size="slim" onClick={() => handleSubscribe("PREMIUM")}>
                      Premium — $25/mo
                    </Button>
                  </InlineStack>
                </InlineStack>
                <Collapsible open={showHowItWorks} id="how-it-works">
                  <Box paddingBlockStart="300">
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">① <strong>Target Products</strong> — choose all products, a collection, vendor, product type, or tag.</Text>
                      <Text as="p" variant="bodySm" tone="subdued">② <strong>Configure</strong> — pick % or fixed increase/decrease, optionally round prices.</Text>
                      <Text as="p" variant="bodySm" tone="subdued">③ <strong>Preview</strong> — review exact new prices before anything changes in your store.</Text>
                      <Text as="p" variant="bodySm" tone="subdued">④ <strong>Apply</strong> — push live instantly. All changes logged; revert anytime from History.</Text>
                    </BlockStack>
                  </Box>
                </Collapsible>
              </Card>
            )}

            {/* Upgrade nudge for Basic users */}
            {hasSubscription && currentPlan === "BASIC" && (
              <Banner
                tone="info"
                action={{ content: "Upgrade to Premium", onAction: () => handleSubscribe("PREMIUM") }}
              >
                <Text as="p" variant="bodySm">
                  Unlock scheduled campaigns and auto-revert for just $25/mo.
                </Text>
              </Banner>
            )}

            {/* Step 1 */}
            <ProductSelector
              collections={collections}
              vendors={vendors}
              productTypes={productTypes}
              filterType={filterType}
              filterValue={filterValue}
              onSelectFilter={handleSelectFilter}
              loading={loading || applying}
              productCount={productCount}
            />

            {/* Step 2 — only shows after filter selected */}
            {isFilterReady && (
              <AdjustmentForm
                onPreview={handlePreview}
                disabled={false}
                loading={loading || applying}
                currentPlan={currentPlan}
              />
            )}

            {/* No products found */}
            {previewEmpty && (
              <Banner tone="warning" title="No products found">
                No products matched your filter. Make sure the selected collection, vendor, product type, or tag contains published products.
              </Banner>
            )}

            {/* Step 3 — Preview & Apply */}
            {previewItems.length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Step 3 — Preview & Apply
                    </Text>
                    <Badge tone="info">
                      {`${validCount} variant${validCount !== 1 ? "s" : ""} ready`}
                    </Badge>
                  </InlineStack>

                  <PreviewTable items={previewItems} />

                  {!hasSubscription ? (
                    <InlineStack gap="200" blockAlign="center">
                      <Button
                        variant="primary"
                        size="large"
                        onClick={() => handleSubscribe("BASIC")}
                      >
                        Subscribe to Apply — 14-day free trial
                      </Button>
                      <Text as="p" variant="bodySm" tone="subdued">
                        $12/mo after trial
                      </Text>
                    </InlineStack>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleApplyClick}
                      disabled={!canApply || applying}
                      loading={applying}
                      size="large"
                    >
                      Apply Price Changes
                    </Button>
                  )}
                </BlockStack>
              </Card>
            )}

            <ConfirmationModal
              open={showConfirmModal}
              onConfirm={handleConfirmApply}
              onCancel={() => setShowConfirmModal(false)}
              variantCount={validCount}
              estimatedTime={estimatedTime}
            />

            <ApplyProgress
              result={applyResult}
              isApplying={applying}
              progress={0}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

