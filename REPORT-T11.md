# Report: Turn 11

A cabinet for a top bar, a day you can read, and a shop that looks like paper.

Branch `claude/charming-archimedes-0wocge` (the cloud environment names the branch; the brief's
task queue would have called it `turn-11-cabinet-and-paper`). Base: `9993e1e` on `main`, which is
Piotr's commit putting this brief in the repository. 1,071 tests green, up from the 947 at the end
of the chat fixes. `npm run check` clean on its own exit code before every commit.

---

## 1. Done

| Task | Commit | What went in |
|---|---|---|
| T11-01 Housekeeping and v18 | `218733f` | `docs/turn-10-brief.md` out of git history, the README pointing at it, `APP_VERSION = 'v18'`, and the skin table: every modal id in the game with the one family it wears. |
| T11-02 Day log and categories | `916c0d6` | The owner's day written down as it happens, in the seven bands the player reads, merged while he stays on one thing and emptied every morning. `STATE_VERSION` 12. |
| T11-03 The top bar | `f5d747c` | Seventy pixels of machine green with rivets, the money on a cream name plate, the date over the speed knobs, the boss's day in the middle with its lamp and its seven bands, the four push buttons on the right, and the same day as percentages at the top of the evening's summary. |
| T11-04 Autosave and Continue | `a96ec22` | `src/cloud/store.ts`: one interface, the browser's storage behind it, the game written down at every morning, purchase, hire, accepted enquiry, finished move and closed modal, never more than once a second. Continue, and the one question a New game asks. |
| T11-05 The helper's chores and his figure | `f9f1dc5` | The unloading, the bags and the cleaning are the helper's and nobody else's, and he stands where he can be seen. |
| T11-06 The Work Plan bar that fills | `a7a4408` | A bar as long as the work at the rate it will get, filling green as the work goes in and stretching by every minute the job stands still, red past the deadline. |
| T11-07 The two families painted | `bb33ff7` | The folder at three sizes, the steel magnet board drawn in CSS, and the white squares over the laptop and the door replaced by a 2 px orange outline. |
| T11-08 The company board | `a077d70` | The felt picture with its live text: the name and the week on the felt, the output and its two columns on the pinned sheet, and the two totals under both. |
| T11-09 The day one checklist | `a3e91cd` | Twelve things at the top of the catalogue, ticked as they are bought, collapsing to one line when the last of them is. |
| T11-10 Lacquer, bench air, free rotation | `af4504e` | Two sprayed products, a bench that wants air, and a heavy machine that pays for being turned where it stands. |
| T11-11 Phone and cancel | `d39adf9` | The owner's own phone sheet on a call, and Cancel on a load of sheets until the morning it lands. |
| T11-12 Scenarios | `7e70abd` | The spray booth unlocked, month (q) with a helper and month (r) with a booth and no dryer, and the day log and the bench air rule asserted over the Easy month. |
| T11-13 Report and PR | this commit | This file. |

---

## 2. Numbers chosen

Every `[TUNE]` this turn added, with the figure that went in, and Piotr's own bands marked. None of
them is presented to the player as a fact.

| Number | Value | Where | Tag |
|---|---|---|---|
| `APP_VERSION` | `v18` | `constants.ts` | the brief |
| `STATE_VERSION` | 12 | `constants.ts` | the owner carries his day, the state the last week of them |
| `DAY_CATEGORIES` | workshop, calls, emails, meetings, site measure, office, fixing and bags | `constants.ts` | `[PIOTR]` 3.1, in his order |
| Band colours | `#2e9e5b`, `#378add`, `#7f77dd`, `#c9a227`, `#8e6a3a`, `#e0731e`, `#d84a4a` | `styles.css`, `.seg-*` | `[PIOTR]` 3.1 |
| `DAY_LOGS_KEPT` | 7 | `constants.ts` | `[PIOTR]` 3.1: a week is what the board shows |
| Top bar height | 70 px | `styles.css` `.topbar` | `[PIOTR]` 3.1: "about 70 px" |
| Cabinet green | `#102518` to `#0a1a10` | `styles.css` | `[PIOTR]` 3.1 |
| Name plate | `#f3ecdc` to `#d9d1bd`, cash 26 px, date 20 px, push buttons 16 px | `styles.css` | `[PIOTR]` 3.1 |
| `SAVE_KEY` | `woodwork-empire.save` | `cloud/store.ts` | `[PIOTR]` 3.2 |
| `AUTOSAVE_MIN_MS` | 1,000 | `ui/app.ts` | `[PIOTR]` 3.2: "never more than once a second" |
| `HELPER_HOME_CELL` | (2, 8) | `constants.ts` | `[PIOTR]` 3.4: the gate lane cell |
| `NO_AIR_FACTOR` | 0.67 | `constants.ts` | `[TUNE]` 3.8, the brief's own figure |
| `NO_AIR_LINE` | "No air: screws by hand" | `constants.ts` | `[PIOTR]` 3.8, his own words |
| Lacquered wardrobe | base 4,375, 300 design minutes, 4 calls, reputation 10, weights 0 / 10 / 18 | `constants.ts` | band `[PIOTR: 3,500 to 6,000]`, the rest `[TUNE]` |
| Lacquered kitchen | base 15,000, 900 design minutes, 4 calls, reputation 20, weights 0 / 0 / 12 | `constants.ts` | band `[PIOTR: 12,000 to 20,000]`, the rest `[TUNE]` |
| `DAY_ONE_KIT` | twelve things, in Piotr's order | `constants.ts` | `[PIOTR]` 3.6, his own list |
| Board skin | steel `#4a4f54` to `#3a3f44`, frame `#24282c`, magnets `#c0392b` and `#2f6fb0`, tilt minus 1 to 1.5 degrees, buttons `#f5e27a` / cream / `#ff8a80` / grey | `styles.css` | `[PIOTR]` 3.5 |
| Hover outline | 2 px orange, 4 px radius, no fill | `styles.css` `.office-region` | `[PIOTR]` 3.5 |

The calls of both lacquered templates come off the price curve of 8.10 like every other template,
which is what `tests/engine/catalog.test.ts` holds them to; nothing was chosen for them.

---

## 3. Skins

Two families and nothing else. `MODAL_SKINS` in `src/ui/modal.ts` is the one table, and
`tests/ui/modalSkins.test.ts` holds every modal id to exactly one of the two.

| Modal id | Skin | What it is |
|---|---|---|
| `catalogue` | folder | the equipment catalogue |
| `accounting` | folder | the books |
| `team` | folder | the team board, and the hiring inside it |
| `laptop` | folder | the desk, with Materials and Drawings in its tabs |
| `board` | folder | the order board: enquiries are paperwork |
| `event` | folder | every event modal, the folder scaled down |
| `daySummary` | folder | the evening's summary and any past day |
| `workPlan` | board | cards on the steel magnet board |
| `shopping` | board | the same, for what is on order |
| `company` | board | the one board that is a picture: `.modal-felt` over the green felt |

The company board is in the board family and carries `modal-felt` as well, which swaps the drawn
steel for `officeCompanyBoard.png`. It is one of the two families, not a third.

---

## 4. The day you can read, which is most of the turn

`state.owner.dayLog` is the day in the order it happened: one segment per run of minutes on the
same thing, joined while he stays on it, so a morning of drawing is one entry and not two hundred.
It is emptied every morning in `startDay` and kept, when the day closes, on that day's summary and
on `state.dayLogs`, which holds the last seven of them for the company board.

Every kind of task in the game is on one table, `DAY_CATEGORY_OF_TASK` in `src/engine/tasks.ts`,
that maps it to one of the seven bands. The engine's own three way `admin` / `design` / `workshop`
split is untouched: that is the minute pool, and this is the seven way split the player reads. The
awkward corners of that table are written down here because they are judgements and not facts:

- a delivery run in the van is `workshop`: it is the work of the shop, not of the office;
- moving the hall about, a repair and a service are `fixing and bags`, beside the bag change and
  the cleaning they feel like;
- an interview is `meetings`, because that is what an hour sitting down with somebody is;
- waiting for the laptop to come up is `office`.

The percentages are shared out by largest remainder, so a day of thirds comes to exactly 100 and
never to 99. Break and idle time is not in the log at all: unpainted on the bar is unpainted, and
the percentages are of the minutes that were worked.

---

## 5. Deviations from the contract

1. **The branch name.** `claude/charming-archimedes-0wocge`, not `turn-11-cabinet-and-paper`: the
   environment names the branch and the session may only push to the one it was given. The same
   deviation as Turns 7 to 10.
2. **The brief names the members of the two families and leaves two modals out.** Section 1 lists
   the folder family as the catalogue, Team, Accounting, Drawings and the events, and the board
   family as the Work Plan, the shopping list and the company board. The order board and the
   laptop are on neither list. Both went to the paper family by elimination: enquiries and a desk
   are paperwork. Open question 1.
3. **The lacquer bands are the bottom of the band, not the whole of it.** The board draws a size
   multiplier of 0.8 to 1.6, a span of two, and Piotr's bands span 1.67 and 1.71. No base price
   reproduces either band exactly. The base prices chosen put his bottom figure at the smallest
   size the board draws: 4,375 gives 3,500 to 7,000 and 15,000 gives 12,000 to 24,000. The tops
   overshoot by the same fifth in both cases. Open question 2.
4. **0.67 is for no compressor at all; a compressor short of litres keeps its 0.7.** 3.8 reads
   "with no compressor in the hall, or the bench's compressor short of litres, Assembly runs at
   0.67". Turn 10's `LOW_AIR_FACTOR` of 0.7 is tagged `[PIOTR]` and the 0.67 is tagged `[TUNE]`,
   and a `[TUNE]` may not overwrite a `[PIOTR]`. So the new figure covers the case Turn 10 had no
   answer for, which is the empty hose, and the short compressor is still the Turn 10 rule. The
   assembly is slowed in both cases, which is the substance of the sentence. Open question 3.
5. **The empty hose slows every bench minute, not only the assembly.** `airFactorFor` already knew
   "this minute draws air at a bench", which is the assembly and the hand sanding of a Finishing
   that is not done in a booth. Both lose the same hose, so both take the factor; carving the
   sanding out would have been a special case with nothing behind it.
6. **The spray booth is unlocked.** It carried `locked: true` and "Coming in a later stage." since
   Turn 1. 3.7 gives the game two products that need a booth, and a product that needs a machine
   nobody can buy is a product nobody can ever make, which rule 3.5 forbids. It is the only thing
   in the catalogue that was locked, and nothing is now. Open question 4.
7. **The day one card sits under the tab bar and not over it.** "At the top of the catalogue" is
   the top of the page the player reads; the tabs are the chrome above it, and a card drawn over
   them on the folder's paper reads as a mistake.
8. **Piotr's day one order cannot be worked straight down.** The hand edgebander is seventh on his
   list and lives in a tool cabinet, which is eleventh: a player working down the list in order
   meets "Needs Tool cabinet first" on the seventh item. The list is his order and it stands; the
   folder the line opens says why, which is the game teaching him. Open question 5.
9. **R still arms the turn on the drag.** 3.9 says "R on a light item turns it in place". There is
   still no way to turn a machine without picking it up, which is REPORT-T10 deviation 9 and it
   stands. What Turn 11 changed is the cost, which is what 3.9's own test asks for: a bench turned
   where it stands costs nothing and a saw books the move.
10. **With a helper on the books the van is never a question at all.** 3.4 keeps the explicit
    "Unload it yourself" override. A helper clears his workshop jobs on the spot (Turn 2 3.8) and
    the morning hands him the lorry before anybody is asked about it, so the question does not
    come and there is no button to press. The override itself is alive and tested: it is what the
    Clean up button under the hall does, and what Work here does at a bench. Open question 6.
11. **The cloud row holds the encoded save text now.** 3.2 asks for one encoder for every store.
    `saveGame` writes `encodeSaveFile(state)` into the `state` column and `loadGame` opens it with
    `decodeSaveFile`; a row written before tonight is refused as "from an older build", which is
    what a state version bump does to it anyway. The cloud is dark in this build and the SQL is
    unchanged: a JSON string is valid `jsonb`.
12. **`mount` starts from nothing.** A page that has just been opened holds no game and nothing
    the player clicked: `mount` now resets the UI and the state before it reads the store. It was
    called once in the life of a page before, so nothing about the game changed; what it fixes is
    that a refreshed page would otherwise have come back to the game the module was still holding.
13. **Cancelling a job's material puts the job back to wanting it ordered.** 3.12 says the Cancel
    works and says nothing about the job behind it. Leaving the job at `materialOrdered` with no
    lorry would have stopped it for ever, so it goes back to `materialPending` with a fresh job of
    work on the list.
14. **A booth on the road counts for the board.** 3.7 says a lacquered product "needs the spray
    booth". Bought and on the road counts, which is what every other thing the board asks about
    has meant since Turn 8, and is what stops the same wardrobe standing on the board takeable and
    greyed at once. A booth that is not there yet still stops the Finishing: a machine on order
    cuts nothing (REPORT-T10 deviation 5).
15. **Two small defects in the board were fixed to let 3.7 work at all.** They are in section 6.

---

## 6. What reviewing the diff turned up

1. **A template the workshop could offer no finish for killed the whole board draw.**
   `availableFinishes` answers "what can this workshop offer", which for a lacquer only template
   in a hall with no booth is nothing at all. `buildEnquiry` then returned null, `generateEnquiry`
   gave up, and the board came back short: three of the Turn 10 board tests failed the moment the
   two sprayed templates existed. A client who wants his kitchen sprayed rings up whether the
   workshop can spray or not, so the enquiry is built on the template's own finish and the board
   greys it with the reason. That is the whole point of the greyed tile.
2. **One awkward template stopped the greyed list being topped up.** `generateUnreachable` bailed
   out of its own attempt loop on a candidate it could not build, instead of trying the next one,
   so the board stood half filled. One word.
3. **A pure turn cost nothing, for a saw as much as for a bench.** `recordMove` compared only the
   cell, so turning a machine where it stood was free for everything. It compares the orientation
   too now, and `endSetup` still drops every light thing from the list, which is what makes 3.9
   true in both directions.
4. **Every man who was not a joiner was anchored on cell (1, 1).** That is inside the office block
   of the painted hall, which is why Piotr could not see his helper. It is the helper's own corner
   now, and the corner follows the hall: the extractor when there is one, the gate lane when there
   is not.
5. **The autopilot reached for jobs of work the engine would refuse it.** With a helper in the
   hall the scripted owner would have stood in front of an unload he was not allowed to start for
   the whole month. He asks `startTaskCheck` now, which is the engine's own answer, and walks past
   what it refuses.
6. **Two lists called `DAY_ONE_KIT`.** The engine grew one for the catalogue card and the
   autopilot already had one for the buy order. The autopilot's is `DAY_ONE_BUY_ORDER` now, and
   its comment says which list it is the order of.
7. **The Orders button could never light.** The rule as first written was "an order he had seen is
   no longer on the list", and the list he had seen was only written when he opened it: a player
   who bought a saw and never opened the list was never told the lorry had come. The list he has
   seen takes in everything he adds to it now, and stops taking anything in the moment one of them
   has gone, so the button lights for a lorry that landed while he was looking somewhere else and
   stays lit until he looks.
8. **The Work Plan's own ruler was tilted with the cards.** `.plan-scale-row` is a `.plan-row`, so
   the nth-of-type tilt caught it and the reset underneath it lost on specificity. The tilt
   selectors exclude it now; a ruler at one and a half degrees is not a ruler.

The diff was then read again, line by line, against the brief, against the standing rules and for
its own correctness, and that turned up seven more. Every one of them is fixed with a test:

9. **A forced job of work was orphaned by the phone.** With a helper in the hall the owner may
   still take the cleaning himself, and the Clean up button forces it. If the phone then went, or
   the laptop was lifted, `resumeOwnerTask` handed him back a task the refusal now stopped him
   picking up, and the task was left marked as his: `assignStaffTasks` skips anything with a name
   on it, so the helper could never take it either and the weekly clean was stuck for the rest of
   the game. The resume carries the override he already exercised.
10. **"Put them back" left a machine turned.** Now that a turn is a move, `putThemBack` had to put
    the orientation back with the position: it restored the cell and left the saw at ninety
    degrees, with `fromRotated` written and read by nobody.
11. **A refund could hand back money that never left the bank.** A job's material is charged with
    `chargeUnavoidable`, which puts the bill on the arrears when the cash is not there. Cancelling
    it paid the full price into the bank and left the arrears standing. `refund` in `economy.ts`
    pays the arrears down first and only what is left of it reaches the cash, through the one
    function that pays arrears down.
12. **The company board counted the closing day twice.** Between the evening writing the day into
    `dayLogs` and the next morning emptying the owner's log, the day is on both. The week skips
    the day in progress once it has been written down.
13. **The Orders button lit for an order the player called off himself.** Cancelling takes a line
    off the list, which the button read as a lorry landing. A cancel is now seeing it.
14. **A booth on the road was not enough for the board while it was enough for the tile.** The
    lacquer branch of `kitBlockFor` asked `has`, and everything else on that list asks
    `hasOrOnOrder`, so the same wardrobe could stand on the board takeable and greyed at once. It
    asks the same question as its neighbours now.
15. **Escape and Start production shut a modal without writing the game down.** 3.2 says on every
    modal close, and only the cross did it. One `shutModal` for all three ways out.
16. **Two predicates for "is there a helper".** `raiseBagFull` and `runHelperClean` asked
    `helpers(state).length`, which counts a man who is sick or who starts tomorrow;
    `helperOnDuty` asks whether he is in the hall today. With a helper hired and not yet started,
    a full bag raised no event at all and the owner was never told. Both ask `helperOnDuty` now.
17. **Two folds of a week's reputation, and a day one check written twice.** The felt head added
    up the week itself beside the list that had already added it up; it reads the list. The
    catalogue card asked `items.every(done)` beside the engine's own `dayOneComplete`, which was
    then reachable from nothing; it asks the engine.

The tests were then read the same way, against what their own names claim, and eight more went in:

18. **The wet air finish was asserted as a constant and never timed.** `expect(WET_AIR_FINISH_FACTOR)
    .toBe(1.5)` reads the number back; deleting the line that divides the speed by it left every
    test green. Two halls now run the same lacquered job at the same Finishing, one with a dryer
    on the compressor and one without, and the wet one is measured at 1 / 1.5 of the dry one.
19. **A loop in month (r) asserted the filter it had just filtered on.** `lacquered.filter(wetFinish)`
    and then `expect(entry.wetFinish).toBe(true)` is true of nothing. The month asserts instead
    that every sprayed job that reached the Finishing carries the mark, and that the reputation
    log has a line for every one of them that went out.
20. **Two drawn widths were asserted by substring.** `toContain('width:7')` passes for `width:7%`.
    Both are measured exactly now, at `width:75%` and `width:50%`, and the outline of a started
    bar is read off the stylesheet rather than inferred from the absence of a class.
21. **The cloud row's new shape had no test.** `openSavedRow` is the one function that opens a
    row, and it is tested: the bytes round trip, a row from another build is refused, a row
    written before tonight (which holds the state object itself) is refused, and rubbish in the
    column is refused by the one decoder.
22. **Two of the autosave moments were untested.** The morning and the finished move are the two
    that are not actions; both are proved now.
23. **A test leaned on the page the test before it left open.** The coalescing test opens
    everything it needs itself.
24. **"Every kind of task in the game" was read off the table under test.** `TASK_KINDS` comes off
    the runner's own table now, and the band table is held to it.

---

## 7. Paths: how many code paths do the same job?

| Question | The one path |
|---|---|
| What band of his day is this minute? | `dayCategoryOf(kind)`, over `DAY_CATEGORY_OF_TASK` |
| What did his day come to? | `dayMinutesByCategory(log)`, and `dayPercentages(log)` over it |
| Where is a save kept? | the `SaveStore` interface; `saveStore` is the browser's |
| What is waiting in it? | `peekSave()` for the head of it, `readStore()` for the game |
| What bytes is a save? | `encodeSaveFile(state)`, for the file, the browser and the cloud row alike |
| Is this job of work the helper's? | `isHelperTask(state, task)`, over `HELPER_ONLY_KINDS` |
| Is there a helper in the hall today? | `helperOnDuty(state)` |
| Is the day one kit complete? | `dayOneComplete(state)` |
| What did a week of reputation come to? | `weeksOf(state)`, and the felt head reads it |
| What comes back for something that never came? | `refund(state, ...)`, arrears before the bank |
| How is a modal shut? | `shutModal()`, whichever of the three ways out was taken |
| How does a saved row open? | `openSavedRow(row)`, over the one decoder |
| What kinds of task are there? | `TASK_KINDS`, off the runner's own table |
| Where does a man stand with nothing to do? | `homeCellOf(state, worker)` |
| How long is this job's bar, and where does it end? | `workPlan(state)`, one `PlanRow` a job |
| What skin does this modal wear? | `MODAL_SKINS[id]` |
| What are the company's two totals? | `companyTotals(state)` |
| What does a workshop need on day one? | `DAY_ONE_KIT`, and `dayOneKit(state)` with the ticks on it |
| What does the air do to this minute? | `airFactorFor(state, check, machine, atTheBench)` |
| Which family does this stage run on? | `familyForStage(job, stage)` |
| Is this a move, or was it put back? | `recordMove(state, item, stood)`, cell and orientation |
| Can the owner start this? | `startTaskCheck(state, taskId, force)` |
| Which sheet does a figure play? | `animationForStation(station)` |

---

## 8. Deleted

| Gone | Where it was | Why |
|---|---|---|
| `minuteBar` and the three segment classes `seg-admin`, `seg-design`, `seg-workshop` | Turn 1 top bar | The day meter of 3.1 replaces it with seven bands in the order they happened. `seg-workshop` is a band of the new set and carries the new colour. |
| The white hover fill on the office regions | Turn 9 3.4 | "The white squares on the laptop and the door still show" (PIOTR, 15.09). |
| `locked` and `lockReason` on the spray booth | Turn 1 | Two products ask for a sprayed finish now. |
| The Turn 1 rule against browser storage | Turn 1 3.13 | Withdrawn by the owner on 14.09 for `src/cloud/store.ts` and for nothing else. |

---

## 9. Known risks

1. **A game over sits in the store like any other save.** The browser keeps the last state,
   bankrupt or not, so Continue on a dead company opens the game over screen. Nothing in 3.2 says
   what should happen to a company that has failed. Open question 7.
2. **The spray booth is 18,000 and twenty working days.** Month (r) spends the first four weeks of
   its life waiting for it and takes one sprayed job at the end. Whether that is the shape Piotr
   wants of the first booth is a balance question the month can now be played to answer.
3. **The lacquered templates moved the seeded stream.** Two more templates in the weights is two
   more draws in every refresh of the board. Every measured month was played again against the
   code that went in and every figure in the scenarios still holds, which is luck rather than
   design: the draw order happened not to move.
4. **The day meter is the busiest thing on the screen.** Seven colours, a lamp, two lines of text
   and a hover plate in a panel 340 px wide. It reads at 1,280 px; it has not been played at
   anything smaller, and the body still declares a 1,280 px minimum.
5. **The store is written whole.** Every autosave serialises the entire state. At a month in that
   is tens of kilobytes a second at worst, which the coalescing holds to one a second. A year in
   it may want measuring.
6. **The helper is still a capsule.** `character.helper.*` has not been delivered, so the man
   Piotr could not see is now a blue capsule he can see.

---

## 10. Tests

1,071 green, up from 947. New files:

- `tests/engine/dayLog.test.ts`: the seven bands, the merge, the percentages that come to a
  hundred for sixty different days, the morning that empties the log and the week that keeps it.
- `tests/ui/topbar.test.ts`: the 70 px cabinet with its four rivets and no picture, the bands in
  the order they happened, the width of a band against its own minutes, the bar that grows past
  the 480 for overtime, the hover plate that holds the minutes, the lamp in its three states and
  the push buttons that light orange.
- `tests/ui/store.test.ts`: the store under one key, the head of a save read without opening it,
  a purchase that writes it, the coalescing, Continue with the company and the day on it, the one
  question New game asks and the save from a build that is gone.
- `tests/engine/helper.test.ts`: the three kinds that are his, the owner's queue that skips them
  with the reason, the override that still lands, the joiner who is never sent, and the figure on
  the painted floor at every station the day puts him on.
- `tests/ui/planBar.test.ts`: the bar as long as the work, the green that fills it, the sixty
  minutes of waiting that stretch it by sixty, the end that walks towards DL and the red outline.
- `tests/ui/modalSkins.test.ts` and `tests/ui/skinPaint.test.ts`: the table, the class on the
  modal the player opens, the steel, the magnets, the tilt between minus one and one and a half,
  the four button colours, and the hover rectangle with no fill in its computed style.
- `tests/ui/companyFelt.test.ts`: the two totals in one place, on the modal and on the wall, the
  name and the week on the felt, the week in the same seven bands and the picture full page.
- `tests/ui/dayOne.test.ts`: the twelve, the tick, the folder a line opens from any tab, and the
  one line it collapses to.
- `tests/engine/lacquerAirRotate.test.ts`: the two sprayed products and their bands, the greyed
  reason, the booth the Finishing runs at, the assembly at 0.67 with no compressor, the line under
  the hall, and the bench and the saw turned where they stand.
- `tests/engine/phoneAndCancel.test.ts`: the phone station and its sheet, and the Cancel on a load
  of sheets with the job behind it.

Rewritten or extended: `tests/ui/workPlan.test.ts` for the bar that no longer runs to its
deadline; `tests/ui/oneClick.test.ts` for the four push buttons; `tests/ui/hallClock.test.ts` for
the outline that replaced the white box; `tests/engine/machines.test.ts` for a catalogue with
nothing locked in it; `tests/ui/companyBoard.test.ts` for the totals that moved onto the felt;
`tests/scenarios/thirtyDays.test.ts` for months (q) and (r) and for the day log and the bench air
rule over the Easy month.

---

## 11. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 11 added is reachable from the game: the cabinet and the day meter on every
screen, the hover plate behind the meter, Continue on the start screen, the Day one card at the
top of the catalogue, the sprayed wardrobe and kitchen on the board once a booth is in the hall,
the booth itself on the Spraying tab, the helper on the Team board, the Work Plan bar that fills,
the company board on the office wall with its two totals, and the Cancel on a load of sheets.

---

## 12. Line balance

| Task | Files touched | Lines added | Lines removed |
|---|---|---|---|
| T11-01 | 7 | 413 | 10 |
| T11-02 | 9 | 396 | 9 |
| T11-03 | 8 | 685 | 66 |
| T11-04 | 6 | 463 | 3 |
| T11-05 | 7 | 319 | 16 |
| T11-06 | 5 | 237 | 25 |
| T11-07 | 3 | 388 | 6 |
| T11-08 | 7 | 390 | 16 |
| T11-09 | 7 | 328 | 1 |
| T11-10 | 7 | 335 | 24 |
| T11-11 | 8 | 229 | 15 |
| T11-12 | 5 | 250 | 42 |
| Whole turn | 55 | 4,405 | 205 |

273 of those added lines are `docs/turn-10-brief.md`, which is the archive and not code. New
modules: `src/cloud/store.ts`.

---

## 13. Open questions for Piotr

1. **The order board and the laptop: paper or steel?** The brief names neither. Both are on the
   paper family tonight.
2. **The lacquer prices: is the band the whole band, or the bottom of it?** 4,375 and 15,000 put
   his bottom figures at the smallest size the board draws and overshoot his tops by a fifth. Two
   lines if he wants them centred on the band instead.
3. **Is a compressor short of litres meant to hold a bench at 0.7 or at 0.67?** Turn 10 says 0.7
   and it is his; Turn 11 says 0.67 and it is a `[TUNE]`. Both are in, each in its own case.
4. **Was the spray booth meant to be unlocked tonight?** It had to be for 3.7 to be playable at
   all. 18,000 and twenty working days, as it has always been written.
5. **Should the day one list be in an order a player can work straight down?** His order puts the
   hand edgebander before the tool cabinet it lives in.
6. **Should the helper take time over the unloading?** He clears it on the spot, which is the Turn
   2 rule, and the consequence is that the van is never a question and "Unload it yourself" is
   unreachable for a hall with a helper in it.
7. **What should happen to the browser's save when the company goes under?** It is kept, so
   Continue opens the game over screen.
8. **There is still no `sprayBooth.png` and no `airDryer.png`**, so both draw as placeholder
   boxes, and no `character.helper.*`, so the helper is a capsule.

---

## 14. Parked, carried forward

1. The machine sprites repainted on templates, the helper and the office staff character sheets,
   sound, the two turns of fixes and balance before the Kickstarter demo, the Supabase cloud save
   switched on (SQL and keys), the Electron shell.
2. House 100 k and villa 500 k, 180 degree view, movable rooms, rates and power for 200 m2.
3. Everything parked before.
