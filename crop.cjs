const { Jimp } = require('jimp');
const path = require('path');

const MEDIA = 'C:\\Users\\User\\.openclaw\\media\\browser';
const ASSETS = path.join(__dirname, 'store_assets');

// The screenshot from OpenClaw browser is 1197x756 (roughly)
// Dev console takes up bottom ~115px — crop it out

async function cropDevConsole(src, dest) {
  const img = await Jimp.read(src);
  const { width, height } = img.bitmap;
  // Find where the dev console starts (dark bar) — crop bottom 115px
  const cropHeight = height - 115;
  img.crop(0, 0, width, cropHeight);
  await img.writeAsync(dest);
  console.log('✓', path.basename(dest), `${width}x${cropHeight}`);
}

async function run() {
  const shots = [
    { src: path.join(MEDIA, 'bef2c404-a1d2-4a4e-ab2e-7685cf6a5456.png'), dest: path.join(ASSETS, 'real_main.png') },
  ];
  for (const s of shots) {
    await cropDevConsole(s.src, s.dest);
  }
}
run().catch(console.error);
