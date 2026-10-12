# Sermons

Visitors can listen to Sunday sermons as audio: the newest sermon in a card, older ones in a list on `/sermons/`, and a compact "Audio Sermons" row on Home. Home also embeds the latest Facebook video. A GitHub Action fills `assets/data/sermons.json` and `sermon.json`; `assets/js/sermons.js` renders them.

## Sub-features

- `sermons-latest` fills `#sermon-latest` with the newest date, minutes, an `<audio controls>` player and a "Download MP3" link.
- `sermons-list` fills `#sermon-list` on `/sermons/` with every other sermon, each with a player.
- `sermons-home-row` shows the same card in the Home `.row-audio` section with an "All Audio Sermons" button to `/sermons/`.
- `sermons-fallback` keeps the "Coming soon" placeholder text if `sermons.json` is empty or fails to load.
- `sermons-video` embeds the `sermon.json` Facebook video in `#fb-feed` (iframe), or the Page feed plugin when `videoUrl` is empty.

## How to get to it (user POV)

- Scroll Home to the Audio Sermons row, press play, or choose "All Audio Sermons".
- Open `/sermons/` directly.
- Scroll Home to "Video Sermons" for the embedded Facebook video.

## Driving it with Playwright

Preconditions:

- `serve.sh doctor` reports `OK`.
- `site/assets/data/sermons.json` has at least two entries (check with `node -e`), otherwise `sermons-list` has nothing to show.

- **Latest card.** Load `/sermons/`. `#sermon-latest .sl-date` no longer reads `Coming soon` and matches the first entry's date (long weekday format). `#sermon-latest audio[controls]` has `src` equal to the first entry's `mp3`.
- **Download link.** `#sermon-latest a[download]` `href` equals the same `mp3`.
- **List.** `#sermon-list li` count equals `sermons.json.length - 1`; each has an `audio` and a `.sr-date`.
- **Home row.** Load `/`. `.row-audio #sermon-latest audio` has the same `src`; click `.row-audio a.btn` and land on `/sermons/`.
- **Video embed.** On `/`, `#fb-feed iframe` exists with `title="Latest sermon on Facebook"`. Its `src` is a facebook.com URL; do not wait for it to load (offline runs fail it harmlessly).
- **Proof.** Screenshot `/sermons/` after the list renders and record the audio `src` values. Do not press play against GitHub Releases in a proof run; the `src` and `preload="none"` are the contract.

## Gotchas

- The MP3s are on GitHub Releases, a third party. Playback needs the network and is not part of the local proof.
- `preload="none"` means no media request fires on load; absence of an audio request is correct.
- If the JSON fetch fails, `sermons.js` swallows the error silently and the placeholder stays. A `Coming soon` card is a failure when `sermons.json` has entries.
- `data-src` differs by page depth (`assets/data/...` on Home, `../assets/data/...` on `/sermons/`).
- At 360 px the Home page currently overflows horizontally from the Facebook video row (`div.fb-feed.is-video`); see the latest sweep report.
- Do not edit `sermons.json` or `sermon.json` to test; the archive workflow owns them.
