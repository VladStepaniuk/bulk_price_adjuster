# Shopify Bulk Price Adjuster - MVP

A Shopify embedded app for bulk price adjustments. Built with Remix, Polaris UI, and GraphQL.

## Features

- ✅ Select products by collection
- ✅ Percentage or fixed price adjustments
- ✅ Price rounding options (.99, .95)
- ✅ Preview changes before applying
- ✅ Rate-limited batch processing
- ✅ $12/month subscription with 14-day trial
- ✅ Server-side price calculations

## NOT Included (Strict MVP)

- ❌ Scheduling
- ❌ Campaign history
- ❌ Revert feature
- ❌ Compare-at price editing
- ❌ Multi-currency
- ❌ Vendor/tag filtering

## Project Structure

```
app/
  services/
    pricing.server.ts     # Server-side price calculation engine
    product.server.ts     # Product fetching and updates
    billing.server.ts     # Subscription management
  utils/
    rateLimiter.ts        # Batch processing with delays
    rounding.ts           # Price rounding utilities
  components/
    ProductSelector.tsx   # Collection selection
    AdjustmentForm.tsx    # Price adjustment configuration
    PreviewTable.tsx      # Price preview display
    ApplyProgress.tsx     # Apply progress and results
  routes/
    app._index.tsx        # Main app page
    api.preview.tsx       # Preview endpoint
    api.apply.tsx         # Apply endpoint (requires billing)
    api.billing.tsx       # Billing redirect
    webhooks.app.uninstalled.tsx  # Cleanup on uninstall
```

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Shopify CLI:**
   Ensure you have the Shopify CLI installed and authenticated.

3. **Update app scopes:**
   Add required scopes in `shopify.app.toml`:
   ```toml
   scopes = "write_products,read_products"
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   or
   ```bash
   shopify app dev
   ```

5. **Deploy:**
   ```bash
   shopify app deploy
   ```

## How It Works

### 1. Preview Flow
- Merchant selects collection
- Configures adjustment (%, fixed, rounding)
- Clicks "Preview Changes"
- Server fetches products → calculates prices → returns preview
- **No database changes**

### 2. Apply Flow
- Checks active subscription (blocks if inactive)
- Re-calculates all prices server-side (never trusts preview)
- Processes updates in batches of 10 with 500ms delays
- Returns success/failure report

### 3. Rate Limiting
- Batch size: 10-15 variants
- Delay between batches: 500ms
- Prevents Shopify GraphQL rate limit errors

### 4. Billing
- £12/month subscription
- 14-day free trial
- Blocks apply action only (preview is free)
- Auto-cleanup on app uninstall

## Price Calculation Rules

```typescript
// Server-side only (app/services/pricing.server.ts)

switch (adjustmentType) {
  case "PERCENT_INCREASE":
    newPrice = oldPrice * (1 + value / 100)
  case "PERCENT_DECREASE":
    newPrice = oldPrice * (1 - value / 100)
  case "FIXED_INCREASE":
    newPrice = oldPrice + value
  case "FIXED_DECREASE":
    newPrice = oldPrice - value
}

// Optional rounding
if (rounding === "ROUND_99") {
  newPrice = Math.floor(newPrice) + 0.99
}

// Validation
- Value must be > 0
- Percentage max 1000%
- Fixed max $10,000
- Result must be > $0.01
- Max 2 decimal places
```

## Testing Checklist

- [ ] Load app in dev store
- [ ] Select collection with 10+ products
- [ ] Preview 10% increase
- [ ] Preview 10% decrease
- [ ] Preview 100% decrease (should error)
- [ ] Preview fixed $5 increase
- [ ] Preview with .99 rounding
- [ ] Apply without subscription (should block)
- [ ] Subscribe and apply changes
- [ ] Verify prices in Shopify admin
- [ ] Test with 200+ variants (pagination)
- [ ] Uninstall app (check cleanup)

## Deployment Checklist

- [ ] Remove all `console.log` in production code
- [ ] Change billing test mode to `false` in billing.server.ts
- [ ] Test in production Shopify store
- [ ] Verify app loads < 3 seconds
- [ ] Test with 0 products
- [ ] Test with 500+ products
- [ ] Submit for Shopify app review

## GraphQL Queries

See `app/services/product.server.ts` for:
- `GET_COLLECTIONS` - Paginated collection fetching
- `GET_PRODUCTS_BY_COLLECTION` - Products with variants
- `UPDATE_VARIANT_PRICE` - Single variant update

## License

Private - MVP for monetization

## Support

This is a strict MVP. No feature requests will be accepted until after launch and monetization.

**Goal:** Stable. Predictable. Review-approved. Monetised.
