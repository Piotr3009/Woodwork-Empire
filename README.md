# Woodwork Empire

A tycoon game about running a joinery workshop in the UK. This repository holds the Turn 1
prototype: a pure simulation engine plus an intentionally ugly SVG prototype of the views.

The full design contract for this stage is `CLAUDE.md`. The build report is `REPORT-T1.md`.

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
minimum. Nothing is persisted: closing the tab loses the game.

## Test

```
npm test
```

## Gate before every commit

```
npm run check
```

That runs `npm run lint`, `npm run build` (type check plus production build) and `npm test`.

## Layout

- `src/engine` pure simulation. No DOM, no timers, no `Date`, no `Math.random`.
- `src/render` isometric projection helpers and SVG builders that read `GameState`.
- `src/ui` bootstrap, top bar, views and modals. Plain DOM, no framework.
- `tests/engine` unit tests per engine module.
- `tests/scenarios` scripted multi-day playthrough tests.

## First 10 minutes (manual run through)

Run `npm run dev` and work through this. It is the same path the jsdom smoke test
(`tests/ui/app.test.ts`) drives, so if the test passes, this should too.

1. Start screen: pick Easy, type your name and the company name, press Start. The top bar shows
   about 17,300 in the bank: 20,000 less the unit deposit and the first day of costs.
2. Day 1, 08:00, hall view. An empty unit with three small rooms along the back wall and an empty
   sheet rack. Nothing else has been bought.
3. Press Office in the top bar, or click the office room in the hall. Click the catalogue and buy:
   desk, chair, laptop, table saw, cordless drill, hand edgebander, small compressor, extractor,
   one workbench. Then buy the one off software licence. Watch the cash drop.
4. Close the catalogue and press Board. The enquiries are no longer greyed out now the tools are
   there. Accept one. Half the price lands as a deposit.
5. Click the laptop on the desk. Start the client calls, then the drawing. The minute bar fills with
   grey and purple. Press 4x. When both are done, the material order appears: start that too.
6. Open the menu and press End day. Before 16:00 that means going home, so the top bar says so and
   the rest of the day runs without you. Let the clock run out: the summary says the day went on
   admin and nothing was made.
7. Day 2, 08:00. A van stands at the gate and the event asks whether to unload now. Unload it
   (45 minutes), then press Work here in the hall. Production ticks.
8. When the job lands, the event shows the balance paid and the rating. Open Accounting: the deposit
   and the balance are in, the material is out, and the daily costs have quietly taken a slice of it.
9. The board has refilled. A dearer template may sit there greyed out with the reason, and an oak
   dining table can be taken by hand at plus 50% time.
10. Decide. That is the game.
