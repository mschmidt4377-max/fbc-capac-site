#!/usr/bin/env node
// Usage: node check.mjs [slug ...]     (slugs as discovered from site/: "home", "about", "events/vbs")
// Env: VERIFY_PORT (default 8090) or VERIFY_URL to point at another server.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const BASE = process.env.VERIFY_URL || `http://127.0.0.1:${process.env.VERIFY_PORT || 8090}`;

// The script lives outside tools/, so resolve playwright against tools/package.json.
let chromium;
try {
  ({ chromium } = createRequire(path.join(ROOT, 'tools/package.json'))('playwright'));
} catch {
  console.error('playwright not found: run `cd tools && npm ci`');
  process.exit(2);
}

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { // Galaxy S25
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
};

function discoverPages() {
  const pages = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'assets') walk(p);
      else if (e.name === 'index.html') {
        const slug = path.relative(path.join(ROOT, 'site'), dir);
        pages.push({ slug: slug || 'home', url: `${BASE}/${slug ? slug + '/' : ''}` });
      }
    }
  })(path.join(ROOT, 'site'));
  return pages.sort((a, b) => (a.slug === 'home' ? -1 : b.slug === 'home' ? 1 : a.slug.localeCompare(b.slug)));
}

const allPages = discoverPages();
const wanted = process.argv.slice(2);
const unknown = wanted.filter((s) => !allPages.some((p) => p.slug === s));
if (unknown.length) {
  console.error(`unknown slug(s): ${unknown.join(', ')}\nknown: ${allPages.map((p) => p.slug).join(' ')}`);
  process.exit(2);
}
const PAGES = wanted.length ? allPages.filter((p) => wanted.includes(p.slug)) : allPages;

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
const outDir = path.join(ROOT, 'verify-out', stamp);
fs.mkdirSync(outDir, { recursive: true });

const isLocal = (url) => url.startsWith(BASE);

// Lazy images only load when scrolled into view, so scroll before the full-page shot.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
}

// Names the elements poking past the right edge so an overflow failure points at a cause.
// The closed mobile menu is parked off-screen on purpose, so it is skipped.
function findOverflowers(width) {
  return [...document.querySelectorAll('body *')]
    .filter((el) => !el.closest('.mobile-menu') && el.getBoundingClientRect().right > width + 1)
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`);
}

async function checkPage(browser, vpName, spec, { slug, url }) {
  const ctx = await browser.newContext(spec);
  const page = await ctx.newPage();
  const result = { slug, viewport: vpName, url, failures: [], consoleErrors: [], failedRequests: [] };
  const fail = (msg) => result.failures.push(msg);

  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location().url || '';
    // Offline runs make every third-party fetch fail with a generic "Failed to load resource"; that is not a site bug.
    if (loc && !isLocal(loc) && m.text().startsWith('Failed to load resource')) return;
    result.consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => result.consoleErrors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (isLocal(r.url()) && r.status() >= 400) result.failedRequests.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => {
    if (isLocal(r.url())) result.failedRequests.push(`${r.failure()?.errorText} ${r.url()}`);
  });

  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    result.status = resp?.status() ?? null;
    if (result.status !== 200) fail(`HTTP ${result.status}`);
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await scrollThrough(page);

    const width = spec.viewport.width;
    result.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (result.scrollWidth > width) {
      result.overflowers = await page.evaluate(findOverflowers, width);
      fail(`horizontal overflow: scrollWidth ${result.scrollWidth} > ${width} (${result.overflowers.join(', ')})`);
    }

    const shot = (name) => path.join(outDir, `${slug.replace(/\//g, '__')}-${name}.png`);
    result.screenshot = path.basename(shot(vpName));
    // scale 'css' keeps the DPR 3 mobile shots a manageable size.
    await page.screenshot({ path: shot(vpName), fullPage: true, scale: 'css' });

    if (vpName === 'mobile') {
      await page.click('.burger');
      const open = await page.evaluate(() => document.body.classList.contains('menu-open'));
      const expanded = await page.getAttribute('.burger', 'aria-expanded');
      result.menu = { bodyMenuOpen: open, ariaExpanded: expanded };
      if (!open) fail('after clicking .burger, body lacks .menu-open');
      if (expanded !== 'true') fail(`after clicking .burger, aria-expanded is "${expanded}", expected "true"`);
      await page.screenshot({ path: shot('mobile-menu'), scale: 'css' });
    }
  } catch (e) {
    fail(`exception: ${e.message.split('\n')[0]}`);
  }

  if (result.consoleErrors.length) fail(`${result.consoleErrors.length} console error(s): ${result.consoleErrors[0]}`);
  if (result.failedRequests.length) fail(`${result.failedRequests.length} failed local request(s): ${result.failedRequests[0]}`);
  await ctx.close();
  return result;
}

const browser = await chromium.launch();
const results = [];
for (const [vpName, spec] of Object.entries(VIEWPORTS)) {
  for (const p of PAGES) {
    const r = await checkPage(browser, vpName, spec, p);
    results.push(r);
    console.log(`${r.failures.length ? 'FAIL' : 'ok  '} ${vpName.padEnd(7)} ${p.slug}${r.failures.length ? '  ' + r.failures.join('; ') : ''}`);
  }
}
await browser.close();

const failed = results.filter((r) => r.failures.length);
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ base: BASE, total: results.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed. evidence: ${outDir}`);
process.exit(failed.length ? 1 : 0);
