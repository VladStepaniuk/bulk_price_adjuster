/**
 * Screenshot via CDP — connects to the already-running OpenClaw browser
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'store_assets');
const CDP_PORT = 18800; // OpenClaw gateway CDP port
const APP_BASE = 'https://admin.shopify.com/store/nmj-creation-studio/apps/bulk-price-editor-46';

async function getAppFrame(page) {
  await page.waitForTimeout(6000);
  const frames = page.frames();
  for (const f of frames) {
    if (f.url().includes('railway.app')) return f;
  }
  return null;
}

async function cropIframe(page, filename, description) {
  const outPath = path.join(OUT_DIR, filename);
  const iframeEl = await page.$('iframe[src*="railway.app"]');
  if (!iframeEl) {
    await page.screenshot({ path: outPath });
    console.log(`⚠️  No iframe found — full page screenshot: ${filename}`);
    return;
  }
  const box = await iframeEl.boundingBox();
  await page.screenshot({
    path: outPath,
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: Math.min(box.height, 900 - box.y),
    },
  });
  console.log(`✅ ${description} -> ${filename} (${Math.round(box.width)}x${Math.round(Math.min(box.height, 900 - box.y))})`);
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Connect to the already-running OpenClaw browser
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const contexts = browser.contexts();
  const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });
  
  // Use a new page so we don't disturb existing tabs
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // ── Screenshot 1: Main page ─────────────────────────────────────────────────
  console.log('1. Main page...');
  await page.goto(APP_BASE + '/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await cropIframe(page, 'screenshot1.png', 'Main page — Step 1 filter pills');

  // ── Interact to show Step 2 ─────────────────────────────────────────────────
  const frame1 = await getAppFrame(page);
  if (frame1) {
    try {
      await frame1.click('button:has-text("All Products")');
      console.log('   Clicked All Products');
      await page.waitForTimeout(3000);
    } catch(e) { console.log('   Could not click All Products:', e.message); }
    await cropIframe(page, 'screenshot2.png', 'Step 2 — Adjustment form');

    // Click Preview
    try {
      await frame1.click('button:has-text("Preview Changes")');
      console.log('   Clicked Preview');
      await page.waitForTimeout(6000);
    } catch(e) { console.log('   Could not click Preview:', e.message); }
    await cropIframe(page, 'screenshot3.png', 'Step 3 — Preview table with live prices');
  } else {
    console.log('   No app frame found — using full page');
    await page.screenshot({ path: path.join(OUT_DIR, 'screenshot2.png') });
    await page.screenshot({ path: path.join(OUT_DIR, 'screenshot3.png') });
  }

  // ── Screenshot 4: History page ──────────────────────────────────────────────
  console.log('4. History page...');
  await page.goto(APP_BASE + '/app/history', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await cropIframe(page, 'screenshot4.png', 'History page — campaign log');

  // ── Screenshot 5: Scheduled page ───────────────────────────────────────────
  console.log('5. Scheduled page...');
  await page.goto(APP_BASE + '/app/scheduled', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await cropIframe(page, 'screenshot5.png', 'Scheduled page — upcoming campaigns');

  await page.close();
  await browser.close();

  console.log('\nDone! Files:');
  fs.readdirSync(OUT_DIR)
    .filter(f => f.startsWith('screenshot'))
    .sort()
    .forEach(f => {
      const size = fs.statSync(path.join(OUT_DIR, f)).size;
      console.log(`  ${f} — ${(size/1024).toFixed(0)} KB`);
    });
})();
