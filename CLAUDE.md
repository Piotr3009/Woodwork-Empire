# Turn 3: the visible path to work, machine tiers, and the first real pictures

Woodwork Empire. Autonomous overnight session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 12.09.2026, from the Petros memory store
(software/woodwork-empire: STAN, LOG, PODZIAŁ RÓL) and Piotr's second play of the game.

Read this whole file, then `docs/turn-1-brief.md` and `docs/turn-2-brief.md` (base design, still law
where nothing below changes it), then `docs/art/SPRITES.md` (the sprite contract this turn implements).
Where files disagree, this one wins. Everything in the Turn 1 brief about rules, architecture, stack,
report format and the do-not list applies unchanged.

No time cap. Zero questions. Skip-and-note as in Turn 1 section 12. Kill your background processes
before you end. Open the PR, do not merge, do not watch it, end the session.

---

## 0. What Piotr said after playing Turn 2

1. "Where is the button to go to work and make furniture?" He never saw Start production, because it
   only appears once the delivery is unloaded. He did not know what he was waiting for.
2. "Why three emails on such a small job?" Emails must scale with the job value, starting at one.
3. "There are no drawings in the office." He expects a Drawings object on the desk.
4. "Modals do not scroll. They scroll, then jump back to the top." A bug, not a setting.
5. "The cheapest saw is 5 k. 1.8 k can be a used one, slower, bags twice as often, a quarter of the
   life. A better new one 7 k, an expensive one 15 k, a very expensive one 25 k. Buying a saw should
   open a modal with tiles, an explanation, a description and a picture."

Plus: the art side (GPT) starts producing sprites to `docs/art/SPRITES.md`. Tonight the game learns to
show them.

---

## 1. State of the repo

- `main` after PR #2: Turn 1 + Turn 2, 387 tests green, CI green, Vercel deploys from `main` with no
  env. `turn-1-brief.md` sits in the repository root by mistake (housekeeping in T3-01).
- `REPORT-T2.md` section 8 lists 19 open questions. Piotr has answered some through this brief
  (section 3); the rest stay open and are not to be guessed.
- Tile size on screen is 48 × 24 (`src/render/iso.ts`), not the 64 × 32 of the Turn 1 brief. The sprite
  contract is written for 48 × 24 at 2x. Do not change the tile size tonight.

---

## 2. Rules restated (short)

All Turn 1 rules (section 2 and 3 there) plus the two Turn 2 additions (kill background processes;
retag `[TUNE]` to `[PIOTR]` when a number becomes the owner's). Tonight also:

- **The disabled-button exception grows by one case.** Turn 1 allowed a disabled Buy button with a
  reason. Tonight a disabled Start production with a reason is the second and last allowed case.
- **Sprites are files, never code.** No sprite is drawn in code. The loader shows a PNG when the file
  exists and the placeholder box when it does not. No inline base64, no generated art.
- **New files in `docs/`:** `docs/turn-2-brief.md` is created by T3-01 from the Turn 2 CLAUDE.md that
  is on `main` at the start of the night (the root CLAUDE.md before Piotr replaced it with this one is
  in git history: use `git show` on the merge commit of PR #2). Nothing else in `docs/` is touched.

---

## 3. Changes to the design (the contract)

### 3.1 The visible path to production `[PIOTR]`

- Every job card, everywhere it appears (laptop "Jobs on the books", board after acceptance, the
  event that confirms acceptance), shows **Start production** at all times from acceptance until the
  job is in production. Enabled only when the job is `ready for production` and unassigned. Disabled
  otherwise, with the reason as the button's text suffix and tooltip, in this order of precedence:
  "2 calls to make", "design not done", "material not ordered", "material arrives tomorrow",
  "unload the delivery", "waiting for material", "no extraction", "no free hands". Exactly one
  reason at a time, the one that blocks first in the lifecycle.
- The same card shows the lifecycle as a five-step row: Calls, Design, Material, Delivery, Production,
  each step done (filled), current (outlined) or pending (dim). One helper renders it, used by every
  card. This is the "what am I waiting for" answer.
- Clicking an enabled Start production behaves as in Turn 2 (owner assigned, hall view, figure at the
  bench).
- Test: a jsdom test that accepts an enquiry and asserts the disabled reason changes through the
  lifecycle in the order above as each step is completed.

### 3.2 Email curve `[PIOTR]`

Emails per job by price P: up to 3,000: 1; up to 10,000: 2; up to 20,000: 3; then one more for every
further 10,000 (30,000: 4, 40,000: 5 and so on). `[PIOTR gave the first two bands and the rule above
20,000; the 10,000 to 20,000 band as 3 is Claude's reading, report it]`. Email minutes stay 10. The
penalty rules of Turn 2 are unchanged. Retag.

### 3.3 Drawings on the desk `[PIOTR]`

- New office desk item `drawings` (roll of drawings, spriteKey `drawings`, footprint 2 × 1 × 1, on the
  desk beside the laptop). Click opens the **Drawings modal**: the design queue moves here from the
  laptop, with the same rows (job, minutes left, Start or Continue), plus the current software tier as
  text, plus a "Finished drawings" list of jobs whose design is done (job name, date done).
- The laptop keeps: office tasks today, workshop jobs of work, at the gate, jobs on the books. It no
  longer shows the design queue (one place per thing).
- Test: the design queue renders in the Drawings modal and not in the laptop.

### 3.4 Modal scroll bug `[PIOTR: "they scroll, then jump back"]`

Cause to confirm and fix: the open modal is re-rendered on every game minute, which replaces its
DOM and resets `scrollTop`. Fix without a framework, one path:
- The modal shell (header, body container, footer) is created once when opened; on each render only
  the body's inner content is replaced, and the body's `scrollTop` is captured before and restored
  after the replacement. If the content shrank, clamp to the new max.
- Focus in a text field inside a modal (the board filter, the arrears amount) survives a re-render:
  capture the active element by a stable `data-field`, restore focus and caret position after.
- Applies to every modal through `ui/modal.ts`; no per-modal special cases.
- Test (jsdom): open the Accounting modal with 80 ledger rows, set `scrollTop` to 500, tick one
  minute, assert `scrollTop` is still 500; type in the board filter, tick, assert the field still has
  focus and its value.

### 3.5 Machine tiers `[PIOTR: prices and the used-saw effects]` with `[TUNE]` factors

Data model: a **machine family** (table saw, edgebander, ...) with **variants**. Every purchasable
machine becomes a family with at least one variant; the catalogue lists families; clicking a family
opens the **Machine modal** with one tile per variant.

Table saw family, five variants:

| Variant id | Name | Price | Output factor | Bag interval factor | Endurance factor | Power per day |
|---|---|---|---|---|---|---|
| used | Used table saw | 1,800 `[PIOTR]` | 0.95 `[PIOTR: "slows 5%"]` | 0.5 `[PIOTR: bags twice as often]` | 0.25 `[PIOTR: a quarter of new]` | 3 `[TUNE]` |
| budget | Budget table saw | 5,000 `[PIOTR]` | 1.00 | 1.0 | 1.0 | 3 `[TUNE]` |
| standard | Standard table saw | 7,000 `[PIOTR]` | 1.05 `[TUNE]` | 1.2 `[TUNE]` | 1.2 `[TUNE]` | 4 `[TUNE]` |
| pro | Professional table saw | 15,000 `[PIOTR]` | 1.15 `[TUNE]` | 1.5 `[TUNE]` | 1.5 `[TUNE]` | 5 `[TUNE]` |
| industrial | Industrial table saw | 25,000 `[PIOTR]` | 1.30 `[TUNE]` | 2.0 `[TUNE]` | 2.0 `[TUNE]` | 7 `[TUNE]` |

- Output factor multiplies production speed of jobs that use the machine (stacks with the Turn 1
  labour reductions; one function computes the product).
- Bag interval factor multiplies the family's base bag interval (saw 2,400 minutes).
- Endurance: every machine gets `enduranceHours` = family base `[TUNE: saw 3,000 hours, edgebander
  4,000, thicknesser 2,500, others 5,000]` × endurance factor, and `hoursUsed`. Past its endurance a
  machine has the same breakdown chance per day as an overdue service (2%), on top of the service
  rule. Piotr will set the real hours per machine later: keep them all in one table in `constants.ts`.
- Every other family has one variant tonight, id `standard`, with the Turn 1 price and factors 1.0.
  The modal works for all of them, so adding variants later is data, not code.
- **Machine modal:** full-page like the board, one tile per variant: name, price, a three-line plain
  English description of what this class of machine is `[write them; no brands]`, the four effects as
  short lines ("Output +15%", "Bags every 3,600 min", "Life about 4,500 hours", "Power 5 a day"), a
  picture slot (the sprite loader from 3.6 with the tier key; placeholder box when absent), and a Buy
  button (disabled with the reason when unaffordable or locked). The single accent button is Buy on
  the recommended variant: the cheapest one the player can afford.
- Existing saves and tests that referenced `tableSaw` map to `tableSaw` family, `budget` variant?
  No: the Turn 1 saw at 1,800 was a placeholder price. The starting purchase in the first ten minutes
  becomes the **used** saw at 1,800 so the day 1 cash flow of the scenarios changes as little as
  possible; update the scenario expectations and note the deltas in the report.
- Tests: buying the used saw halves the bag interval and applies 0.95 to a job's production; the
  industrial saw does 1.30; endurance runs down with `hoursUsed`; the modal renders five tiles for the
  saw and one for the compressor.

### 3.6 Sprite loader and the `/sprites` page (implements `docs/art/SPRITES.md`)

- `render/sprites.ts`: given a `spriteKey` and optional tier, returns the URL of the PNG to use, in
  this order: `public/sprites/<key>.<tier>.png`, `public/sprites/<key>.png`, none. Presence is known
  from a manifest `public/sprites/manifest.json` (array of file names) that the build reads; there is
  no runtime probing of 404s. A script `npm run sprites:manifest` regenerates the manifest from the
  folder; `npm run build` runs it first. An empty folder produces an empty manifest and the game
  looks exactly as it does today.
- In the hall and office SVG, an object with a sprite renders as an `<image>` element sized per the
  contract (canvas at 2x scaled by 0.5, anchored at the footprint's bottom corner, 8 px padding
  accounted for) in place of the placeholder box. The label stays as a tooltip only when a sprite is
  shown (no text over pictures). The contact shadow (a soft ellipse on the footprint's centre) is
  drawn by the game under both boxes and sprites.
- Machines with a running job overlay their effects from 3.7 on top of the sprite or the box.
- **`/sprites` test page** reachable from the Menu ("Sprite check", visible always): a grid of every
  `spriteKey` in the game, each cell showing the footprint diamond on a tile grid, the placeholder
  box, and the sprite if present, side by side, with the key, the footprint and the expected canvas
  size printed under it. Missing sprites show "no file". This page is the acceptance tool of the
  contract's checklist item 7.
- Tests: the fallback order; the anchor maths (a 4 × 2 × 2 sprite's `<image>` has the right x, y,
  width, height for a given tile); the manifest script; the `/sprites` page lists every key exactly
  once.

### 3.7 Machine effects in code

Small, cheap, on top of whatever the machine is drawn with:
- Table saw running: a spinning blade disc (a small circle with radial lines rotating via CSS
  animation) at the blade position, and a sawdust puff: 3 to 6 grey particles drifting down-right
  for 1.2 s, repeating while the machine is in use.
- Edgebander running: a slow blinking amber light.
- Extractor running: the top bag "breathes" (scale 1.0 to 1.04, 2 s loop); broken: red light,
  no breathing.
- Thicknesser running: a small chip stream like the saw's, from the outfeed side.
- Effects are pure presentation: driven by "machine in use this minute" from the state, no engine
  changes beyond exposing that selector. All animations are CSS on SVG groups; no timers in JS.
- Test: snapshot contains the blade group only while a job that uses the saw is in production.

### 3.8 Balance from the answered questions

From `REPORT-T2.md` section 8, Piotr has answered (through Claude) only what appears in this brief.
The overdraft on Easy stays 10,000 `[TUNE]`. The one-off software keeps 3,600 with the 30-job limit
`[PIOTR gave both; still open]`. Do not change any other Turn 2 value.

---

## 4. Task queue for tonight, in order

Branch `turn-3-visible-path` from `main` (the cloud environment may impose its own branch name; if it
does, say so in the report and carry on). One commit per task, `npm run check` green before every
commit, two report lines per task.

**T3-01 Housekeeping.** Move `turn-1-brief.md` to `docs/turn-1-brief.md`; create `docs/turn-2-brief.md`
from git history as described in section 2; fix any link in `README.md`. No content edits to either
brief. Done: both files exist under `docs/`, root has only the current `CLAUDE.md`.

**T3-02 Modal scroll and focus.** Section 3.4. Done: the two jsdom tests.

**T3-03 Visible path to production.** Section 3.1. Done: the lifecycle row helper, the always-present
button, the ordered-reasons test.

**T3-04 Email curve.** Section 3.2. Done: a test per band edge (3,000, 3,001, 10,000, 10,001, 20,000,
30,000, 40,000).

**T3-05 Drawings.** Section 3.3. Done: the desk item, the modal, the laptop without the design queue,
the test.

**T3-06 Machine families and variants.** Section 3.5 engine side: types, constants table, output and
bag and endurance effects, `hoursUsed`, breakdown past endurance. Done: the engine tests of 3.5.

**T3-07 Machine modal.** Section 3.5 UI side: the catalogue lists families, the modal with tiles,
descriptions, effects, picture slot, Buy with reasons. Done: the modal tests of 3.5.

**T3-08 Sprite loader.** Section 3.6 loader, manifest script, `<image>` rendering, contact shadow,
label as tooltip. Done: the four tests listed.

**T3-09 Sprite check page.** Section 3.6 page. Done: reachable from the Menu, lists every key once.

**T3-10 Machine effects.** Section 3.7. Done: the snapshot test.

**T3-11 Scenarios.** Update all four scripted months for the used saw at 1,800 and the email curve;
add (e) a month that buys the industrial saw on day 1 on Very easy and asserts the 1.30 output and
the doubled bag interval in the numbers.

**T3-12 Report and PR.** `REPORT-T3.md` in the Turn 1 structure, with the constants retagged section
and a "Sprite contract" section confirming which `spriteKey`s the loader knows (must equal the list
in `docs/art/SPRITES.md` sections 6 and the later batches, plus `drawings` and the saw tiers). Kill
background processes, push, PR titled `Turn 3: the visible path to work, machine tiers, and the
first real pictures`, do not merge, end the session.

If everything is done: raise engine test coverage and stop.

---

## 5. Do not (tonight)

1. No sprite drawn or generated in code; no placeholder PNGs committed to `public/sprites/`.
2. No PixiJS, canvas, sound, mobile layout, i18n, settings screen.
3. No change to the tile size, the projection, or the footprints (the contract depends on them).
4. No new machine variants beyond the saw's five and the single `standard` for the rest.
5. No persistence changes; the Supabase client stays dark without env.
6. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, or the archived briefs.
7. No watch loops, no PR polling, nothing left running.

---

## 6. Parked (list in the report)

1. Going home early with an empty hall (jump or run to 16:00): unanswered.
2. Overdraft on Easy and Very easy: 10,000 stays until Piotr confirms.
3. The one-off software bundle versus the 30-job limit.
4. Machine endurance hours per machine, service costs per machine: Piotr's table to come.
5. Tier variants for every other family.
6. Everything parked in the Turn 2 brief section 6.

End of brief.