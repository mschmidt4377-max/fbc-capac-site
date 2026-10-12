---
name: verify
description: Drive and prove changes to the First Baptist Church of Capac static site (plain HTML/CSS/JS in site/) in a real browser with Playwright. Use after editing any page, CSS, or JS under site/ to serve it locally, load every page at desktop 1440x900 and Galaxy S25 360x780, check console errors, broken local requests, horizontal overflow and the mobile menu, and capture screenshots as evidence.
---

# Verify the FBC Capac site

The product is `site/`: one `index.html` per folder, shared `assets/css/styles.css` and `assets/js/main.js`, page code in `assets/js/{events,sermons}.js`, data in `assets/data/*.json`. The surface is a browser. There is no build step, so "launch" means serving `site/`.

Everything below runs from the repo root. Read `.claude/skills/verify/features/README.md` for per-feature recipes (navigation, events, sermons, contact, giving); a proof that touches one entry point is incomplete when the feature file lists others.

## Launch

```sh
.claude/skills/verify/scripts/serve.sh start
```

Serves `site/` with `python3 -m http.server` on `127.0.0.1:8090` (override with `VERIFY_PORT=8091`). This is deliberately not port 8080, which belongs to the user's `tools/serve.sh` (and that script calls `python`, which is absent here). Ready means `/` answers 200; `start` waits up to 5 s for that and prints `ready: pid N at URL`. It refuses to start if the port already answers and the PID file is not ours. State lives in `verify-out/serve-<port>.pid` and `.log`.

## Doctor

```sh
.claude/skills/verify/scripts/serve.sh doctor
```

Read-only. Passes only if the PID file names a live `http.server` process serving this checkout's `site/` on our port and `GET /` returns 200 with a title starting `First Baptist Church of Capac`. Run it first whenever a check looks odd (stale server from another worktree, wrong port). Never drive an instance that fails doctor.

## Drive

Full sweep, every page found under `site/` at both viewports:

```sh
node .claude/skills/verify/scripts/check.mjs
node .claude/skills/verify/scripts/check.mjs home events/vbs     # only these slugs
```

Slugs are the folder path under `site/` (`home` for the root). Playwright is resolved from `tools/node_modules`; if missing, `cd tools && npm ci` (Chromium lives in `~/.cache/ms-playwright`). For each page and viewport the script loads the page and records: HTTP status, console errors and page errors, local 4xx/5xx or failed requests, `documentElement.scrollWidth` greater than the viewport width (with the offending elements named), and a full-page screenshot. Mobile also clicks `.burger` and asserts `body.menu-open` and `aria-expanded="true"`, then screenshots the open menu. Third-party failures (Facebook, Google Fonts, Tithe.ly) are ignored so an offline run stays meaningful. Exit code is nonzero if any page fails.

For behavior the sweep does not cover (carousel arrows, sermon list rendering, form fields), write a short Playwright snippet using the handles in the matching `features/*.md` file, again against `http://127.0.0.1:8090`. Do not submit the contact form: it posts to Formspree.

## Evidence

Each sweep writes `verify-out/<YYYYMMDD-HHMMSS>/` containing `<slug>-desktop.png`, `<slug>-mobile.png`, `<slug>-mobile-menu.png` (slashes in slugs become `__`) and `report.json` (per page and viewport: status, failures, console errors, failed requests, scrollWidth, overflowers, menu state). `verify-out/` is gitignored.

Proof standards:

- Quote failing lines from the script output and name the `report.json` entry; do not summarize a failure away. Overflow at 360 px is a real finding, not a flaky check.
- Look at the screenshots for visual claims; a passing sweep says nothing about layout fidelity. For comparison against the live Squarespace site use `cd tools && node compare.mjs <slug>` (see CLAUDE.md).
- Exercise the real user path: click the burger, press the carousel arrows, do not set classes or call functions from the console.
- Data-driven UI (events, sermons) renders from `assets/data/*.json`; verify the rendered DOM, not just that the JSON loads.

## Cleanup

```sh
.claude/skills/verify/scripts/serve.sh stop
```

Kills only the PID in `verify-out/serve-<port>.pid`, and only after confirming that PID is still our `http.server`; a stale PID file is removed without killing anything. Never `pkill python`. Stop leaves `verify-out/<timestamp>/` in place; delete old evidence by hand only when the user asks. Run `stop` after a failed attempt too.

## Helpers

| Script | Invocation | Purpose |
| --- | --- | --- |
| `scripts/serve.sh` | `serve.sh start\|stop\|doctor` (env `VERIFY_PORT`) | Isolated server for `site/` on 8090 with a PID file |
| `scripts/check.mjs` | `node check.mjs [slug ...]` (env `VERIFY_PORT`, `VERIFY_URL`) | Per-page, per-viewport sweep; writes evidence; exits nonzero on failure |
