/**
 * Marketing screenshot generator
 * Creates 5 branded App Store screenshots using HTML+CSS rendered via Playwright
 * Each: 1200x800px, dark navy bg, headline, subtext, app UI in a card frame
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'store_assets');
const CDP_PORT = 18800;
const APP_BASE = 'https://admin.shopify.com/store/nmj-creation-studio/apps/bulk-price-editor-46';

// Brand colors (matching logo)
const NAVY = '#0f1729';
const GREEN = '#00c875';
const WHITE = '#ffffff';
const LIGHT = '#e8edf5';
const CARD_BG = '#ffffff';

async function captureAppState(appPage, appFrame, state) {
  const iframeEl = await appPage.$('iframe[src*="railway.app"]');
  const box = await iframeEl.boundingBox();
  const tmp = path.join(OUT_DIR, `_tmp_${state}.png`);
  await appPage.screenshot({
    path: tmp,
    clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height - 36, 860 - box.y) },
  });
  return tmp;
}

function toBase64(filePath) {
  return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
}

async function renderMarketing(browser, html, outPath) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const p = await ctx.newPage();
  await p.setContent(html, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: outPath, fullPage: false });
  await ctx.close();
  console.log(`✅ ${path.basename(outPath)}`);
}

function slide(opts) {
  // opts: { headline, sub, badge, appImg (base64 or null), bullets, accentColor, layout }
  const { headline, sub, badge, appImg, bullets = [], accentColor = GREEN } = opts;

  const bulletsHtml = bullets.map(b =>
    `<div class="bullet"><span class="dot">✓</span><span>${b}</span></div>`
  ).join('');

  const imgHtml = appImg
    ? `<div class="app-frame"><img src="${appImg}" /></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 800px; overflow: hidden;
    background: ${NAVY};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${WHITE};
    display: flex;
    flex-direction: column;
  }

  /* Top bar */
  .topbar {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 40px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .logo-mark {
    width: 28px; height: 28px; border-radius: 6px;
    background: ${accentColor};
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 900; color: ${NAVY};
  }
  .app-name { font-size: 13px; font-weight: 600; opacity: 0.7; letter-spacing: 0.5px; }

  /* Main layout */
  .main {
    flex: 1;
    display: flex;
    gap: 0;
  }

  /* Left panel */
  .left {
    width: 310px; min-width: 310px;
    padding: 44px 32px 40px 40px;
    display: flex; flex-direction: column; justify-content: center;
    gap: 18px;
  }
  .badge {
    display: inline-flex; align-items: center;
    background: rgba(0,200,117,0.15);
    border: 1px solid rgba(0,200,117,0.4);
    color: ${accentColor};
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    padding: 5px 12px; border-radius: 20px;
    text-transform: uppercase;
    width: fit-content;
  }
  h1 {
    font-size: 30px; font-weight: 800; line-height: 1.15;
    letter-spacing: -0.5px;
    color: ${WHITE};
  }
  h1 em {
    font-style: normal;
    color: ${accentColor};
  }
  .sub {
    font-size: 15px; line-height: 1.6; opacity: 0.7;
    color: ${LIGHT};
  }
  .bullets { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
  .bullet { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; opacity: 0.85; }
  .dot { color: ${accentColor}; font-weight: 900; flex-shrink: 0; margin-top: 1px; }

  /* Right panel — app screenshot */
  .right {
    flex: 1;
    padding: 20px 24px 20px 8px;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .app-frame {
    width: 100%; height: 100%;
    background: #f6f7f9;
    border-radius: 12px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.08),
      0 24px 60px rgba(0,0,0,0.5),
      0 4px 12px rgba(0,0,0,0.3);
    position: relative;
  }
  .app-frame::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0;
    height: 28px;
    background: #e2e5ea;
    border-bottom: 1px solid #d0d5dc;
    border-radius: 12px 12px 0 0;
    z-index: 1;
  }
  .app-frame::after {
    content: '● ● ●';
    position: absolute; top: 7px; left: 14px;
    font-size: 8px; letter-spacing: 2px;
    color: #aab;
    z-index: 2;
  }
  .app-frame img {
    width: 100%;
    height: calc(100% - 28px);
    margin-top: 28px;
    object-fit: cover;
    object-position: top left;
    display: block;
  }

  /* Decorative gradient blob */
  .blob {
    position: absolute;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,200,117,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .blob-1 { top: -60px; left: 200px; }
  .blob-2 { bottom: -80px; right: 100px; }

  /* Bottom accent line */
  .accent-line {
    height: 3px;
    background: linear-gradient(90deg, ${accentColor} 0%, transparent 60%);
  }
</style>
</head>
<body>
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>

  <div class="topbar">
    <div class="logo-mark">₿</div>
    <span class="app-name">BULK PRICE EDITOR</span>
  </div>

  <div class="main">
    <div class="left">
      ${badge ? `<div class="badge">${badge}</div>` : ''}
      <h1>${headline}</h1>
      <p class="sub">${sub}</p>
      <div class="bullets">${bulletsHtml}</div>
    </div>
    <div class="right">
      ${imgHtml}
    </div>
  </div>

  <div class="accent-line"></div>
</body>
</html>`;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Phase 1: Capture raw app states ────────────────────────────────────────
  console.log('Capturing live app states...');
  const appBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const appCtx = appBrowser.contexts()[0];
  const appPage = await appCtx.newPage();
  await appPage.setViewportSize({ width: 1440, height: 900 });

  // State A: Main page — filter pills
  await appPage.goto(APP_BASE + '/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await appPage.waitForTimeout(6000);
  const ssMain = await captureAppState(appPage, null, 'main');

  // State B: Step 2 visible (after clicking All Products)
  const frames = appPage.frames();
  let frame = null;
  for (const f of frames) { if (f.url().includes('railway.app')) { frame = f; break; } }
  if (frame) {
    await frame.click('button:has-text("All Products")').catch(() => {});
    await appPage.waitForTimeout(3000);
  }
  const ssStep2 = await captureAppState(appPage, null, 'step2');

  // State C: Preview table with prices
  if (frame) {
    await frame.click('button:has-text("Preview Changes")').catch(() => {});
    await appPage.waitForTimeout(6000);
  }
  const ssPreview = await captureAppState(appPage, null, 'preview');

  // State D: History
  await appPage.goto(APP_BASE + '/app/history', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await appPage.waitForTimeout(5000);
  const ssHistory = await captureAppState(appPage, null, 'history');

  // State E: Scheduled
  await appPage.goto(APP_BASE + '/app/scheduled', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await appPage.waitForTimeout(5000);
  const ssScheduled = await captureAppState(appPage, null, 'scheduled');

  await appPage.close();

  console.log('Rendering marketing slides...');

  // ── Phase 2: Render marketing slides ───────────────────────────────────────
  // Use a plain new browser for rendering HTML (not CDP — needs viewport control)
  const renderBrowser = await chromium.launch({ headless: true });

  // Slide 1 — Hero / Target Products
  await renderMarketing(renderBrowser, slide({
    badge: 'Bulk Price Editor',
    headline: 'Change prices<br><em>across your store</em><br>in seconds',
    sub: 'Select all products, a collection, vendor, type, or tag. Preview every price change before it goes live.',
    bullets: [
      'Filter by collection, vendor, product type, or tag',
      'Preview exact new prices before applying',
      '40+ variants updated in a single click',
    ],
    appImg: toBase64(ssStep2),
  }), path.join(OUT_DIR, 'screenshot1.png'));

  // Slide 2 — Adjustment Options
  await renderMarketing(renderBrowser, slide({
    badge: 'Flexible Pricing',
    headline: 'Percent or<br>fixed — <em>your choice</em>',
    sub: 'Increase or decrease by percentage or fixed amount. Round to .99 or .95 for that perfect price point.',
    bullets: [
      'Percentage or fixed $ increase / decrease',
      'Optional .99 or .95 price rounding',
      'Works on all variants automatically',
    ],
    appImg: toBase64(ssStep2),
  }), path.join(OUT_DIR, 'screenshot2.png'));

  // Slide 3 — Preview table
  await renderMarketing(renderBrowser, slide({
    badge: 'Zero Surprises',
    headline: 'See every<br>new price<br><em>before you apply</em>',
    sub: 'A full preview table shows current price → new price for every variant. No guessing, no mistakes.',
    bullets: [
      'Current price vs new price for every variant',
      'Invalid prices flagged automatically',
      'Apply only when you\'re 100% confident',
    ],
    appImg: toBase64(ssPreview),
  }), path.join(OUT_DIR, 'screenshot3.png'));

  // Slide 4 — History + Revert
  await renderMarketing(renderBrowser, slide({
    badge: 'Always Reversible',
    headline: 'Every change<br>is <em>logged & reversible</em>',
    sub: 'Made a mistake? Revert any adjustment with one click. Full history of every campaign, always.',
    bullets: [
      'Complete adjustment history with timestamps',
      'One-click revert to restore original prices',
      'Track vendor, collection, and bulk campaigns',
    ],
    appImg: toBase64(ssHistory),
  }), path.join(OUT_DIR, 'screenshot4.png'));

  // Slide 5 — Scheduled campaigns
  await renderMarketing(renderBrowser, slide({
    badge: 'Premium Feature',
    headline: 'Schedule sales<br>to run <em>automatically</em>',
    sub: 'Set a future start time and optional auto-revert. Your Black Friday sale runs itself — no alarm needed.',
    bullets: [
      'Schedule price changes days in advance',
      'Auto-revert when the sale ends',
      'Live countdown on every campaign',
    ],
    appImg: toBase64(ssScheduled),
  }), path.join(OUT_DIR, 'screenshot5.png'));

  await renderBrowser.close();

  // Cleanup temp files
  ['main','step2','preview','history','scheduled'].forEach(s => {
    const f = path.join(OUT_DIR, `_tmp_${s}.png`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  console.log('\nDone! Marketing screenshots:');
  fs.readdirSync(OUT_DIR)
    .filter(f => f.match(/^screenshot\d\.png$/))
    .sort()
    .forEach(f => {
      const kb = Math.round(fs.statSync(path.join(OUT_DIR, f)).size / 1024);
      console.log(`  ${f} — ${kb} KB`);
    });
})();
