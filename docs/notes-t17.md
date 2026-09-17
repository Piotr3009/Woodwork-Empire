# Notes on the frozen files, Turn 17

The six files of Turn 13 (`src/engine/types.ts`, `src/engine/constants.ts`, `src/engine/index.ts`,
the action routing switch in `src/engine/game.ts`, the click routing switch in `src/ui/app.ts` and
the class names in `src/ui/styles.css`) were frozen for phase B after phase A had put in
everything it could foresee. Each B group wrote down what it still had to add and why. Phase C
read all of it with the three groups in, decided what stands, and this is the finished record:
what was added, what phase C changed about it, and what is there now.

Nothing had to be merged: no two groups added the same click case, the same constant or the same
function under two names. What phase C changed is listed under each entry and again at the end.

## B1, the hall

- **`src/engine/constants.ts`, one new export: `HELPER_CLEAN_DUST_BAND = 'messy'` [TUNE]**, beside
  `HELPER_CLEAN_WEEKDAY`. CLAUDE.md T17 2.3 asks for a band to be chosen and tagged, and the house
  keeps every engine figure in constants.ts. **Stands.** It is read in one place,
  `runHelperClean` in game.ts, and it is the only figure the rule has.
- **`src/ui/app.ts`, the click routing switch: one new case, `emptyBags`**, dispatching
  `ASK_EMPTY_BAGS`. The engine action existed but only a click on the extractor itself could reach
  it. **Stands, and it earned its place twice over:** the Empty bags button on the bags chip
  (T17 2.5) and the one on the extractor's own card (T17 2.6) are the same `data-do="emptyBags"`
  through the one case, so there is one way to change the bags.
- **`src/engine/constants.ts`, one new `TIPS` key: `hallCamera`**, for the mouse wheel sentence
  that T17 2.5 turns into a tip said once. **Stands.** The tips table is the one place a tip's
  sentence can live.

## B2, the people and the desk

- **`src/engine/index.ts`, four export names taken out:** `staysForOvertime` and `worksOvertime`
  from staff.ts, `overtimePayFor` and `overtimeWageBill` from economy.ts. T17 2.12 sends the men
  home at five always, so nothing can reach the four functions behind those names, and a function
  cannot be deleted while the public API still names it. **Stands, and phase C checked it:** the
  build (`tsc --noEmit`) passes, so index.ts still exports everything the UI imports from it, and
  a grep for the four names over `src` and `tests` returns nothing at all. Phase C found no other
  name in index.ts that has stopped existing, and no name the UI imports that index.ts has stopped
  exporting.
- **`src/ui/app.ts`, the click routing switch: one new case, `takeOverJob`**, dispatching
  `TAKE_OVER_JOB`. T17 2.12 gives the owner a man's job by a click on the work plan row; phase A
  routed the action and left the click. **Stands.**
- **`src/ui/app.ts`, the click routing switch: one new case, `assignSecond`**, dispatching
  `ASSIGN_SECOND` with the worker on the chip, or null for Alone (T17 2.10). **Stands.**
- **`src/engine/constants.ts`, one export deleted: `RESTOCK_TO_SHEETS`.** T17 2.20 says it goes:
  Restock takes the number the player types and fills the rack when he types none, so there is no
  figure to bring a low line back up to. **Stands.** `LOW_STOCK_SHEETS`, which shared its comment,
  still wears the Low stock badge.
- **`src/ui/app.ts`, the click routing switch: the `restock` case carries the number off the
  button**, the way the `buyStock` case beside it already reads `data-sheets`. **Stands.**

## B3, the money

- **`src/engine/types.ts`, one new field on `DayStats` and the same on `DaySummary`:
  `expressUplift`.** T17 2.26 says an express job pushes the rate over 40, and nothing in the
  engine made that true: an express job's labour value comes off its base price (T2 3.4, T13 3.24)
  and the uplift is pure profit, so a minute of it booked the same labour as a standard job.
  `dayStats.labourValue` could not carry it: that field is Turn 6's earned labour rate and has its
  own tests and three UI readers. **Stands.** It is written in one place (`addLabour` in jobs.ts),
  defaulted to 0 in `createGame`, `startDay` and `liftToVersion15`, and read only by rate.ts.
- **`src/engine/constants.ts`, two rows added to `CONTRACT_PIECES`** (`drawerBox`, the hour at 8;
  `wardrobeFront`, the three days at 40), **one new export beside them,
  `CONTRACT_QUANTITY_MINUTES` (45)**, and **`cutSheetPack.sheets` changed from 1 to 0.15.**
  T17 2.22 says the board must offer both lengths of work and the table is the only place a piece
  can live; the quantity constant is what Turn 13's band of 20 to 40 a week means once there is
  more than one piece in the table; and the sheets figure had to move because a contract's
  material comes off the rack now. **Stands.** `CONTRACT_QUANTITY_MINUTES` repeats the cut sheet
  pack's own 45 minutes, and phase C left it repeated on purpose: it is the piece the band was
  written for, a fixed point in the past, and it must not move when somebody tunes the cut sheet
  pack.
- **`src/ui/app.ts`, the click routing switch: one new case, `endContract`**, dispatching
  `END_CONTRACT` (T17 2.22). **Stands.** The engine has one way out of a contract:
  `endContractNow` checks the first month and then calls `endContract`, which is the same function
  the term's own last day calls.

## What phase C changed

- **Four dead constants removed from `src/engine/constants.ts`:** `STAFF_OVERTIME_RATE`,
  `STAFF_OVERTIME_MAX_MINUTES`, `OVERTIME_TIRED_DAYS` and `OVERTIME_QUIT_CHANCE`. B2 deleted the
  functions that read them (T17 2.12) but could not touch constants.ts, so four figures were left
  in a frozen file describing a rule the game no longer has, under a comment that said each joiner
  and helper stays with the owner from 17:00, which is now the opposite of the truth. Nothing in
  `src` or `tests` read any of them. `WORKER_HOURS_PER_WEEK`, which stood in the middle of them,
  is still read by staff.ts and keeps its own comment.
- **The comment over `keepSetupHonest` in `src/ui/app.ts`** said Move takes the player to the
  floor "with the machine under his hand", which the code does not do: it puts the card away and
  opens setup mode, and he drags the machine himself. The comment now says that. See
  REPORT-T17.md, "Phase C decisions", for why the button is right as it is.
- **A line added to `workshopRate` in `src/engine/plan.ts`,** pointing at rate.ts. Two different
  figures wear the word rate now: Turn 9's `workshopRate` is the speed the work plan draws a bar
  at, exported from index.ts since Turn 9, and Turn 17's is pounds an hour and lives in
  `src/engine/rate.ts`. They are never imported into the same file and neither was renamed:
  renaming a Turn 9 name in the public API would be a change to a frozen file for no behaviour at
  all. The comment is there so the next reader does not have to find it out.

## What phase C looked at and left alone

- **The rate's selectors are imported straight from `src/engine/rate.ts` by company.ts and
  monthEnd.ts** rather than through index.ts, because index.ts was frozen. That is the house's own
  habit and not a phase B shortcut: monthEnd.ts already imports `monthEfficiency` from
  `../engine/efficiency`, team.ts imports `monthlyPay` from `../engine/staff`, materials.ts
  imports `restockSheets` from `../engine/materials`, and hall.ts imports from three engine
  modules. Adding the names to the barrel would have changed a frozen file to say the same thing
  twice.
- **The predicate "a man on the books today"** is written as `worker.startDay <= state.clock.day`
  in economy.ts (the two wage bills), in rate.ts (the hours paid) and inverted in three more
  places. It is not a Turn 17 duplication: the idiom is older than this turn, and the one place it
  could be folded into, `onTheBooksToday` in staff.ts, means something else (started AND not
  absent), while the rate must count the man who is on holiday, because he is paid. Folding it
  would need economy.ts to import from staff.ts, and staff.ts already imports from economy.ts.
- **The four `Worker` overtime fields** (`overtimeMinutes`, `overtimeMinutesWeek`, `overtimeDays`,
  `tiredOfOvertime`), `GameState.lastQuitMonth` and the `workerQuit` event kind stand at zero and
  nothing reads them. They are carried by every save and set by about thirty test fixtures;
  taking them out of types.ts would be a large change to a frozen file for no behaviour. The
  owner's own overtime, which is Turn 6's rule and not Turn 8's, is untouched and very much alive.
