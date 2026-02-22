/**
 * Terms of Service — public route, no Shopify auth required
 * Accessible at /terms
 */
export default function TermsOfService() {
  const updated = "22 February 2026";
  const appName = "Bulk Price Editor";
  const contactEmail = "support@bulkpriceadjuster.app";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Terms of Service — {appName}</title>
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
        <h1>Terms of Service</h1>
        <p><em>Last updated: {updated}</em></p>

        <h2>1. Acceptance</h2>
        <p>
          By installing or using {appName} (the "App"), you agree to be bound by these Terms.
          If you do not agree, do not install or use the App.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          {appName} is a Shopify-embedded application that enables merchants to perform
          bulk price adjustments across their product catalogue, including percentage and
          fixed-amount changes, scheduled adjustments, and automatic price reversals.
        </p>

        <h2>3. Subscription and Billing</h2>
        <ul>
          <li>
            The App is offered on a subscription basis through Shopify's billing system.
            Charges are billed monthly and processed by Shopify.
          </li>
          <li>
            A 14-day free trial is available for new installations. No charge is applied
            during the trial period.
          </li>
          <li>
            Subscriptions may be cancelled at any time from your Shopify admin. Cancellation
            takes effect at the end of the current billing period.
          </li>
          <li>
            The Standard plan ($12/month) provides access to core bulk pricing features.
            The Premium plan ($25/month) additionally includes scheduling and auto-revert.
          </li>
        </ul>

        <h2>4. Use of the App</h2>
        <ul>
          <li>You are responsible for all price changes made through the App on your store.</li>
          <li>You must ensure that price changes comply with all applicable laws and regulations.</li>
          <li>
            We recommend using the Preview feature before applying changes. Bulk price
            changes are difficult to reverse manually — use the History &amp; Revert feature
            if you need to undo an adjustment.
          </li>
        </ul>

        <h2>5. Limitations of Liability</h2>
        <p>
          The App is provided "as is". To the maximum extent permitted by law, we are not
          liable for any loss of revenue, incorrect prices published to your store, or any
          other direct or indirect damages arising from the use of the App. Always preview
          changes before applying them.
        </p>

        <h2>6. Modifications</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App after
          changes are posted constitutes acceptance of the revised Terms.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about these Terms? Email us at{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </body>
    </html>
  );
}

