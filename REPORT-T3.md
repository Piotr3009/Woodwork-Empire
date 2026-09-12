# Report: Turn 3

The visible path to work, machine tiers, and the first real pictures.
Branch `claude/turn-3-execution-li4le0` (the cloud environment named it, not `turn-3-visible-path`:
CLAUDE.md 4 allows for that and asks for it to be said here).
Base: `main` at `28aa84b`, which is PR #2 plus Piotr's `gpt/fullscreen-hall-office` and the Turn 3
brief itself.

---

## 1. Done

T3-01 `fd7a3f2` Housekeeping. `turn-1-brief.md` moved to `docs/turn-1-brief.md`, the Turn 2
CLAUDE.md taken out of the PR #2 merge commit and archived as `docs/turn-2-brief.md`, neither of
them edited, and the README pointed at both and at the sprite contract. The repository root now
holds only the current `CLAUDE.md`.

T3-02 `5d5d705` Modal scroll and focus. The cause was confirmed: `render()` replaced the whole page
HTML on every game minute, which threw the open modal away with it. The page and the modal layer
are now two halves of the root. A modal shell is built once when it opens; each render only
replaces its body content, with the scroll captured before and put back after, clamped when the new
content measures shorter. The caret is captured by `data-field`, which every input already carried,
so the second attribute that did the same job is gone.

T3-03 `ff72bbc` The visible path to production. Start production is on every job card from the day
the job is accepted until somebody is on the job, disabled with exactly one reason, taken in
lifecycle order. Beside it, one helper draws the five steps Calls, Design, Material, Delivery,
Production as done, current or pending. The hall block moved from `game.ts` into `jobs.ts`, so the
card and the bench read the same function, and the rack can now be asked without being emptied.

T3-04 `a98efa9` Email curve. One email up to 3,000, two up to 10,000, three up to 20,000, then one
more for every further 10,000. The emails stopped borrowing the call curve. Minutes and penalties
unchanged.

T3-05 `2a48c86` Drawings. A roll of drawings on the desk beside the laptop, with the design queue,
the licence the drawings are done on, and a list of everything already drawn with the day it was
finished. The laptop keeps the office tasks, the workshop jobs of work, the gate and the books.

T3-06 `6a7e973` Machine families and classes. Every catalogue line is a family with at least one
class. The table saw has five, with what each does to the speed of the bench, to the bag, to the
hours in the machine and to the meter. A machine books its hours as the bench works, and past its
endurance it gives up as often as one that never sees a service, on top of the service rule.

T3-07 `080a01d` Machine modal. Choose on a machine fills the page with one tile per class: name,
price, two or three lines about what that class of machine is, the four effects, a picture slot and
a Buy button. The one accent button is Buy on the cheapest class the workshop can pay for.

T3-08 `ec7911d` Sprite loader. `render/sprites.ts` turns a key and a class into the URL of a PNG,
class file first, family file second, nothing third, from `public/sprites/manifest.json`, which
`npm run sprites:manifest` writes and which `npm run build` runs first. An object with a picture is
an `<image>` halved from the 2x file and anchored on the bottom corner of its footprint, with its
name in the tooltip instead of over the art, and the game draws the contact shadow under both
pictures and boxes.

T3-09 `37ef76b` Sprite check page. Sprite check in the Menu, always visible: 39 cells, one per key
the game can ask for, each with the footprint diamond on a tile grid, the placeholder box, the
picture when there is one, and the key, the footprint and the exact canvas printed underneath.

T3-10 `ca879b8` Machine effects. A spinning blade and a chip stream on the saw, an amber lamp on the
edgebander, chips on the thicknesser, a breathing extractor, a red lamp on a broken one. All CSS on
SVG groups, no timers, driven by one new engine selector.

T3-11 `4bafda0` Scenarios. The four scripted months run on the used saw and the new email curve and
now say so, and a fifth month buys the industrial saw on day 1 on Very easy and proves the 1.30
output, the doubled bag interval, the doubled hours and the seven a day off the meter.

T3-12 this report, the PR, and the state version bump described in section 5.

---

## 2. Not done or partial

1. **The job card appears in one place, not three.** CLAUDE.md 3.1 asks for Start production on the
   job card "everywhere it appears (laptop Jobs on the books, board after acceptance, the event that
   confirms acceptance)". The board holds enquiries, and an accepted enquiry leaves it in the same
   action, so there is no job card on the board; and accepting an enquiry raises no event in the
   engine, so there is no acceptance event to put a card in. The button and the five step row are
   one helper used by every card that exists: the laptop's Jobs on the books and its At the gate
   list. Nothing was invented to fill the other two.
2. **No browser run.** Playwright is not a dependency of this repository and adding one was out of
   scope. Everything was driven through jsdom. The machine effects, the contact shadow and the
   sprite anchor are asserted as SVG and CSS, not looked at.

---

## 3. Tests

454 tests in 34 files, all green, 9 seconds. Command: `npm test`, or `npm run check` for the gate.

| Area | Files | Tests |
|---|---|---|
| engine | 19 | 310 |
| render | 6 | 61 |
| scenarios | 1 | 22 |
| ui | 8 | 61 |

New this turn: `tests/engine/variants.test.ts` (14), `tests/render/sprites.test.ts` (8),
`tests/render/spriteArt.test.ts` (4), `tests/render/machineFx.test.ts` (6),
`tests/ui/modalScroll.test.ts` (3), `tests/ui/startProduction.test.ts` (5),
`tests/ui/drawings.test.ts` (5), `tests/ui/machine.test.ts` (7),
`tests/ui/spriteCheck.test.ts` (4): 56 tests in nine new files. The scenarios gained the fifth
month (4) and two more on the Easy month, and the smoke test gained the Sprite check page (1).

---

## 4. How to run

```
npm ci
npm run dev
npm test
npm run check
```

`npm run sprites:manifest` rewrites `public/sprites/manifest.json` from whatever PNG files are in
`public/sprites/`. `npm run build` runs it first, so a batch of art needs no other step. The folder
is empty tonight and the manifest is `[]`, which is why the game looks exactly as it did.

The first ten minutes script in the README is up to date: it now buys the machines through their
class modal, finds the drawing on the roll beside the laptop, and ends on the Sprite check page.

---

## 5. Deviations from CLAUDE.md

1. **A ninth reason on Start production: "site measure not done".** CLAUDE.md 3.1 lists eight. A
   kitchen cannot order its material until the site visit is done, so without this reason the card
   would say "material not ordered" while there is no material order task to start, which is a lie.
   It sits between "design not done" and "material not ordered". `src/engine/jobs.ts`.
2. **"material arrives tomorrow" says the day when the lorry is not due tomorrow.** Bespoke material
   takes three working days. The card says "material arrives on day 14" in that case and keeps the
   brief's wording whenever the lorry really is due the next working day. `src/engine/jobs.ts`.
3. **The hall reasons are the hall's own words.** After the rack, the card shows whatever
   `hallBlock` says, which is "no extraction" as the brief asks, and also "table saw is broken" or
   "bag full", which are the other two things the hall can say. Inventing a single reason for all
   three would have been less true. `src/engine/jobs.ts`.
4. **Every catalogue line is a family; only machines get the modal.** CLAUDE.md 3.5 says every
   purchasable machine becomes a family. In the data every line is one, so adding classes later is
   data everywhere; in the UI only the machine and extraction categories open the class modal, and
   a locker is still bought off its catalogue line. The modal draws one tile for a one class family
   exactly as the brief's test asks.
5. **Only the better of two machines of a family counts.** Two table saws in the hall do not make
   the work 1.3 by 1.3 times quicker: the best class of each family is taken and the families are
   multiplied together. The brief is silent and the alternative is nonsense.
6. **The contact shadow breaks a Turn 1 rule on purpose.** CLAUDE.md 10.3 says no shadows in the
   placeholder art. CLAUDE.md T3 3.6 says the game draws the contact shadow under both boxes and
   sprites. Turn 3 wins, and the test that forbade shadows now checks that the only shadow in the
   hall is that one.
7. **`STATE_VERSION` goes from 1 to 2.** CLAUDE.md 5.5 says no persistence changes. A machine now
   carries its class, its endurance and its hours, and a task carries the day it was finished, so a
   Turn 2 save would open a game with half a workshop in it. The version bump makes the loader
   refuse it with the line it already has ("That save is from an older build of the game"). No other
   line of the persistence layer was touched and it is still dark without env.
8. **The chip stream is four particles.** CLAUDE.md 3.7 asks for 3 to 6. The renderer has no
   randomness and Turn 1 10.3 forbids a view that jitters, so it is a constant, tagged `[TUNE]` in
   `src/render/hall.ts`.
9. **A one class family's tile description is its catalogue effect line.** CLAUDE.md 3.5 asks for a
   three line description per class. Five were written for the saw. Writing 23 more for families
   that have one class each and no choice to make would have been noise; they show the effect line
   they already had.
10. **The scenario stock was retuned twice.** The short handed month buys ten sheets on day 1 where
    Turn 2 bought twelve. One email instead of three on a small job, and then the used saw, changed
    how far the month got; at twelve sheets the rack no longer ran dry and the month proved nothing.
    Ten restores what the scenario is for. See section 9.
11. **Two unit tests ask for the budget saw.** The labour figures of CLAUDE.md 8.5 (240 minutes for
    a 400 job, 13.3 days for a poor joiner on a 6400 wardrobe) describe a workshop with an ordinary
    new saw, which is the budget class at factor 1.0. Those tests now buy it by name. Every scenario
    and the first ten minutes still buy what the catalogue offers first, which is the used saw.

---

## 6. Duplicate paths

Counted per behaviour, target one.

| Behaviour | Paths | Where |
|---|---|---|
| Draw an object in a scene | 1 | `objectArt` in `render/hall.ts`, used by the hall and the office |
| Decide which file an object is drawn with | 1 | `pickSprite` in `render/sprites.ts` |
| Decide where a sprite goes on screen | 1 | `spriteBox` |
| Open, fill and scroll a modal | 1 | `syncModals` in `ui/modal.ts`, every modal without exception |
| Remember the caret in a field | 1 | `data-field`, after the second attribute was removed |
| Say what is in the way of a job | 1 | `startProductionCheck`, which calls the same `hallBlock` the bench does |
| Draw the five lifecycle steps | 1 | `lifecycleRow` in `ui/laptop.ts`, used by both card lists |
| Ask the rack for sheets | 1 | `rackCanSupply`, called by `drawSheetsFor` and by the card |
| Work out a bag interval | 1 | `bagIntervalFor` |
| Work out what a class does to the bench | 1 | `machineOutputFactor`, inside `jobSpeedFactor` |
| Know whether a machine is running | 1 | `machineInUse` |
| Stand a machine in the hall for a test | 1 | `placeEquipment` in `tests/helpers.ts`, which replaced three copied literals |

Removed this turn: the second focus key attribute, the `hallBlock` copy in `game.ts`, three hand
written `Equipment` literals in `tests/engine/jobs.test.ts`, and the licence line that the laptop
and the drawings modal would otherwise both have printed.

---

## 7. Line balance

Production is `src`, `scripts` and `package.json`. The briefs that moved in T3-01 are not code.

| Task | Production added / removed | Tests added / removed |
|---|---|---|
| T3-01 | 0 / 0 | 0 / 0 |
| T3-02 | 160 / 66 | 117 / 2 |
| T3-03 | 197 / 26 | 144 / 0 |
| T3-04 | 28 / 3 | 61 / 15 |
| T3-05 | 138 / 20 | 94 / 3 |
| T3-06 | 283 / 23 | 264 / 48 |
| T3-07 | 205 / 13 | 133 / 1 |
| T3-08 | 258 / 28 | 180 / 3 |
| T3-09 | 263 / 3 | 80 / 0 |
| T3-10 | 195 / 3 | 95 / 0 |
| T3-11 | 0 / 0 | 105 / 7 |
| Total | 1,727 / 185 | 1,273 / 79 |

`src` is now 10,993 lines, `tests` 7,303.

---

## 8. Constants retagged

Every `[TUNE]` that became `[PIOTR]` tonight, and the new numbers that arrived with a tag of their
own. All of them are in `src/engine/constants.ts` unless another file is named.

| Constant | Was | Is now |
|---|---|---|
| `EMAIL_PRICE_BREAKS` | emails borrowed `CALLS_PRICE_BREAKS`, tagged PIOTR for the call curve | `[PIOTR]` for the first two bands and the rule above 20,000. The 10,000 to 20,000 band as 3 is Claude's reading and is called out in the comment and in section 10 below |
| `EMAIL_ABOVE_BREAKS`, `EMAIL_ABOVE_PRICE`, `EMAIL_ABOVE_PRICE_STEP` | did not exist | `[PIOTR]` |
| `EMAIL_MINUTES` | `[TUNE]` | unchanged, still `[TUNE]` |
| `TABLE_SAW_VARIANTS` prices 1800, 5000, 7000, 15000, 25000 | one price of 1800, `[TUNE]` | `[PIOTR]` |
| Used saw `outputFactor` 0.95, `bagIntervalFactor` 0.5, `enduranceFactor` 0.25 | did not exist | `[PIOTR]` |
| Every other variant factor | did not exist | `[TUNE]` |
| `powerPerDay` per class | `POWER_PER_MACHINE_DAILY` flat 3, `[TUNE]` | `[TUNE]` per class, 3 to 7. The flat constant is still the default for every family that has one class |
| `MACHINE_ENDURANCE_HOURS` and `MACHINE_ENDURANCE_HOURS_DEFAULT` | parked in Turn 2 | `[TUNE]`: saw 3,000, edgebander 4,000, thicknesser 2,500, everything else 5,000. One table, as the brief asks, for Piotr to replace |
| `OVERDUE_BREAKDOWN_CHANCE` | `[TUNE]`, service only | unchanged at 2%, now also charged against a worn out machine, which stacks |
| `FX_CHIPS` in `render/hall.ts` | did not exist | `[TUNE]`, 4 |
| `STATE_VERSION` | 1 | 2, see deviation 7 |

Nothing else was retagged. The overdraft on Easy stays 10,000 `[TUNE]` and the one off software
bundle stays 3,600 with the 30 job limit, both as the brief instructs.

---

## 9. Sprite contract

The loader knows 39 keys. `Sprite check` in the Menu lists every one of them with its footprint and
the exact canvas the art side has to hit, and `tests/render/sprites.test.ts` asserts the canvas of
fourteen of them against the table in `docs/art/SPRITES.md` section 6 line by line.

- First batch, section 6, all fifteen: `tableSaw`, `workbench`, `edgebander`, `extractor`,
  `sheetRack`, `compressor`, `desk`, `chair`, `locker`, `canteenSeat`, `sheetRackBetter`, `van`,
  `forklift`, `thicknesser`, `solidWoodTools`.
- Later batches, all seventeen: `roomOffice`, `roomWc`, `roomCanteen`, `forkliftBetter`, `cnc`,
  `cncHead`, `sprayBooth`, `dustSystem`, `pelletiser`, `laptop`, `ledgerFolder`, `materialsBinder`,
  `catalogue`, `teamBoard`, `phone`, `drill`, `handToolSet`.
- The five classes of table saw: `tableSaw.used`, `tableSaw.budget`, `tableSaw.standard`,
  `tableSaw.pro`, `tableSaw.industrial`.
- `drawings`, new tonight (CLAUDE.md T3 3.3), 2 by 1 by 1 tiles, canvas 144 by 120, file 160 by 136.

That is 38. The thirty ninth is `deliveryVan`, the lorry that stands at the gate while a delivery is
waiting. It has carried that key since Turn 2 and it is not in `docs/art/SPRITES.md`. It is 4 by 2
by 2 tiles, canvas 288 by 240, file 304 by 256, and it is question 1 below. The contract file was
not touched (CLAUDE.md T3 5.6).

Fallback order, as delivered: `tableSaw.pro.png`, then `tableSaw.png`, then the placeholder box.
Nothing probes the network: a key with no file in the manifest never becomes a request.

---

## 10. Open questions for Piotr

Each stands on its own. Numbers, please.

1. **The lorry at the gate needs a sprite key in the contract.** The game draws it as `deliveryVan`,
   4 by 2 by 2 tiles. Should it go into `docs/art/SPRITES.md` as a later batch line so GPT draws it,
   or should the gate show the van you own instead, once one is bought?
2. **Emails between 10,000 and 20,000.** You gave 1 up to 3,000, 2 up to 10,000, and one more for
   every further 10,000 above 20,000. I read the 10,000 to 20,000 band as 3. Confirm, or give the
   number.
3. **Machine endurance in hours, per machine.** Tonight they are placeholders: saw 3,000,
   edgebander 4,000, thicknesser 2,500, everything else 5,000, and the class multiplies them, so the
   used saw has 750 hours and the industrial one 6,000. Your table replaces all of it.
4. **The four factors of the four dearer saws.** You gave the prices and what the used one does. The
   budget saw is the 1.0 baseline. Standard, professional and industrial are guesses:
   output +5%, +15%, +30%; bag interval 1.2, 1.5, 2.0; life 1.2, 1.5, 2.0; power 4, 5, 7 a day.
   Change any of the twelve numbers.
5. **A used saw makes a job 5% slower than a new one, and the day 1 workshop buys the used one.** So
   a 400 job that took 240 minutes of your own time in Turn 2 takes 253 now. Is that the right way
   round, or should the used saw be the 1.0 baseline and the new ones all faster than it?
6. **Which families get classes next?** The extractor and the edgebander are the obvious ones. Give
   me the prices and I will do the same as the saw: it is data now, not code.
7. **Power per day per class.** 3 for a used or budget saw up to 7 for an industrial one. Does that
   feel right against a bill you have actually paid?
8. **The service cost is 2% of what the machine cost.** On an industrial saw that is 500 a month.
   Too much?
9. **Does Start production read right?** It says "Start production, 2 calls to make" on the button
   and repeats the reason as the tooltip. Would you rather it said the reason underneath the button
   and left the button reading just "Start production"?

---

## 11. Known risks

1. **The short handed month is a balance canary, not a test.** It proves the rack ran dry by playing
   a month and counting the events, so any change to the owner's minutes or the speed of the bench
   can make it stop proving it. It was retuned twice tonight for exactly that reason. If it goes off
   again, the honest fix is to starve the rack directly rather than to keep moving the sheet count.
2. **Nothing has been looked at in a browser.** The blade spin, the chip drift, the breathing
   extractor and the contact shadow are asserted as SVG classes and CSS rules. `transform-box:
   fill-box` on an SVG group is well supported in current browsers and not in old ones.
3. **No sprite has ever been loaded.** `public/sprites` is empty, so the anchor maths is proved
   against the contract and against a faked manifest, never against a real PNG. The first batch from
   GPT is the real test, and the Sprite check page is where to run it.
4. **The modal layer now outlives a render.** That is the point of T3-02, but it means a modal shell
   can carry stale attributes if a future modal changes shape without going through `fillModal`.
   Everything goes through it today.
5. **A Turn 2 save cannot be loaded.** By design, see deviation 7. Nobody has run the SQL yet, so
   nobody has a save.
6. **Machine hours are a float in the state.** `hoursUsed` gains one sixtieth a minute and is
   rounded to four places on every step, which keeps the replay test byte for byte identical today.
   If it ever drifts, the fix is to count minutes and divide when asked.

---

## 12. Parked, carried forward

1. Going home early with an empty hall (jump or run to 16:00): unanswered.
2. The overdraft on Easy and Very easy stays 10,000 until Piotr confirms.
3. The one off software bundle at 3,600 against its 30 job limit.
4. Machine endurance hours and service costs per machine: Piotr's table, question 3 above.
5. Classes for every family other than the table saw: question 6 above.
6. Figures as sprites. The squares still slide: the contract says the art side does not draw people.
7. Everything parked in the Turn 2 brief section 6, which carries everything parked in Turn 1
   section 14.

---

End of report.
