const { chromium } = require('playwright');
const path = require('path');

async function render() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 1200 });

  const html = `<!DOCTYPE html>
<html><head><style>
  * { margin:0;padding:0; }
  body { width:1200px;height:1200px;overflow:hidden; }
</style></head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141820"/>
      <stop offset="100%" stop-color="#0D1017"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="60%" y2="100%">
      <stop offset="0%" stop-color="#00E88A"/>
      <stop offset="100%" stop-color="#00B368"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="1200" rx="240" fill="url(#bg)"/>

  <!-- Glow bloom -->
  <ellipse cx="600" cy="590" rx="260" ry="260" fill="#00D37F" opacity="0.08"/>

  <!-- Price tag hexagonal outline -->
  <path d="M340,400 L740,400 L860,600 L740,800 L340,800 Z"
    fill="none" stroke="#00D37F" stroke-width="24" stroke-linejoin="round" opacity="0.30"/>

  <!-- Tag hole -->
  <circle cx="390" cy="600" r="30"
    fill="none" stroke="#00D37F" stroke-width="20" opacity="0.35"/>

  <!-- Lightning bolt glow layer -->
  <path d="M638,350 L540,615 L628,615 L562,850"
    fill="none" stroke="#00E88A" stroke-width="90" stroke-linecap="round" stroke-linejoin="round" opacity="0.15"/>

  <!-- Lightning bolt main -->
  <path d="M638,350 L540,615 L628,615 L562,850"
    fill="none" stroke="url(#bolt)" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>

</svg>
</body></html>`;

  await page.setContent(html);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(__dirname, 'store_assets', 'logo_v3.png'),
    clip: { x: 0, y: 0, width: 1200, height: 1200 }
  });
  console.log('Done: logo_v2.png');
  await browser.close();
}
render().catch(console.error);
