// Saves each Sunday service from the church Facebook page as an MP3, before
// Facebook deletes live videos (30 days). Run by .github/workflows/sermon-archive.yml.
//
// 1. Playwright opens the page's public Videos tab (no login) and lists video IDs.
// 2. yt-dlp reads each new video. Short clips (under 20 min) are skipped.
// 3. yt-dlp + FFmpeg make <date>.mp3, and `gh` uploads it to a GitHub Release.
// 4. site/assets/data/sermons.json gets one entry per saved sermon, and
//    sermon.json points the Home page video at the newest one.
//
// Needs on PATH: yt-dlp, ffmpeg, gh (with GH_TOKEN). Safe to run again any time:
// videos already in sermons.json are skipped.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PAGE_ID = '100064603992779';
const MIN_SECONDS = 20 * 60;
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'assets', 'data', 'sermons.json');

const sermons = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const known = new Set(sermons.map((s) => s.videoId));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2000 } });
await page.goto(`https://www.facebook.com/${PAGE_ID}/videos`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const hrefs = await page.$$eval('a[href*="/videos/"]', (as) => as.map((a) => a.href));
await browser.close();

const ids = [...new Set(hrefs.map((h) => h.match(/\/videos\/(\d{6,})/)?.[1]).filter(Boolean))];
if (!ids.length) {
  // Fail loudly so GitHub emails the owner: Facebook probably changed the page.
  console.error('Found no videos on the Facebook page. Facebook may have changed its layout or blocked the robot.');
  process.exit(1);
}
console.log(`Found ${ids.length} videos on the page.`);

const ytdlp = (args) => execFileSync('yt-dlp', ['--no-warnings', ...args], { encoding: 'utf8' }).trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sermon-'));
let failed = false;

for (const videoId of ids.filter((id) => !known.has(id))) {
  const url = `https://www.facebook.com/${PAGE_ID}/videos/${videoId}/`;
  try {
    const [uploadDate, duration, title] = ytdlp(['--print', '%(upload_date)s\t%(duration)s\t%(title)s', url]).split('\t');
    if (Number(duration) < MIN_SECONDS) {
      console.log(`Skip ${videoId}: only ${Math.round(duration / 60)} min long.`);
      continue;
    }
    const date = `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`;
    const name = sermons.some((s) => s.date === date) ? `${date}-${videoId}` : date;

    ytdlp(['-q', '-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '64K',
      '--postprocessor-args', 'ffmpeg:-ac 1', '-o', path.join(tmp, `${name}.%(ext)s`), url]);
    const mp3 = path.join(tmp, `${name}.mp3`);

    const tag = `sermon-${name}`;
    const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
    let exists = true;
    try { gh(['release', 'view', tag]); } catch { exists = false; }
    if (exists) gh(['release', 'upload', tag, mp3, '--clobber']);
    else gh(['release', 'create', tag, mp3, '--title', `Sermon ${date}`, '--notes', `Facebook video: ${url}`]);

    const repo = gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
    sermons.push({
      date,
      title,
      videoId,
      videoUrl: url,
      minutes: Math.round(duration / 60),
      mp3: `https://github.com/${repo}/releases/download/${tag}/${name}.mp3`,
    });
    sermons.sort((a, b) => b.date.localeCompare(a.date));
    fs.writeFileSync(file, JSON.stringify(sermons, null, 2) + '\n');
    console.log(`Saved ${name}.mp3 (${Math.round(duration / 60)} min).`);
  } catch (err) {
    console.error(`Could not save ${url}:`, err.message);
    failed = true;
  }
}

if (!fs.existsSync(file)) fs.writeFileSync(file, '[]\n');

// Home page "Online Sermons" plays the newest sermon video.
const newest = sermons[0];
const featured = path.join(path.dirname(file), 'sermon.json');
if (newest && JSON.parse(fs.readFileSync(featured, 'utf8')).videoUrl !== newest.videoUrl) {
  const data = { videoUrl: newest.videoUrl, title: newest.title, date: newest.date, updated: new Date().toISOString() };
  fs.writeFileSync(featured, JSON.stringify(data, null, 2) + '\n');
  console.log('Home page now shows:', newest.videoUrl);
}
process.exit(failed ? 1 : 0);
