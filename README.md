# Woodwork Empire

A tycoon game about running a joinery workshop in the UK. This repository holds the prototype:
a pure simulation engine plus an intentionally ugly SVG prototype of the views.

The design contract for the current stage is `CLAUDE.md`. The briefs of the finished stages are
archived in `docs`: `docs/turn-1-brief.md` and `docs/turn-2-brief.md`. The build reports are
`REPORT-T1.md` and `REPORT-T2.md`.

The sprite contract between the art side and the game is `docs/art/SPRITES.md`.

## Requirements

- Node 20 or newer
- npm 10 or newer

## Install

```
npm ci
```

## Run

```
npm run dev
```

Then open the address Vite prints (http://localhost:5173 by default). Desktop only, 1280 px wide
minimum.

## Test

```
npm test
```

## Gate before every commit

```
npm run check
```

That runs `npm run lint`, `npm run build` (type check plus production build) and `npm test`.

## Saving (optional)

Saving is off unless the build is given both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
Without them there is no Sign in on the start screen, no Save in the Menu, and no network call is
made at all. With them, the start screen offers a magic link sign in and Continue, the Menu offers
Save now and Load, and slot 1 autosaves at the end of every day.

Run `supabase/001_saves.sql` in the Supabase SQL editor first. Nothing in the game applies it, and
until the table exists the game says saving is not ready rather than failing.

## Layout

- `src/engine` pure simulation. No DOM, no timers, no `Date`, no `Math.random`.
- `src/render` isometric projection helpers and SVG builders that read `GameState`.
- `src/ui` bootstrap, top bar, views and modals. Plain DOM, no framework.
- `src/cloud` the Supabase client and the saved games, behind the two environment variables.
- `tests/engine` unit tests per engine module.
- `tests/scenarios` scripted multi-day playthrough tests.

## First 10 minutes (manual run through)

Run `npm run dev` and work through this. It is the same path the jsdom smoke test
(`tests/ui/app.test.ts`) drives, so if the test passes, this should too.

1. Start screen: pick Easy, type your name and the company name, leave the real-life notes on,
   press Start. The top bar shows about 19,000 in the bank: 20,000 less the unit deposit of one
   month of rent and the first day of costs.
2. Day 1, 08:00, hall view. An empty unit with three small rooms along the back wall. There is no
   shelving yet, and the line under the hall says so.
3. Press Office in the top bar, or click the office room in the hall. Click the catalogue and buy:
   desk, chair, laptop, table saw, cordless drill, hand edgebander, small compressor, extractor,
   one workbench and the cheap shelving. Then buy the one off software bundle. Watch the cash drop.
4. Close the catalogue and press Board. It fills the page with a tile per enquiry: the price, the
   sheets it takes, about how many of your own days, and what it needs. Accept one. Half the price
   lands as a deposit.
5. Click the laptop on the desk. Start the client calls and the emails, and watch the job card:
   Start production is on it from the day the job is accepted, greyed out with the one thing in
   its way. The drawing is on the roll of drawings beside the laptop. The minute bar fills with
   grey and purple. Press 4x, which is two real minutes a game day. When the calls and the drawing
   are done, the material order appears: start that too.
6. Open the menu and press End day. Before 16:00 that means going home, so the top bar says so and
   the rest of the day runs without you. Let the clock run out: the summary says the day went on
   admin and nothing was made.
7. Day 2, 08:00. A van stands at the gate and the event asks whether to unload now. Unload it
   (45 minutes), then press Start production on the job card, or Work here in the hall. The square
   slides between the bench and the table saw as it works.
8. When the piece is finished it stands at the gate and nothing is paid. Order transport: without a
   van a courier is 120 and the client has it the next working day. Then the balance lands with the
   rating.
9. Open Accounting. The top bar says "?" for today, because the books were never written up: the
   Accounting modal is frozen at the last day anybody wrote them. Do the bookkeeping in the laptop
   and everything comes back.
10. Press Set up hall and drag the table saw somewhere else. Green means it fits, red says why not.
    Press Done and the clock starts again. That is the game.
