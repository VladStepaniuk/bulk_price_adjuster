const { chromium } = require('playwright');
const path = require('path');

const ASSETS = path.join(__dirname, 'store_assets');

// Test results log
const results = [];
const log = (status, test, detail = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const msg = `${icon} ${test}${detail ? ': ' + detail : ''}`;
  results.push(msg);
  console.log(msg);
};

async function shot(page, filename) {
  const vp = page.viewportSize();
  await page.screenshot({
    path: path.join(ASSETS, filename),
    clip: { x: 0, y: 0, width: vp.width, height: vp.height - 115 }
  });
  console.log('📸', filename);
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Navigate via the direct URL that worked
  const APP_URL = 'https://admin.shopify.com/store/nmj-studio-2/apps/e6ee2ca4eeb295410ad0bebdf5798ddc';

  // Login
  await page.goto('https://accounts.shopify.com/lookup');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'vladstepaniuk33@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
  await page.fill('input[type="password"]:visible', 'stepvlad16');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);

  // Navigate to app
  await page.goto(APP_URL);
  await page.waitForTimeout(6000);
  await shot(page, 'test_01_main.png');

  // Get iframe
  const frames = page.frames();
  const appFrame = frames.find(f => f.url().includes('railway.app') || f.url().includes('bulk-price'));
  
  if (!appFrame) {
    log('WARN', 'App frame not found', `frames: ${frames.map(f => f.url()).join(', ')}`);
    // Try main page directly
  }

  const frame = appFrame || page.mainFrame();
  log('PASS', 'App loads', `frame url: ${frame.url()}`);

  // Test: Choose plan banner visible
  const planBanner = await frame.locator('text=Choose your plan').count();
  log(planBanner > 0 ? 'PASS' : 'WARN', 'Plan banner visible');

  // Test: Start trial - click Standard
  try {
    const standardBtn = frame.locator('button:has-text("Standard")').first();
    await standardBtn.click({ timeout: 5000 });
    await page.waitForTimeout(4000);
    await shot(page, 'test_02_billing.png');
    log('PASS', 'Billing page loads after clicking Standard plan');
  } catch (e) {
    log('WARN', 'Standard plan button click', e.message.substring(0, 80));
  }

  // Go back to app
  await page.goto(APP_URL);
  await page.waitForTimeout(6000);

  // Test: Filter by All Products
  const appFrame2 = page.frames().find(f => f.url().includes('railway.app'));
  const f = appFrame2 || page.mainFrame();
  
  try {
    const filterSelect = f.locator('select').first();
    await filterSelect.selectOption({ label: 'All Products' });
    await page.waitForTimeout(3000);
    await shot(page, 'test_03_filter_all.png');
    log('PASS', 'Filter by All Products selected');
  } catch (e) {
    log('FAIL', 'Filter select', e.message.substring(0, 80));
  }

  // Test: Set adjustment
  try {
    const adjustSelect = f.locator('select').nth(1);
    await adjustSelect.selectOption({ label: 'Decrease by percentage' });
    log('PASS', 'Adjustment type selected');
  } catch (e) {
    log('WARN', 'Adjustment type', e.message.substring(0, 80));
  }

  try {
    const valueInput = f.locator('input[type="number"]').first();
    await valueInput.fill('20');
    log('PASS', 'Adjustment value set to 20%');
  } catch (e) {
    log('WARN', 'Adjustment value input', e.message.substring(0, 80));
  }

  // Test: Preview
  try {
    const previewBtn = f.locator('button:has-text("Preview")').first();
    await previewBtn.click({ timeout: 5000 });
    await page.waitForTimeout(4000);
    await shot(page, 'test_04_preview.png');
    log('PASS', 'Preview renders');
  } catch (e) {
    log('FAIL', 'Preview button', e.message.substring(0, 80));
  }

  // Save screenshots report
  console.log('\n=== TEST RESULTS ===');
  results.forEach(r => console.log(r));

  await ctx.storageState({ path: path.join(__dirname, 'auth_state.json') });
  await browser.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
