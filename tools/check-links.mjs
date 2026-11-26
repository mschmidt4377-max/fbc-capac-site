import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const allow = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/check-links.allow.json'), 'utf8'));
const BEACON = 'static.cloudflareinsights.com/beacon.min.js';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

const lineOf = (text, i) => text.slice(0, i).split('\n').length;
const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function refsOf(tag) {
  const out = [];
  for (const m of tag.matchAll(/\s(href|src|poster|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const val = m[2] ?? m[3];
    if (m[1].toLowerCase() === 'srcset') {
      for (const part of val.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) out.push(url);
      }
    } else out.push(val);
  }
  return out;
}

const problems = [];
let pages = 0;
let refs = 0;
let allowed = 0;
const used = new Set();

for (const file of walk(SITE).sort()) {
  pages++;
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  const isTemplate = rel === 'site/_template.html';
  const baseDir = isTemplate ? path.join(SITE, 'page') : path.dirname(file);
  const add = (line, msg, ref) => {
    const hits = ref === undefined ? [] : allow.filter((a) => a.file === rel && a.ref === ref);
    if (hits.length) {
      allowed++;
      for (const a of hits) used.add(a);
    } else problems.push(`${rel}:${line}  ${msg}`);
  };

  for (const m of text.matchAll(/<[a-z](?:"[^"]*"|'[^']*'|[^'">])*>/gi)) {
    const tag = m[0];
    if (tag.includes(BEACON)) continue;
    const line = lineOf(text, m.index);
    for (const ref of refsOf(tag)) {
      if (!ref || ref.startsWith('#') || external.test(ref)) continue;
      if (isTemplate && ref.includes('SLUG')) continue;
      refs++;
      if (ref.startsWith('/')) {
        add(line, `root-absolute link: ${ref}`, ref);
        continue;
      }
      let target;
      try {
        target = decodeURIComponent(ref.split('#')[0].split('?')[0]);
      } catch {
        add(line, `bad %-escape in link: ${ref}`, ref);
        continue;
      }
      if (!target) continue;
      let abs = path.resolve(baseDir, target);
      if (abs !== SITE && !abs.startsWith(SITE + path.sep)) {
        add(line, `link escapes site/: ${ref}`, ref);
        continue;
      }
      const isDir = fs.existsSync(abs) && fs.statSync(abs).isDirectory();
      if (target.endsWith('/') && !isDir) {
        add(line, `broken link: ${ref}`, ref);
        continue;
      }
      if (isDir) abs = path.join(abs, 'index.html');
      if (!fs.existsSync(abs)) add(line, `broken link: ${ref}`, ref);
    }
  }

  const live = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const beacons = [...live.matchAll(/<script\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)].filter((m) => m[0].includes(BEACON));
  const main = live.lastIndexOf('</main>');
  const body = live.lastIndexOf('</body>');
  if (beacons.length !== 1) {
    add(1, `expected exactly 1 Cloudflare beacon script, found ${beacons.length}`);
  } else if (main === -1 || body === -1 || !(beacons[0].index > main && beacons[0].index < body)) {
    add(lineOf(text, beacons[0].index), 'Cloudflare beacon must come after </main> and before </body>');
  }
}

for (const a of allow) {
  if (!used.has(a)) problems.push(`tools/check-links.allow.json: unused allowlist entry ${a.file} ${a.ref}`);
}

for (const p of problems) console.log(p);
console.log(`check-links: ${pages} pages, ${refs} local refs, ${problems.length} problems, ${allowed} allowlisted`);
process.exit(problems.length ? 1 : 0);
