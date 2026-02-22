const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, 'store_assets');

async function render() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Render screenshots at 1400x900 (Shopify recommended aspect ratio ~1.9:1)
  await page.setViewportSize({ width: 1400, height: 900 });

  for (let i = 1; i <= 5; i++) {
    const file = path.join(ASSETS_DIR, `screenshot${i}.html`);
    await page.goto(`file://${file}`);
    await page.waitForTimeout(500);
    const outPath = path.join(ASSETS_DIR, `screenshot${i}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`✓ screenshot${i}.png`);
  }

  // Render logo at 1200x1200
  await page.setViewportSize({ width: 1200, height: 1200 });
  const logoHtml = `
    <!DOCTYPE html>
    <html><head><style>*{margin:0;padding:0;background:#000;}body{width:1200px;height:1200px;overflow:hidden;}</style></head>
    <body><img src="file://${path.join(ASSETS_DIR, 'logo.svg')}" width="1200" height="1200"/></body></html>
  `;
  await page.setContent(logoHtml);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ASSETS_DIR, 'logo.png'), clip: { x: 0, y: 0, width: 1200, height: 1200 } });
  console.log('✓ logo.png');

  await browser.close();
  console.log('\nAll assets rendered to store_assets/');
}

render().catch(console.error);
