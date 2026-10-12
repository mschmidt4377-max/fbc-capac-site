# FBC Capac site verification map

This directory is the maintained source for verifying the user-facing behavior of the First Baptist Church of Capac static site. Read this index before driving the site, then use the matching feature file as the recipe.

## Baseline preconditions

- Serve the site with `.claude/skills/verify/scripts/serve.sh start`; it listens at `http://127.0.0.1:8090` (override with `VERIFY_PORT`).
- Run `.claude/skills/verify/scripts/serve.sh doctor` and require `OK`.
- Playwright resolves from `tools/node_modules`; run `cd tools && npm ci` if it is missing.
- Never drive port 8080 or any server this run did not start.
- Never submit the contact form for real: it posts to Formspree.

## Driving conventions

- Two viewports: desktop 1440x900 and mobile 360x780 (Galaxy S25: DPR 3, `isMobile`, `hasTouch`). The header burger only exists at the mobile layout (CSS breakpoint 900 px or less).
- Local URLs are `/<slug>/`; home is `/`. All links are relative, so also follow links by clicking, not only by `goto`.
- Prefer ARIA labels and class handles named in each feature file. Visible text is deliberately a copy of the live site, typos included; assert text by reading it from the page, not from memory.
- Run the sweep (`node .claude/skills/verify/scripts/check.mjs [slug ...]`) after any edit; use the feature recipes for behavior the sweep does not click through.

## Proof and skip reporting

- Capture the user action and the resulting state (class, attribute, rendered DOM), plus a screenshot.
- Evidence goes to `verify-out/<timestamp>/` and survives `serve.sh stop`.
- Report an unreachable path with the attempted command and the unmet precondition. Do not report a skipped entry point as verified through another path.
- Overflow at 360 px, console errors, and local 404s are findings. Report them as found.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Navigation and mobile menu](./navigation.md) covers the header links, the burger menu, and the footer on every page.
- [Events](./events.md) covers the home carousel, the events list, event detail pages, and the top banner.
- [Sermons](./sermons.md) covers the sermon audio archive page, the home audio row, and the home video embed.
- [Contact form](./contact.md) covers the Formspree form fields and validation without submitting.
- [Giving](./giving.md) covers the giving page and its Tithe.ly button.
