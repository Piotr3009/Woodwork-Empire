# Report: Turn 12

Dust in cubic metres, bags only on the extractor.

Branch `claude/dreamy-goldberg-87obv0` (the cloud environment names the branch; the brief's task
queue would have called it `turn-12-dust-in-cubic-metres`). Base: `08ef09b` on `main`, which is
Piotr's commit putting this brief in the repository, on top of the Turn 11 merge `0449e03`. 1,098
tests green and one todo, up from the 1,071 at the end of Turn 11; 103 test files, up from 99.
`npm run check` clean on its own exit code before every commit.

---

## 0. Blocker: the thicknesser is nobody's station

Month (s) of T12-07 asks for "a month with a thicknesser and a single bag extractor that asserts
the helper empties it more than once a day". That assertion cannot hold in a played month, and
this is why:

- `familyForStage` in `src/engine/stages.ts` gives the machining of timber to `solidWoodTools`,
  and no stage of any job stands a man at the thicknesser. It is a prerequisite of solid wood
  work (`SOLID_WOOD_EQUIPMENT`, read by the board's `kitBlockFor`) and nothing else. Nobody's
  minute is ever booked at it, so it makes no dust in play, whatever its figure.
- The month is played all the same, with the policy `THICKNESSER_ONE_BAG`: the thicknesser and
  the tools bought on day 1 behind the day 1 fan, a helper on the books, and the oak dining table
  taken off the board. It asserts what is true: the thicknesser has zero hours on its clock, the
  store was fed by the saw and the bander at their figures and never filled, and no emptying was
  asked for. The brief's assertion is an `it.todo` naming this section, so the suite shows it as
  pending and not as passing.
- The fill rule itself is proved a level down, in `tests/engine/bags.test.ts`: a man stood at a
  thicknesser a minute at a time, booked the way the clock books him, fills the single bag at
  minute 240, which is dinner time.
- What would unblock it: a stage of solid wood work that runs on the thicknesser, the planing of
  the timber before the machining. That is a change to the production model, which section 5.2
  and scope 1:1 keep out of this turn. One line in the stages table and a test, next session, and
  month (s) becomes the month the brief describes. Open question 1.

Nothing else in the brief was impossible. The rest of this report is the usual structure.

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T12-01 Housekeeping and v19 | `60cfc0e` | `docs/turn-11-brief.md` out of git history, byte for byte the `CLAUDE.md` of `0449e03`; the README pointing at it; `APP_VERSION = 'v19'`. | `tests/ui/version.test.ts` |
| T12-02 Constants | `17ca779` | `DUST_OUTPUT_M3_PER_HOUR`, `EXTRACTOR_BAGS`, `BAG_M3`, `bagsToM3`, the comment block for the five families that do not exist yet; `BAG_BY_CLASS`, every `bagIntervalFactor` and every `bagInterval` gone, with every reader of them. | `tests/engine/dust.test.ts`: every machine family on the table, every extractor class in the bags table, Piotr's figures, nothing left of the old fields |
| T12-03 Types and migration | `a767f44` | `bagFillM3` on the state, `dustM3` on the day and `dustMadeM3` on the record; `minutesUsed` and `bagFull` off `Equipment`; `STATE_VERSION` 13 and `src/engine/migrate.ts`, which lifts a v18 save; the chore renamed `emptyBags`, sized to the store, raised on the extractor by `ASK_EMPTY_BAGS`. | `tests/cloud/migrate.test.ts`: a real v18 save loads through the one decoder, the browser store and the cloud row, with no `bagFull` on any item |
| T12-04 Filling, full, emptying | `73cf5a5` | `accumulateMachineMinute` adds the family's figure over sixty for every person minute at a machine, to the day and to the store; the store full stops every family with a figure above zero; one event, "Bags full in the workshop"; emptying sets it to nothing. | `tests/engine/bags.test.ts`: the six cases the brief lists, the one event, and the helper |
| T12-05 The cards | `a7aad43` | The class card in Piotr's order with the output coloured by its sign, `Dust 0.015 m³/h of use`, `Needs 1,100 m³/h of extraction`, `Takes 3 m by 1 m, works in 4 m by 3 m`; the extractor card `Bags 4, holds 4 m³`; the central systems `No bags. Waste collection £400 a month` off the constant. | `tests/ui/machine.test.ts`: the standard saw's two lines and the pro extractor's line the brief asks for, the colours, the trimmed decimals |
| T12-06 The floor and the reports | `ab172bf` | The store under the hall on a click of the extractor, with a bar that goes red; the store in the extractor's tooltip; `Dust made today 0.31 m³` on the summary at every cadence. | `tests/ui/bagStore.test.ts`, `tests/render/views.test.ts`, `tests/ui/summary.test.ts` |
| T12-07 Scenarios | `1005dbd` | The used saw and big saw months assert the hall store where they asserted the saw's bag interval; the crew month asserts the two fans added up; a six joiner month on the day 1 fan fills the bag more than once and the owner empties it each time; month (s), as section 0 says. | `tests/scenarios/thirtyDays.test.ts` |
| T12-08 Report and PR | this commit | This file, and the README's reports line. | |

---

## 2. Numbers chosen

Every `[TUNE]` this turn added, with what went in. Piotr's own figures are marked as his.

| Number | Value | Where | Tag |
|---|---|---|---|
| `APP_VERSION` | `v19` | `constants.ts` | the brief |
| `STATE_VERSION` | 13 | `constants.ts` | the store on the state, the two fields off the items |
| `BAG_M3` | 1 | `constants.ts` | `[PIOTR]` 1: a bag is one cubic metre |
| `DUST_OUTPUT_M3_PER_HOUR` | saw 0.015, bander 0.01, thicknesser 0.25, CNC 0.06, CNC head 0.06, hand tools 0, booth 0, drill 0 | `constants.ts` | `[PIOTR]` 2.1, his table to the figure |
| `DUST_OUTPUT_M3_PER_HOUR.compressor` | 0 | `constants.ts` | `[TUNE]`: not on his list. A compressor moves air and makes no chips; the zero is there so that every family of the machine category is on the table and the test can hold it to that |
| `EXTRACTOR_BAGS` | used 1, budget 1, standard 2, pro 4, industrial 10 | `constants.ts` | `[PIOTR]` 2.3, off the class descriptions already on the shelf |
| The store's brim | capped at its capacity | `machines.ts`, `accumulateMachineMinute` | `[TUNE]`: 2.3 says "reaches its capacity"; the minute that would take it past the brim takes it to the brim, and the dust past it is on the day's figure only, so the floor never reads 1.00008 of 1 |
| `OLDEST_SAVE_VERSION` | 12 | `migrate.ts` | the brief: saves from v18 (state 12) must load; anything older is refused as before |
| Decimals | 1 on the floor line, 3 on the card, 2 on the summary | `bagStoreLine`, `dustLine`, `dayEnd.ts` | `[PIOTR]` 3.1 to 3.4, his own examples: 4.6, 0.015, 0.31 |
| The bag gauge | 80 by 8 px, `var(--good)` filled, `var(--bad)` when full | `styles.css` `.bag-gauge` | size `[TUNE]`; the colours are the game's green and red |
| The chore's station | the first extractor standing in the hall, else the bench | `stations.ts` | `[TUNE]`: the store is the hall's, so the man empties it at the first fan |
| The event body | "The bags on the extractor hold 10 m³ and they are full. Nothing that makes dust gets made until they are emptied." Choices "Empty them yourself", "Leave the machines stopped" | `game.ts` `raiseBagsFull` | wording `[TUNE]`; the title is `[PIOTR]` 2.3 |
| Month (s) standing | reputation 40 | `autopilot.ts` `THICKNESSER_ONE_BAG` | `[TUNE]`: the lacquer month's figure, more than the table's 10, so the board offers it from day 1 |

Nothing on the machine class ladders was touched. `EXTRACTION_DEMAND`, `EXTRACTION_CAPACITY`, the
air rule, the dust band and `BAG_CHANGE_MINUTES` are as they were.

---

## 3. Where the store lives

**Per hall, one number: `state.bagFillM3`.** Not one per extractor.

Why: 2.3 makes the hall one duct run, so the capacity is the sum over every extractor standing in
it and the dust of every machine goes into that one sum. With a field per extractor the engine
would need a rule for which fan a minute's dust goes into and a sum to read it back, which is two
paths for the one question "how full is this hall's store". With a number on the state the
question is asked in one place, `bagStore(state)`, and everything reads that: the fill rule, the
full rule, the floor, the Owned tab, the chore's size and the event's body. The migration zeroes
one field. The cost is small and named: a second hall (the house session) will want a store per
hall, which is this one field becoming a map keyed by hall, and the number stays in the state when
the last fan is sold, with no bags to be full against, until the next fan is bought and finds it
there (risk 4).

`BagStore` is `{ exists, bags, capacityM3, fillM3, full }`. `exists` is `bagsExist(state)` as it
always was (an extractor and no central system); `bags` counts every extractor standing in the
hall and not sold, through `bagsOf`; `capacityM3` is `bagsToM3(bags)`, the one conversion; `full`
is `exists && bags > 0 && fillM3 >= capacityM3`, so an empty hall or a hall on a central system
never reads full.

---

## 4. The model, as built

- **Filling.** `accumulateMachineMinute(state, minutesByItem)` still books the hours; for every
  item in the map it now adds `dustOutputOf(family) / 60 * personMinutes` to `dayStats.dustM3`
  always, and to `bagFillM3` while the store exists and has bags, with the six place rounding.
  It returns true the minute the store fills and `runProductionMinute` raises the one event on
  that. A central system and a hall with no fan count the dust and fill nothing (2.3).
- **Full.** `familyStopped` returns `{ why: 'bags' }` for a family with a figure above zero while
  the store is full, and `hallBlock` reads it as `bags full` on the job, exactly where `bag full`
  used to be; `canWorkOn` releases the man and the machine, so the saw's blade and chips stop.
  Broken still comes first when every machine of the family is broken.
- **The event.** `raiseBagsFull` with a helper on duty delegates the chore and raises nothing; he
  takes it on the spot, which is the Turn 11 rule that a helper's chore needs no minutes. Without
  one it queues "Bags full in the workshop" with the `adHocChoices` of every other chore. Clicking
  the extractor while the store is full is `ASK_EMPTY_BAGS`, which asks again.
- **Emptying.** One task kind, `emptyBags`, `BAG_CHANGE_MINUTES` a bag, labelled "Empty the bags
  (10 bags, 150 min)" through `emptyBagsLabel`; done, `emptyBags(state)` sets the store to nothing.
  It carries no `equipmentId`, because the store is the hall's and not one fan's.
- **The migration.** `migrateState(raw, version)` runs the lifts in `LIFTS` from the save's
  version up to `STATE_VERSION`, on a copy. `liftToVersion13` zeroes `bagFillM3`, `dayStats.dustM3`
  and `dustMadeM3` on every day record, deletes `minutesUsed` and `bagFull` from every item, drops
  every open `bagChange` task and frees whoever held it, renames the done ones to `emptyBags`, and
  drops any `bagFull` event. `decodeSaveFile` lifts what is not at the current version, and
  `peekSave` and `openSavedRow` ask `canOpenVersion` instead of comparing to the number.

---

## 5. Deviations from the contract

1. **The branch name.** `claude/dreamy-goldberg-87obv0`, not `turn-12-dust-in-cubic-metres`: the
   environment names the branch and the session may only push to the one it was given. The same
   deviation as Turns 7 to 11.
2. **The task cut.** T12-02 deletes the fields and also every reader of them, because a check
   with the fields gone and the readers left cannot be green. T12-03 carries the state shape, the
   renames and the migration together with the emptying chain (the chore, the action, the event),
   because a migration that renames a task kind is nothing without the kind. T12-04 then adds
   only what the cut left: the filling and the full rule. Each of the three commits is green on
   its own.
3. **The extractor card has no output line and no dust line.** 3.2 lists what it pulls, its bags,
   its life, its power and its floor; a fan has no output factor of its own and makes nothing. The
   air dryer and the pelletiser, on the same category, lose "Output as a standard machine" for the
   same reason. Open question 4.
4. **Two lines stay on the class card after the six of 3.1**: the compressed air line of Turn 10
   and the delivery line of Turn 8, in that order, as they were. 3.1 sets the order of its six and
   says nothing about these two, and taking them off would have been a change nobody asked for.
5. **Hover shows the store as text, the bar is on the click.** A browser tooltip is text and
   cannot carry a bar, so the extractor's `<title>` reads "Extractor. Bags 0.4 / 1 m³. Serves
   every machine..." and the click puts the same line under the hall with the bar beside it,
   drawn off the state every render so it fills as the saws run and turns red when full.
6. **"Dust made today" is the day's figure at every cadence.** It sits in the column headed "The
   hall, day N", which is the day's whatever the cadence, beside the dust band that was there
   already; so the monthly report carries the brief's line word for word, while its money column
   says "this month". Open question 3.
7. **`Dust none` on the compressor card.** 3.1 says every family with classes shows the line and
   "Dust none" when the figure is zero; the compressor has five classes. Open question 8.
8. **The store is capped at the brim** (section 2).
9. **The scenarios that asserted a bag.** No month on `main` asserted a bag on a machine as such;
   the two that read the saw's bag interval (`bagIntervalFor(saw)` in the Easy month and the big
   saw month) now assert the hall store, fed at the family's figure off the machines' own clocks,
   one bag for the day 1 fan, never filled off one saw. The crew month stands an industrial fan
   beside the day 1 one, so it asserts eleven bags in one store; the month that fills the bag and
   has the owner empty it twice is the autopilot's six joiners on the day 1 fan alone, added for
   it. Month (s) is section 0.
10. **One list of the central systems.** `hasCentralExtraction` read two names inline; the
    extractor card needed the same two, so both read `CENTRAL_EXTRACTION_SPECS` now.
11. **The sprite check page** prints "2 m by 1 m, 1 m high" and "works in 3 m by 3 m" through the
    formatter, where it printed "2 by 1 by 1 m" and "on a 3 by 3 m zone". Every footprint and zone
    in the game goes through `metresBy`, including the buy refusal "No free 4 m by 3 m in the
    hall".
12. **The effect strings of the central systems** read the fee off `DUST_WASTE_MONTHLY`; they
    typed 400. The card's line is off the same constant through `money`.
13. **The colour helper is on the class card and nowhere else.** The company board and the books
    keep their own inline sign checks, and there a zero is green where the card's rule makes it
    the body colour, so folding them in would have changed what those two show. Open question 5.
14. **The helper empties ten bags in no time.** 2.3 says ten bags take ten times as long as one,
    and they do for the owner and for a joiner; a helper's chore is instant by the Turn 11 rule,
    which this turn did not touch. Open question 2.
15. **The README's step 3** said each class shows what it does "to the bag"; it says "to the dust
    it makes" now, which is what the card says.

---

## 6. What reviewing the diff turned up

1. **The chore is sized when it is raised.** A fan bought while "Empty the bags (1 bag, 15 min)"
   is open does not resize it; the next one is sized to the new store.
2. **A sold fan waiting for the van** still counts for `bagsExist` and `hasExtraction` (it always
   did) and no longer counts for the store's bags, so nothing fills until it is gone and the next
   fan is bought. Before tonight its bag went on filling.
3. **`machineInUse` no longer looks at a bag.** A machine whose family the store has stopped is
   released by `canWorkOn`, so the blade and the chips stop through the same path as any other
   block.
4. **The migration frees a man mid chore.** A v18 save with the owner or a joiner half way through
   a bag change loses the task; the minutes he spent are not refunded. Saves in that state are a
   quarter of an hour wide.
5. **Only one lift exists.** Version 11 and older (Turn 10 and before) are refused as they were;
   `LIFTS` is a table, so the next bump adds a function and nothing else.
6. **Two sums, six places.** The day's dust and the store are rounded a minute at a time, and the
   hours the same way; over a month of cutting the dust off the clocks and the dust off the days
   agree to a few thousandths, which is what the scenarios hold them to.
7. **`ownedState` stops every family that makes dust**, so the Owned tab says "stopped: bags full"
   on the saw, the bander, the CNC and the thicknesser, and "running" on the drill and the hand
   tools, which is the rule of 2.3 read literally.
8. **The store note gives way to any other note.** Every note under the hall goes through one
   setter that clears the store's live line, so the bar never lingers under "It has stopped" or
   "On order".

---

## 7. Paths: how many code paths do the same job?

| Question | The one path |
|---|---|
| How much dust does a machine of this family make an hour? | `dustOutputOf(specId)`, over `DUST_OUTPUT_M3_PER_HOUR` |
| How many bags on this fan? | `bagsOf(item)`, over `EXTRACTOR_BAGS` |
| Bags into cubic metres? | `bagsToM3(bags)`, over `BAG_M3` |
| How full is the hall's store? | `bagStore(state)` |
| Is it full? | `bagsFull(state)` |
| What does the store read? | `bagStoreLine(store)` |
| What is the chore called, and how long is it? | `emptyBagsLabel(bags)`, `emptyBagsMinutes(bags)` |
| What stops this family? | `familyStopped(state, specId)`, and `hallBlock` reads it |
| Is the hall on a central system? | `hasCentralExtraction(state)`, over `CENTRAL_EXTRACTION_SPECS` |
| A figure in cubic metres? | `cubicMetres(value, places)` |
| A footprint or a zone? | `metresBy(size)` |
| A figure trimmed of its zeros? | `trimmed(value, places)` |
| What colour is a signed line? | `signClass(value)` |
| Can this build open that save? | `canOpenVersion(version)`, and `migrateState` lifts it through `LIFTS` |
| What is under the hall? | `setNote(text)`, or the store's live line |
| What did the day's machines make? | `dayStats.dustM3`, written once into `DaySummary.dustMadeM3` |

---

## 8. Deleted

Everything section 2.4 names, and what was found beyond it.

| Gone | Where it was | What replaced it |
|---|---|---|
| `EquipmentVariant.bagIntervalFactor`, on the type and on every class of every family | `types.ts`, `constants.ts` | nothing: the dust is the family's |
| `EquipmentSpec.bagInterval` and every `bagInterval:` line | `types.ts`, `constants.ts` | `DUST_OUTPUT_M3_PER_HOUR` |
| `BAG_BY_CLASS` | `constants.ts` | `EXTRACTOR_BAGS` |
| `Equipment.minutesUsed`, `Equipment.bagFull`, and the two in `standItem` and the tests' `placeEquipment` | `types.ts`, `game.ts`, `tests/helpers.ts` | `GameState.bagFillM3` |
| `bagIntervalFor`, `bagMachinesFor` | `machines.ts`, `index.ts` | `bagsOf`, `bagStore` |
| `emptyBag(state, equipmentId)` | `machines.ts` | `emptyBags(state)` |
| `familyStopped`'s `'bag'` and `hallBlock`'s `'bag full'` | `machines.ts`, `jobs.ts` | `'bags'` and `'bags full'` |
| `raiseBagFull(state, machine)`, the event kind `bagFull`, the action `ASK_BAG_CHANGE` with its `equipmentId`, the task kind `bagChange` | `game.ts`, `types.ts`, `tasks.ts`, `stations.ts` | `raiseBagsFull(state)`, `bagsFull`, `ASK_EMPTY_BAGS`, `emptyBags` |
| The `bagFull` key wherever it was read: the item field, the event kind, the reason on the job | `game.ts`, `catalogue.ts`, `app.ts`, `hall.ts` | the store |
| `bagLine`, "Bag every N min of use", "No bag to change" | `ui/machine.ts` | `dustLine`: "Dust 0.015 m³/h of use", "Dust none" |
| "Bag every N minutes" in the effect strings of the saw, the bander and the thicknesser | `constants.ts` | the card's line |
| `machinesUsedFor` | `machines.ts`, `index.ts` | nothing read it: dead, found beyond 2.4 |
| The `(bag full)` suffix on a machine's floor label | `render/hall.ts` | `(bags full)` on the extractor, the same visual moved and not a second one |
| `'stopped: bag full'` on the Owned tab | `ui/catalogue.ts` | `'stopped: bags full'` on every family that makes dust |
| "Extraction 1,100 m3/h while it runs" | `ui/machine.ts` | "Needs 1,100 m³/h of extraction" |
| "Takes 2 by 1 m on a 3 by 3 m zone", "on a 3 by 3 m zone", "No free 5 by 3 m in the hall", "2 by 1 by 1 m" | `ui/machine.ts`, `spriteCheck.ts`, `game.ts` | `metresBy` |
| "m3/h" in the under extraction note under the hall | `render/hall.ts` | "m³/h" |
| The per machine bag tests: the interval, the class factor, the bag that filled, the one event a machine | `tests/engine/machines.test.ts`, `variants.test.ts`, `toolCabinet.test.ts`, `machineHours.test.ts`, `thirtyDays.test.ts` | `tests/engine/bags.test.ts` and the scenario assertions of section 5.9 |

No shim, no compatibility layer, no dead export: `git grep` for `bagFull`, `bagChange`,
`bagInterval`, `minutesUsed`, `BAG_BY_CLASS` and `ASK_BAG_CHANGE` finds them only in the migration
that drops them and in the test that asserts they are gone.

---

## 9. Known risks

1. **Two halls** (parked, the house session) need a store per hall; tonight there is one number.
2. **A fan bought while the chore is open** does not resize the chore (6.1).
3. **A hall with a helper empties ten bags for nothing**, by the Turn 11 rule (5.14).
4. **The number survives the last fan.** Sell the only extractor and `bagFillM3` stays; buy the
   next one and it starts with that fill in it. Nothing reads it as full meanwhile.
5. **A v18 save mid chore** loses the chore and the minutes (6.4).
6. **v17 and older saves** are still refused; only the v18 lift exists (6.5).
7. **The bar is inline in a one line note**, 80 px; on a narrow view the note wraps under the bar.
8. **Month (s)** is a todo until the thicknesser is a station (section 0).
9. **The check is a little time dependent.** One full run tonight went red in
   `tests/ui/officeRegions.test.ts` and `tests/ui/pausedTime.test.ts`, eleven tests, and green
   when rerun; both files pass on their own every time. The pattern in the log ("no kit in the
   hall", a laptop boot task still open after `advanceMinutes`) is the app's real time frame:
   `mount` starts a `requestAnimationFrame` loop that walks the game clock at the chip's speed in
   real time, jsdom fires frames between tests, and a file that leaves the clock at 1x can have a
   minute or two run on its own between two clicks when the worker is slow, which puts an event up
   and leaves every later `advanceMinutes` running nothing. Turn 7 brought the loop and those
   tests; this turn adds one more jsdom file, which is a little more load, and touches neither
   file. Not fixed tonight, scope 1:1: the fix is for those tests to put the clock back to 0 once
   the office has been reached for, or for the loop not to walk the clock under test.

---

## 10. Tests

1,098 green and one todo, up from 1,071. 103 files, up from 99. New files:

- `tests/engine/dust.test.ts`: every family of the machine category on the dust table and every
  extractor class on the bags table, Piotr's figures to the number, the CNC's half bag a day and
  the saw's quarter of it, and no bag interval or class factor left on any class of any family.
- `tests/engine/bags.test.ts`: the store as the fans added up; an eighth of a bag off one saw in
  eight hours; ten saws on one bag full in about eight hours (at minute 400), to the brim and not
  past it; a thicknesser on a single bag full by dinner (minute 240); a central system never full
  and the dust still counted; a hall with no fan the same; fifteen minutes a bag and ten bags ten
  times that, on the chore's label and on the owner's clock; every machine that makes dust stopped
  while the bags are full and running again when they are emptied; one event the minute the store
  fills and never one a machine; the helper emptying them the minute they fill with nobody stopped.
- `tests/cloud/migrate.test.ts`: a real v18 save (`tests/fixtures/save-v18.woodwork.json`, day 2
  with a full bag on the saw, the event up and the chore open) loads through `decodeSaveFile` at
  version 13 with the new fields zeroed and the old ones gone, the chore and the event dropped,
  every task reference valid, ticks thirty minutes and round trips; the browser store reads it as
  ready; the cloud row opens it; version 11 is refused; the input is left untouched.
- `tests/ui/bagStore.test.ts`: the page driven: click the extractor and the line and the bar
  are under the hall, the bar at 0%, then 40%, then 100% and red as the state moves; click it full
  and the one event comes up, left stopped the chore is on the laptop under its full name; click
  the saw and the store's line gives way to the saw's.

Changed: `tests/ui/machine.test.ts` (the seven lines in Piotr's order on the used and the
industrial saw, the standard saw's `Dust 0.015 m³/h of use` and `Takes 3 m by 1 m, works in 4 m
by 3 m`, the same dust on every class, 0.25 and 0.06 and "Dust none", the colours, the pro
extractor's `Bags 4, holds 4 m³` between what it pulls and its life, the central systems' line);
`tests/render/views.test.ts` (the extractor's label and tooltip); `tests/ui/summary.test.ts`
("Dust made today" on the summary and on the monthly report, and the figure written into the
record of a day the saw ran); `tests/scenarios/thirtyDays.test.ts` (section 5.9 and month (s));
`tests/engine/machines.test.ts`, `helper.test.ts`, `game.test.ts`, `breakTime.test.ts`,
`dayLog.test.ts`, `stations.test.ts`, `catalogueTabs.test.ts`, `zones.test.ts`,
`spriteCheck.test.ts`, `topbar.test.ts`, `earnedRate.test.ts`, `types.test.ts`,
`variants.test.ts`, `toolCabinet.test.ts`, `machineHours.test.ts`, `machineFx.test.ts` (the
renames, the new field on the day record, `STATE_VERSION` 13, and the per machine bag gone).

---

## 11. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 12 added is reachable from the game: the class cards in the catalogue with
the output coloured, the dust, what it needs, and the floor in metres; the extractor card with its
bags; the central systems' line; the store under the hall on a click of the extractor and in its
tooltip; "Bags full in the workshop" when the store fills, and "Empty the bags (N bags, M min)" on
the laptop's tasks tab; "Dust made today" on the evening's summary; and a Turn 11 save opening
through Continue, the file and the cloud.

---

## 12. Line balance

| Task | Files touched | Lines added | Lines removed |
|---|---|---|---|
| T12-01 | 4 | 277 | 4 |
| T12-02 | 13 | 151 | 309 |
| T12-03 | 31 | 475 | 132 |
| T12-04 | 4 | 260 | 13 |
| T12-05 | 14 | 204 | 50 |
| T12-06 | 7 | 224 | 19 |
| T12-07 | 2 | 157 | 1 |
| Whole turn, before this report | 51 | 1,730 | 510 |

Of those, `src` is 21 files, 565 added and 221 removed; `tests` 28 files, 890 added and 287
removed; 273 of the added lines are `docs/turn-11-brief.md`, which is the archive and not code.
New modules: `src/engine/migrate.ts`.

---

## 13. Open questions for Piotr

1. **Should the thicknesser be a station?** The planing of timber before the machining, one line
   in the stages table. Without it month (s) stays a todo and a thicknesser makes no dust in play.
2. **Should the helper take fifteen minutes a bag like everybody else?** Tonight he empties ten
   bags on the spot, by the Turn 11 rule.
3. **"Dust made today" on the monthly report: the day's figure, or the month's sum?** The brief
   gives the same line for both, and the hall column is the day's.
4. **Should the extractor card keep an output line?** Dropped tonight, 3.2 lists none.
5. **One colour helper for the board and the books too?** There a zero is green; on the card it is
   the body colour.
6. **Two fans, one store.** Both fans on the floor read the same line. Is that the picture wanted
   until the pipes are drawn?
7. **"Dust none" on the compressor card**, which has five classes and makes no chips: keep it or
   leave the line off families that make nothing?
8. **`powerPerDay`'s unit**, still open (section 6.2 of the brief).

---

## 14. Parked, carried forward

1. Turns 13 to 15 in one pass, as the brief's section 6 lists them: loans and overdraft, insurance,
   the gate to commercial work, standing contracts, security in five levels, the owner's house in
   eight tiers, the extraction pipes drawn on the grid, the production manager.
2. The thicknesser as a station (section 0); a store per hall when there are two halls; the colour
   helper on the board and the books.
3. Starting capital 50 k or 40 k, open, stays 50 k; every `[TUNE]` on the class ladders except
   prices and the used saw's three effects.
4. Everything parked before.
