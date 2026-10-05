// Usage: node shoot.mjs <baseUrl> <outDir> [slug ...]
// Takes full-page desktop + mobile screenshots of each page.
// With base = the live Squarespace site it also saves the rendered HTML.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
  'home', 'about', 'services', 'contact', 'giving-page', 'missionaries',
  'pastoral-staff', 'history', 'events',
  'events/thanksgiving-service', 'events/grand-national-races',
  'events/family-movie-night-jd65z', 'events/rummage-plmw7',
  'events/jxmpgs4t8hyctqbeski7esfk7qm6j2', 'events/christmas-caroling',
  'events/annual-harvest-night-activities', 'events/vbs-bdhcw',
  'events/family-movie-night', 'events/family-fun-night', 'events/easter-sunday',
  'events/christmaseve', 'events/vbs', 'events/rummage', 'events/goodfriday',
];

const [, , base, outDir, ...only] = process.argv;
const slugs = only.length ? only : PAGES;
const isLive = base.includes('squarespace') || base.includes('firstbaptistchurchofcapac.com');
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const slug of slugs) {
    // Local site uses folder/index.html per page
    const url = isLive ? `${base}/${slug}` : `${base}/${slug === 'home' ? '' : slug + '/'}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      // Scroll slowly so lazy images load
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 150));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);
      const name = slug.replace(/\//g, '__');
      await page.screenshot({ path: path.join(outDir, `${name}-${vpName}.png`), fullPage: true });
      if (isLive && vpName === 'desktop') {
        fs.writeFileSync(path.join(outDir, '..', 'html', `${name}.html`), await page.content());
      }
      console.log('ok', vpName, slug);
    } catch (e) {
      console.log('FAIL', vpName, slug, e.message.split('\n')[0]);
    }
  }
  await ctx.close();
}
await browser.close();
