# Notes from v120: the house factory's frames held in memory

Built in chat on 19.10.2026 on v119 (STATE_VERSION 53, unchanged). Piotr, watching the factory at
speed: "now give the fix for the disappearing of the houses".

## 1. What happened

A station's picture changes at every sixteenth of its cycle (v117), and an SVG `<image>` whose
`href` moves to a file the browser has to go and get shows nothing until the file is down and
decoded: half a megabyte a frame, six stations at once, at 30x or 100x a change every second or
two. The browser's cache was no help: the dev server and `vite preview` send `Cache-Control:
no-cache`, and GitHub Pages' ten minutes run out, so every swap went to the network again. Measured
in Chromium at 100x: 48 requests for station frames in six seconds, each a full download.

## 2. The fix (`src/render/prefetch.ts`, `hall.ts`)

- `prefetch(urls, first)`: a queue, one file at a time, each URL once a page. `fetch` to a blob,
  `URL.createObjectURL`, one decode through an `Image`, and the blob kept (`cachedUrl(url)`).
  About half a megabyte a frame in memory, fifty for a whole factory.
- The hall, drawing a station, asks for the two frames after the one shown at the head of the line
  and then the rest of its sixteen and the empty picture (`prefetchStationFrames`), only the files
  that have landed; `objectArt` draws every picture through `cachedUrl`, so a station is drawn from
  its blob once held and from its file until then. Nothing else of the hall moved; a window line's
  pictures go on being files.
- Measured again, the same run: 102 files fetched within fifteen seconds of the hall opening, the
  stations drawn from `blob:` URLs, and no request at all during six seconds at 100x.
- A page without `fetch` or object URLs (the tests' jsdom) asks nothing and draws the files.

## 3. Tests

`tests/render/v120Prefetch.test.ts` (5): the queue's order, the one at a time, the blob held, a
failed file passed over, the hall's asking (the next two first, seventeen a station, once), a
station drawn from its blob and everything else from its file, nothing twice on a second page.
`APP_VERSION` v120.

## 4. Said the same evening, not done

Ten engineers walking the factory's metre cost the frame rate (measured: 38 to 21 frames a second
at 10x on a slow processor; the pictures cost nothing, halved they changed nothing): chat proposed
two drawn walking as on a window line, for Piotr's word.
