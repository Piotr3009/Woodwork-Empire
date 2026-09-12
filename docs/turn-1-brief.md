# Turn 1 brief (archived): engine skeleton and ugly prototype

Archived copy of the Turn 1 CLAUDE.md, merged in PR #1. It remains the base design of the game.
Where the current CLAUDE.md in the repository root changes something here, the root file wins.


Woodwork Empire. Autonomous overnight session brief for Claude Code (Opus, cloud environment).
Owner: Piotr (product owner, not a programmer). Programmer: Claude.
Spec author: Claude (chat), 11.09.2026, from the Petros memory store (biznes/nowe-pomysly, entry "Woodwork Empire").

Read this whole file before touching anything. It is long on purpose. Everything you need to work
through the whole night, however long it takes, without a single question is here. There is no time cap. If something is genuinely missing, apply the
skip-and-note rule (section 12) and keep going.

---

## 0. How to read this file

- Section 1 to 3: what the game is, who it is for, the rules you must obey.
- Section 4 to 5: architecture and stack (decided, not up for discussion tonight).
- Section 6 to 9: the full game design for Turn 1 with every number, formula and screen.
- Section 10: art direction and the placeholder art you build tonight.
- Section 11: the task queue for tonight in order, each with a definition of done.
- Section 12: rules of the night (skip-and-note, branch, PR, report).
- Section 13: hard "do not" list.
- Section 14: parked decisions (do not implement, list them in the morning report).

Numbers in this file are marked with their origin:
- `[PIOTR]` stated by the owner from his real business. Law. Do not change.
- `[TUNE]` placeholder chosen by Claude so the engine can run. Put it in `constants.ts`,
  mark it with the same tag in a comment, and never present it in the UI as a fact.
  Piotr will replace these values after playing the prototype.

---

## 1. What this game is

A tycoon / management game about running a real joinery (cabinet making) workshop in the UK,
built on Piotr's actual journey from an empty rented unit to a company. Reference feel: SimCity 2000,
RollerCoaster Tycoon, Airline Tycoon, Prison Architect. Not a cartoon, not a mobile farm.

Three things make it different from every other tycoon and every one of them is a hard requirement:

1. **Mega realistic.** Every mechanic comes from what actually happens in a workshop: business rates,
   the extractor bag that fills up, the client who calls while you are cutting, the material that
   always arrives tomorrow, the bailiff after three months of arrears. If a mechanic would not
   happen in a real UK workshop, it does not go in.
2. **A guide for someone who wants to start this business.** Under decisions there will be optional,
   dismissable explanations ("why it is like this in real life"). Not in Turn 1, but the engine must
   model the real thing so the explanations can be true later.
3. **The owner's time is the core resource.** The player has 480 minutes a day (8 hours). Every
   phone call, drawing, material order and bag change eats minutes from that pool until they hire
   someone to take it off them. "You cannot do everything yourself" is the whole first act.

Branching, not linear: the player can pick one specialisation and add another later as a branch, or
run several threads at once. Turn 1 builds only the trunk (rented unit, first tools, first jobs).

Working name: Woodwork Empire (formerly Joinery Empire). Name availability is not yet checked;
treat it as a working title in code and copy.

---

## 2. People and language

- Piotr: owner, product owner, plays the prototype, decides everything. Not a programmer. Communicates
  in Polish, terse, with typos. He will read this repo and the morning report.
- Claude (chat): designs with Piotr, writes specs like this one, audits your work in the morning.
- Claude Code (you): builds. Tonight: alone, no questions, no interruptions.

Language rules:
- All code, comments, identifiers, commit messages, UI copy, reports: **English**. Zero Polish in
  source files.
- UI copy: sentence case ("Order board", never "Order Board"). No exclamation marks in system copy.
  No "please", no "click here", no "successfully".
- **No em dash and no en dash anywhere.** Not in code comments, not in UI copy, not in the report,
  not in commit messages. Use a comma, a colon, a full stop, or brackets. Hyphens inside compound
  words (single-glazed, edge-bander) and the minus sign are fine. This is a standing rule of the
  owner and is checked in audit with a grep for the two characters.

---

## 3. Standing rules of this repo (from Petros, translated)

These are the owner's laws for every project in his family of repos. They apply tonight.

1. **Scope 1:1.** Build exactly what this spec says. No "safer" or "better" variants, no silent
   narrowing, no bonus features. Unrequested features are a defect, not a gift.
2. **Approved decisions are immutable.** If you find something in this spec that seems wrong or
   contradicts itself, do not "fix" the design. Implement as written where possible, and record
   the contradiction in the morning report (section 12), numbered, one line each.
3. **One code path per behaviour.** Never leave two parallel implementations of the same thing.
   A green test beside a duplicated path is a lie. If you must replace something, delete the old
   path in the same commit. After each task, count how many paths do the same job. More than one
   is a defect you name yourself.
4. **Engine numbers never enter the UI unasked.** All tunable values live in `engine/constants.ts`.
   The UI shows game facts (cash, minutes, dust level) but never exposes constants as settings,
   sliders, or debug fields. No settings screen tonight at all.
5. **New feature = visible entry in the UI, same commit.** A function without a clickable way to
   reach it is not done. The audit rejects it.
6. **Search for an existing working pattern in the repo before writing a new one.** Tonight the
   repo is empty, so this means: once you have written the projection helper, the modal helper,
   the task runner, reuse them. Name the reused module in the report.
7. **Never invent facts.** Where the spec says `[TUNE]`, put a placeholder and tag it. Where the
   spec is silent, do not fill the gap with something plausible: skip-and-note.
8. **Never blame the environment first.** If something does not work, the fault is in your code
   until proven otherwise with evidence.
9. **Modals:** scrollable when content may exceed the viewport (`overflow-y: auto` on the body,
   sticky header and footer), draggable by the header, never covering interactive content
   without a way to reach it. Every modal has a visible close control.
10. **Every text search or filter field gets a clear button (a cross)** visible when the field is
    not empty; click clears and refocuses. Tonight this applies to the order board filter if you
    build one, and to the equipment catalogue filter.
11. **UI contrast:** never everything white. Cards, panels and sections must sit on a visibly
    different background from the page. White on white is chaos.
12. **Number inputs never show spinners.** Values are typed. Hide spinners globally.
13. **Tombstone comments max 2 lines.** History of decisions lives in Petros and in the report,
    not in source files.
14. **Line balance in the report.** Lines added and lines removed per task.

---

## 4. Architecture (decided)

```
woodwork-empire/
  CLAUDE.md                 this file (do not edit tonight)
  README.md                 short: what it is, how to run, how to test
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  src/
    engine/                 pure simulation. NO DOM, NO window, NO Date.now, NO Math.random.
      constants.ts          every number in the game, tagged [PIOTR] or [TUNE]
      types.ts              GameState and all sub-types, JSON-serialisable
      rng.ts                seeded RNG (mulberry32), the ONLY source of randomness
      clock.ts              game time: minutes, days, weeks, months, weekends, speed
      game.ts               createGame(seed, difficulty), tick(state, minutes), applyAction(state, action)
      events.ts             event queue (things that pause the game and need a decision)
      economy.ts            cash, daily and periodic costs, debt, arrears, bailiff, bankruptcy
      owner.ts              owner minute pool, overtime, fatigue, absence
      tasks.ts              task definitions, who can do what, minutes, task runner
      catalog.ts            product templates
      board.ts              order board generation (reputation and tool gating, express, expiry)
      jobs.ts               job lifecycle: accept, call, design, material, unload, produce, deliver, pay, rate
      staff.ts              hiring pool, tiers, wages, assignment, management load, helper
      machines.ts           machine catalogue, labour reduction, bags, extractor, dust
      materials.ts          material orders, next-day delivery, stock capacity, overflow
      reputation.ts         rating updates and thresholds
      index.ts              public API of the engine
    render/
      iso.ts                isometric projection helpers (tile to screen, screen to tile)
      hall.ts               SVG hall view built from GameState (placeholder art)
      office.ts             SVG office desk view (placeholder art)
    ui/
      app.ts                bootstrap, view switching, game loop (requestAnimationFrame to engine ticks)
      topbar.ts             cash, date, time, speed controls, owner minute bar, Board, Hall/Office toggle
      modal.ts              reusable modal (draggable, scrollable, close control)
      board.ts              order board modal
      laptop.ts             laptop modal: design queue and office tasks
      accounting.ts         accounting modal
      catalogue.ts          equipment catalogue modal
      hiring.ts             hiring modal
      eventModal.ts         decision modal for paused events
      dayEnd.ts             end-of-day summary
      start.ts              start screen: difficulty, player name, company name
      styles.css
    main.ts
  tests/
    engine/                 Vitest unit tests, one file per engine module
    scenarios/              30-day scripted playthrough tests
  REPORT-T1.md              your morning report (section 12)
```

Rules that make this architecture hold:

- **The engine is a pure function library.** `tick` and `applyAction` take a state and return a new
  state (or mutate a cloned state, your choice, but be consistent and document it in `engine/index.ts`).
  No DOM. No timers. No `Date`. No `Math.random`. Everything random goes through `rng.ts` with the
  seed stored in the state so a game can be replayed deterministically.
- **`GameState` is plain JSON.** `JSON.parse(JSON.stringify(state))` must produce an identical state.
  No class instances, no functions, no Maps or Sets inside the state. This is what will later be
  saved to Supabase and what makes tests trivial.
- **The UI never computes economics.** If the UI needs a derived number (days remaining, labour cost,
  minutes left), the engine exposes a selector function for it. If you catch yourself writing
  `price * 0.4` in `src/ui`, stop and move it to the engine.
- **Rendering reads state, never owns it.** `render/hall.ts` takes `GameState` and returns an SVG
  string or element. It has no memory of its own.
- **One tick = one game minute.** The UI loop converts real elapsed time into game minutes using the
  speed setting and calls `tick` in whole minutes. Fractions accumulate in the UI, not the engine.

Why SVG tonight and not a canvas engine: the prototype must be ugly, inspectable and fast to change.
PixiJS is the planned renderer for Phase 2 when real sprites exist. Keep `render/iso.ts` free of SVG
so it can feed PixiJS later.

---

## 5. Stack and commands (decided)

- Vite + TypeScript (strict: `"strict": true`, `"noUncheckedIndexedAccess": true`).
- Vitest for tests. `npm test` runs the whole suite, never with `--silent`.
- ESLint with typescript-eslint recommended. `npm run lint` must pass with zero errors.
- No UI framework. Plain DOM with small helper functions. No React, no Svelte, no jQuery.
- No CSS framework. One `styles.css` with CSS variables for the palette (section 10).
- No backend tonight. No Supabase, no auth, no fetch, no localStorage (see section 13).
- Node 20+. `npm ci` must install cleanly on a fresh clone.

Scripts in `package.json`:
- `dev`: vite
- `build`: tsc --noEmit && vite build
- `test`: vitest run
- `lint`: eslint src tests
- `check`: npm run lint && npm run build && npm test

`npm run check` is the gate before every commit.

---

## 6. Time model

### 6.1 Clock `[PIOTR]` unless tagged

- The game clock covers the working day only: 08:00 to 16:00, 480 game minutes.
  Evening and night do not exist on the clock. When the owner's day ends (see 7.2), the engine runs
  the end-of-day processing and jumps to 08:00 next day.
- Speeds: paused, 1x, 2x, 4x. Nothing above 4x.
- 1x: one game day (480 minutes) = 180 real seconds `[PIOTR, "for testing, maybe 4 or 5"]`.
  Constant `REAL_SECONDS_PER_DAY_AT_1X = 180`.
- The game only runs while the browser tab is open and the game is not paused. Closing the tab
  freezes time (no persistence tonight; that is a later turn).
- Calendar: 7-day weeks, 12 months of 30 days `[TUNE, simplification for Turn 1]`. Day 1 is a Monday.
  Saturday and Sunday: no work, the clock skips both with a short weekend summary. Daily costs that
  apply on weekends (rent) still accrue. Living costs do not (see 8.1).

### 6.2 Events pause the game `[PIOTR]`

Anything that needs a decision stops the clock and opens the event modal:
- delivery arrived (needs unloading),
- machine stopped (bag full, extractor breakdown),
- end of day summary,
- weekly wages paid, monthly bills paid (informational, one click),
- arrears warning, bailiff visit, bankruptcy,
- owner sick,
- job overdue, job completed and paid, rating received.

The player never misses a decision because the clock was running fast.

In Turn 1 the client call is **not** an interrupting event. Enquiries sit on the order board. Accepting
one creates a "client call" task that eats owner minutes (see 8.4). Interrupting calls for jobs already
in progress (client changes, supplier, complaint) are parked for a later turn.

---

## 7. The owner

### 7.1 Minute pool `[PIOTR]`

- 480 minutes per working day. Every task the owner performs draws from this pool.
- The top bar shows the pool as a segmented bar: admin (grey), design (purple), workshop (green),
  free (empty). Numbers: `162 / 480 min`.

### 7.2 Overtime and going home `[PIOTR]` with `[TUNE]` details

- Hours 1 to 8: full efficiency (1.0).
- Hours 9, 10, 11, 12: efficiency 0.8, 0.6, 0.4, 0.4 `[PIOTR said 80/60/40 for hours 9 to 12; the
  fourth value is TUNE]`. Efficiency multiplies the work output of every owner minute in that hour.
- After 12 hours the owner goes home. There is no way to force more. The day ends.
- Fatigue `[TUNE]`: each overtime hour worked reduces next day's efficiency by 0.05, recovering
  fully after one normal day. Constant `FATIGUE_PER_OVERTIME_HOUR = 0.05`.
- The player ends the day voluntarily with an "End day" button at any time after 16:00 (or earlier,
  which counts as absence for the remaining hours, see 7.3).

### 7.3 Absence `[PIOTR]`

- If the owner is not in the workshop on a working day (sick, holiday, "I have 20k in the bank, I am
  not coming in for 3 days"), the company output that day drops by 30% (all staff production
  multiplied by 0.7) `[PIOTR]`.
- With a hired CEO the drop is 5% instead `[PIOTR]`. A rare "exceptional CEO" gives +15% instead of a
  drop `[PIOTR]`. CEO hiring is **parked** (section 14); model the constants, do not build the UI.
- Sick leave: once per game year, 4 to 5 days, random day `[PIOTR]`. Build it in `owner.ts` with the
  event "You are sick" (informational, the days pass with the absence penalty).
- Holidays and days off: parked.

### 7.4 "Take a day off" action

- Action `SKIP_DAY`: the owner does not come in. Living costs and all fixed costs still run, absence
  penalty applies. Visible entry: button in the top bar menu "Stay home today".

---

## 8. Economy

### 8.1 Money leaves every day `[PIOTR]`

All of this is visible in the Accounting modal, nothing arrives as a "letter".

| Cost | Cadence | Value | Origin |
|---|---|---|---|
| Living costs (family) | every working day Mon to Fri | 200 | `[PIOTR]` |
| Rent | every calendar day | monthly rent / 30 | `[PIOTR: rent is daily]`, rent amount `[TUNE]` |
| Business rates | every calendar day | monthly rates / 30 | `[PIOTR]`, amount `[TUNE]` |
| Power | every calendar day | base + per machine per day | `[PIOTR: depends on number of machines]`, amounts `[TUNE]` |
| Joiner wages | every Friday | weekly wage per employee | `[PIOTR: weekly]`, amounts `[TUNE]` |
| Admin / office staff | 1st of month | monthly salary | `[PIOTR: monthly]`, amounts `[TUNE]` |
| Software subscription | 1st of month | monthly fee, if subscription chosen | `[PIOTR]`, amount `[TUNE]` |
| Dust waste collection | 1st of month | 400, only once the dust system exists | `[PIOTR]` |

Placeholder values for the one starting unit `[TUNE, all of them]`:
`UNIT_AREA_M2 = 60`, `UNIT_RENT_MONTHLY = 1200`, `UNIT_RATES_MONTHLY = 450`, `UNIT_DEPOSIT = 2400`
(paid on day 1), `POWER_BASE_DAILY = 4`, `POWER_PER_MACHINE_DAILY = 3`, `BENCH_SLOTS = 4`,
`SHEET_STOCK_CAPACITY = 12`.

### 8.2 Difficulty `[PIOTR]`

| Difficulty | Starting cash | Unit |
|---|---|---|
| Very easy | 50 000 | bigger unit at a cheaper rent (`[TUNE]`: 90 m², rent 1000, 6 bench slots, 20 sheet capacity) |
| Easy | 20 000 | standard unit |
| Hard | 0, start on credit | standard unit, overdraft from day 1 |

Always from physical zero: empty unit, buy desk, chair, laptop, tools.

### 8.3 Debt, arrears, bailiff, bankruptcy `[PIOTR]` with `[TUNE]` numbers

- Cash may go negative: that is the overdraft. Interest `[TUNE]`: 2% per month on the negative balance,
  charged on the 1st. Constant `OVERDRAFT_MONTHLY_INTEREST = 0.02`.
- If a periodic cost (rent, rates, wages) is due and cash after paying it would be below the overdraft
  limit `[TUNE: OVERDRAFT_LIMIT = -10000]`, the cost is recorded as **arrears** instead of paid.
- Arrears counter in months. 1 month: warning event. 2 months: final warning. 3 months: **bailiff**
  event: the most valuable machine is seized and credited at 50% of its purchase price `[PIOTR]`,
  arrears reset by that amount.
- **Bankruptcy** (game over screen) when arrears reach 3 months and there is no machine left to seize,
  or when the overdraft exceeds twice the limit `[TUNE]`.

### 8.4 Job value split `[PIOTR]`

For every job with price P:
- Material cost = 0.40 P (drops when the player buys stock in advance, see 8.9).
- Labour value = 0.40 P.
- Profit = 0.20 P. Late delivery penalties come out of profit first.
- When the owner does the work himself, no labour cost leaves the company: the whole 0.60 P stays
  in the till. Example: job 800, material 320, 480 stays.

### 8.5 Labour in minutes `[PIOTR]`

- Owner productivity: 800 of job value per 480-minute day, i.e. labour value 320 per day,
  `OWNER_LABOUR_PER_MINUTE = 0.6667` (40 per hour).
- Minutes of workshop time for a job = labour value / labour rate of the worker.
- Worker tiers as a fraction of owner speed `[PIOTR]`: poor 0.60, normal 0.80, super 0.90. Nobody
  matches the owner.
- Example `[PIOTR]`: wardrobe 6400, labour 2560. Owner: 8 days. Normal joiner: 10 days.
  Poor joiner: 13.3 days.
- A worker's labour cost leaves the cash as wages (weekly), not per job. The per-job "cost" shown in
  the job card is informational: minutes multiplied by the worker's minute rate `[TUNE: wage / 2400]`.
- A job in production occupies its worker fully until done. A worker walks between machines
  (visual only tonight).

### 8.6 Machines reduce labour `[PIOTR]`

- Each machine has a labour reduction that applies to jobs using it. CNC: minus 20%. CNC tool changer
  head: further minus 5%. Reductions multiply: 0.8 × 0.95.
- Turn 1 machine catalogue (see 9.6) includes only the reductions of the starting tools and the first
  upgrades. CNC and spray booth are listed but locked with a price so the player sees the ladder.

### 8.7 Payments `[PIOTR]`

- Deposit 50% of P on acceptance `[PIOTR]`.
- Balance 50% on delivery if on time `[PIOTR]`.
- Standard late penalty: 5% of P per day late, taken from the balance. The client always pays the
  rest.
- Express jobs (8.8): price +20%, late penalty 30% of P per day late.
- Risky clients who do not pay: parked.

### 8.8 Order board and enquiries `[PIOTR]`

- No phone call to start a job. The player opens the order board (top bar button and the laptop) and
  sees enquiries.
- Each enquiry: product template, size variant, finish, price, deadline in days, express flag,
  expiry (days until it disappears from the board), required tools, visible reason if locked.
- Expiry: standard enquiries 3 days max, express 1 day.
- Refill: after an enquiry is taken or expires, the board draws a new one. Board size `[TUNE]`:
  reputation 0: 1 to 2 enquiries, most of them cheap; reputation 1: 2 to 3; reputation 2+: 3 to 5.
- Low reputation: cheap templates only, board often empty, poor tier enquiries. Rising reputation
  unlocks dearer templates and more enquiries.
- Some enquiries are visible but locked: "needs solid wood tools", "needs spray booth". They are
  shown greyed with the lock reason. This is deliberate: motivation to buy machines.
- The player may still take a job that is above their tools when the template allows a "by hand"
  path: duration +50% `[PIOTR]` and the job is flagged "made by hand". Turn 1: the oak dining table
  template allows this path. Reputation gain is normal; profit is normally zero or negative because
  of the extra minutes.
- Accepting an enquiry creates the job and its owner tasks (8.10).

Enquiry generation (`board.ts`):
1. Filter templates by `minReputation <= state.reputation`.
2. Weight by `templateWeight` (cheap templates heavier at low reputation).
3. Draw size multiplier uniformly from 0.8 to 1.6 `[PIOTR]`, round price to nearest 10.
4. Draw finish from the template's allowed finishes; laminate only unless a spray booth exists.
5. Draw deadline from the template's deadline range (days).
6. Express with probability `EXPRESS_PROBABILITY = 0.10 + 0.05 × floor(reputation)` `[TUNE]`.
7. Expiry: 3 days standard, 1 day express.
8. Never generate two identical enquiries side by side (same template, same price).

### 8.9 Materials `[PIOTR]`

- Ordering material is an owner task (8.10). Material **always arrives the next working day at 08:00**
  as a delivery event. A delivery must be unloaded (8.10) before production can start.
- Two purchasing modes, player's choice on the material order:
  - per job: cost 0.40 P, arrives next day, no stock needed;
  - stock in advance (buy sheets): cheaper `[TUNE: 0.34 P equivalent]`, ties up cash, takes sheet
    stock capacity. Jobs then draw sheets from stock instead of ordering.
- Standard vs bespoke material flag on the enquiry: bespoke `[TUNE]` arrives in 3 working days, is not
  returnable, costs +15%.
- Stock overflow: if a delivery does not fit in the sheet stock capacity, event with two choices:
  - leave it outside overnight: the surplus is lost in the morning (written off);
  - temporary storage: 150 paid now `[PIOTR]`, and the next morning a worker (or the owner) loses
    60 minutes fetching it `[PIOTR]`.

### 8.10 Owner tasks: minutes and who can take them `[PIOTR]`

| Task | Minutes | Who can do it | Notes |
|---|---|---|---|
| Emails (daily admin) | 60 per day | owner, office admin | appears every working day |
| Bookkeeping | 60 per day | owner, office admin | appears every working day |
| Material ordering (general daily) | 60 per day | owner, purchasing clerk, office admin | appears every working day while there are jobs |
| Client call (per accepted job) | 15 for P up to 1000, then +15 per further 1000 up to 200 `[TUNE curve]` | owner, salesman | 2 calls for P up to 1000, 3 up to 3000, 4 above `[PIOTR: 2 to 3 calls per job]` |
| Design (per job) | template design minutes × software factor | owner, designer (parked) | see catalogue; software basic 1.0, standard 0.5, pro 0.2 `[PIOTR: 5 to 80% faster]` |
| Material order (per job) | 30 for P up to 10 000; 200 at P = 100 000; linear between `[PIOTR]` | owner, purchasing clerk | a clerk handles about 16 job orders per day `[PIOTR]` |
| Site measure | 240 (half a day) | owner | only templates with `needsMeasure` (kitchen and up) `[PIOTR]`; without a van, taxi cost `[TUNE: 40]` |
| Unloading a delivery | 45 base `[TUNE]` | owner, any joiner, helper | forklift × 0.5, better forklift × 0.2 `[PIOTR]` |
| Bag change (per machine) | 15 | owner if he has minutes left, else a joiner (minus 15 of his production minutes), helper | `[PIOTR]` |
| Cleaning | 120 per week | owner, helper | if skipped, dust rises (9.7) |
| Staff management | 10 per joiner per day | owner | from 5 joiners a helper is required or the hall degrades `[PIOTR]` |
| Fetch from temp storage | 60 next morning | a worker or the owner | see 8.9 |

Rule from Piotr: **every hour the owner loses on calls, design and ordering pushes his workshop work to
the next day.** The task runner therefore processes owner tasks in this priority: forced events,
then admin tasks the player queued, then design, then workshop production. The player can reorder by
choosing which task to start from the laptop, but admin tasks never run silently in the background:
the player starts them (one click each) and the minutes tick off.

### 8.11 Reputation `[PIOTR]`

- Scale 0 to 5 with negatives allowed. Start at 0.
- Every client rates the company at job completion: on time +0.3, each day late minus 0.1,
  made by hand minus 0 (no penalty), express on time +0.5 `[TUNE weights]`.
- Rating changes are shown in the event modal when the job closes.
- Thresholds gating templates and the hiring pool are in `constants.ts` (`REPUTATION_TIERS`).

---

## 9. Content for Turn 1

### 9.1 Product catalogue `[PIOTR: products and prices]`, design minutes and calls `[PIOTR]`

| Template | Base price | Material | Design minutes (basic software) | Calls | Deadline range (days) | Needs measure | Required tools | Min reputation |
|---|---|---|---|---|---|---|---|---|
| Garage shelves | 400 | sheet | 30 | 2 | 10 to 20 | no | table saw, drill | 0 |
| Bookcase | 900 | sheet | 60 | 2 | 10 to 25 | no | table saw, drill, edgebander | 0 |
| TV unit | 1200 | sheet | 120 | 3 | 14 to 28 | no | table saw, drill, edgebander | 0.5 |
| Wardrobe | 1600 | sheet | 480 | 3 | 21 to 35 | no | table saw, drill, edgebander | 1.0 |
| Small kitchen (6 units) | 3500 | sheet | 720 | 4 | 28 to 42 | yes | table saw, drill, edgebander | 1.5 |
| Oak dining table | 12000 | solid wood | 480 | 4 | 42 to 60 | no | solid wood tools (locked); by-hand path allowed at +50% | 1.0 |

Finishes: laminate (always), lacquer (needs spray booth, locked in Turn 1), veneer (parked).
Size multiplier 0.8 to 1.6 on price and proportionally on design minutes and material.
Workshop minutes come from 8.5, not from this table.

### 9.2 Starting purchases (day 1 catalogue) `[PIOTR: items]`, prices `[TUNE]`

| Item | Price | Notes |
|---|---|---|
| Desk | 150 | required to use the laptop |
| Chair | 60 | |
| Laptop | 700 | required for design, board, accounting |
| Management software, one-off | 900 | works for 30 jobs, then must be bought again `[PIOTR]` |
| Management software, subscription | 60 per month | "quietly eats cash" `[PIOTR]` |
| Table saw | 1800 | bag every 2400 minutes of use `[PIOTR]`, 1 saw per 3 joiners `[PIOTR]` |
| Cordless drill | 120 | |
| Hand edgebander | 900 | bag every 4800 minutes `[PIOTR]` |
| Small compressor | 350 | |
| Extractor | 600 | required for bags to exist at all; can break down (9.7) |
| Workbench | 250 | one per worker; the unit has 4 bench slots |
| Locker | 80 | one per worker `[PIOTR]` |
| Canteen seat | 40 | one per worker `[PIOTR]` |
| Hand tool set for a worker | 400 | one per worker, bought by the owner `[PIOTR]` |
| Van | 9000 | removes taxi and transport costs `[PIOTR]` |
| Forklift | 6000 | unloading × 0.5 `[PIOTR]` |
| Better forklift | 12000 | unloading × 0.2 `[PIOTR]` |
| Thicknesser (solid wood tools, part 1) | 2500 | bag every 480 minutes `[PIOTR]`, used only on solid wood jobs |
| Planer, router, sander, clamps (solid wood tools, part 2) | 2200 | together with the thicknesser unlocks solid wood |
| CNC | 45000 | labour minus 20% `[PIOTR]`, locked (price shown) |
| CNC tool changer head | 9000 | further minus 5% `[PIOTR]`, locked |
| Spray booth | 18000 | unlocks lacquer, locked |
| Central dust extraction system | 35000 | no more bags, waste 400 per month `[PIOTR]` |
| Pelletiser | 15000 | needs the dust system, zero waste cost, +600 per month pellet sales rising with production `[PIOTR]` |

"Locked" means: visible in the catalogue with price and effect, buy button disabled with the reason
(not enough reputation, or "coming in a later stage"). This is the one allowed disabled button
pattern; give it a tooltip with the reason.

### 9.3 Hiring pool `[PIOTR: tiers and gating]`, wages `[TUNE]`

| Role | Tier | Speed vs owner | Weekly wage | Available from reputation |
|---|---|---|---|---|
| Joiner | poor | 0.60 | 480 | 0 |
| Joiner | normal | 0.80 | 640 | 1.0 |
| Joiner | super | 0.90 | 800 | 2.5 |
| Helper | | n/a | 420 | 0 |
| Office admin | | takes emails, bookkeeping, daily ordering | 1900 per month | 0.5 |
| Purchasing clerk | | takes per-job material orders, ~16 per day | 1700 per month | 1.0 |
| Salesman | | takes client calls | 2200 per month | 1.5 |

- Hiring is immediate (candidate starts next working day) `[TUNE]`.
- Each joiner needs: a free bench slot, a workbench, a locker, a canteen seat, a hand tool set. The
  hiring modal shows what is missing and the total cost to make the hire possible. Cannot hire without
  them `[PIOTR: "kurwa, jak w życiu"]`.
- Helper: takes bag changes, cleaning, unloading. Required from 5 joiners: without one, from the 5th
  joiner the hall gets dust and mess faster (multiply dust gain by 2) and productivity drops
  `[PIOTR]`.
- Machine ratio: 1 table saw per 3 joiners. If exceeded, every joiner above the ratio works at 0.8
  `[TUNE]` (queueing).

### 9.4 Job assignment `[PIOTR: automatic with manual override]`

- Automatic: a free joiner takes the oldest job whose material has arrived. The owner is assigned only
  when the player clicks "Work here" in the hall (the owner never auto-assigns).
- Manual: from the job card, "Assign" lets the player pick a specific worker or the owner.
- A worker on a job is busy until it completes.

### 9.5 Job lifecycle (state machine, `jobs.ts`)

`enquiry → accepted → calls pending → design pending → material ordered → material arrived (unload) →
ready for production → in production → completed → delivered and paid → rated`

Rules:
- Calls and design can run in any order the player chooses; both must finish before the material
  order task is available (you cannot order sheets for a design that does not exist).
- Material order task done at time T on day D: delivery event on day D+1 at 08:00 (bespoke: D+3).
- Unloading must happen before production; the delivery sits in the yard until then. Every day a
  delivery waits in the yard: dust and mess `[TUNE: not modelled tonight, note it]`.
- Production minutes = labour value / worker rate / efficiency × machine reductions × (1.5 if by hand).
- Delivery to the client is instantaneous at completion tonight (van logistics parked).
- Deadline is counted in calendar days from acceptance.

### 9.6 Machines, bags, extractor `[PIOTR]`

- Each machine tracks `minutesUsed` since the last bag change. When it reaches its bag interval the
  machine stops and raises the event "Bag full: table saw". Choices: owner changes (15 minutes from
  the pool, only if minutes remain), a joiner changes (15 minutes off his production), helper changes
  (free, automatic, no event if a helper exists).
- The extractor is one machine that serves all others. Breakdown `[TUNE]`: probability 1% per working
  day, rising to 3% when dust is high. When broken, dust rises at 3× rate and all machines stop until
  the repair task (90 minutes `[TUNE]`, owner or joiner, plus 150 cash `[TUNE]`) is done.
- With the central dust system no bags exist and the extractor cannot break down; waste collection
  400 per month is charged instead.

### 9.7 Dust and cleaning `[PIOTR]`

- `dust` is a number 0 to 100 in the state. It rises by `DUST_PER_PRODUCTION_MINUTE = 0.02` `[TUNE]`
  per minute of any production in the hall.
- Thresholds `[TUNE]`: 0 to 40 clean (no effect); 40 to 70 messy (productivity × 0.95); 70 to 90 dirty
  (productivity × 0.85, accident risk warning shown); 90 to 100 dangerous (productivity × 0.7 and a 2%
  per day chance of an accident event: a joiner is off for 3 days `[TUNE]`).
- Cleaning task: 120 minutes, resets dust to 0. Should be done weekly `[PIOTR]`. A helper cleans
  automatically every Friday at no owner cost.
- Visual: sawdust piles appear on the hall floor as dust rises (section 10). No side panel with dust
  stats: the hall shows its own state `[PIOTR]`. A small text label under the hall is allowed
  ("Hall: messy").

---

## 10. Views and art direction

### 10.1 Views (the player walks between places, no single dashboard) `[PIOTR]`

Every view shares one slim top bar:
- cash, today's net change (red or green),
- weekday, day number, clock,
- speed controls: pause, 1x, 2x, 4x,
- owner minute bar with segments and `n / 480 min`,
- buttons: Board, Hall or Office toggle, a small menu with "End day" and "Stay home today".
Nothing else lives in the top bar.

**Start screen.** Empty unit seen from outside (placeholder block). Difficulty (very easy, easy, hard),
player name, company name (default "Woodwork Empire"), one sentence: "You quit your job. You have some
savings and the trade. Find a unit." Start button.

**Hall view (main).** Isometric hall. Contains three small rooms of 4 m² each: office, WC, canteen,
drawn as blocks along one wall, each clickable (office opens the office view; WC and canteen show a
one-line tooltip tonight). Machines, benches (occupied or free), sheet stock rack with a count
`5 / 12`, workers as simple figures with a name label, the owner as a distinct figure, sawdust piles
that grow with the dust value, the extractor with a red state when stopped. Under the hall: three
buttons: "Work here" (assigns the owner to the oldest ready job), "Clean up · 120 min", "Fix extractor"
(only when broken). A delivery van appears at the gate when a delivery is waiting; clicking it opens
the unloading choice `[PIOTR: unloading is an event in the hall view, not a separate view]`.

**Office view.** Isometric desk with clickable items: laptop (opens the laptop modal), accounting
folder (accounting modal), materials and stock binder (materials modal: order per job or buy stock,
stock level), team board on the wall (hiring modal and staff list), equipment catalogue (catalogue
modal), phone (Turn 1: opens the order board, same as the top bar). Nothing else on screen. Design
queue and office tasks live inside the laptop `[PIOTR: "open the laptop, information in the laptop"]`.

**Laptop modal.** Two lists: design queue (jobs needing design, minutes remaining, Start or Continue
button, current software tier shown as text) and office tasks today (emails, bookkeeping, ordering,
client calls, per-job material orders, each with minutes and a Start button; done items greyed).
Starting a task assigns the owner to it; minutes tick off the pool while the clock runs; another task
can be started only when the current one is done or paused.

**Order board modal.** List of enquiries with template, finish, price, deadline, express badge, expiry
("expires in 2 days" / "expires today"), locked entries greyed with reason. Accept button. A filter
field with a clear cross if you build filtering (optional).

**Accounting modal.** Today: income, costs by category, net. This week, this month: the same. Cash,
overdraft, arrears months, next due dates (wages Friday, rent daily, rates daily, admin 1st). A running
ledger of the last 50 entries.

**Event modal.** Title, one paragraph, 1 to 3 choice buttons. The clock is paused while open.

**End of day summary.** Minutes used by category, jobs progressed, money in and out, dust level,
tomorrow's deliveries. Button "Next day".

**Game over screen.** Bankruptcy: what happened, how many days survived, restart button.

### 10.2 Art direction for the final game (context, not tonight's job)

2D isometric, realistic, not cartoon. One main camera. Objects will be modelled in 3D and rendered
to 2D sprites so that angles stay consistent across the workshop. Machine detail views may open as
modals later (e.g. a close-up of the saw). No in-game 3D: "too much work" `[PIOTR]`.

Claude Code cannot produce realistic rendered art. Tonight's art is **placeholder geometry** that fixes
the grid, the projection, the footprints and the anchors so real sprites can drop in later without
touching the engine or the layout code.

### 10.3 Placeholder art rules for tonight

- Projection: 2:1 dimetric ("isometric" in game terms). Tile 64 × 32 px on screen. World unit: one tile
  = 0.5 m × 0.5 m. The 60 m² unit is 12 m × 5 m = 24 × 10 tiles `[TUNE: proportions]`. Very easy unit
  90 m² = 15 m × 6 m = 30 × 12 tiles.
- `render/iso.ts`: `tileToScreen(x, y, z = 0)`, `screenToTile(px, py)`, `footprintPolygon(x, y, w, d)`,
  `boxPolygons(x, y, w, d, h)` returning top, left and right faces. Pure functions, no SVG.
- Every placeable object has a `footprint` in tiles (w × d), a `height` in tiles for the placeholder
  box, an `anchor` (bottom-left tile), and a `spriteKey` string that is unused tonight but present
  in the type so the sprite pipeline can map to it later.
- Placeholder objects are flat-shaded boxes with three faces (top lighter, right darker) and a text
  label inside or below. Palette per category (CSS variables in `styles.css`):
  rooms: warm grey; machines: muted purple; benches: teal; stock: amber; extractor: red when stopped,
  grey when fine; workers: small capsule figures in blue, the owner in green.
- Sawdust: grey ellipses scattered near machines. Count = `round(dust / 10)`, radius grows with dust.
- Floor: light concrete polygon, thin darker grid lines every tile (optional, keep it cheap).
- Rooms are boxes drawn along the back wall; their labels are the room names in sentence case.
- No gradients, no shadows, no textures. Flat colours. It is meant to look like a plan, not a game,
  tonight.
- Placement tonight: fixed layout from `constants.ts` (`STARTING_LAYOUT`), items appear when bought.
  Free placement by the player is parked.

### 10.4 UI style rules

- Page background slightly darker than panels; panels and cards on a lighter surface with a 1px
  border. Never white on white.
- One accent colour for the single primary button per view. Everything else outlined.
- Body 14 px, labels 12 px, never below 11 px. One font family from the system stack.
- Money formatted with a thin space or comma as thousands separator and no decimals: `£18,340`.
- Minutes always as `n min`. Days as `n days`. Dates as `Mon, day 6 · 10:42`.
- No emoji. Icons: none tonight, text labels only, or inline SVG paths you draw yourself if a
  label is unreadable.
- Modals: draggable header, scrollable body, sticky footer with the action buttons, close cross top
  right, open beside the clicked object where possible (hall and office items), centred otherwise.

---

## 11. Task queue for tonight, in order

Do them in this order. Each task ends with `npm run check` green, one commit with the task id in the
message (`T1-03: ...`), and a two-line entry in `REPORT-T1.md`. Do not start the next task with a red
check. If a task cannot be finished, mark it in the report and move on (section 12).

**T1-01 Scaffold.** Vite + TS strict + Vitest + ESLint, folder tree from section 4 with empty index
files, scripts from section 5, README with run and test instructions, `.gitignore`, `.editorconfig`.
Definition of done: fresh clone, `npm ci && npm run check` passes with one trivial test.

**T1-02 Constants and types.** `constants.ts` with every number from sections 6 to 9, each with a
`[PIOTR]` or `[TUNE]` comment. `types.ts` with `GameState`, `Job`, `Enquiry`, `Worker`, `Machine`,
`Task`, `GameEvent`, `Ledger`, `Difficulty`, `Speed`. JSON-only shapes. Done: types compile, a
serialisation round-trip test on a sample state passes.

**T1-03 RNG and clock.** `rng.ts` (mulberry32, `next()`, `int(min, max)`, `pick(arr)`, `chance(p)`),
seed in state. `clock.ts`: minute ticking, day boundaries at 480 minutes or at owner going home,
weekends skipped, month roll-over, `isWorkingDay`, `weekday`, speed value stored in state. Done:
tests for day/week/month boundaries and determinism (two games with the same seed and the same
actions produce identical JSON after 1000 ticks).

**T1-04 Economy.** Daily costs, weekly wages, monthly items, deposit on day 1, overdraft interest,
arrears counter, bailiff seizure, bankruptcy flag, ledger entries for every movement. Done: tests for
each cadence, a 90-day test that reaches bailiff when income is zero on Hard, and a 30-day test that
survives on Very easy.

**T1-05 Owner and tasks.** Minute pool, efficiency by hour, fatigue, go home at 12 h, absence penalty,
`SKIP_DAY`, task definitions from 8.10 with `minutes(job)` functions, task runner that consumes owner
minutes per tick, assignment of tasks to admin staff when present. Done: tests for the call minute
curve, the material order minute curve, overtime efficiency, and "one hour lost pushes production
to the next day".

**T1-06 Catalogue and board.** Templates from 9.1, enquiry generation per 8.8 with reputation and tool
gating, express, expiry and refill. Done: tests that reputation 0 never yields a wardrobe, that
express expires after one day, that a locked enquiry carries its lock reason, and that 1000 draws
never produce two identical adjacent enquiries.

**T1-07 Jobs.** Full lifecycle 9.5 with calls, design, material order, next-day delivery, unloading,
production minutes with worker rates and machine reductions, by-hand path, deadline, penalties,
deposit and balance, rating update. Done: scenario test "garage shelves on Easy": accept on day 1,
finish calls and design, order material, delivery day 2, unload, produce, paid, rating +0.3, cash
movements match 8.4 exactly.

**T1-08 Staff.** Hiring pool by reputation, prerequisites (bench slot, bench, locker, seat, tool set),
weekly wages, automatic assignment and manual override, management minutes, helper effects, machine
ratio queueing. Done: tests for prerequisites blocking a hire, a poor joiner taking 13.3 days on a
6400 wardrobe, and the 1-saw-per-3-joiners slowdown.

**T1-09 Machines and dust.** Catalogue from 9.2 with locks, bag intervals and the bag full event,
extractor breakdown and repair, dust accumulation, thresholds and productivity multipliers, cleaning
task, helper auto-clean, dust system and pelletiser effects on monthly costs. Done: tests for a saw
stopping at 2400 minutes, a joiner losing 15 minutes on a bag change when the owner has no minutes,
dust crossing 70 lowering productivity, and the dust system removing bag events.

**T1-10 Materials.** Per-job and stock purchase modes, bespoke flag, sheet stock capacity, overflow
event with both outcomes. Done: tests for next-day arrival, bespoke three days, overflow write-off,
and the 150 plus 60 minutes temp storage path.

**T1-11 Render.** `iso.ts` with tests (round-trip tile to screen to tile). `hall.ts` and `office.ts`
producing SVG from state per 10.1 and 10.3, including the delivery van at the gate and the sawdust
piles. Done: a snapshot test that the SVG for the day-1 state contains the three rooms, the bought
items and no unbought items.

**T1-12 UI.** Everything in 10.1: start screen, top bar, hall and office views, all modals, event
modal, end-of-day summary, game over screen, game loop with speed, pause on event. Every engine
action reachable by a click (rule 3.5). Done: manual run-through script in the README ("first 10
minutes") that you actually perform in a headless browser if Playwright is available in the
environment, or at minimum a `vite build` that succeeds plus a DOM smoke test with jsdom that mounts
the app, starts an Easy game, accepts the garage shelves enquiry and asserts the job appears in the
laptop design queue.

**T1-13 Scenario tests.** `tests/scenarios/`: (a) 30 game days on Easy with a scripted decision list
that takes shelves, bookcase and TV unit, hires nobody, and ends with positive cash and reputation
above 0.5; (b) 30 days on Hard doing nothing, ending in arrears warning; (c) determinism replay of
scenario (a). Done: all three pass and run under 10 seconds total.

**T1-14 Report and PR.** `REPORT-T1.md` per section 12, push the branch, open a PR to `main` titled
`Turn 1: engine skeleton and ugly prototype`. Do not merge. Done: PR exists, CI (if any) green,
report committed.

If you finish early: do not add features. Improve test coverage of the engine, tighten types, and
write the "why it is like this in real life" explanation strings for the events that already exist
(as data in `constants.ts`, not shown in the UI yet). That is the only extra work allowed.

---

## 12. Rules of the night

- Environment: Claude Code **cloud** session (never a terminal on Piotr's machine). Branch:
  `turn-1-engine-skeleton` from `main`. Commit per task. PR at the end. Never push to `main`.
- **Zero questions.** Piotr is asleep. Nothing you can ask will be answered before morning.
- **Skip-and-note.** When something is missing, contradictory, or impossible: implement the closest
  thing this spec clearly supports, or leave a typed stub that throws `NotImplementedError` with the
  task id, and write a numbered line in `REPORT-T1.md` under "Open questions for Piotr". Do not
  invent a design to fill the gap. Do not stop the session.
- **No refactor sprees.** Build forward. If task 9 reveals task 4 was wrong, fix task 4 minimally, keep
  one code path, note it.
- **Tests are not optional** and never run with `--silent`. A task without its tests is not done.
- **`npm run check` before every commit.** A commit on a red check is a defect you name in the report.
- **No em dashes, no en dashes.** Run `grep -rn --include=*.ts --include=*.md --include=*.css --include=*.html -e $'\u2014' -e $'\u2013' src tests README.md REPORT-T1.md` before the PR. It must return nothing.
- **Do not edit `CLAUDE.md`.** It is the contract. Corrections go in the report.

`REPORT-T1.md` structure, numbered, English, short lines:

```
# Report: Turn 1

## 1. Done
T1-01 ... one line each, with commit hash

## 2. Not done or partial
T1-xx ... reason, what exists, what is stubbed

## 3. Tests
count by module, total, runtime, command

## 4. How to run
npm ci, npm run dev, npm test, the first-10-minutes script

## 5. Deviations from CLAUDE.md
numbered, one line each: what, why, where in code

## 6. Duplicate paths
"How many code paths do the same thing?" Answer per behaviour. Target: one.

## 7. Line balance
added / removed per task

## 8. Open questions for Piotr
numbered 1, 2, 3, each standing on its own without reading the rest, so he can answer with numbers

## 9. Known risks
honest list: what is untested, what is placeholder, what will not scale
```

---

## 13. Do not (tonight)

1. No Supabase, no auth, no network calls of any kind.
2. No localStorage or sessionStorage. State lives in memory. A "Copy state as JSON" button in the
   accounting modal is allowed for debugging and is the only export.
3. No real art, no sprite pipeline, no PixiJS, no canvas. SVG placeholders only.
4. No sound.
5. No mobile layout. Desktop 1280 px wide minimum.
6. No i18n, no Polish strings.
7. No settings screen, no debug sliders for constants, no cheat menu.
8. No multiplayer, no monetisation, no Kickstarter, no Steam integration.
9. No free placement of equipment (fixed layout).
10. No CEO, designer, holidays, risky clients, veneer, van logistics, interrupting phone calls, accident
    model beyond the single event in 9.7, lacquer finish, or Mars. All parked (section 14).
11. No frameworks (React, Svelte, Vue), no CSS frameworks, no state libraries.
12. No editing of this file.

---

## 14. Parked decisions (list them in the report, do not build)

1. Unloading as its own view (tonight: van at the gate in the hall view).
2. CEO hiring and the exceptional CEO bonus.
3. Designers as staff.
4. Forced family holidays and days off beyond `SKIP_DAY`.
5. Risky clients that do not pay.
6. Interrupting client calls for jobs in progress (changes, complaints).
7. Van delivery logistics to the client's site.
8. Veneer and lacquer finishes (spray booth is listed but locked).
9. Free placement of machines and benches on the hall floor.
10. Real calendar (months of 28 to 31 days, bank holidays).
11. Persistence (Supabase project exists: `vdqnirthqpbnpqzcfzgm`, empty by design; schema will be
    derived from `GameState` in a later turn).
12. Explanations under decisions ("why it is like this in real life") in the UI.
13. Branching specialisations, land, sawmill, mergers, boards, multiplayer competition, Mars.
14. Monetisation model (recommendation on record: premium on Steam with a free demo and Kickstarter;
    decision deferred until the game is fun).

---

## 15. First 10 minutes (what the prototype must let a player do)

1. Start screen: pick Easy, enter names, start. Cash 20,000.
2. Day 1, 08:00, hall view, empty unit, deposit and first month rent already gone (Accounting shows it).
3. Enter the office, open the catalogue, buy desk, chair, laptop, table saw, drill, hand edgebander,
   compressor, extractor, one workbench. Watch the cash drop. Choose the one-off software.
4. Open the board: garage shelves 400 (and one or two more cheap enquiries). Accept the shelves.
5. Laptop: start the client call (15 min), start the design (30 min), start the material order (30 min).
   Emails and bookkeeping sit there too (60 + 60). The minute bar fills. Speed 4x.
6. End day 1. Summary shows that the owner spent the day on admin and produced nothing.
7. Day 2, 08:00: delivery van at the gate. Unload (45 min). Click "Work here". Production ticks.
8. Shelves complete. Event: paid balance, rating +0.3. Accounting: 400 in (200 deposit, 200 balance), 160 material out, and the
   daily costs quietly took more than the profit. The player understands the loop.
9. Board refilled: a bookcase, and a greyed oak dining table "needs solid wood tools" with a "by hand,
   +50% time" option visible on the enquiry.
10. The player decides. That is the game.

End of brief.
