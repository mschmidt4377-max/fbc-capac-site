// Finds the newest video on the church Facebook page and saves it to
// site/assets/data/sermon.json. Run by .github/workflows/deploy.yml every Sunday.
// Needs env FB_PAGE_ID and FB_PAGE_TOKEN (see tools/SERMON-SETUP.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { FB_PAGE_ID, FB_PAGE_TOKEN } = process.env;
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'assets', 'data', 'sermon.json');

if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
  console.log('No Facebook key set yet - skipping. The site shows the Facebook feed box instead.');
  process.exit(0);
}

const url = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/videos` +
  `?fields=permalink_url,created_time,title,description&limit=5&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`;
const res = await fetch(url);
const body = await res.json();
if (!res.ok || body.error) {
  // Fail loudly so GitHub emails the owner (usually means the key expired).
  console.error('Facebook error:', body.error?.message || res.status);
  process.exit(1);
}

const newest = (body.data || []).sort((a, b) => b.created_time.localeCompare(a.created_time))[0];
if (!newest) {
  console.log('No videos found - keeping the current one.');
  process.exit(0);
}

const old = JSON.parse(fs.readFileSync(file, 'utf8'));
const videoUrl = new URL(newest.permalink_url, 'https://www.facebook.com').href;
if (old.videoUrl === videoUrl) {
  console.log('Newest video is already on the site:', videoUrl);
  process.exit(0);
}

const data = {
  videoUrl,
  title: newest.title || (newest.description || '').split('\n')[0].slice(0, 120),
  date: newest.created_time.slice(0, 10),
  updated: new Date().toISOString(),
};
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Saved new sermon video:', videoUrl);
