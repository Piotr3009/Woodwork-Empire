# Notes for phase C, Turn 17

What each phase B group had to add to a frozen file of Turn 13, and why it could not be avoided.

## B1, the hall

- `src/engine/constants.ts`: one new export, `HELPER_CLEAN_DUST_BAND = 'messy'` [TUNE], beside
  `HELPER_CLEAN_WEEKDAY`. CLAUDE.md T17 2.3 asks for a band to be chosen and tagged `[TUNE]`, and
  the house keeps every engine figure in constants.ts. Nothing else in the file is touched.
- `src/ui/app.ts`, the click routing switch: one new case, `emptyBags`, which dispatches
  `ASK_EMPTY_BAGS`. CLAUDE.md T17 2.5 puts an Empty bags button on the bags chip and 2.6 puts one
  on the extractor's card; the engine action existed but nothing but a click on the extractor
  itself could reach it, and a `data-kit` on a button would have sent a chip through the scene
  click path to say it.
- `src/engine/constants.ts`: one new `TIPS` key, `hallCamera`, for the mouse wheel sentence that
  CLAUDE.md T17 2.5 turns into a tip said once. The tips table is the one place a tip's sentence
  can live.

## B2, the people and the desk

- `src/engine/index.ts`: four export names taken out, `staysForOvertime` and `worksOvertime` from
  staff.ts and `overtimePayFor` and `overtimeWageBill` from economy.ts. CLAUDE.md T17 2.12 sends
  the men home at five always, so nobody can work an evening, nobody can be paid for one and the
  four functions behind those names are unreachable. The brief asks for what is genuinely dead to
  be removed rather than left to rot, and a function cannot be deleted while the public API still
  names it. Nothing is added to the file.
- `src/ui/app.ts`, the click routing switch: one new case, `takeOverJob`, which dispatches
  `TAKE_OVER_JOB`. CLAUDE.md T17 2.12 says the owner takes a man's job on by a click on the work
  plan row; phase A routed the action in the engine but nothing in the UI could reach it.
- `src/ui/app.ts`, the click routing switch: one new case, `assignSecond`, which dispatches
  `ASSIGN_SECOND` with the worker on the chip, or null for Alone. CLAUDE.md T17 2.10 says
  assigning the second man is a click on the work plan row; phase A routed the action in the
  engine and left the click to B2.
- `src/engine/constants.ts`: one export deleted, `RESTOCK_TO_SHEETS`. CLAUDE.md T17 2.20 says it
  goes: Restock takes the number the player types and fills the rack when he types none, so there
  is no figure to bring a low line back up to. `LOW_STOCK_SHEETS`, which shared its comment, is
  untouched and still wears the Low stock badge.
- `src/ui/app.ts`, the click routing switch: the `restock` case now carries the number off the
  button, `dispatch({ type: 'RESTOCK', sheets: Number(element.dataset.sheets ?? '0') })`, the way
  the `buyStock` case beside it already reads `data-sheets`. Phase A made the action carry the
  count and CLAUDE.md T17 2.20 asks for the typed number to reach the engine; no other path
  could carry it.

## B3, the money

- `src/engine/types.ts`: one new field on `DayStats` and the same on `DaySummary`,
  `expressUplift`. CLAUDE.md T17 2.26 says an express job pushes the workshop rate over 40, and
  nothing in the engine made that true: an express job's labour value comes off its base price
  (T2 3.4, T13 3.24) and its uplift is pure profit, so the labour booked by the minute is the same
  as a standard job's. The uplift had to be earned somewhere the rate could read it a week later,
  and `dayStats.labourValue` could not carry it: that field is the earned labour rate of Turn 6
  and has its own tests and three UI readers. The field is written in one place, `addLabour` in
  jobs.ts, defaulted to 0 in `createGame`, `startDay` and `liftToVersion15`, and read only by
  `src/engine/rate.ts`. Express itself is untouched: the probability, the uplift band, the
  deadline factor, the late penalty and the rating are all as they were (CLAUDE.md T17 6).
- `src/engine/constants.ts`: two rows added to `CONTRACT_PIECES` (`drawerBox`, the hour at 8, and
  `wardrobeFront`, the three days at 40), one new export beside them, `CONTRACT_QUANTITY_MINUTES`
  (45), and the `sheets` figure of `cutSheetPack` changed from 1 to 0.15. CLAUDE.md T17 2.22 says
  the board must offer both lengths of work and the table is the only place a piece can live. The
  quantity constant is what the band of Turn 13 means once there is more than one piece in the
  table: 20 to 40 a week was written for a 45 minute piece, so it is a week's work and not a count,
  and a three day piece is asked for one a week. The sheets figure had to move because a contract's
  material comes off the rack now: a piece with 30 of material in it is 0.15 of a 200 sheet, and at
  one whole sheet a piece the client would have been paying 38 for 200 of material.
- `src/ui/app.ts`, the click routing switch: one new case, `endContract`, which dispatches
  `END_CONTRACT`. CLAUDE.md T17 2.22 gives the running contract a way out after the first month;
  phase A routed the action and wrote the engine's own check, and nothing in the UI could reach it.
