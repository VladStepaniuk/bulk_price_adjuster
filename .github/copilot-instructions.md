# Shopify Bulk Price Adjuster - MVP

## Project Overview
Shopify embedded app for bulk price adjustments using Remix, Polaris UI, and GraphQL API.

## Stack
- Node.js (LTS)
- Remix (Shopify template)
- Shopify Admin GraphQL API
- Polaris UI
- SQLite (dev only)

## Strict MVP Rules
- NO scheduling, campaign history, revert features, compare-at price editing, multi-currency, vendor/tag filtering
- All price calculations MUST happen server-side
- No business logic in frontend
- Focus: Stable, Predictable, Review-approved, Monetised

## Architecture
- Frontend: Embedded Polaris UI with fetch calls
- Backend: REST endpoints for products, preview, apply, billing
- Rate limiting: Batch size 10-15 variants, 500ms delay
- Billing: £12/month, 14-day trial, block apply only

## Progress
- [x] Project structure created
- [x] Scaffold complete
- [x] Services implemented (pricing, product, billing)
- [x] Components created (ProductSelector, AdjustmentForm, PreviewTable, ApplyProgress)
- [x] Routes configured (app._index, api.preview, api.apply, api.billing)
- [x] Billing integrated ($7/month, 7-day trial)
- [x] Webhooks configured (app.uninstalled)
- [ ] Testing in dev store
- [ ] Production deployment
