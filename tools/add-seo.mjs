// Adds SEO tags to every page in site/ and writes site/sitemap.xml + site/robots.txt.
// Descriptions and share images come from the live site (reference/html).
// Safe to re-run: it replaces its own <!-- seo --> block each time.
// Usage: cd tools && node add-seo.mjs
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.firstbaptistchurchofcapac.com/';
const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'site');
const imageMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'reference/image-map.json'), 'utf8'));

// Pages that are not on the live site.
const EXTRA = {
  'sermons': { description: 'Listen to Sunday morning sermons from First Baptist Church of Capac. Press play, or download the MP3 to listen later. | 106 W Church St, Capac, MI 48014 |' },
  'privacy': { description: 'Privacy Policy for the First Baptist Church of Capac website. | 106 W Church St, Capac, MI 48014 |' },
  'events/view': { noindex: true },
};

// Fallback for events whose live page has no description: the event's own text, cut to ~160 chars.
const events = JSON.parse(fs.readFileSync(path.join(SITE, 'assets/data/events.json'), 'utf8'));
const eventText = slug => {
  const e = (Array.isArray(events) ? events : events.events).find(e => 'events/' + e.slug === slug);
  if (!e) return '';
  const text = unescape((e.excerpt || e.body || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text.length <= 160 ? text : text.slice(0, 157).replace(/\s+\S*$/, '') + '…';
};

const pages = fs.globSync('**/index.html', { cwd: SITE }).map(p => p.replaceAll('\\', '/')).sort();

const attr = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const meta = (html, key) => {
  const m = html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};
function unescape(s) { return s.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&'); }
const sitemap = [];
for (const file of pages) {
  const slug = file === 'index.html' ? '' : file.replace(/\/index\.html$/, '');
  const up = slug ? '../'.repeat(slug.split('/').length) : '';
  const url = BASE + (slug ? slug + '/' : '');
  const ref = path.join(ROOT, 'reference/html', (slug || 'home').replaceAll('/', '__') + '.html');
  const live = fs.existsSync(ref) ? fs.readFileSync(ref, 'utf8') : '';
  const extra = EXTRA[slug] || {};

  const description = extra.description || unescape(meta(live, 'description') || meta(live, 'og:description')) || eventText(slug);
  const liveImg = meta(live, 'og:image').split('?')[0];
  const image = imageMap[liveImg] && fs.existsSync(path.join(SITE, imageMap[liveImg])) ? imageMap[liveImg] : 'assets/img/logo1-1.jpg';

  const pagePath = path.join(SITE, file);
  let html = fs.readFileSync(pagePath, 'utf8').replace(/\n?<!-- seo -->[\s\S]*?<!-- \/seo -->/, '');
  const title = unescape(html.match(/<title>([^<]*)<\/title>/)[1]);

  const tags = [`<link rel="icon" href="${up}favicon.ico" sizes="any">`, `<link rel="icon" type="image/png" href="${up}favicon.png">`, `<link rel="apple-touch-icon" href="${up}favicon.png">`];
  if (extra.noindex) {
    tags.push('<meta name="robots" content="noindex">');
  } else {
    if (!description) throw new Error(`No description for ${file}`);
    sitemap.push(url);
    tags.push(
      `<meta name="description" content="${attr(description)}">`,
      `<link rel="canonical" href="${url}">`,
      `<meta property="og:site_name" content="First Baptist Church of Capac">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:title" content="${attr(title)}">`,
      `<meta property="og:description" content="${attr(description)}">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:image" content="${BASE + image}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
    );
  }
  html = html.replace(/(<title>[^<]*<\/title>)/, `$1\n<!-- seo -->\n${tags.join('\n')}\n<!-- /seo -->`);
  fs.writeFileSync(pagePath, html);
}

fs.writeFileSync(path.join(SITE, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemap.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
console.log(`${pages.length} pages tagged, ${sitemap.length} in sitemap.xml`);
