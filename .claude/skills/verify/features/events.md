# Events

Visitors see upcoming events as a scrolling carousel on Home, as a list on Events, and as individual event pages, all rendered by `assets/js/events.js` from `assets/data/events.json`. A top banner on every page announces the next upcoming event.

## Sub-features

- `events-carousel` scrolls the Home "Upcoming Events" cards with Previous and Next arrows, disabling an arrow at its end.
- `events-list` lists upcoming events on `/events/` with thumbnail, date tag, title and "View Event".
- `events-detail` renders one event page (`/events/<slug>/`, or `/events/view/?e=<slug>`) with body, optional gallery, and previous/next pager.
- `events-gallery` switches gallery slides with the thumbnail buttons.
- `events-banner` shows the next upcoming event in `.site-banner` and lets the visitor hide it.
- `events-empty` shows "No upcoming events." when nothing is upcoming.

## How to get to it (user POV)

- Scroll Home to "Upcoming Events" and press the arrow buttons.
- Choose `Events` in the header, then a title or "View Event".
- Open a card on the Home carousel.
- Follow the banner link at the top of any page.

## Driving it with Playwright

Preconditions:

- `serve.sh doctor` reports `OK`.
- Note today's date: upcoming is computed in the browser from `events.json`, so the list and carousel change as dates pass.

- **Carousel.** Load `/`, locate `.event-carousel`. Read `.event-list` `scrollLeft`, press `page.click('.event-carousel .next')`, wait until `scrollLeft` increases (smooth scroll). `.prev` becomes enabled. Press `.prev` and `scrollLeft` returns to 0 with `.prev` disabled.
- **Card opens detail.** Click the first `.event-card a.event-thumb`. The URL is `/events/<slug>/` and `main` renders a title.
- **List.** Load `/events/`. `article.eventlist-event` count equals the number of upcoming entries in `events.json`, or `.ev-none` reads `No upcoming events.`
- **Detail.** Load `/events/vbs/`. `.ev-body` is non-empty and the pager (`.ev-pg-prev`, `.ev-pg-next`) links resolve with 200.
- **Gallery.** On an event whose JSON has `gallery`, click `.ev-thumb:nth-child(2)`. That thumb and the matching `.ev-slide` gain `.on`.
- **Banner.** On any page, `.site-banner` shows a link to the next event. Click `.site-banner-close` (`aria-label="Hide this message"`) and reload; it stays hidden (`localStorage['fbc-banner-dismissed']`).
- **Proof.** Screenshot the carousel before and after pressing Next, and the list page.

## Gotchas

- Past events render nothing in the list or carousel; an empty list can be correct. Check `events.json` dates before calling it a bug.
- The Home carousel has hard-coded cards in HTML that `events.js` replaces once the JSON loads; wait for `networkidle` before counting cards.
- `.prev/.next` use smooth scrolling. Poll for the change; do not sleep a fixed time.
- Dismissing the banner writes to `localStorage`; use a fresh browser context per run so a dismissal does not hide it next time.
- Most event folders under `site/events/` are legacy Squarespace slugs (`vbs-bdhcw`, `family-movie-night-jd65z`); the sweep covers them all, but `events/view/` has an empty `data-event` and depends on `?e=`.
- At 360 px the Annual Harvest page currently overflows horizontally (`span.ev-pg-icon`); see the latest sweep report.
