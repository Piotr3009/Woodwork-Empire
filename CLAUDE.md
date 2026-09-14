# Turn 11: a cabinet for a top bar, a day you can read, and a shop that looks like paper

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 15.09.2026, from Piotr's play of
Turn 10 and the chat fixes v14 to v17 (Petros: software/woodwork-empire, STAN "Tura 11" points 1
to 15, the rule entries on UI style, single clicks, the top bar spec).

Read this whole file (first line must say "Turn 11"; if the root `CLAUDE.md` does not, stop and
report), then `docs/art/SPRITES.md` in full (sections 10 and 11 are the character and UI art
contracts), then `REPORT-T10.md`, then the archived briefs in `docs/`. Where files disagree, this
one wins. All standing rules apply (no em or en dashes, scope 1:1, one code path, constants never
in the UI, retag `[TUNE]` to `[PIOTR]`, kill background processes, PR without merge, end the
session, no PR watching, `npm run check` gated on its own exit code, every click single, one
`APP_VERSION` bump).

State of `main`: Turn 10 plus chat fixes v14 to v17 (board picture under the clock, book on the
floor and on the desk, the folder skin on the catalogue, save to file and load from file, Patrick
Hand as the title font, warnings at the foot of the catalogue, paper cards). 947 tests green,
`APP_VERSION` `v17`. UI art on `main`: `ui.folder.png`, `officeCompanyBoard.png`,
`catalogueFloor.png`, `public/fonts/PatrickHand-Regular.ttf`.

---

## 0. What this turn is for (Piotr, 14 and 15.09)

1. "The top bar: bigger, in the style of the game, dark green, readable. The boss's bar should
   show the whole day: what he did in the workshop, calls, emails, meetings, quotes, office; at
   the end of the day a percentage summary." (3.1)
2. "When I refresh the page my game should be there." (3.2)
3. "A started job's bar turns all green to the deadline. It should stay the length of the work
   and fill green as the work is done; if the work stopped it should stretch." (3.3)
4. "With a helper, I and the joiners stop unloading, cleaning and changing bags. And I cannot see
   him." (3.4)
5. The paper family on the other modals, the boards in the magnet style, the company board with
   its text. (3.5)
6. "At the top of the catalogue, a list of what to buy on day one." (3.6)
7. "The white squares on the laptop and the door still show." (3.7)
8. Piotr's answers to the Turn 10 risks: air for every bench, lacquer products, free rotation of
   light items, extraction on day 1 stays tight, Management stays empty. (3.8 to 3.10)
9. The owner's `phone` animation; cancel for material orders. (3.11, 3.12)

---

## 1. Rules restated (short)

Everything from Turns 1 to 10 and the chat fixes. Tonight in addition:

- **`APP_VERSION = 'v18'`.**
- **Two UI families and nothing else.** Paper on a folder (`.modal-folder`, `ui.folder.png`):
  catalogue, Team, Accounting, Drawings, every event modal. Cards on a steel magnet board
  (`.modal-board`, CSS only, no picture): Work Plan, Orders (the shopping list), the company board
  modal is the felt picture. A test asserts every modal id has exactly one of the two skins.
- **The title hand** (`--font-title`, Patrick Hand) on every title: modal heads, tile and card
  names, board titles, the top bar's cash, date and buttons. Numbers and running text stay in the
  body font.

---

## 3. Changes to the design (the contract)

### 3.1 The top bar: a machine cabinet `[PIOTR: the spec of 15.09]`

- Height about 70 px. Background the darkest machine green of the mockups, `#102518` to
  `#0a1a10`, a lighter top edge, a dark bottom edge, a rivet in each corner (CSS, no picture).
- Left: a cream **name plate** (gradient `#f3ecdc` to `#d9d1bd`, dark border, two rivet dots) with
  the cash in the title hand, 26 px, dark green, and "−£2,699 today" under it in red.
- Next: date and time in the title hand, 20 px, cream; under it the speed **knobs**: dark
  rounded buttons, the active one the game's orange (`--accent`) with a soft glow; Pause, 1x, 2x,
  4x, 10x.
- Middle: **the boss's day meter**, a dark inset panel with a small lamp (orange while he is on
  something, green when idle, grey when he is out or home), the text "Piotr's day · client call, 6
  min left" and "117 / 480 min" right aligned, and under it the **segment bar**: the 480 minutes
  (plus overtime when it runs) as coloured segments in the order they happened, one per task
  category: workshop `#2e9e5b`, calls `#378add`, emails `#7f77dd`, meetings `#c9a227`, site
  measure `#8e6a3a`, office (bookkeeping, ordering, design) `#e0731e`, fixing and bags `#d84a4a`,
  break and idle unpainted. **No legend under the bar.** Hovering the bar shows a tooltip (a small
  cream plate) with the legend and the minutes per category so far; every category the engine
  already has (`TASK_RULES.category` and the owner's production minutes) maps onto one of these
  seven, in one table.
- Right: **push buttons** (cream plates with a hard shadow, title hand, 16 px): Orders with a
  count, Board with a count, Hall or Office (whichever is not current), Menu. A button with
  something new for the player (new enquiries since last opened, a delivery landed) is orange.
- The version stays in the bottom right corner of the page.
- **Day end:** the day summary (the existing modal) gets a plate at the top: "Day 1 done" and the
  percentages per category ("Workshop 52% · Calls 8% · ..."), plus "480 of 480 min · overtime 0";
  the company board keeps the same percentages per week (3.5).
- Engine: the day meter needs `state.owner.dayLog`: an ordered list of `{category, minutes}`
  segments for today (merged when consecutive), reset at day start; the percentages come from it;
  the week's percentages are the sum of the days' logs kept in `reputationLog`'s neighbour
  `dayLogs` (last 7 days is enough). `STATE_VERSION` bump.
- Tests: the meter draws seven categories in the right order from a scripted day; the tooltip
  holds the minutes; the day end plate shows percentages that sum to 100; the bar is 70 px high;
  every button is on the single click list.

### 3.2 Browser autosave and Continue `[PIOTR]`

- One save module `src/cloud/store.ts` with a `SaveStore` interface (`write(text)`, `read()`,
  `clear()`) and one implementation tonight: the browser's local storage under one key
  (`woodwork-empire.save`). The file save of v15 and the cloud save of Turn 2 use the same
  encoder (`encodeSaveFile`) so every store holds the same bytes.
- Autosave: at every day start (after the morning settle), after every purchase, hire, accepted
  enquiry, completed move, and on every modal close. Never more than once a second (coalesced).
- Start screen: **Continue** (the saved company name and day on it) when a save exists and its
  version matches; **New game** asks "Start over? The saved game will be lost" once (a second
  button, not a double click) and clears the store. A save from another build is shown as "A
  saved game from an older build was found; it cannot be continued" and offered to be cleared.
- Menu: "Save to file" and "Load from file" stay; "Load from file" also writes the store.
- The Turn 1 rule against local storage is withdrawn by the owner (14.09) for exactly this module;
  nothing else in the code touches storage.
- Tests (jsdom): a purchase writes the store; reload with a store shows Continue and restores the
  clock; a mismatched version shows the notice and Continue is absent; New game clears it.

### 3.3 The Work Plan bar that fills `[PIOTR]`

- A job's bar is the length of its work at the rate it will get (the "at workshop average" or
  "for Tom" arithmetic of Turn 9) from its start day; before the start it is a dashed outline
  (as today); after the start the **outline stays** and the done minutes **fill it green from the
  left**. The outline's right edge is the projected end, never the deadline.
- When the job's clock does not move (waiting for a machine, the owner's day at home, the break,
  overtime debt, under extraction) the outline **stretches** by the lost time, so the projected
  end walks towards DL. Past DL the outline turns red and the label says "late by N days".
- DL stays its own red tick; "Latest start" stays for jobs not started.
- Tests: a started job's bar length equals its work minutes at its rate; 60 minutes of waiting
  stretch it by 60; a job past DL has a red outline.

### 3.4 The helper's chores, and the helper you can see `[PIOTR]`

- When a helper is employed and present, **unloading, bag changes and cleaning are his and only
  his**: the owner's "never idle" queue skips them, joiners are never assigned them, the van and
  the bags wait for him (the status says "waiting for the helper"). The player can still send the
  owner with the explicit "Work here" / "Unload it yourself" buttons; that is an override for that
  one task.
- Without a helper everything stays as today.
- The helper's figure: fix whatever hides him (reproduce with a hired helper on day 2: his anchor,
  his station cell, the depth sort against the office block). His home station is the extractor
  when there is one, else the gate lane cell (2, 8); he is always inside the painted floor.
  Capsule until his sheet lands (`character.helper.*`).
- Tests: with a helper present the owner's next-task choice skips an unload; a joiner never gets a
  bag change; the helper's figure renders inside the floor polygon on day 2.

### 3.5 The two UI families, the boards, the company board text

- **Folder skin** (`.modal-folder`, already on the catalogue): Team, Accounting, Drawings, the
  hiring modal, and every event modal (the folder scaled down, as in the mockup). Tabs, cards,
  buttons and locked buttons per the v17 CSS; the day end summary too.
- **Board skin** (`.modal-board`, new, CSS only): dark steel (`#4a4f54` to `#3a3f44`, inner frame
  `#24282c`), a red magnet in the head, tabs as magnet strips, content as **cream cards held by a
  blue magnet at the top, tilted −1 to 1.5 degrees, with a shadow**; primary button light yellow
  `#f5e27a`, secondary cream, danger salmon `#ff8a80`, locked grey. Applied to Work Plan and the
  shopping list. Hover orange everywhere.
- **Company board:** the felt picture gets live text: on the felt above the sheet the company
  name and "Week 2 · +3" in the title hand (cream); on the pinned sheet the company output and
  its two column breakdown; **under both, in larger letters: "Reputation 5" and "Output 0.72"**
  (the totals, `[PIOTR]`). The wall board in the office shows the two totals only. The modal opens
  on the same picture full page.
- The office **hover rectangles** (laptop, door, boards, binder, catalogue): no fill at all, no
  border at rest; on hover a 2 px orange outline with 4 px radius, nothing else. The white boxes
  of today are gone `[PIOTR]`.
- Tests: the skin test of section 1; a hovered region has no fill in its computed style; the
  company board modal contains both totals.

### 3.6 The day one checklist `[PIOTR]`

- At the top of the catalogue (Office tab and every tab, until done): "Day one" card with the
  items a workshop needs first: desk, chair, laptop, software licence, table saw, cordless drill,
  hand edgebander, compressor, extractor, workbench, tool cabinet, sheet rack; each with a tick
  once bought or on order; clicking an item opens its folder. When every item is ticked the card
  collapses to one line "Day one kit complete" and stays collapsed. One constant lists the items.
- Test: the card lists twelve items, ticks a bought one, opens a folder on click, collapses when
  all are owned.

### 3.7 Lacquered products `[PIOTR: air rules that are alive]`

- Two templates with `finish: 'lacquer'`: "Lacquered kitchen" (sheet, 12,000 to 20,000) and
  "Lacquered wardrobe" (sheet, 3,500 to 6,000); they need the spray booth (else the board shows
  the reason "needs a spray booth"); Finishing runs at the booth; the Turn 10 dry air rule
  applies.
- Test: a lacquered job without a booth is greyed on the board; with a booth and no dryer the
  Finishing is 1.5× and the rating loses 1.

### 3.8 Air for every bench `[PIOTR]`

- Bench work (Assembly) uses the joiner's nailer and driver: 6 bar, 30 l/min per man while
  assembling (already in the Turn 10 demand table). With **no compressor** in the hall, or the
  bench's compressor short of litres, Assembly runs at 0.67 (`[TUNE]`, "no air: screws by hand")
  and the status says so; the catalogue says on the compressor tiles "benches and edgebanders
  need air".
- Test: two joiners assembling with no compressor run at 0.67; with a budget compressor at 1.0.

### 3.9 Free rotation of light items `[PIOTR]`

- In setup, R on a light item (bench, rack, cabinet, locker, seat, small compressors) turns it in
  place with no minutes and no ducting; on a heavy machine it is a move as today (the Turn 10
  behaviour). Test: rotating a bench costs nothing; rotating a saw books a move.

### 3.10 What stays as is `[PIOTR]`

Extraction on day 1 stays tight (used saw 800 against 830); the Management tab stays empty with
"Nothing here yet". No change, noted so nobody "fixes" them.

### 3.11 The owner on the phone

The `phone` animation from `character.owner.phone` plays while the owner's current task is a
client call; `idle` otherwise. Test: on a call the owner's image points at the phone sheet.

### 3.12 Cancel for material and for orders in transit

- The shopping list's Cancel works for material orders until the morning they land (full refund)
  and for equipment orders in transit (Turn 8 already; the "in transit" gap from REPORT-T8 closes).
- Test: cancelling a material order on the evening before delivery refunds it.

---

## 4. Task queue, in order

Branch `turn-11-cabinet-and-paper` from `main`. One commit per task, `npm run check` green on its
own exit code before each, two report lines per task.

**T11-01 Housekeeping and v18.** `docs/turn-10-brief.md` from git history; `APP_VERSION = 'v18'`;
the skin table of section 1 with its test (skins may be assigned as tasks land). Done.

**T11-02 Day log and categories.** 3.1 engine side: `dayLog`, the seven categories, day end
percentages, `STATE_VERSION`. Done: the engine tests.

**T11-03 The top bar.** 3.1 UI side. Done: the tests.

**T11-04 Autosave and Continue.** 3.2. Done: the tests.

**T11-05 The helper's chores and his figure.** 3.4. Done: the tests.

**T11-06 The Work Plan bar that fills.** 3.3. Done: the tests.

**T11-07 Folder skin on the rest, board skin, hover outlines.** 3.5 except the company board
text. Done: the skin test, the hover test.

**T11-08 Company board text and totals.** 3.5 company board. Done: the test.

**T11-09 Day one checklist.** 3.6. Done: the test.

**T11-10 Lacquer, air for benches, free rotation.** 3.7, 3.8, 3.9. Done: the tests.

**T11-11 Phone and cancel.** 3.11, 3.12. Done: the tests.

**T11-12 Scenarios.** Update the sixteen months for the day log and the bench air rule; add (q) a
month with a helper that asserts the owner never unloads and (r) a lacquered wardrobe with a booth
and no dryer.

**T11-13 Report and PR.** `REPORT-T11.md` in the usual structure plus "Numbers chosen" (every
`[TUNE]`) and "Skins" (every modal id with its skin). Kill background processes, push, PR titled
`Turn 11: a cabinet for a top bar, a day you can read, and a shop that looks like paper`, do not
merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the sprite files or the
   font file.
2. No new machine families, no sanding, no CEO, no Steam or Electron work.
3. No storage access outside `src/cloud/store.ts`.
4. No PixiJS, sound, mobile.
5. No watch loops, nothing left running.

---

## 6. Parked

1. Turn 12: the machine sprites repainted on templates (art), the helper and office staff sheets,
   sound, the "two turns of fixes and balance" before the Kickstarter demo, the Supabase cloud save
   switched on (SQL and keys), the Electron shell.
2. House 100 k and villa 500 k, 180 degree view, movable rooms, rates and power for 200 m².

End of brief.
