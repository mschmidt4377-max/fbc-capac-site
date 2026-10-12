# Giving

Visitors reach the giving page from the header and choose "Give Now", which opens the church's Tithe.ly form in a new tab. The owner will later wire a Tithely embed in its place.

## Sub-features

- `giving-page` shows the heading "Honor God Through Your Giving" and the "Give today" section.
- `giving-button` shows a `Give Now` link (`.give-btn`) that opens Tithe.ly in a new tab with `rel="noopener"`.

## How to get to it (user POV)

- Choose `Giving` in the header or mobile menu.
- Open `/giving-page/` directly.

## Driving it with Playwright

Preconditions:

- `serve.sh doctor` reports `OK`.

- **Reach it.** From `/`, click `header nav >> text=Giving` (desktop) or open the burger and click `.mm-link >> text=Giving` (mobile). The URL ends in `/giving-page/` and `h1` reads `Honor God Through Your Giving`.
- **Button.** `a.give-btn` is visible, reads `Give Now`, has `target="_blank"`, `rel` containing `noopener`, and an `href` on `give.tithe.ly`.
- **No navigation away.** Assert attributes only; do not click through to Tithe.ly, which is third party and needs the network.
- **Proof.** Screenshot both viewports and record the `href` value.

## Gotchas

- The page folder is `giving-page`, not `giving`.
- The current `href` is the old live Tithe.ly form; a `TODO owner` comment marks where the owner replaces it. A changed `href` is expected once they do, but it must remain an external HTTPS link.
- Clicking `Give Now` opens a popup in Playwright; avoid it unless the popup URL is the thing under test.
