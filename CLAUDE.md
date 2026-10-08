# First Baptist Church of Capac — static site rebuild

Goal: one-for-one copy of https://www.firstbaptistchurchofcapac.com (Squarespace) as plain HTML/CSS, hosted free on GitHub Pages.

## Layout
- `site/` — the new website (deployed). One folder per page: `site/about/index.html`, `site/events/vbs/index.html`. Home is `site/index.html`.
- `site/assets/css/styles.css` — shared styles (header, footer, tokens, buttons). `site/assets/css/pages/<slug>.css` — page-only styles.
- `site/assets/js/main.js` — shared JS (mobile menu).
- `site/assets/img/` — images downloaded from the live site. `reference/image-map.json` maps Squarespace CDN URL -> local path.
- `reference/html/<slug>.html` — rendered HTML of each live page (slashes in slug -> `__`). Source of truth for text, links, structure.
- `reference/shots/<slug>-desktop.png` (1440 wide) and `-mobile.png` (390 wide) — screenshots of the live site.
- `reference/site.css` — Squarespace's compiled CSS (huge; grep it, don't read it whole).

## Design tokens (from live site)
- Fonts: Manrope (headings), Nunito Sans (body) — Google Fonts.
- darkAccent hsl(223.41,62.44%,38.63%) = main blue; black hsl(0,1.54%,12.75%); accent hsl(0,0%,74.9%); lightAccent hsl(0,0%,87.06%); white.

## Rules
- Plain HTML/CSS/vanilla JS. No build step, no frameworks. All links relative so the site works under a GitHub Pages subpath.
- Copy text exactly from `reference/html`, including the live site's typos (owner fixes those later).
- Contact form posts to Formspree: `https://formspree.io/f/YOUR_FORM_ID` (owner fills in ID).
- Giving: link/button placeholder for Tithely (owner wires it up).

## Checking work
1. `sh tools/serve.sh` (background) to serve `site/` at http://localhost:8080
2. `cd tools && node compare.mjs <slug> [...]` → side-by-side images in `compare/side/` + match %.
3. Look at the side-by-side PNGs (Read tool) and fix differences.

## Sermons (video + audio archive)
- `.github/workflows/deploy.yml` deploys `site/` to Pages on push, only when repo variable `DEPLOY_SITE` is `true` (off until launch).
- `.github/workflows/sermon-archive.yml` runs Sun + Mon 1 PM Michigan time: `tools/archive-sermons.mjs` uses Playwright (no login) to list videos on the public Facebook Videos tab, then yt-dlp + FFmpeg save each new video over 20 min as `<date>.mp3` to a GitHub Release `sermon-<date>`, list it in `site/assets/data/sermons.json`, and point `site/assets/data/sermon.json` at the newest one. No Facebook key needed.
- `site/sermons/` lists `sermons.json` with audio players (newest in a card, the rest below). Home sermons row links to it.
- Home `#fb-feed` embeds the `sermon.json` video; if `videoUrl` is empty it shows the Facebook Page feed plugin instead.
