// Saves each Sunday service from the church Facebook page as an MP3, before
// Facebook deletes live videos (30 days). Run by .github/workflows/sermon-archive.yml.
//
// 1. Playwright opens the page's public Videos tab (no login) and lists video IDs.
// 2. yt-dlp reads each new video. Short clips (under 20 min) are skipped.
// 3. yt-dlp + FFmpeg make <date>.mp3. find-sermon-start.py finds where the
//    sermon starts, and FFmpeg cuts off the singing and announcements before it.
//    `gh` uploads the MP3 to a GitHub Release. (The video is not cut.)
// 4. site/assets/data/sermons.json gets one entry per saved sermon, and
//    sermon.json points the Home page video at the newest one.
//
// Needs on PATH: yt-dlp, ffmpeg, gh (with GH_TOKEN), python with faster-whisper.
// Safe to run again any time: videos already in sermons.json are skipped.
// Sermons saved before the cut existed (no "start" in sermons.json) get cut once.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PAGE_ID = '100064603992779';
const MIN_SECONDS = 20 * 60;
const tools = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(tools, '..', 'site', 'assets', 'data', 'sermons.json');

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

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const ytdlp = (args) => run('yt-dlp', ['--no-warnings', ...args]);
const gh = (args) => run('gh', args);
const save = () => fs.writeFileSync(file, JSON.stringify(sermons, null, 2) + '\n');
const minutesOf = (mp3) =>
  Math.round(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]) / 60);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sermon-'));
let failed = false;

// Cuts the singing and announcements off the front of the MP3, in place.
// Returns the seconds cut off (0 when the sermon start was not clear).
function cutToSermon(mp3) {
  const start = Number(run('python', [path.join(tools, 'find-sermon-start.py'), mp3]));
  if (start > 0) {
    const cut = mp3.replace(/\.mp3$/, '-cut.mp3');
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(start), '-i', mp3, '-c', 'copy', cut]);
    fs.renameSync(cut, mp3);
  }
  return start;
}

for (const s of sermons.filter((s) => s.start === undefined)) {
  try {
    const [, tag, name] = s.mp3.match(/download\/([^/]+)\/([^/]+)$/);
    gh(['release', 'download', tag, '-p', name, '-D', tmp, '--clobber']);
    const mp3 = path.join(tmp, name);
    s.start = cutToSermon(mp3);
    if (s.start) gh(['release', 'upload', tag, mp3, '--clobber']);
    s.minutes = minutesOf(mp3);
    save();
    console.log(`Cut ${name}: sermon starts at ${s.start}s.`);
  } catch (err) {
    console.error(`Could not cut ${s.mp3}:`, err.message);
    failed = true;
  }
}

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
    const start = cutToSermon(mp3);

    const tag = `sermon-${name}`;
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
      minutes: minutesOf(mp3),
      start,
      mp3: `https://github.com/${repo}/releases/download/${tag}/${name}.mp3`,
    });
    sermons.sort((a, b) => b.date.localeCompare(a.date));
    save();
    console.log(`Saved ${name}.mp3 (sermon starts at ${start}s).`);
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
