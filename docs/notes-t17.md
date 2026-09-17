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
