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
