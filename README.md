# Woodwork Empire

A tycoon game about running a joinery workshop in the UK. This repository holds the prototype:
a pure simulation engine plus an intentionally ugly SVG prototype of the views.

The design contract for the current stage is `CLAUDE.md`. The briefs of the finished stages are
archived in `docs`: `docs/turn-1-brief.md`, `docs/turn-2-brief.md`, `docs/turn-3-brief.md`,
`docs/turn-4-brief.md`, `docs/turn-5-brief.md`, `docs/turn-6-brief.md`, `docs/turn-7-brief.md`,
`docs/turn-8-brief.md`, `docs/turn-9-brief.md`, `docs/turn-10-brief.md`, `docs/turn-11-brief.md`,
`docs/turn-12-brief.md`, `docs/turn-13-brief.md`, `docs/turn-14-brief.md`, `docs/turn-15-brief.md`,
`docs/turn-16-brief.md`, `docs/turn-17-brief.md`, `docs/turn-18-brief.md`,
`docs/turn-19-brief.md` and `docs/turn-20-brief.md`. The build reports are `REPORT-T1.md` to
`REPORT-T21.md`.

The sprite contract between the art side and the game is `docs/art/SPRITES.md`; the art Turn 13
asks for is listed in `docs/art/REQUESTS-T13.md`, the art Turn 14 asks for in
`docs/art/REQUESTS-T14.md`, Turn 16's in `docs/art/REQUESTS-T16.md`, Turn 17's in
`docs/art/REQUESTS-T17.md`, Turn 19's in `docs/art/REQUESTS-T19.md`, Turn 20's in
`docs/art/REQUESTS-T20.md` and Turn 21's in `docs/art/REQUESTS-T21.md`.

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
   month of rent and the first day of costs. Day 1 is the ordering and day 2 is the setting up:
   nothing you buy is in the building the day you pay for it.
2. Day 1, 08:00, hall view. An empty unit with three small rooms along the back wall. There is no
   shelving yet, and the line under the hall says so.
3. Press Office in the top bar, or click the office room in the hall. The room is bare: there is
   no desk and no laptop yet, so the catalogue is lying on the floor by the door. Click it and
   order: desk, chair, laptop, cordless drill, one workbench and the cheap shelving. The machines
   are families: press Open on the table saw and the page fills with its five classes, from a used
   one at 1,800 to an industrial one at 25,000, each with what it does to the speed of the bench,
   to the dust it makes, to the life of the machine and to the meter. Order the used saw, then the
   edgebander, the compressor and the extractor the same way. The cash drops at every click and
   not one minute of your day goes with it: nobody goes out for any of it. Every tile then says
   when its lorry is due.
4. There is nothing else to do with day 1. There is no laptop on the desk, so there is no order
   board and no drawing. The top bar says Orders with the count on it: press it and the list says
   what is on the road, the shortest wait first. Open the menu, press End day and let the clock
   run out. The summary says the day went on nothing at all, which is what a first day is.
5. Day 2, 08:00. One van at the gate with the whole of day 1 on it. The furniture, the hand tools,
   the bench and the shelving are carried in and stand themselves in the hall and in the office;
   the saw, the compressor and the extractor are two hours each and the event asks who takes them
   off. Unload them. The office now has a desk with a laptop on it.
6. Click the catalogue again and buy the one off software bundle: it goes on the laptop the moment
   you pay for it. Press Board. It fills the page with a tile per enquiry: the price, the sheets it
   takes, about how many of your own days, and what it needs. Accept one. Half the price lands as a
   deposit.
7. Click the laptop on the desk. Start the client calls and the emails, and watch the job card:
   Start production is on it from the day the job is accepted, greyed out with the one thing in
   its way. The drawing is on the Drawings tab. The minute bar fills with grey and purple. Press
   4x, which is two real minutes a game day. When the calls and the drawing are done, the material
   order appears: start that too.
8. The sheets come the next working day. A van stands at the gate and the event asks whether to
   unload now. Unload it (45 minutes), then press Start production on the job card, or Work here in
   the hall. The square slides between the bench and the table saw as it works.
9. When the piece is finished it stands at the gate and nothing is paid. Order transport: without a
   van a courier is 120 and the client has it the next working day. Then the balance lands with the
   rating.
10. Open Accounting. The top bar says "?" for today, because the books were never written up: the
    Accounting modal is frozen at the last day anybody wrote them. Do the bookkeeping in the laptop
    and everything comes back.
11. Press Set up hall and drag the table saw somewhere else. Green means it fits, red says why not.
    Press Done and the clock starts again. That is the game.

## Sprite check

The Menu has a Sprite check entry. It lists every sprite key the game can draw, with the footprint
the engine expects, the placeholder box, the picture beside it when there is a file, and the exact
canvas the art side has to hit. It is the acceptance page of `docs/art/SPRITES.md`.

Put delivered PNG files in `public/sprites/`, then run `npm run sprites:manifest` (the build runs
it first anyway). With no files the manifest is empty and the game draws its boxes as before.
