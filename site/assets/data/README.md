# Managing Events

All events live in one file: **`events.json`** (this folder). The Events page, the Home page
"Upcoming Events" slider and every event page read from it. You never edit the web pages themselves.

An event shows up under **Upcoming Events** until its *end* date/time has passed. After that it
disappears from the Events list and the Home page, but its own page still works if someone has the link.

## The yearly routine: bring an old event back

1. Open `events.json` and find the event (search for its title).
2. Change `start` and `end` to the new date. Keep the format exactly: `"2027-07-12T09:00"`
   (year-month-day, then `T`, then 24-hour time: 9 AM = `09:00`, 7 PM = `19:00`).
3. Save. The event is Upcoming again. The text and photos stay as they are.

Tip: if the text mentions the date (like "Date: Sunday, October 28"), update that sentence in `body`
(and `excerpt`) too.

## Adding a brand-new event

Copy a whole `{ ... }` block of an existing event, paste it right after another block
(put a comma between blocks), and change:

| Field | Meaning |
|---|---|
| `slug` | Short web address name, lowercase letters, numbers and dashes only. Example `"fall-picnic"`. Must be different from every other event. |
| `title` | Event name. |
| `start` / `end` | Start and end, like `"2026-10-28T19:00"`. One-day event: same date in both. Multi-day: different dates. |
| `allDay` | Optional. Put `true` to hide the times. (Leave the line out otherwise.) |
| `image` | The picture on the Events list and Home slider, for example `"assets/img/fall-picnic.jpg"`. |
| `excerpt` | Short text shown on the Events list page. Optional. If left empty (`""`) the full `body` is shown instead. |
| `body` | Full text of the event page. |
| `gallery` | Optional. A list of pictures shown as a slideshow with thumbnails. |
| `registration` | Optional. `true` adds a sign-up form to the event page. |
| `registrationButton` | Optional. Words on the form button, for example `"Register"`. |
| `location`, `address` | Optional. Shown under the date on the event page (with a map link). |
| `page` | Leave this out for new events (see "Event page addresses" below). |

### Writing text (`excerpt` and `body`)

Text is written as simple HTML inside quotes, on a single line:

* A paragraph: `<p>Your words here.</p>`
* Bold: `<strong>bold words</strong>`   Italic: `<em>words</em>`
* A new line inside a paragraph: `<br>`
* A picture inside the text: `<p class="body-img"><img src="assets/img/photo.jpg" alt=""></p>`
* A quote mark `"` inside the text must be written `\"` (or use a typographic quote like “ ”).
  Emoji can be pasted in as normal.

## Photos

Put photo files in **`site/assets/img/`**, then refer to them as `assets/img/filename.jpg`
(no `../`). Use `.jpg`, `.png` or `.webp`. File names should have no spaces. Photos used in
`image` should be roughly landscape (3:2); the list crops them to fit.

## Event page addresses

* Events with `"page": true` (all the original ones) have their own folder:
  `site/events/<slug>/index.html`, giving the address `/events/<slug>/`.
* New events do **not** need a folder. Leave out `page` and the event is found at
  `events/view/?e=<slug>` (the Events list and Home page link there automatically).
* (Optional, developer) to give a new event a pretty address, copy any `site/events/<slug>/index.html`
  into a new folder named after the slug, change the `data-event="..."` value and the `<title>`, and
  add `"page": true` to the event.

## Sign-up (registration) form

Events with `"registration": true` show a form. It sends the entries to Formspree
(`https://formspree.io/f/YOUR_FORM_ID`). Replace `YOUR_FORM_ID` in `site/assets/js/events.js`
with your Formspree form ID (search for `YOUR_FORM_ID`). The email subject will read
"Registration: <event title>".

## Checklist if an event does not appear

* A comma between every `{ }` block, no comma after the last one.
* All quotes `"` are straight and paired; the dates look like `"2026-10-28T19:00"`.
* The `end` is later than today.
* You can check your file by pasting it into https://jsonlint.com.
