const { chromium } = require('playwright');
const path = require('path');

const ASSETS = path.join(__dirname, 'store_assets');
const APP_URL = 'https://admin.shopify.com/store/nmj-creation-studio/apps/bulk-price-editor-46/app';
const HISTORY_URL = APP_URL.replace('/app', '/app/history');
const SCHEDULED_URL = APP_URL.replace('/app', '/app/scheduled');

const COOKIES = [
  { name: '_shopify_essential_', value: 'e685ac3e-fbe9-4d06-9ee1-446658530c14', domain: 'admin.shopify.com', path: '/' },
  { name: '_shopify_y', value: '6b62da72-4c12-46ed-a31a-0019972fd543', domain: '.shopify.com', path: '/' },
  { name: '_shopify_s', value: '74448f2e-86ac-400f-8b06-fab9f3219884', domain: 'admin.shopify.com', path: '/' },
];

async function shot(page, filename, cropBottom = 115) {
  const vp = page.viewportSize();
  await page.screenshot({
    path: path.join(ASSETS, filename),
    clip: { x: 0, y: 0, width: vp.width, height: vp.height - cropBottom }
  });
  console.log('✓', filename);
}

async function run() {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(COOKIES);

  const page = await ctx.newPage();

  // SS1: Main page
  await page.goto(APP_URL);
  await page.waitForTimeout(5000);
  await shot(page, 'real_ss1.png');

  // SS2: History
  await page.goto(HISTORY_URL);
  await page.waitForTimeout(4000);
  await shot(page, 'real_ss2.png');

  // SS3: Scheduled
  await page.goto(SCHEDULED_URL);
  await page.waitForTimeout(4000);
  await shot(page, 'real_ss3.png');

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e.message); process.exit(1); });
