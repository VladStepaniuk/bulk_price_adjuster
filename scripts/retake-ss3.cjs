const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'store_assets');
const CDP_PORT = 18800;
const APP_BASE = 'https://admin.shopify.com/store/nmj-creation-studio/apps/bulk-price-editor-46';

(async () => {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(APP_BASE + '/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const frames = page.frames();
  let frame = null;
  for (const f of frames) {
    if (f.url().includes('railway.app')) { frame = f; break; }
  }

  await frame.click('button:has-text("All Products")');
  await page.waitForTimeout(3000);
  await frame.click('button:has-text("Preview Changes")');
  await page.waitForTimeout(6000);

  // Scroll deep inside the iframe to reach NMJ Studio products
  await frame.evaluate(() => {
    // Find rows with our product names
    const cells = Array.from(document.querySelectorAll('td, [class*="Cell"]'));
    for (const cell of cells) {
      if (cell.textContent.trim() === 'Alpine Fleece Jacket') {
        cell.scrollIntoView({ behavior: 'instant', block: 'start' });
        return 'found Alpine';
      }
    }
    // Fallback: scroll way down
    const scrollable = document.querySelector('[class*="Scrollable__Content"]') || 
                       document.querySelector('[data-polaris-scrollable]') ||
                       document.documentElement;
    scrollable.scrollTop = 9999;
    return 'scrolled to bottom';
  });
  await page.waitForTimeout(1000);

  const iframeEl = await page.$('iframe[src*="railway.app"]');
  const box = await iframeEl.boundingBox();

  await page.screenshot({
    path: path.join(OUT_DIR, 'screenshot3.png'),
    clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height - 36, 900 - box.y) },
  });
  console.log('✅ screenshot3.png');

  await page.close();
  await browser.close();
})();
