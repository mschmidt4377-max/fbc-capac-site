# Navigation and mobile menu

Every page has the same header: logo, six links (Home, About Us, Services, Events, Giving, Contact), a Facebook icon, a "Join Us This Sunday" button, and on narrow screens a burger that opens a full-screen menu.

## Sub-features

- `nav-desktop` shows the six inline links in the header at 1440 px.
- `nav-active` marks the current page's link with `.active`.
- `nav-burger-open` opens the mobile menu: `body.menu-open` is set and `.burger` has `aria-expanded="true"`.
- `nav-burger-close` closes it by pressing the burger again or choosing a menu link.
- `nav-links` leads each link to a page that loads with HTTP 200 under a relative path.
- `nav-footer` shows the footer with the privacy link on every page.

## How to get to it (user POV)

- Open any page at desktop width and use the header links.
- Open any page at phone width and tap the `Open Menu` burger, then a `.mm-link`.
- Tap the footer `Privacy Policy` link.

## Driving it with Playwright

Preconditions:

- `serve.sh doctor` reports `OK`.
- A mobile context: viewport 360x780, `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true`.

- **Sweep.** Run `node .claude/skills/verify/scripts/check.mjs`. Every mobile row asserts the burger opens the menu; any `after clicking .burger` failure is a break of `nav-burger-open`.
- **Open menu.** Load `/about/`, run `page.click('.burger')`. `document.body.classList.contains('menu-open')` is true, `.burger` `aria-expanded` is `"true"`, and `nav.mobile-menu` becomes visible (`expect(...).toBeVisible()`; its opacity fades in over 0.3 s, so reading it immediately returns 0).
- **Pick a link.** With the menu open, run `page.click('.mobile-menu a.mm-link >> text=Events')`. The URL ends in `/events/`, `body` no longer has `menu-open`, and `html` has no inline `overflow: hidden`.
- **Toggle closed.** Open, then `page.click('.burger')` again. `menu-open` is gone and `aria-expanded` is `"false"`. The burger sits above the menu, so the click is not blocked.
- **Desktop links.** At 1440x900, `page.click('header nav >> text=Contact')` lands on `/contact/`, and that link has `.active` there. The `.burger` is not displayed.
- **Proof.** Screenshot the open menu (`-mobile-menu.png` from the sweep) and keep the `report.json` `menu` entry.

## Gotchas

- Opening the menu sets `overflow: hidden` on `<html>`. Taking a full-page screenshot with it open captures only the viewport, so the sweep shoots the page first and the open menu second.
- `.mobile-menu` is parked off-screen/invisible when closed; do not count it as overflow.
- The burger aria-label is `Open Menu` and does not change when open; assert `aria-expanded`, not the label.
- Event pages under `events/` use `../../` paths; click through from there to catch relative-link breaks.
