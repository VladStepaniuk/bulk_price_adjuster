# Bulk Price Editor — Shopify App

Update prices across your entire Shopify store in seconds.

## What it does

Filter products by collection, vendor, type, or tag. Apply percentage or fixed price adjustments. Preview every change before applying. Revert instantly if needed.

## Stack

- **Framework:** Remix (Shopify App template)
- **UI:** Shopify Polaris
- **Database:** PostgreSQL via Prisma ORM
- **Billing:** Shopify App Subscriptions
- **Hosting:** Railway

## Features

- Filter by collection, vendor, product type, tag, or entire store
- Percentage and fixed price adjustments (increase or decrease)
- Compare-at price support
- Smart rounding (.99 / .95 endings)
- Live preview before applying
- Full campaign history
- One-click revert
- Scheduled price changes *(Premium)*
- Auto-revert sale windows *(Premium)*
- GDPR webhooks

## Plans

| Plan | Price | Trial |
|------|-------|-------|
| Basic | $12/mo | 14 days |
| Premium | $25/mo | 14 days |

## Development

```bash
npm install
shopify app dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | Shopify app client ID |
| `SHOPIFY_API_SECRET` | Shopify app client secret |
| `SHOPIFY_APP_URL` | Production app URL |
| `DATABASE_URL` | PostgreSQL connection string |
| `SCOPES` | `write_products` |

## Production

Deployed on Railway. Automatic deploys via `railway up`.

App URL: `https://bulk-price-editor-production-d1df.up.railway.app`
