# Report: Turn 9

Orders that arrive, a joiner who walks, and a board that says how the company is doing.

Branch `claude/epic-lovelace-lgxabt` (the cloud environment names the branch; the brief's task
queue would have called it `turn-9-orders-and-the-walking-joiner`). Base: `31008c6` on `main`,
which is Piotr's commit putting this brief in the repository. 850 tests green, up from the 790 at
the end of Turn 8. `npm run check` clean on its own exit code before every commit.

---

## 1. Done

| Task | Commit | What went in |
|---|---|---|
| T9-01 Housekeeping and v11 | `5455a0f` | `docs/turn-8-brief.md` out of git history at the PR #9 merge, the README pointing at it, `APP_VERSION = 'v11'`, and one table that says how much of the page each modal takes. |
| T9-02 Orders without trips | `b1acb68` | The shopping trip is deleted. The cash leaves at the click, the delivery is booked at the click, the cells are held from the click, and it costs the owner nothing. Every class waits a working day at least, so day 1 is the ordering and day 2 is the setting up: one van, one unloading, one event. `STATE_VERSION` 10. |
| T9-03 Orders board by the door | `2147635` | The board moves onto the wall beside the personnel door in the left wall, lettered into that wall's own plane. Owner is out is the measure, the meeting and the move, and nothing else. |
| T9-04 The double click | `4b27432` | The page is patched and never replaced: a control keeps its node while its `data-do` and `data-id` are unchanged, the clock and the counts are written into the text nodes that hold them, and the frame loop writes the page once however many minutes it ran. |
| T9-05 The glow and the hall clock | `9561058` | The office clock's twin on the rear wall of the hall, beside the company name. The glow was the room being taken off the page and put back every minute, which T9-04 ended; the hover is a stylesheet rule with a 120 ms transition and the game writes nothing about it. |
| T9-06 From stock, one click | `3ccd7d5` | One click takes the job's sheets off the rack, holds them for it, ticks the material order green and makes the job ready. No second order for that job, ever. |
| T9-07 Drop project | `364826c` | The deposit back, the job and its list off the plan, the material back on the rack or written off, ten points of reputation at once, on a second click inside the card. Every reputation change now writes down the day, the reason and the points. |
| T9-08 Reputation log and output | `cde12e3` | The client's verdict goes on the board as two lines. `outputBreakdown` is the one place the things that multiply a minute of production in this hall are written down, and `hallProductivityFactor` is that list's total. |
| T9-09 Company board | `9d8cbdf` | A third board, on the free wall right of the door: week by week with plus and minus on the left, the company output and why on the right. |
| T9-10 Work Plan, the simple one | `a4a9677`, `4ff5370` | The Gantt is deleted. One row, one bar, a blue line for now, a red tick for the deadline, the minutes under it, and a yellow tick on the last day a job can be started and still be on time. |
| T9-11 Speed 10x | `afd8317` | A fifth chip, and the one speed the game ever takes the clock to is that chip. |
| T9-12 The joiner walks | `7051c0c` | Everything that plays a character sheet, and the capsule while there is none to play. Section 2. |
| T9-13 Scenarios | `926b041`, `168155c` | The months re-measured as each task went in, and month (n), which drops a job on day 8. |
| T9-14 Report and PR | this commit | This file. |

---

## 2. Not done, and why

1. **No joiner walks tonight, because there is nothing to walk.** The brief says the frame sheet
   is in the repository and that `docs/art/SPRITES.md` section 10 is the contract for it. Neither
   is there: `public/sprites/` holds the 28 files of the Turn 8 art pack and no character sheet,
   `SPRITES.md` ends at section 9.6, and the fifteen extraction and air sprites the brief's state
   note mentions are not in the repository either. `git log` on `main` has no art commit of 13.09
   after the brief. So T9-12 put in every piece of code the walk needs and none of the pictures:
   with a sheet in the manifest a joiner is an image clipped to one cell, and without one he is
   the capsule he has always been. The moment the art side delivers
   `character.joiner.walk.sheet.png` and `character.joiner.walk.json`, `npm run sprites:manifest`
   picks both of them up and he walks with no code change at all. Open question 1.
2. **`docs/art/SPRITES.md` was not touched**, as section 5 says. The character contract is
   therefore written in `src/render/characters.ts` instead, in the same terms as section 2 of the
   sprite contract: 2x art halved by the loader, one row a direction, one column a frame, the
   anchor where the feet are. It wants copying into SPRITES.md section 10 by whoever owns that
   file. Open question 2.
3. **Compressed air and extraction capacity are untouched**, as the brief says: Turn 10.

---

## 3. Orders, which is most of the turn

Turn 8 made a purchase three things: the cash, the trip and the delivery. Tonight it is two. The
trip is gone: `placeEquipmentOrder` pays, books the delivery and holds the floor in one go, out of
the owner's day entirely. The `shopping` task kind, `SHOPPING_MINUTES`, `SHOPPING_NEXT_MINUTES`,
`SOFTWARE_SHOPPING_MINUTES`, `shoppingTask`, `orderMinutes`, `shoppingLabel` and the trip line in
the catalogue are deleted, and a grep test says so. The interview is the one errand he still runs.

Every class waits at least a working day, so nothing the player buys is in the building the day he
pays for it. That is the largest change to the feel of the game this turn made: day 1 is an hour
of ordering and then an empty afternoon, and day 2 is the lorry. The first ten minutes in the
README are rewritten around it, and the jsdom smoke test drives the new path.

One van is one unloading. Everything heavy that lands on the same morning is one task and one
event, however many machines are on it; the minutes are still `EQUIPMENT_UNLOAD_MINUTES` a machine
`[TUNE]`, because three machines off one lorry is three machines to get off. Day 2 of a new game
is therefore one event asking about 360 minutes at the gate rather than three asking about 120
each, which is what "one van, one unloading" says.

The licence is the one thing that does not wait: it comes down the wire the moment it is paid for.
It is therefore asked of the hall the owner is standing in and not of the one the lorries will
make, so it cannot be bought until the laptop is on the desk. Day 1 has no laptop, no order board
and no drawings; day 2 has all three. Deviation 3.

---

## 4. The double click, which is the other half of the turn

Piotr asked why he sometimes has to click twice. He does, and this is why: the page was written
again from the state every game minute, and `parts.page.innerHTML = ...` replaced every element on
it. A browser raises a click only when the press and the release land on the same element, so a
render between his mousedown and his mouseup took the button out from under him and the click went
nowhere. At 4x that is four chances a second.

`src/ui/patch.ts` is the fix. It brings a piece of the page into line with fresh markup without
throwing it away: a text node's value is written into the node that holds it, an element keeps its
node while its tag, its `data-do` and its `data-id` are unchanged, and an element marked
`data-scene-slot` is left alone entirely, which is how the painted hall and the office room are
carried whole from page to page. The modal body and footer go through the same function, which is
where Start production lives.

Two tests prove it, and both of them fail on the old code: two hundred clicks on Start production
with a render between every two, all two hundred landing; and the Board button being the same node
object sixty ticks later while the Orders count beside it changes.

The glow Piotr saw blinking (3.4) was the same fault: `mountScene` took the room off the page and
put it back on every render, and a browser drops `:hover` when a node is re-attached. It is
inserted once now and left there. The hover itself was already a stylesheet rule; it has a 120 ms
transition on it now and a test says the game writes no hover state at all.

The render loop also stopped writing the page once a game minute. One frame is one page now,
whatever the clock did inside it, which at 10x is ten minutes to one page rather than ten.

---

## 5. Deviations from the contract

1. **The branch name.** `claude/epic-lovelace-lgxabt`, not `turn-9-orders-and-the-walking-joiner`:
   the environment names the branch and the session may only push to the one it was given. The
   same deviation as Turns 7 and 8.
2. **A handler still writes the page, once, at the end of itself.** 3.8 says "never inside an
   event handler (handlers change state and request a frame)". A render scheduled on the next
   animation frame would mean the player's click did not reach the screen until the frame after
   it, and it would mean every jsdom test in the repository having to wait for a frame that vitest
   never runs inside a synchronous test body. What went in instead: a click opens a batch, changes
   the world as many times as it likes, and the page is written once when the handler is done, so
   the page is never written in the middle of a gesture. The frame loop opens the same batch, so
   one frame is one page. The two things 3.8 is actually about, the node the player pressed and the
   page being written once a frame, both hold.
3. **The licence waits for the laptop.** 3.1 gives software 0 days `[TUNE]` and says it is down the
   wire at the click. Down the wire means installed now, and there is nothing to install it on
   until the laptop is in the room, so `orderSoftwareCheck` asks the hall he is standing in. The
   alternative, checking it against the hall the lorries will make, would have taken his 3,600 and
   given him nothing, because `buySoftware` asks for a laptop and would have refused.
4. **The output breakdown's total is the hall's factor, and the men and the machines are beside
   it.** 3.10 asks for one selector whose total is `hallProductivityFactor`, and in the same
   sentence for the crew's rates and the machines' classes to be in the columns. They cannot both
   be true without double counting: a poor joiner is already slow because his rate multiplies his
   own minutes, and a used saw is already slow because its class multiplies the stage it does.
   Putting either into the hall factor would slow the whole workshop a second time for the same
   man and the same machine. So `outputBreakdown` carries every line Piotr asked to see, each with
   what it is worth and where it acts, and only the lines that act on every minute in the hall
   (dust, extraction, the missing helper, the crowded gate) make the total. The board prints them
   under the sum with "these act where they are, and are never counted twice". No engine number
   moved.
5. **A worker's line is his own shortfall, not 0.1.** 3.10 says "each worker below 1.0 (poor joiner
   minus 0.1 per man `[TUNE]`)". A poor joiner's rate is 0.6, a normal one 0.8 and a super one 0.9,
   so his line says what he is really worth: minus 0.4, minus 0.2, minus 0.1. The board has to say
   what is true.
6. **The board on the office wall covers the painted clock casing.** 3.10 gives the company board
   x 970 to 1280 by y 60 to 520, and `docs/art/SPRITES.md` 8.2 puts the clock casing at x 1040 to
   1162 by y 88 to 146, inside it. The drawn board covers the casing; the live digits are in the
   layer above it and still read. Open question 3.
7. **Books behind costs money and not reputation.** 3.10 lists "books behind minus 1" among the
   lines the log can carry. The game has no such rule: `LATE_ACCOUNTS_CHARGE` is a charge, and
   nothing in the engine has ever taken reputation for it. Nothing was invented; the line is not
   there because the rule is not there. Open question 4.
8. **Overtime is two lines on the board and not one.** 3.10 names "overtime debt, skipped break"
   separately, which is what the owner's labour factor is made of, so they are two lines.
9. **The Work Plan's stage text for a job in production is the stage and its blocker.** 3.6 gives
   "Assembly", "Cutting, waiting for table saw" and "drawings not done" as the three shapes. The
   first two are the stage and, where there is one, `job.blockedBy` after a comma. The third is
   what a job with its drawing outstanding says.
10. **The laptop is not a full page modal.** 3.12 names six: board, catalogue, workPlan, shopping,
    company board, accounting. The laptop is not one of them, so it keeps the size it had, even
    though it holds the longest lists in the game. Open question 5.
11. **`STATE_VERSION` was bumped once, not per task.** It went to 10 in T9-02 and stayed there: one
    turn is one save format.
12. **Day 2 of the careful month is 473 of the owner's 480 minutes.** The scenario asserted 480
    before. With the trip gone and the unloading in its place, the month runs out of work seven
    minutes before five with one job on the books. It is measured, not rounded away.

---

## 6. What reviewing the diff turned up

1. **A job whose material was never ordered was written off when it was dropped.** `dropJob` wrote
   a loss into the books whenever the job's mode said per job, which includes a job the player set
   to per job and dropped before anybody ordered anything. What makes the material the job's own is
   the delivery, so that is what is asked now. Commit `168155c`.
2. **A job nobody had started had cut one sheet.** `sheetsDueFor` holds a job on the bench to at
   least one sheet, which is right for a job under way and wrong for one that has not begun: the
   drop handed back one sheet fewer than it took. Progress of zero cuts nothing now.
3. **The startProduction test was reading the wrong button.** The job card carries From stock and
   Drop project beside Start production now, and the test took the first `.btn` it found. It asks
   for the one that starts the work by name.

---

## 7. Paths: how many code paths do the same job?

| Question | The one path |
|---|---|
| May he order this? | `orderEquipmentCheck`, asked by the tile and by the action |
| What happens when he does? | `placeEquipmentOrder` |
| How long do I wait for this class? | `deliveryDaysFor(specId, variantId)` |
| What is on order? | `shoppingList(state)` |
| What is the owner out on? | `ownerOutTask(state)`, and `interviewTask(state)` for the interview |
| Is the clock the player's? | `skippedTask(state)` |
| What is on the rack for this job? | `stockCheck(state, job)`, asked by the button and by the action |
| What does the hall turn out, and why? | `outputBreakdown(state)`, whose total is `hallProductivityFactor` |
| Why did the reputation move? | `changeReputation(state, points, reason)`, the one write |
| What does the Work Plan draw? | `workPlan(state)` |
| How is a piece of the page brought up to date? | `patchInto(target, html)` |
| Which sheet does this figure draw from? | `characterSheet(role, animation)` |
| What build is this? | `APP_VERSION` |

---

## 8. Delivery days chosen

Every class, with the working days between the click and the lorry. Everything that used to come
back in the owner's hands is a 1 now `[PIOTR: furniture and hand tools next day]`; the rest is the
Turn 8 table unchanged.

| Family | Classes and their days |
|---|---|
| Desk, chair, laptop | 1 |
| Cordless drill, hand tool set | 1 |
| Tool cabinet, locker, canteen seat | 1 |
| Table saw | used 1, budget 1, standard 5, pro 7, industrial 12 |
| Edgebander | used 1, budget 1, standard 7, pro 12, industrial 20 |
| Workbench | every class 1 |
| Sheet rack | used 1, budget 1, standard 3, pro 5, industrial 10 |
| Extractor, compressor | 1 |
| Van | 3 |
| Forklift, better forklift | 5 |
| Thicknesser, solid wood tools | 5 |
| CNC | 45 |
| CNC tool changer head | 20 |
| Spray booth, pelletiser | 20 |
| Central dust system, flexi system | 25 |
| Management software | 0, down the wire, and it wants the laptop on the desk |
| Material, per job | next working day, unchanged |
| Material, bespoke | 3 working days, unchanged |

---

## 9. Board lines: every reason the reputation log can carry

| Reason | Points | Where it is written |
|---|---|---|
| `<job>: on time` | `RATING_ON_TIME`, +3 | `applyRating`, when the client takes delivery |
| `<job>: express, on time` | `RATING_EXPRESS_ON_TIME`, +5 | the same, for an express job |
| `<job>: n days late` | 0 plus `RATING_PER_DAY_LATE` a day | the same |
| `<job>: calls not answered` | minus `CALL_RATING_PENALTY` a penalised miss | the same, as its own line |
| `Dropped: <job>` | minus `DROP_PROJECT_REPUTATION`, 10 | `dropJob` |

Unanswered emails and missed calls also scale the rating itself before it is written down, so they
are in the first line as well as the fourth. Every line carries the points the company actually
moved: at the top or the bottom of the scale that is less than was asked for, and the week's total
then adds up to the reputation the player can see.

---

## 10. Deleted

| Gone | Where it was | Why |
|---|---|---|
| `SHOPPING_MINUTES`, `SHOPPING_NEXT_MINUTES`, `SOFTWARE_SHOPPING_MINUTES` | Turn 7 3.10 | The owner never goes out. |
| The `shopping` task kind | Turn 7 3.10 | The same. |
| `shoppingTask`, `orderMinutes`, `shoppingLabel` | Turn 7 3.10 | Nothing left to ask them. |
| `placeOrder`, `settleEquipmentOrder`, `onOrder`, `ordersOnTheList` | Turns 7 and 8 | An order is booked at the click; there is nothing to settle later. |
| `TaskOrder`'s equipment and software shapes | Turn 7 3.10 | A task carries a hire and nothing else. |
| `workPlanGantt`, `barsFor`, `gapFor`, `jobRate`, `StageBar`, `StageGap`, `JobGantt`, `DELIVERY_BAR_DAYS` | Turn 7 3.2 | The five bars are one bar. |
| `GANTT_STAGES` | Turn 7 3.2 | Nothing left reading it. |
| The stage colours in the stylesheet | Turn 7 3.2 | A stage is a word now. |
| `TaskInstance.orderId` | Turn 8 3.2 | One van is one unloading of several orders, so it is a list. |

---

## 11. Other numbers chosen

| Number | Value | Why |
|---|---|---|
| `APP_VERSION` | `v11` | The brief. |
| `STATE_VERSION` | 10 | A task carries a list of orders. |
| `SPEEDS` | 0, 1, 2, 4, 10 | `[PIOTR]`: speed times ten. |
| `SKIP_SPEED` | 10 | The brief: everything that forced 4x runs at 10. |
| `DROP_PROJECT_REPUTATION` | 10 | `[PIOTR]`: drastically. |
| `REPUTATION_LOG_MAX` | 2000 | `[TUNE]`: a year of trading is a few hundred lines. |
| Base delivery days | 1 | `[PIOTR]`: furniture and hand tools next day. |
| Unloading a lorry | `EQUIPMENT_UNLOAD_MINUTES` a heavy machine | `[TUNE]`, the Turn 8 figure, summed over the load. |
| Hall clock | 1.6 m up, right of the name's box plus 0.8 m | The brief for the height; the gap is `[TUNE]` and is taken off the name's own box. |
| Hall clock lettering | 12 px at 1x | `[TUNE]`: smaller than the name beside it. |
| Company board region | x 970..1280, y 60..520 | The brief. |
| Hover transition | 120 ms | The brief. |
| Figure's resting direction | `sw` | `[TUNE]`: towards the camera's left, the way the hall is drawn. |

---

## 12. Open questions for Piotr

1. **Where are the character sheets?** The brief says the frame sheet is in the repository and
   section 10 of `docs/art/SPRITES.md` is its contract. Neither is on `main`. The code is waiting
   for `character.joiner.walk.sheet.png` and `character.joiner.walk.json` in `public/sprites/`.
2. **May the character contract go into `SPRITES.md` section 10?** It is written in
   `src/render/characters.ts` tonight because section 5 forbids touching that file. The two need
   to be the same words.
3. **The company board sits over the office clock.** The brief's rectangle contains the clock
   casing the artwork paints. The drawn board covers it and the digits still read on top of it.
   Should the board start below the clock, or should the art side paint a board that leaves a hole
   for it?
4. **Should the books being behind cost reputation?** 3.10 lists it; the game has never had that
   rule, only the charge. Say the points and it is a line.
5. **Should the laptop fill the page too?** It holds the Tasks, Materials, Team and Drawings lists,
   which is more list than anything else in the game, and 3.12 does not name it.
6. **Day 1 is now an empty afternoon.** He orders his kit in ten minutes and then has nothing to do
   until five: no laptop, no board, no drawings, no material. It is what "day 1 is ordering, day 2
   is setting up" asks for, and it is the one place the new shape of the game feels thin.
7. **Is 360 minutes at the gate on day 2 right?** One van, one unloading, but three heavy machines
   on it at two hours each is three quarters of the morning. The alternative is one flat two hours
   for the load however much is on it.

---

## 13. Known risks

1. **The patch is new and it touches every pixel of the page.** 850 tests pass over it, the scene
   and the modals are kept the way they were, and fields keep what the player typed. The one thing
   it changes that nothing tests is the browser's own idea of focus on an element that is now kept
   rather than replaced, which should only ever be an improvement.
2. **A job dropped in production hands back the sheets the bench has not cut.** The cut ones are
   cut. The arithmetic is `sheetsUsed` less what the progress has eaten, which is right at both
   ends and a rounding of a sheet in the middle.
3. **The company output board says numbers the engine does not multiply.** The crew and the machine
   lines are there to answer "why is the company at 0.7", and the board says where each of them
   acts. A player who adds every line up will not get the number at the top. Deviation 4.
4. **The character code has never drawn a real sheet.** It is proved against a sheet the tests
   make, which is the same way the office and hall pictures were proved before the art landed.
5. **Day 2 is a morning at the gate**, as Turn 8 warned. It is now one event instead of three,
   which makes it one decision instead of three, but the minutes are the same.

---

## 14. Tests

850 green, up from 790. New files:

- `tests/ui/modalSize.test.ts`: the size of every modal in the game, per id.
- `tests/ui/oneClick.test.ts`: two hundred clicks on Start production with a render between every
  two, and the Board button's node identity across sixty ticks. Both fail on the old code.
- `tests/ui/hallClock.test.ts`: the clock on the hall wall, its plane, its node across the minutes,
  and the office regions byte identical sixty ticks apart.
- `tests/engine/fromStock.test.ts`: what the rack is short of, the click that drains it, the order
  ticked green, and no second order ever.
- `tests/engine/dropJob.test.ts`: the refund, the removal, the ten points, the material both ways,
  and the second click.
- `tests/engine/companyBoard.test.ts`: the log and the breakdown.
- `tests/ui/companyBoard.test.ts`: the board on the wall, the weeks and the two columns.
- `tests/ui/speedTen.test.ts`: the fifth chip, a thousand minutes in a hundred seconds, and the
  event that still stops it.
- `tests/render/characters.test.ts`: the image and no capsule, the anchor, the mirror, the frames
  in real time, the fallbacks and the owner's capsule.

Rewritten: `tests/ui/workPlan.test.ts` for the one bar; `tests/ui/ownerOut.test.ts` for the three
things that take the owner out; `tests/ui/app.test.ts` for a first ten minutes where day 1 is the
ordering; `tests/ui/pausedTime.test.ts` for orders that cost nothing. Month (n) is new in
`tests/scenarios/thirtyDays.test.ts`.

---

## 15. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 9 added is reachable from the game: the version in the corner, the catalogue
that takes the money and books the lorry in one click, the Orders board beside the hall door, the
clock on the hall wall, the company board right of the office door, the Work Plan with one bar a
job, From stock and Drop project on every job card, the fifth speed chip, and the sprite check page
with a strip waiting for every character sheet.

---

## 16. Line balance

| Task | Files touched | Lines added | Lines removed |
|---|---|---|---|
| Whole turn | 57 | 3,836 | 1,099 |

222 of those added lines are `docs/turn-8-brief.md`, which is the archive and not code. New
modules: `src/ui/patch.ts`, `src/ui/company.ts`, `src/render/characters.ts`.

---

## 17. Parked, carried forward

1. Turn 10: compressed air and extraction capacity with Piotr's tables; the extractor and
   compressor classes as data; ducts drawn along the walls with the `ducts` sprites.
2. The character sheets themselves, and the owner, helper and office staff sheets after the
   joiner's: `bench`, `carry` and `idle` play the moment they land.
3. The floor catalogue picture, and a painted company board.
4. House 100 k and villa 500 k templates, a 180 degree view, movable rooms, rates and power for
   200 m2.
5. Worker morale beyond the overtime flag.
6. Everything parked before.
