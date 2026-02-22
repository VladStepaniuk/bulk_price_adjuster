import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect } from "react";

export default function App() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const suppress = [
                  "Hydration failed",
                  "initial UI does not match",
                  "error occurred during hydration",
                  "grammarly-desktop-integration",
                  "postMessage",
                  "admin.shopify.com"
                ];
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.error = function() {
                  const msg = String(arguments[0] || "");
                  if (suppress.some(s => msg.includes(s))) return;
                  originalError.apply(console, arguments);
                };
                
                console.warn = function() {
                  const msg = String(arguments[0] || "");
                  if (suppress.some(s => msg.includes(s))) return;
                  originalWarn.apply(console, arguments);
                };

                window.onerror = function(msg) {
                  if (suppress.some(s => String(msg).includes(s))) return true;
                };

                window.onunhandledrejection = function(event) {
                  if (suppress.some(s => String(event.reason).includes(s))) event.preventDefault();
                };
              })();
            `,
          }}
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
