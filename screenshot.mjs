import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };
const OUT = '/home/sam/dev/swiss-mail/test-results';

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ 
  headless: true, 
  executablePath: '/home/sam/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'] 
});
const page = await browser.newPage();
await page.setViewport(VIEWPORT);

await page.goto(`${BASE}/en`, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1000));
await page.screenshot({ path: `${OUT}/landing-mobile-fold.png`, fullPage: false });
await page.screenshot({ path: `${OUT}/landing-mobile-full.png`, fullPage: true });
console.log('Landing screenshots done');

try {
  await page.goto(`${BASE}/en/draft/new`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  const url = page.url();
  console.log('Current URL after draft/new:', url);
  await page.screenshot({ path: `${OUT}/write-mobile-fold.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/write-mobile-full.png`, fullPage: true });
  console.log('Write page screenshots done');
} catch(e) {
  console.error('Draft page error:', e.message);
  await page.screenshot({ path: `${OUT}/write-mobile-error.png`, fullPage: false }).catch(() => {});
}

await browser.close();
console.log('All screenshots saved to', OUT);
