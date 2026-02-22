const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, 'store_assets');
const BASE = 'https://admin.shopify.com/store/nmj-creation-studio/apps/bulk-price-editor-46';

// Get cookies from the OpenClaw browser CDP session
// We'll connect to the existing browser via CDP
async function run() {
  // Read cookies from file if available
  const cookieFile = path.join(__dirname, 'shop_cookies.json');
  if (!fs.existsSync(cookieFile)) {
    console.error('No cookie file found. Run extract_cookies.cjs first.');
    process.exit(1);
  }
  const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const shoot = async (url, filename, scrollY = 0) => {
    await page.goto(url);
    await page.waitForTimeout(5000);
    if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(500);
    const vp = page.viewportSize();
    await page.screenshot({
      path: path.join(ASSETS, filename),
      clip: { x: 0, y: 0, width: vp.width, height: vp.height }
    });
    console.log('✓', filename);
  };

  await shoot(`${BASE}/app`, 'real_1.png');
  await shoot(`${BASE}/app/history`, 'real_2.png');
  await shoot(`${BASE}/app/scheduled`, 'real_3.png');

  await browser.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
