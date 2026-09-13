# Report: Turn 8

Deliveries you can see, a clock you can skip, and a version in the corner.

Branch `claude/bold-pasteur-9kjnzt` (the cloud environment names the branch; the brief's task queue
would have called it `turn-8-deliveries`). Base: Piotr's commit `ca5ef78`, which put this brief in
the repository. 789 tests green, up from the 736 at the end of Turn 7. `npm run check` clean on its
own exit code before every commit.

---

## 1. Done

| Task | Commit | What went in |
|---|---|---|
| T8-01 Housekeeping and the version | `48b168e` | `docs/turn-7-brief.md` out of git history at the PR #8 merge, the README pointing at it, and `APP_VERSION = 'v10'` in the bottom right corner of every screen, written in one file and nowhere else. |
| T8-02 Delivery days and on-order items | `93508a5` | Every class carries the working days between the click and the lorry. An order with days on it is booked as an on-order item when the owner is back, its cells are held with a grey outline, and it lands at 08:00 on the due working day through the same event the sheets get. `STATE_VERSION` 9. |
| T8-03 Shopping list | `e258d84` | One panel for the kit and the sheets alike, shortest wait first, reachable from the top bar count and from a pin board on the office wall in the hall. The Owned tab carries a tile per order with the same bar. |
| T8-04 Owner is out and Skip ahead | `1aac5a7` | One line under the top bar whenever the owner is out, drawn from the same selector the catalogue's Shopping line uses, and one button that runs the clock at 4x until the task is over and then hands the speed back. |
| T8-05 Moving | `812c00d` | Light kit is simply where he dropped it. Heavy kit asks first, in the words of the brief, with Do it and Put them back. Do it books the move and skips the clock through it; the Turn 4 forced 4x is gone. |
| T8-06 Cancel and sell | `c42484b` | One click calls an order off in full before the lorry. A machine in the hall sells for half what it cost, a third and a bit if it was second hand, on a second click; it stops working at once and the buyer's van comes in the morning. |
| T8-07 Staff overtime pay | `0c13df1` | The Turn 1 paper rule in code: two hours at one and a half times the hour for every joiner and helper who stays with the owner, paid as its own Friday line, and a man tired of three evenings in a row who may hand his notice in at the month end. |
| T8-08 Floor catalogue slot | `a2e6f38` | `catalogueFloor` through the loader, in the region the brief gives it. |
| T8-09 Scenarios | `4da6bd7` | The months re-measured for the deliveries and the move, and the two new ones. It turned up a real fault in T8-02, below. |
| T8-09b, c, d | `c70a4b5`, `528c9e5`, `2b0e039` | What re-reading the night's own diff found: an import cycle, a move that could be booked twice, and a sale remembered across a tab. Section 6. |
| T8-10 Report and PR | this commit | This file. |

---

## 2. Not done or partial

1. **Compressed air and extraction capacity are untouched**, as the brief says: Turn 9. The five
   extraction and compressor classes stay data for Turn 9 too, and the loader still shows
   `extractor.standard`, `compressor.standard`, `dustSystem.standard`, `flexiSystem.standard` and
   `pelletiser.standard` when the files exist.
2. **Nothing was painted.** `catalogueFloor` has its key, its region and its test; the file is for
   GPT. Open question 1.
3. **An order still on the trip cannot be called off.** 3.5 says the Cancel is on the shopping list
   and on the on-order tile, and neither shows a thing the owner is still out buying. The money has
   left the bank at that point and the thing is not on the list yet, so there is a window of an hour
   in which he can change his mind about nothing. Open question 4.
4. **Material orders cannot be cancelled.** 3.5 is about the kit: the reservation it releases is a
   machine's. Sheets are on a list with the kit and carry no Cancel, and the list says nothing about
   why, because there is nothing to say.

---

## 3. Deliveries, which is most of the turn

Turn 7 made a purchase two things: the cash and the trip. Tonight it is three, and none of them
waits for another.

- **The cash** leaves at the click, exactly as chat fix 1 left it.
- **The trip** is the owner's own minutes, exactly as Turn 7 left it.
- **The delivery** is days by class. When the owner gets back from the shops an order with days on
  it becomes an **on-order item**: not in the hall, holding the cells it will stand on, with a grey
  outline of its zone and its footprint drawn on the floor and the day it is due under it.

The outline carries the same `data-kit` hook a machine carries, so setup mode drags it about with
the code that already existed and `canPlaceSpec` refuses to build on it with one more loop. Shifting
an outline is free: there is nothing to carry and nothing to unplug.

At 08:00 on the due working day the lorry is at the gate. Anything two men carry, which is the
furniture, the hand tools, the benches, the racks, the cabinets, the lockers and the seats, is
brought in and stands on the cells that were held for it without asking anybody. Anything heavy is
the same `deliveryArrived` event the sheets raise, with the same two choices, and 120 minutes at the
gate before the forklift halves it. A helper takes it off the list without being asked, as he always
has.

Two questions the brief did not put, which the deliveries forced:

1. **May a job be taken while the saw is on a lorry?** The board's locks now count kit that is
   bought and paid for and still on the road. Turn 7's day 1 ended with the saw in the hall and the
   board open; without this, day 1 would end with every sheet job greyed out and a dead first day the
   brief never asked for. The job is days in the drawing and the material anyway.
2. **May a man be taken on before his bench arrives?** The same answer, for the same reason: he
   starts the next working day and the bench lands at 08:00 that morning. `shortfallForHire` counts
   what is on the road.

Both are section 5 deviations.

---

## 4. The clock the player can skip

3.3 and 3.4 are one mechanism. `state.skipTaskId` names the task the player asked the clock to be
run through and `state.speedBeforeSkip` holds what he was on; while it is set the clock is held at
4x and the speed chips are his no longer. It ends when the task ends, and it ends with the day, so
a trip cut by 17:00 is picked up at 08:00 with its counter carrying on and the player decides again
whether to sit through it.

The Turn 4 move forced the clock to 4x from inside `settle` and remembered the speed in a field of
its own. That is deleted. "Do it" on the move asks for the same Skip ahead run, so there is one
thing in the game that ever takes the clock off the player and one speed it takes it to.

---

## 5. Deviations from the contract

1. **The branch name.** `claude/bold-pasteur-9kjnzt`, not `turn-8-deliveries`: the environment names
   the branch and the session may only push to the one it was given. The same deviation as Turn 7.
2. **Month (m) asserts 630 and not 900.** 3.5 says a sale is 50% of the purchase price `[PIOTR]` and
   35% for a used class `[TUNE]`. The used saw cost 1,800, so the used fraction of it is 630. The
   task line for month (m) says 900, which is the 50% figure. They cannot both be right; the
   contract of 3.5 wins and the scenario says 630, the way Turn 7 handled the worked example that
   did not add up. **If Piotr meant 900, the line to change is `SALE_FRACTION_USED`, not the test.**
3. **The CNC tool changer head is heavy.** 3.4's list of heavy kit does not name it. It is ducted
   into the extraction like the machine it bolts to, and leaving it light would let a ducted machine
   be re-sited for nothing while the bill for reconnecting it still existed. It is in `HEAVY_SPECS`,
   which the brief tags `[TUNE list]`.
4. **A van and a forklift are light.** They are not in Piotr's list either way. They drive
   themselves in and out, so they need nobody at the gate and cost nothing to move.
5. **The standard compressor is heavy.** Piotr wrote "compressors above budget", and the one class
   the family has tonight is `standard`, which is above budget. So the day 2 lorry brings a 350
   compressor that costs somebody two hours at the gate, which is a lot of morning for a small
   portable machine. It is literal and it is `[TUNE list]`; open question 2.
6. **Put them back puts the machines back and leaves the light kit where he dropped it.** 3.4 says
   both "Put them back restores every moved item to where it stood" and "light items are simply
   where the player dropped them when he clicks Done". The two disagree when he has moved some of
   each. The question is about the machines, so the answer governs the machines.
7. **Kit on the road counts as the company's for the board's locks and for a hire.** Section 3.
8. **The settle check asks the hall the click asked about.** Section 6, fault 1.
9. **The delivery days of the better forklift.** Piotr named the forklift; the better one has the
   same five days `[TUNE]`.
10. **A tired man's chance of quitting is 5% and not "5% more".** 3.6 says the flag "adds 5% to his
    chance of quitting at the month end". There is no base chance in the game for it to be added to,
    so 5% is the whole of it.
11. **T8-09 says "the starting kit now arrives on day 2 for the saw, the rest with the trip".** By
    the table of 3.2 five of the eleven are ordered in, not one: the saw, the compressor, the
    extractor, the bench and the rack, all of them one day. The table is the contract and the
    scenario says all five.

---

## 6. What reviewing the diff turned up

No separate review task was in tonight's queue, so this is what re-reading the night's own diff and
writing the scenarios found.

1. **An order was settled against the wrong hall.** Turn 7 checked a purchase against "the hall as
   it will be when he gets back". With deliveries that is no longer the hall the click was checked
   against: a CNC ordered behind an extractor that is still on a lorry passed the click and was
   refused when he walked back in, and the money was already gone. Both now ask the same question of
   the same hall, which is the hall once everything on the road has landed. Month (l) is what caught
   it, and it is the fault of the night.
2. **A move could be booked twice.** Pressing Done again while the question was still in front of
   the player queued a second one, and answering both would have shifted the hall twice and charged
   the ducting twice. The hall cannot be set out over the top of the question now.
3. **An import cycle.** `economy.ts` reached into `staff.ts` for the Friday overtime line, and
   `staff.ts` reaches into `jobs.ts`, which reaches back into `economy.ts`. The three wage functions
   moved into `economy.ts` beside the weekly wages and the salaries, where the rest of the payroll
   arithmetic already lives.
4. **A sale was remembered across a tab.** The machine offered for sale was held in the UI and never
   forgotten, so a second click on another tab could have meant a sale nobody asked for.
5. **The catalogue's cost with things on order was measured, not guessed.** `orderCheck` clones the
   state once per tile while anything is on the road, which is now most of the time. Forty renders of
   an open folder with four things on order take 50 ms, against 7 ms with nothing on order: about
   1.2 ms a render, four times a second at 4x. It was left alone.

---

## 7. Paths: how many code paths do the same job?

| Question | The one path |
|---|---|
| How long do I wait for this class? | `deliveryDaysFor(specId, variantId)` |
| Is this thing heavy? | `isHeavy(specId, variantId)`, asked by the gate and by the move alike |
| What is on order? | `shoppingList(state)`, read by the panel, the chip, the pin board and the tiles |
| Where will this stand when it lands? | the on-order item's own anchor, and `canPlaceSpec` holds it |
| What is the owner out on? | `ownerOutTask(state)`, read inside the catalogue and outside it |
| Is the clock the player's? | `skippedTask(state)` |
| May this be sold? | `canSell(state, equipmentId)`, asked by the tile and by the action |
| What does it fetch? | `salePriceFor(item)` |
| Who stays past five? | `staysForOvertime(state, worker)` |
| What is he owed for it? | `overtimePayFor(worker)` |
| May he buy this? | `orderCheck`, asked by the tile, by the action and by the settle |
| What build is this? | `APP_VERSION` |

---

## 8. Delivery days chosen

Every class, with the working days between the click and the lorry.

| Family | Class | Days | Whose number |
|---|---|---|---|
| desk, chair, laptop | standard | 0 | `[PIOTR]` |
| drill, hand tool set | standard | 0 | `[PIOTR]` |
| tool cabinet, locker, canteen seat | standard | 0 | `[PIOTR]` |
| management software | one off, subscription | 0 | `[PIOTR]`, down the wire as in Turn 7 |
| table saw | used | 1 | `[PIOTR]` band, `[TUNE]` figure |
| table saw | budget | 1 | `[PIOTR]` band, `[TUNE]` figure |
| table saw | standard | 5 | `[PIOTR]` |
| table saw | pro | 7 | `[PIOTR]` |
| table saw | industrial | 12 | `[PIOTR]` band, `[TUNE]` figure |
| workbench | every class | 1 | `[PIOTR]` |
| sheet rack | used, budget | 1 | `[PIOTR]` |
| sheet rack | standard | 3 | `[PIOTR]` |
| sheet rack | pro | 5 | `[PIOTR]` |
| sheet rack | industrial | 10 | `[PIOTR]` |
| edgebander | used, budget (hand) | 0 | `[PIOTR]` |
| edgebander | standard (floor) | 7 | `[PIOTR]` |
| edgebander | pro (floor) | 12 | `[PIOTR]` |
| edgebander | industrial (floor) | 20 | `[PIOTR]` |
| extractor | standard | 1 | `[PIOTR]` |
| compressor | standard | 1 | `[PIOTR]` |
| thicknesser | standard | 5 | `[PIOTR]` |
| solid wood tools | standard | 5 | `[PIOTR]` |
| van | standard | 3 | `[PIOTR]` |
| forklift | standard | 5 | `[PIOTR]` |
| better forklift | standard | 5 | `[TUNE]`, the forklift's own |
| spray booth | standard | 20 | `[PIOTR]` |
| central dust system | standard | 25 | `[PIOTR]` |
| flexi system | standard | 25 | `[PIOTR]` |
| pelletiser | standard | 20 | `[PIOTR]` |
| CNC | standard | 45 | `[PIOTR]` |
| CNC tool changer head | standard | 20 | `[PIOTR]` |
| material, per job | | next working day | `[PIOTR]`, Turn 1, unchanged |
| material, bespoke | | 3 working days | `[TUNE]`, Turn 1, unchanged |

Working days, not calendar days: a CNC ordered on day 1 is due on day 64, which is nine weeks of
the calendar.

---

## 9. Other numbers chosen

| Number | Value | Why |
|---|---|---|
| `APP_VERSION` | `v10` | The brief: this turn sets it to v10. |
| `EQUIPMENT_UNLOAD_MINUTES` | 120 | The brief: the forklift or two hours by hand `[TUNE]`. The forklift halves it and the better one takes it to a fifth, through the factor that already existed. |
| `SALE_FRACTION` | 0.5 | `[PIOTR]`. |
| `SALE_FRACTION_USED` | 0.35 | The brief `[TUNE]`. Deviation 2. |
| `SKIP_SPEED` | 4 | The fastest the loop allows, which is what 3.4 asks for. |
| `STAFF_OVERTIME_RATE` | 1.5 | `[PIOTR]`. |
| `STAFF_OVERTIME_MAX_MINUTES` | 120 | `[PIOTR]`: two hours, and he goes home at 19:00 anyway. |
| `WORKER_HOURS_PER_WEEK` | 40 | The brief `[TUNE]`: the divisor that turns a weekly wage into an hourly one. |
| `OVERTIME_TIRED_DAYS` | 3 | `[PIOTR]`: three evenings in a row. |
| `OVERTIME_QUIT_CHANCE` | 0.05 | The brief `[TUNE]`. Deviation 10. |
| `HEAVY_SPECS` | the twelve families of section 5 | The brief's list `[TUNE list]`, plus the CNC head. |
| `LIGHT_CLASSES` | used and budget compressors | The brief: compressors above budget are heavy. |
| Floor catalogue region | x 60..500, y 700..900 | The brief. |

---

## 10. Deleted

| Gone | Where it was | Why |
|---|---|---|
| `MOVING_SPEED` | Turn 4 3.5 | The Skip ahead run is the one thing that takes the clock off the player, and `SKIP_SPEED` is the one speed it takes it to. |
| `GameState.speedBeforeMove` | Turn 4 3.5 | `speedBeforeSkip` is the same field for every kind of run. |
| The top bar's "Moving machines" lock | Turn 4 3.5 | It said "Skipping ahead" the moment the move became a skipped run, and two ways of saying the clock is not yours is one too many. |
| `hasAll` in `catalog.ts` | Turn 1 | The solid wood check counts kit on the road as well now, so it asks the same question as the rest of the lock. |

---

## 11. Open questions for Piotr

1. **The floor catalogue picture.** `catalogueFloor.png` on the office canvas, drawn to fill
   x 60..500 by y 700..900: a product catalogue lying on the floor by the door, cover up, the word
   the game letters over it left blank. Until it arrives the game draws the object itself.
2. **Is a 350 compressor really a two hour lorry job?** "Compressors above budget" makes the one
   class the family has today heavy, so day 2 of every game has three machines at the gate at two
   hours each. The Turn 9 compressor ladder will sort it out; until then, should the standard
   compressor be light?
3. **Is 630 or 900 the right money for a used saw?** Deviation 2.
4. **Should an order still on the trip be cancellable?** He has paid for it and he is out fetching
   it; there is an hour in which he cannot change his mind.
5. **Day 2 is now a morning of unloading.** The used saw, the compressor and the extractor land
   together and want 360 minutes of somebody at the gate out of 480. It is what the table says and
   the months still trade, but it is the largest single change to the balance this turn made.
6. **Should a machine that is sold stop the extraction?** It stops working the minute it is sold, so
   nobody stands at it and it adds nothing to what the hall can do. It is still physically there
   until the van comes, so `has` still finds it and the extraction it provides does not blink out in
   the middle of a working day. Section 12, risk 3.
7. **Staff overtime is two hours because the day is two hours.** 17:00 to 19:00 is 120 minutes and
   the cap is 120 minutes, so the cap never bites. It is the brief's own reading ("he goes home at
   19:00 anyway"), but it means the cap is a rule with nothing to do.

---

## 12. Known risks

1. **Day 2 is a morning at the gate.** Open question 5.
2. **The catalogue clones the state once a tile while anything is on order.** Measured at about
   1.2 ms a render; see section 6, item 5. If the hall ever has twenty things on order at once it
   will want looking at again.
3. **A sold machine is half in the hall and half out of it.** It works for nobody and it still
   counts as owned for prerequisites and extraction until the van comes. Open question 6.
4. **A heavy delivery the player leaves at the gate stays there.** The event asks once and the task
   waits on the laptop's list like every other job of work. Nothing rots and nothing is lost, but a
   player who never looks at the list will wonder where his saw is. The Owned tab says "at the gate
   now, waiting to be unloaded".
5. **The reserved outline can be dragged somewhere silly.** It is checked exactly as a machine is,
   so it cannot overlap anything, but nothing stops the player putting the CNC's zone in the far
   corner and forgetting for nine weeks.

---

## 13. Tests

789 green, up from 736. New files:

- `tests/engine/deliveries.test.ts`: the days each class waits, a used saw ordered on day 1 that
  lands on day 2 at 08:00 through the event, a CNC 45 working days out, a cabinet that comes back
  with him, the reserved floor that cannot be built on and is dragged like a machine, and what needs
  somebody at the gate.
- `tests/engine/cancelAndSell.test.ts`: a full refund on day 3 of a seven day wait, a Cancel that
  goes the moment the lorry is at the gate, half of 5,000 paid the next morning, and the three
  refusals with their reasons.
- `tests/engine/staffOvertime.test.ts`: two joiners adding 2 x 2 h x 1.5 x the hour to Friday, the
  office adding nothing, an evening the owner does not stay for, three evenings setting the flag,
  one evening at home breaking the run, and the notice at the month end.
- `tests/ui/shoppingList.test.ts`: the kit and the sheets on one list shortest first, what each line
  says, the empty line, the top bar chip and the pin board, and the Owned tab's on-order tiles.
- `tests/ui/ownerOut.test.ts`: the component on a trip and not otherwise, Skip ahead holding 4x and
  giving the speed back, and a trip cut by 17:00.
- `tests/ui/version.test.ts`: the corner on the start screen and in the game, and the grep that says
  `v10` is written in one file.

Rewritten: `tests/engine/moving.test.ts` for the question, the light kit, Put them back and the
skipped clock. Two new scenario months, (l) and (m), and the Easy month now says what the trip
brought back and what the lorry brought the next morning.

---

## 14. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 8 added is reachable from the game: the version in the corner of the start
screen, the delivery line on every class in the catalogue, the Orders chip on the top bar and the
pin board beside the office door in the hall, the grey outlines on the floor where the lorry will
put things, the Owner is out line with its Skip ahead while he is at the shops, the question the
hall asks before it is moved, the Sell on every machine in the Owned tab, and the Friday wages with
the evenings in them.

---

## 15. Line balance

| Task | Files touched | Lines added | Lines removed |
|---|---|---|---|
| Whole turn | 51 | 3,343 | 198 |

346 of those added lines are `docs/turn-7-brief.md`, which is the archive and not code. New modules:
`src/engine/orders.ts`, `src/ui/shopping.ts`, `src/ui/ownerOut.ts`.

---

## 16. Parked, carried forward

1. Turn 9: compressed air (bar, l/min, compressor classes, assignment) and extraction capacity
   (m3/h, under extraction penalties), with Piotr's tables, and the five classes of extractor and
   compressor as data.
2. House 100 k and villa 500 k templates, a 180 degree view, movable rooms, rates and power for
   200 m2.
3. Worker morale beyond the overtime flag.
4. A picture of the floor catalogue, and pictures for the families that still draw as boxes: the
   CNC, the spray booth, the thicknesser, the solid wood tools, the extraction, the compressor, the
   pelletiser, the tool cabinet, the van and the forklifts.
5. Everything parked before.
