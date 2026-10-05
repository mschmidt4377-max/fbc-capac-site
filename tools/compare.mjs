// Usage: node compare.mjs [slug ...]
// Needs the local site served at http://localhost:8080 (see serve.sh).
// Screenshots the local copy into ../compare/new, then for each page and
// viewport writes ../compare/side/<name>-<vp>.png (original | copy) and
// prints a pixel match % over the overlapping area.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const only = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const newDir = path.join(root, 'compare', 'new');
const sideDir = path.join(root, 'compare', 'side');
fs.mkdirSync(sideDir, { recursive: true });

execFileSync('node', [path.join(here, 'shoot.mjs'), 'http://localhost:8080', newDir, ...only], { stdio: 'inherit' });

const files = fs.readdirSync(newDir).filter(f => f.endsWith('.png'))
  .filter(f => !only.length || only.some(s => f.startsWith(s.replace(/\//g, '__') + '-')));

for (const f of files) {
  const a = PNG.sync.read(fs.readFileSync(path.join(root, 'reference', 'shots', f)));
  const b = PNG.sync.read(fs.readFileSync(path.join(newDir, f)));
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const crop = (img) => {
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(img, out, 0, 0, w, h, 0, 0);
    return out;
  };
  const diff = pixelmatch(crop(a).data, crop(b).data, null, w, h, { threshold: 0.15 });
  const match = (100 * (1 - diff / (w * h))).toFixed(1);

  // Side by side: original left, copy right, 20px red gap
  const H = Math.max(a.height, b.height), gap = 20;
  const side = new PNG({ width: a.width + gap + b.width, height: H });
  for (let i = 0; i < side.data.length; i += 4) side.data.set([255, 0, 0, 255], i);
  PNG.bitblt(a, side, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, side, 0, 0, b.width, b.height, a.width + gap, 0);
  fs.writeFileSync(path.join(sideDir, f), PNG.sync.write(side));
  console.log(`${f.padEnd(55)} match ${match}%  height orig ${a.height} / copy ${b.height}`);
}
