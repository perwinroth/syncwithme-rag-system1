#!/usr/bin/env node
/*
  Snapshot a web page with Playwright (Chromium):
  - Renders JS
  - Saves HTML and PNG screenshot

  Usage:
    node scripts/snapshot.js "https://example.com" [outputBase]

  Examples:
    node scripts/snapshot.js https://example.com
    node scripts/snapshot.js https://example.com snapshots/example
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.argv[2];
  const baseArg = process.argv[3] || '';
  if (!url) {
    console.error('Usage: node scripts/snapshot.js <url> [outputBase]');
    process.exit(1);
  }

  // Lazy import so users see a clear message if not installed
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (err) {
    console.error('\nPlaywright is not installed. Run:');
    console.error('  npm i -D playwright');
    console.error('  npx playwright install chromium');
    process.exit(1);
  }

  const safe = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = baseArg
    ? baseArg
    : path.join('snapshots', `${safe(new URL(url).hostname)}-${ts}`);

  const outDir = path.dirname(baseName);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const htmlPath = `${baseName}.html`;
  const pngPath = `${baseName}.png`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  console.log(`Navigating to ${url} ...`);
  const start = Date.now();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Give late JS a beat to settle (ads/analytics etc.)
  await page.waitForTimeout(1000);

  const content = await page.content();
  fs.writeFileSync(htmlPath, content, 'utf8');

  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();

  const ms = Date.now() - start;
  console.log(`Saved HTML -> ${htmlPath}`);
  console.log(`Saved PNG  -> ${pngPath}`);
  console.log(`Done in ${ms} ms`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});

