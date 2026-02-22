/**
 * Privacy Policy — public route, no Shopify auth required
 * Accessible at /privacy
 */
export default function PrivacyPolicy() {
  const updated = "22 February 2026";
  const appName = "Bulk Price Adjuster";
  const contactEmail = "support@bulkpriceadjuster.app";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy — {appName}</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                 max-width: 760px; margin: 40px auto; padding: 0 24px;
                 color: #1a1a1a; line-height: 1.7; }
          h1 { font-size: 2rem; margin-bottom: 4px; }
          h2 { font-size: 1.2rem; margin-top: 2rem; }
          p, li { font-size: 1rem; }
          a { color: #2c6fad; }
        `}</style>
      </head>
      <body>
        <h1>Privacy Policy</h1>
        <p><em>Last updated: {updated}</em></p>

        <h2>1. Overview</h2>
        <p>
          {appName} ("we", "us", "our") is a Shopify app that allows merchants to perform
          bulk price adjustments on their product catalogue. This policy explains what
          data we collect, why we collect it, and how it is handled.
        </p>

        <h2>2. Data We Collect</h2>
        <p>We collect and store only what is strictly necessary to operate the app:</p>
        <ul>
          <li><strong>Shop domain</strong> — to identify your store and authenticate API requests.</li>
          <li><strong>OAuth access tokens</strong> — to make authorised calls to the Shopify Admin API on your behalf.</li>
          <li>
            <strong>Campaign records</strong> — the configuration and outcome of each price adjustment
            (product IDs, variant IDs, old/new prices, timestamps). This data is used to display
            history and enable price reversals.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect, store, or process any personal data belonging to your
          customers (names, email addresses, order data, etc.).
        </p>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>To authenticate and authorise API requests to your Shopify store.</li>
          <li>To record the history of price adjustments so you can review and revert them.</li>
          <li>To run scheduled price changes on your behalf.</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          Campaign history is retained for as long as the app is installed on your store.
          On uninstallation, session data is deleted immediately. All remaining store data
          (campaigns, logs) is permanently deleted within 48 hours of uninstallation in
          accordance with Shopify's GDPR requirements.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          We use <strong>Shopify</strong> as our platform, and our database is hosted on
          <strong> Supabase</strong> (PostgreSQL, EU West region). No data is sold or shared
          with any other third party.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          As a merchant, you may request a copy of your store's data or request deletion at
          any time by contacting us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          Shopify's built-in GDPR webhook infrastructure is also supported — we respond
          to customer data requests and redact requests as required.
        </p>

        <h2>7. Security</h2>
        <p>
          Access tokens are stored encrypted. All communication is over HTTPS. We do not
          log request bodies beyond what is necessary for debugging.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about this policy? Email us at{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </body>
    </html>
  );
}
