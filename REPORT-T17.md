# Report: Turn 17

The workshop earns by the hour. Built in Claude Code, cloud, on branch
`claude/wonderful-rubin-31i1no`, 17.09.2026.

Base: `36ca109` on that branch, which carries `APP_VERSION` `v24` and `STATE_VERSION` 14, the
brief's precondition. The report is written as the turn is built: one entry per task, in the order
the task queue of section 5 names them.

---

## Phase A

- **T17-A1 Housekeeping and v25.** `docs/turn-16-brief.md` is the root `CLAUDE.md` of the v24
  commit (`cda3749`), byte for byte; the README's briefs line names it and its reports line reaches
  `REPORT-T17.md`; `APP_VERSION` is `'v25'`; `docs/art/REQUESTS-T17.md` asks for the helper sheet,
  the welfare kit inside the canteen and the pipe tiles that still stand from Turn 13.
  Done: the two version assertions read `v25`.

---

## Phase B1: the hall

- **T17-B1a The helper is drawn, the labourer works, a machine off the lorry (2.1, 2.3, 2.4).**
  The placeholder figure is sized off the projection instead of being a 12 by 26 rounded rect: a
  1.8 m man at `TILE_RISE` pixels to the metre, with a head, a trunk, two legs and two feet, so a
  role with no character sheet reads as a person beside a joiner who has one. The helper books
  minutes now (`booksTaskMinutes` in staff.ts): he takes the task on, spends it minute by minute,
  is given a station and is walked to it, and his own day meter carries the minutes; the branch
  that cleared a job of work on the spot for nothing is gone, so there is one path for everybody.
  He sweeps the hall the moment it goes past clean, without being asked, and the lorry at the gate
  is never put to the owner while the unloading is his. A machine off the lorry is a second
  flavour of the v24 loop: gate to the floor held for it and back, empty handed both ways.
  Done: `tests/render/capsule.test.ts` (a visible body for the helper and for every role with no
  sheet), the three new helper tests in `tests/engine/helper.test.ts` (a delivery unloaded by him
  minute by minute, a dirty hall swept by him, no `fixing` minutes on the owner's day) and the
  machine loop test in `tests/render/walkers.test.ts`.
- **T17-B1b The welfare kit lives in the canteen (2.2).** A seat and a locker are off the hall
  floor for good: `hallItems` leaves them out, so nothing bumps into them, they eat none of the
  free floor the crew is limited by and `anchorFor` never sends one looking for a free cell; a
  move to a hall cell is refused with "It stands in the canteen", and the hall draws them on the
  canteen block with no `data-kit` on them, so setup mode has nothing to pick them up by. A man at
  one stands in the canteen doorway facing in, and what they are worth is untouched: a seat a man
  and a locker a man, which is what hiring a joiner still asks for.
  Done: `tests/render/canteenKit.test.ts`, six tests, with phase A's migration test still green.
- **T17-B1c The strip under the hall, variant C (2.5).** The four lines and the grey buttons are
  gone: `hallProblems` in hall.ts is the one list of what the hall wants doing, and the page draws
  one dark chip in the hand over the floor for each of them, bottom left, with the button that puts
  it right on the chip itself (Clean up on the dirty hall, Empty bags on the full store, Service it
  on the machine that is due one, Fix it on the one that has stopped). The stack's order is what it
  costs the workshop: moving machines first (nothing runs at all), then Work here, then what has
  stopped a machine, then what is slowing the hall, then the service, then Set up hall last. The
  rack warning and "No job has its material in the hall yet" are gone, the wheel sentence is a tip
  said once, and the camera is three small chips bottom right.
  Done: `tests/ui/hallChips.test.ts`, with the old strip's assertions moved onto `hallProblems` in
  the views, machines, extraction and air tests.
- **T17-B1d A click on a machine opens its own card (2.6).** The card is the Owned tab's card and
  one function draws both, so Connect to extraction cannot be on one and missing from the other:
  its picture and class, what it does, its hours and its life, its service, what it is doing, the
  metres of pipe or that there is none, the gate line, and the buttons Repair or Service, Empty
  bags, Connect to extraction, Automatic gate, Move and Sell. The extractor opens its own card too,
  with the hall's bag store and its bar on it, and the store note under the hall is gone with the
  old strip. Move is one click: it takes the player into setup mode, where nothing stands open over
  the hall and he drags the machine himself, and it is offered only on what the engine would let
  him drag.
  Done: `tests/ui/machineCard.test.ts` (the card is that machine's, Connect works from it, Move
  puts him on the floor, the Owned tab draws the same card) and `tests/ui/bagStore.test.ts` moved
  onto the card.
- **T17-B1e Pipes that look like pipes, and the number on the rack (2.7, 2.8).** Every length of
  pipe is three strokes of the one shape now: a wider bar, the shade along its underside and the
  lighter edge along its top. An elbow is a quarter arc with no disc over a joint it has not got, a
  straight run has no joint in the middle of it, a tee keeps its four arms and the body they meet
  in, the drop lands on the machine's own top face as a short collar over its port instead of
  going through it to the floor, and the inlet is a flange of two rings at the unit. The nine kinds
  and their `data-pipe-tile` keys are untouched, so a delivered file still wins tile for tile. The
  rack carries its own number over its front face, big, in the hand, on the class's colour, drawn
  off the stock every render: it used to be glued into the object's name, which the sprite branch
  throws away, so in the real game it was invisible.
  Done: the three new pipe tests in `tests/render/pipesOnTheHall.test.ts` and the rack number test
  in `tests/render/views.test.ts`, with Turn 16's own pipe tests still green.

### Numbers chosen (B1, the hall)

- **2.1** The placeholder man is `CAPSULE_HEIGHT_M` 1.8 m at `TILE_RISE` (24 px to the metre), so
  43 px tall where the old capsule was 26. His proportions, in fractions of his own height
  [TUNE in src/render/hall.ts]: head radius 0.1 at 0.88 up, shoulders 0.34 wide, trunk 0.78 down
  to 0.42, legs 0.11 wide with a 0.04 gap, feet 0.16 long and 0.05 high.
- **2.3** The helper's day is the clock's and not a meter of his own [TUNE in src/engine/staff.ts,
  `booksTaskMinutes`]: he is on the floor, takes his dinner with the workshop and stays for the
  owner's overtime like a joiner, so only the office has the 480 of `hasWorkingDay`.
  `HELPER_CLEAN_DUST_BAND` is `'messy'` [TUNE in constants.ts]: he picks up a brush the moment the
  hall stops being clean, which is the moment the dust starts costing output.
- **2.2** The welfare kit is drawn on the canteen roof at `CANTEEN_KIT_HEIGHT` 0.3 m with a
  `CANTEEN_KIT_INSET` of 0.15 of a cell [TUNE in src/render/hall.ts]: a plan of what is in there,
  not kit standing on the roof.
- **2.7** `PIPE_BAR_WIDEN` 1.5, so the bar is 7 px where it was 5; the shade and the edge are a
  third of that off the middle; the shade is `rgba(0,0,0,0.35)`; the collar on a port stands
  `COLLAR_DEPTH` 0.18 m proud of the machine's top face [TUNE in src/render/pipes.ts].
- **2.8** The number on the rack sits `RACK_COUNT.up` 0.55 of the way up the front face on a plate
  26 px high, 15 px a digit and 9 px of padding each side [TUNE in src/render/hall.ts].

## Phase B2: the people and the desk

- **T17-B2a Our team, the hiring gate, the evening and the day meter (2.9, 2.11, 2.12, 2.13).**
  Our team is a fifth tab on the Team page and the first of them: one row a person, the owner at
  the top of it, with the day he started and how long ago, what he costs a month, the hours he has
  worked this month, his days off and what he is on this minute. The month's hours and days off
  are counted where the minutes and the absences already are, and start again on the first working
  day of a month. A hire is refused with "Not enough in the bank: needs £2,057" when the account is
  under a month of the man's pay, last in the one blockReason chain. The men go home at five now,
  always: the evening is the owner's, and he takes a man's job on by a click on the work plan row,
  which leaves the job assigned to the man and gives it back to him in the morning. The day meter
  runs 540 to 660 with the evening, and the evening's minutes are painted in their own colour.
  Done: `tests/ui/ourTeam.test.ts`, `tests/engine/hiringGate.test.ts`, the rewritten
  `tests/engine/staffOvertime.test.ts` and the day meter tests in `tests/ui/topbar.test.ts`.
- **T17-B2b Two men on one job (2.10).** A job carries a second man now: a click on the work plan
  row puts him on it and Alone takes him off, and nobody holds two jobs at once. Both men book
  their minutes into the same job, each at his own rate, so the bar is drawn at the two of them
  added up and the job takes about half the days. At a machine stage one of them has the machine
  and the other stands at its waiting cell until his turn; at the bench they share the first man's
  bench, the second in the bench's second place of Turn 16, and he takes no bench of his own.
  Done: `tests/engine/secondMan.test.ts` (the rate doubles, the labour in an hour, the waiting
  cell, both names on the row and the chips that put him on and take him off).
- **T17-B2c The desk stops nagging (2.14 to 2.19).** A job of work somebody started stays his: the
  minutes and the man both carry over, so the drawing he was on at five is in his hands at eight
  and a man of the office is never passed round by rank for what he already started. Calls and
  emails die at dusk instead, done or not, and the emails that are dropped are counted onto the
  job as they go, so the client's penalty at delivery is exactly what it was. The Tasks page has a
  tick on every row the owner could start and one Do these over the list: they are queued in the
  order they were ticked and each one starts the next as it finishes. The laptop writes the day
  down as the boot starts, so an interrupted boot can neither suppress tomorrow's nor be paid for
  twice, and an unfinished one is dropped with the daily chores. The Finished drawings list is
  gone, and a new day comes home to x1.
  Done: `tests/engine/theDesk.test.ts`, `tests/ui/doThese.test.ts` and the rewritten drawings
  tests.
- **T17-B2d Restock by number, and Joinery Core charged once (2.20, 2.21).** The Stock page takes
  a number: the player types how many sheets he wants and Restock buys exactly that, capped at the
  free places on the rack less whatever is already on the road. An empty field is what fills the
  rack, which the placeholder shows, and the "Nothing is low" refusal is gone with the target
  figure: the number is his, not the rack's. `RESTOCK_TO_SHEETS` is deleted. Joinery Core writes
  down the month it was bought in, so the month end that closes that month carries no line for it
  and the subscription starts the month after, each extension on its own month.
  Done: `tests/engine/joineryCoreOnce.test.ts` and the restock tests in
  `tests/engine/materials.test.ts` and `tests/ui/materials.test.ts`.

### Numbers chosen (B2, the people and the desk)

- **2.9** A month of a man's pay is his weekly wage times `WEEKS_PER_MONTH`, which is 30 over 7,
  or his monthly wage where he has one: a poor joiner at 480 a week is £2,057 a month and a normal
  one at 640 is £2,743 [TUNE in `monthlyPay`, src/engine/staff.ts]. It is the one conversion, and
  the hiring gate of 2.11 refuses on the same number. The owner has no wage, so his row is the
  draw he pays himself over a month of working days: `ownerDrawPerDay` times
  `WORKING_DAYS_PER_MONTH` [TUNE in src/ui/team.ts]. His start day is day 1: nobody took him on.
- **2.9** The hours of the month are printed to a tenth of an hour, and the days off as whole
  days. A man's month counts every minute he books, at the desk, at the bench and on the night
  shift; the owner's counts every minute he spends. The meters start again on the first working
  day of a month, which is the Monday when the 1st falls at a weekend.
- **2.11** The bank refusal is the last link of the blockReason chain [TUNE]: reputation, the
  office admin, the bench slot, the floor limit and the missing kit are standing facts about the
  workshop, and the balance is the one that changes by the minute, so it is the last thing asked.
- **2.12** The owner takes a job on only past 17:00 [TUNE]: by day a job is assigned to a man or
  given a second one, and the takeover is the evening's own thing. He stands at it as the second
  man, so the job keeps its first man and gives itself back to him in the morning; a job of his
  own goes back on the list when he takes another man's on, exactly as it does when a man is given
  a job he was holding.
- **2.13** The day meter's bar is the working day on the clock, `DAY_END_MINUTE` 540, and it grows
  to `OVERTIME_END_MINUTE` 660 by the overtime minutes he has actually stayed for. The printed
  figure is read off the same number, so the bar and the figure agree, and the evening's minutes
  are the tail of the day log painted in `.seg-overtime`.
- **2.14** No new field: a task he has put minutes into keeps its `doneBy`, and one he never
  started goes back on the list. The office is still given a task the owner put down while he is
  not holding it, so nothing that used to be delegated stops being delegated.
- **2.20** Restock buys standard sheets, so it lands the next working day; the bespoke lead time
  of three working days is the one the deliveries already have, and the brief's "two working days"
  is not applied, because the brief's own words say to keep the lead time the deliveries have.
  An empty or unreadable field is what fills the rack [TUNE].
- **2.21** The subscription starts the month after the month end that closes the month it was
  bought in: bought in month 1, the month end of month 1 skips it and the month end of month 2
  charges it. A v24 save is stamped month 0 by the migration, so nothing that is running now is
  given a free month.
- **2.12, what was removed with the rule.** Gone, because nothing can reach them once the men go
  home at five: `worksOvertime`, `staysForOvertime`, `countStaffOvertimeMinute` and
  `recordStaffOvertime` in staff.ts; `overtimePayFor`, `overtimeWageBill`, `clearOvertimeWeek` and
  the Friday "Overtime" line in economy.ts; `runOvertimeQuits` in game.ts, with it the only path
  that raised a `workerQuit`; and the "Tired of overtime" chip on the crew row. Kept: the four
  fields on `Worker` (`overtimeMinutes`, `overtimeMinutesWeek`, `overtimeDays`, `tiredOfOvertime`)
  and `GameState.lastQuitMonth`, because types.ts is frozen and every save carries them; they now
  stand at zero and nothing reads them. Kept too: the owner's own overtime, his debt and the
  labour factor it costs him tomorrow, which is Turn 6's rule and not Turn 8's.
- **2.11, what the gate does to the Turn 13 playthrough.** The scripted three months on Easy are
  in the overdraft from the end of month 1, so under the gate that player can take nobody on: the
  estimator, the production manager and the five days away all fall out of that run. The crew of
  the brief's 10.4 is checked on the Very easy control instead, which has the money, and the Easy
  test now asserts what the bank does rather than what the script wanted. Phase C should look at
  it again when it re-runs the sixteen months.

---

## Phase B3: the money

- **T17-B3a The workshop rate, the engine (2.26).** `src/engine/rate.ts` is the one place the
  turn's figure is worked out: labour earned on jobs and contracts over the hours paid for, gross,
  with nothing taken off it. The top is the labour value the engine already books minute by minute
  as the work is done, plus what an express job pays over its base price (earned with the labour
  that earns it, so a minute of an express job earns its share of the premium), plus a contract
  piece's own labour, which `finishPiece` now books instead of the piece's margin. The bottom is
  `paidHoursToday`: eight hours for every man on the books and eight for the owner on every
  working day, worked or not, and the overtime the owner actually stayed for on top. The evening
  writes it onto the day before the day is recorded, so a week of hours paid survives a save.
  Done: `tests/engine/rate.test.ts`, which reads the brief's own four: 40 an hour for the owner
  alone at full work for a week, 24 with two of the five days idle, 26 with a poor joiner half
  idle, and 70 with an express job on the bench.
- **T17-B3b The Machines column, Total efficiency, and the rate where it belongs (2.24, 2.25,
  2.26).** A third sheet is pinned right of Output: one row per machine standing in the hall, what
  its class does to the stage it does with the gate's 2% in it, the hours somebody stood at it
  this week and the minutes those hours saved, with "Machines saved us 6 hours this week" on the
  last line. A machine that cannot run on its air, whose compressor is short, or that has no pipe
  to the extraction says so on its row and its figure is written in the minus. The machines carry
  their own week and month clocks now, filled where the life clock is filled. Above the three
  sheets the workshop rate stands in the hand font, with last week and per man beside it, and the
  same function opens the month end, over the month, followed by Total efficiency: the machines,
  the people, the hall and the waiting of that month, and the one line "Total efficiency N% = real
  work over paid hours".
  Done: the Machines column tests in `tests/engine/companyBoard.test.ts`, the three sheet, rate
  and Machines sheet tests in `tests/ui/companyBoard.test.ts`, and the month end tests in
  `tests/ui/monthEnd.test.ts`, one of which reads the board and the folder over the same days and
  gets the same pound.
- **T17-B3c Standing contracts on stock, and the express deadline (2.22, 2.23).** A contract's
  material is sheets on the rack now, held for the week in hand the way a job holds what it has to
  cut, drawn as the pieces are made and never bought as money on the contract line: the
  `${name}: material` charge is gone, the stock page counts what a contract is holding, and a
  contract never cuts into what a job has reserved. With nothing on the rack for the next piece the
  men on it stand at their benches until a delivery lands. The tab shows the result with each man
  on his own row, price less material less his own time at his own rate, and the offer says how
  much of the rack a week of it takes. The table carries three lengths of work now, the cut sheet
  pack, the drawer box (an hour at 8) and the wardrobe front (three days at 40), and the client
  asks for a week's work of whichever was drawn rather than a flat count. A running contract can be
  ended after its first month from the block itself, and before that the button says how long is
  left. 2.23 was already done by phase A and is checked: `DEADLINE_EXPRESS_FACTOR` is 0.8 and
  nothing else about express is touched.
  Done: the new blocks in `tests/engine/contracts.test.ts` (the rack, the result, the way out, the
  three lengths) and in `tests/ui/contracts.test.ts`, with the Turn 13 contract tests and the (v)
  month rewritten for the wider table.

### Numbers chosen (B3, the money)

- **2.26 the window.** The board reads the rate over the last five closed working days
  (`RATE_WEEK_DAYS`) and "last week" over the five before them: a rolling working week and not the
  calendar's [TUNE], so the figure means the same on a Monday morning as on a Friday afternoon. The
  day in hand is not in it: a day has paid for eight hours before it has had the chance to earn one
  of them, so a live figure would read low every morning and say nothing. A day from before tonight
  (paid hours 0, which is what the migration gives a v24 save) is left out of both.
- **2.26 the hours paid.** Eight hours for every man whose start day has come, worked or not, on
  holiday or off sick, which is the predicate the wage bills themselves use; eight for the owner on
  every working day; and the minutes of the evening he actually stayed for on top. A weekend pays
  nobody, and the clock never stands on one. It is worked out once, at the day's close, and the
  same function answers for the day in hand, so the record and the live figure cannot disagree.
- **2.26 the express uplift.** An express job's minute earns its share of the client's premium: the
  whole uplift (the price less the base price) spread over the job's labour value, booked in
  `addLabour` beside the labour itself. Only an express job carries one, so an ordinary job's
  haggle never touches the figure and the owner alone at full work still reads exactly 40. Express
  itself is untouched, as CLAUDE.md T17 6 says.
- **2.26 per man.** The heads a day paid for are its paid hours less the owner's evening, over
  eight; per man is the rate over the average of those heads across the window. So the owner's
  overtime lengthens the hours paid without inventing a man to spread them over.
- **2.24 the minus on a machine's row.** There is no per machine penalty in the engine: the air is
  per compressor per minute and the extraction is one hall wide line. Each is shown on the row that
  draws it, and nothing is invented: a machine that cannot run on the air it is given shows −100%
  with the hall's own words for it, one whose compressor is short of litres shows
  `LOW_AIR_FACTOR − 1` (−30%), and one with no pipe to the extraction shows
  `−UNDER_EXTRACTION_OUTPUT_PENALTY` (−30%), which is the line the whole hall is carrying because
  of it. The minus is printed, never multiplied into the saved minutes.
- **2.24 the machines' own clocks.** `hoursThisWeek` starts again on the first working day of a new
  week. `hoursThisMonth` starts again on the SECOND working day of a month [TUNE], because the
  month end is raised and answered on the first and reads those hours: the run it measures is the
  morning after one month end to the morning of the next, so every working day falls in exactly one
  report and none in two.
- **2.25 Total efficiency.** The percentage is the brief's own sum and nothing else: the month's
  real work (the people minutes booked into the work) over the hours it paid for, which is a harder
  figure than the day's efficiency and always under it. The month's labour and hours paid come off
  the rate's own fold, so the section and the figure at the top of the report cannot disagree. The
  hall line is the average of the day records' `hallFactor`, the waiting lines are the day's four
  causes added up over the month, and the machines line names the three that saved the most.
- **2.22 the two new pieces [TUNE].** The drawer box is Piotr's hour at 8: 60 minutes, 34 a piece
  with 26 of material. The wardrobe front is his three days at 40: 1,440 minutes, 260 a piece with
  220 of material. A piece's `labour` is the margin it carries, which is what the workshop earns by
  making it, and its `sheets` is its material over `SHEET_VALUE`, so a 30 piece is 0.15 of a 200
  sheet. The cut sheet pack's sheets figure moved from 1 to 0.15 for the same reason: at a whole
  sheet a piece the client would have been paying 38 for 200 of material.
- **2.22 the quantity.** The band of Turn 13 (20 to 40 a week, in fives) is drawn exactly as it was
  and then read as a week's work rather than a count: `CONTRACT_QUANTITY_MINUTES` (45) is the piece
  it was written for, so a 60 minute piece is asked for 15 to 30 a week and a three day piece one a
  week. Every draw stays on `offerCarrier`, the side stream, so the main seeded stream is untouched
  and no month of the game moves for anything but the contract itself. The contract itself does
  move: `pick` takes no number at all from a one entry table (`int` returns early when the band is
  a single value), so the piece draw that was free with one piece costs a draw with three, and the
  quantity, the term and the client of a given seed's offer are not the ones Turn 13 measured. The
  contract tests and the (v) month are rewritten for that.
- **2.22 the reservation.** A contract holds what the week in hand still wants and no more [TUNE]:
  a term runs for months and holding the whole of it would lock the rack for the year. It is held
  every morning after the jobs have had theirs, it may only ever draw its own claim plus the sheets
  nobody has a claim on, and it gives what it holds back when the term ends.
- **2.22, the scripted player.** The autopilot takes the first contract on the board whose week of
  work fits seven tenths of its crew's minutes [TUNE] and declines the rest, because the board
  offers three lengths now and a contract nobody can keep up with is a point of reputation a week.
  The 10.4 playthrough keeps sheets under it while a contract runs, restocking twenty at a time
  when the free stock falls under six [TUNE].

### What B3 could not do as the brief writes it

- **2.22, "so a poor joiner shows a thinner margin than a good one".** The line is on the row and
  it is his own, but the wage table of Turn 1 does not make the sentence true: a poor joiner at 480
  a week works at 0.6 and a normal one at 640 works at 0.8, which is exactly the same money for the
  same work, and a super joiner at 800 works at 0.9, which is a premium for the speed. So a cut
  sheet pack shows the same result a piece with the poor man and the normal one, and a thinner one
  with the super. The figure is right; the sentence was written about a wage table the game does
  not have. Tests: `tests/engine/contracts.test.ts`, "the result with a man on it".
- **2.22, what the rack rule did to the 10.4 playthrough on Easy.** A contract's material used to
  be an unavoidable ledger line, which a broke workshop could put into the arrears and go on
  producing; it is sheets now, and sheets have to be bought. The scripted Easy run is in the
  overdraft from the end of month 1 and in arrears by month 3, so its contract goes short from week
  9 and the month 3 efficiency falls away with it. The month 3 efficiency claim and the "every week
  in full" claim of the brief's 10.4 now stand on the Very easy control, which has the money,
  beside the crew claims B2 moved there for the same reason. Phase C should look at the Easy script
  again when it re-runs the months.

---

## Phase C

- **T17-C1 The notes applied.** `docs/notes-t17.md` is the finished record: every addition the
  three B groups made to one of the six frozen files of Turn 13, with what phase C decided about
  it. Nothing had to be merged. No two groups added the same click case, the same constant or the
  same function under two names; `emptyBags` is one case reached from two places, and the one
  repeated figure, `CONTRACT_QUANTITY_MINUTES`, repeats a fixed point in the past on purpose.
  `src/engine/index.ts` still exports what the UI imports after B2's four removals: the build
  passes and the four names are nowhere in `src` or `tests`.
  Done: four constants of a rule the game no longer has are out of constants.ts
  (`STAFF_OVERTIME_RATE`, `STAFF_OVERTIME_MAX_MINUTES`, `OVERTIME_TIRED_DAYS`,
  `OVERTIME_QUIT_CHANCE`, all unread), the comment over `keepSetupHonest` no longer says the
  machine is under his hand, and Turn 9's `workshopRate` in plan.ts now points at Turn 17's rate.ts
  so the two figures that wear the word cannot be confused.

- **T17-C2 The scenarios.** The sixteen scenario months of Turns 2 to 13 are played again under
  the new rules and stand: `thirtyDays.test.ts`, `turn13.test.ts` ((t) to (x)) and the 10.4
  playthrough, 128 scenario assertions, all green with the hiring gate, restock by number and the
  men going home at five. The 10.4 run on Easy is re-scripted rather than split: the player goes to
  the bank the day the fitting out puts him under, and with the loan drawn every claim of 10.4 is
  back on Easy where the brief put it. Two new months are added in `tests/scenarios/turn17.test.ts`:
  (y) two men on one job and a contract on the rack, and (z) a week that proves the rate.
  Done: 12 assertions on the re-scripted playthrough, 10 on (y) and (z), and the two `it.todo`
  lines of Turn 13 that recorded claims which did not hold are real tests now.

- **T17-C3 The cross check.** Every line of section 7 is answered below with the test, the grep or
  the figure that proves it. Four checks wanted a test that did not exist and now have one: no
  station rests as a walk or a carry, the gate at 2,499 in the bank, both of the labourer's own
  jobs of work in the helper month, and a started drawing surviving the same dusk the calls and the
  emails die at.
  Done: `tests/render/walkers.test.ts` (two new), `tests/engine/hiringGate.test.ts` (one new),
  `tests/scenarios/thirtyDays.test.ts` and `tests/engine/theDesk.test.ts` (tightened).

- **T17-C4 Look and shoot.** Ten pictures in `docs/report-t17`, 1280 wide, taken against the real
  app in a browser and looked at one by one. Three things were wrong in the first set and are
  fixed: the machine card's buttons fell under the fold of the small folder, so the card is the
  middle folder now and Connect, Service, Move and Sell are on the page where Piotr could not find
  them; the Machines sheet said "saved us 0 hours" under a total that read 0.3 h, and says the same
  figure in both places now; and the first hall had two identical service chips, which was two
  saws both past their 80 hours and not a fault.
  Done: `tests/ui/modalSize.test.ts` has the wide table and the folder rule, the companyBoard test
  reads the unrounded sentence, and the ten pictures are in the folder.

### The ten pictures, and which were staged

All ten are the real app in headless Chromium at 1280 by 800, driven by clicks: the camera chips,
the top bar, the office wall, the laptop's own tabs. Six of them stand in front of a hall a click
cannot reach in a reasonable number of steps, and that hall was reached the way a player reaches
one, by loading a saved game the game itself wrote through its own Continue button. The saves were
built by playing the game headless (the day 1 kit with a standard saw, a second saw, an industrial
fan, a labourer and two joiners with the kit they need, a full rack, four pieces of work and a
fortnight behind it) and then, where the picture needed it, one thing was set for the camera. Each
is named below.

1. **01-hall-chips.** The chips over the floor: the bags full with Empty bags on the chip, the hall
   dirty with Clean up, the table saw due a service with Service it, and Set up hall under them.
   Staged: the dust, the bag store and the saw's service hours were set on the saved hall.
2. **02-hall-quiet.** The same hall swept, the bags empty, nothing due and the bench clear: one
   chip, Set up hall, and no others. Staged: the same three set the other way, and the board and
   the jobs cleared.
3. **03-machine-card.** A click on the table saw standing in the hall. Not staged beyond the save.
4. **04-canteen-seats.** The canteen block with the welfare kit on it, three seats and three
   lockers, and the labourer standing at its door. Zoom and drag, both by the game's own controls.
   Not staged beyond the save.
5. **05-two-men-bench.** Two men at one bench, the second in the bench's own second place. Staged:
   the second joiner was taken off his own job and put on the first man's by the work plan's own
   action, and the clock was run until the stage was the bench.
6. **06-company-board.** The office wall: three sheets, Reputation, Output and Machines, with
   "Workshop earns £21 an hour, last week £16, per man £5" over them and "Machines saved us 0.2
   hours this week" on the last line. Not staged beyond the save.
7. **07-month-end.** The month end folder scrolled to Total efficiency: the machines, the people,
   the hall, the waiting and "Total efficiency 67% = real work over paid hours". The rate is the
   first line of the same folder, above the money. Staged: the clock was run to the morning of day
   31, which is when the game raises it.
8. **08-our-team.** The laptop's Team page, Our team tab: the owner first, then the labourer and
   the two joiners, each with the day he started, how long ago, his month's pay, his hours this
   month, his days off and what he is on. Not staged beyond the save.
9. **09-day-meter-overtime.** The day meter at 18:11 reading 551 of 611 minutes, the evening's
   minutes painted in their own colour at the end of the bar, with the hover plate open. Staged:
   the owner answered the going home question with the evening, which is the click the game asks
   for, and the clock ran on.
10. **10-pipes.** The run along the wall with its lighter top edge and its darker underside, the
    tee, two drops landing on their machines as collars, and the flange at the fan. Not staged
    beyond the save.

What the pictures showed that is not worth a change tonight: two men standing on the same cell
print their names over each other (the canteen doorway takes every man at a seat or a locker), and
a hall with two machines of one family prints the family's name on both rows of the Machines sheet
and on both service chips. Both are older than this turn and neither is a fault; the first is on
the art list of `docs/art/REQUESTS-T17.md` with the welfare kit.

### The Easy playthrough, and why it was re-scripted

The C brief asked me to decide whether B2's and B3's split (the crew and the contract claims moved
onto the Very easy control, Easy left asserting that the bank holds him back) was the right answer,
or whether the Easy script should be re-scripted. I re-scripted it. The figures:

- **Where the money goes.** Measured on the Easy run as B2 and B3 left it: the account is at 4,597
  on day 1 and at −464 on day 4, because the script buys 15,400 of kit on day 1 out of 20,000 of
  capital and another 8,200 of kit and stock by day 5. Nothing Turn 17 changed touches those days:
  the run has been in the overdraft from day 4 since Turn 13. It then sat there for three months at
  25% a year, went into arrears in month 2 and ended day 91 at −9,998 with 12,445 of arrears, no
  estimator, no manager, no holiday, and a contract starving for sheets from week 9.
- **The lever.** The C brief names three: spend less, take the loan earlier, take fewer jobs at
  once. The evidence says the loan. The month reports show the workshop's own trade is not the
  problem: the contract nets +3,876, +4,902 and +4,446 over the three months, and the jobs are all
  taken at over 20% margin. What it cannot do is carry 8,600 a month of owner's draw (the draw
  raised to tier 1, which is 400 a day, by 10.4's own script) on the capital it has. Spending less
  would be rewriting what 10.4 measures; the bank is the thing the script never used.
- **The re-script.** One rule in `onDay`: while he is still standing the workshop up (day 30 or
  under), the day the account goes under he takes a loan of 25,000 [TUNE: half what the bank
  lends], once. It fires on day 4 on Easy. Very easy never goes under in month 1, so the control
  is untouched and still never borrows.
- **What it bought.** Easy now closes month 1 at +19,186 and month 2 at +4,359; the estimator is on
  the books on day 32 and the manager on day 64; the five days away are taken; the contract's
  thirteen weeks are made in full out of the rack (27 to 32 against 20 wanted); month 3 efficiency
  is 74.4% against the 55% the claim wants; the house reaches tier 2 in month 2 and keeps it; and
  the run ends at −8,711 with 6,000 of arrears. That is less overdrawn and with half the arrears of
  the run that sat in the overdraft, so the loan is not a trick to get past the gate: it is the
  cheaper money, and the player who takes it is better off on every figure.
- **What the overdraft still costs him.** Two charges in three months, 32p on day 31 for the hours
  between going under on day 4 and the bank answering, and 82.43 on day 91 for the end of month 3.
  The month end of month 2 carries none at all.
- **What the gate still proves.** `tests/engine/hiringGate.test.ts` is where the refusal is
  measured, and the cross check below reads it at 2,499 in the bank. The playthrough's job is to
  show that a careful player can still build the crew of 10.4 on Easy, and it does.

### The two new months

- **(y) two men on one job and a contract on stock.** Very easy, three poor joiners with a saw
  each, one 6,000 piece ready on the first man's bench, a standing contract for 20 cut sheet packs
  a week on the third man's, and nothing else taken off the board. The same month is played twice
  and only one thing differs: the second joiner on the piece. Measured: 26 days to finish it with
  the one man, 13 with the two of them, which is half to the day, the machine stage included. The
  contract holds sheets on the rack while it runs (3 held at the end of the month), draws them as
  the pieces are made (17 sheets, 112 pieces), keeps every full week in full, and puts no material
  line on the ledger at all: every contract entry is income.
- **(z) a week that proves the rate.** The owner alone in a fitted hall, one big piece on his
  bench, a working week played through the clock a minute at a time. The board reads
  **£37.68 an hour** and the month end reads the same pounds out of the same function. The same
  week with the last two days standing, the wages paid for all five, reads **£22.80 an hour**:
  three fifths of it (0.605), which is Piotr's own arithmetic of 40 falling to 24. The played week
  is under 40 because he books 304 of the 320 a full owner day is, losing the rest to the walk to
  the bench and the hall's factor; the exact 40 and 24 are pinned in `tests/engine/rate.test.ts`.

### Phase C decisions

- **The "Set up hall" chip stands on a quiet hall (2.5).** B1's reading is confirmed. 2.5 says two
  things that look like a contradiction, and they are not: "one chip per thing that has to be done
  and nothing else" governs the problem chips, and the sentence "a clean hall with nothing to do
  shows no chip at all" is what that costs on a clean hall. "Set up hall stays as a chip when the
  hall is not in setup" is the exception written in the same paragraph, and
  `docs/mockups/t17/hall-strip-C.html`, which Piotr chose, draws Set up hall as a chip beside
  Clean up, with the README saying the two buttons under the lines are as drawn. So a clean,
  quiet hall shows one chip, Set up hall, and no problem chips at all. The code and the test say
  that (`tests/ui/hallChips.test.ts`) and so does this report.
- **Move on the machine card is honest as it is (2.6).** It takes the player into setup mode with
  the card put away, where he drags the machine to where he wants it. That is the one way anything
  has moved in this game since Turn 4: the destination is a cell he has to choose, so a single
  click cannot do it, and putting the machine "in his hand" for a second click would be a second
  code path for moving, which the house forbids and the brief does not ask for. What was wrong was
  the comment over `keepSetupHonest`, which claimed the machine was under his hand; it now says
  what happens. The button is offered only on what the engine would actually let him drag.

### Numbers chosen (phase C)

- **The Easy playthrough's loan [TUNE].** `LOAN_AMOUNT` 25,000, half what the bank will lend, and
  `LOAN_BY_DAY` 30, the last day of the fitting out he will borrow for. 25,000 is the smallest
  round figure that carries the three months of 10.4 with the crew the brief asks for: at 15,000
  the estimator is affordable in month 2 but the account is at −5,065 by day 60 and the manager is
  refused; at 20,000 it is at −641 on the same day and still refused. Both figures are in
  `tests/scenarios/playthrough.test.ts` and nothing in `src` reads them: they are the scripted
  player's decisions, not the game's.
- **(y), the month [TUNE].** Very easy, three joiners of the poor class with a saw each and no work
  taken off the board, so the month is about the one piece and the one contract; a 6,000 piece,
  which is 2,400 of labour and about five weeks of one poor joiner; and a contract for 20 cut sheet
  packs a week at 100 a piece over an 8 week term, which is a week's work for the third man and
  more rack than a week of jobs. The assertion on the halving is a band, 0.45 to 0.7 of the days,
  and the measured figure is 0.5 exactly: 13 days against 26.
- **(z), the week [TUNE].** A 40,000 piece, whose 16,000 of labour is fifty owner days, so the week
  never runs out of work for him; the board and the month end are read over the same five days; and
  the fall when two of the five stand is asserted as a band, 0.5 to 0.7, with the measured figure
  0.605 against the brief's three fifths.
- **The machine card's size.** `MODAL_IS_WIDE` in app.ts, one table beside `MODAL_IS_FULL`, with
  the machine card the only true in it: the folder's middle size, which the day summary and the
  month end have taken since Turn 13. Measured on the real page: the card is 406 px of content and
  the small folder gives it 333, so the five buttons sat 73 px under the fold.
- **The staged saves.** Built by playing the game headless and written with the game's own
  `encodeSaveFile`, so every picture stands in front of a state the game itself could have saved.
  The fortnight behind them is 14 days, long enough for a week of closed days under the rate and
  for the machines to have hours on their week.

## Cross check (section 7)

**1. The rate.** The four engine readings are `tests/engine/rate.test.ts`, "the four readings of
2.26", and they read what the brief writes: *reads 40 an hour for the owner alone at full work for
a week* (exactly `OWNER_RATE_PER_HOUR`, 320 over 8), *reads 24 an hour when the shop stands two of
the five days*, *is pulled under 40 by a poor joiner who is idle half the day* (26), and *is pushed
over 40 by an express job* (70). The board and the month end print the same function's number:
`tests/ui/monthEnd.test.ts`, "prints the same function's number as the Company board, over the same
days", builds a workshop whose whole history is one working week, so the board's rolling five days
and the month's days are the same days, and asserts `weekRate(week).rate === monthRate(week, 1).rate`
and that both renderers print that pound. The played week of scenario (z) says it again on a week
that went through the clock: the board reads £37.68 an hour and the month end reads £37.68.

**2. Nobody walks on the spot.** The grep, and what it printed:

    $ grep -rn "data-rest" src/render src/ui
    src/render/walkers.ts:231:  const rest = (node.getAttribute('data-rest') ?? 'idle') as Animation;
    src/render/hall.ts:1050:      `data-rest="${rest}" ${extra}>` +

    $ grep -rnE "data-rest=\"(walk|carry)\"|return '(walk|carry)';" src/render
    (nothing)

There is one place a resting figure's animation is chosen, `animationForStation` in
`src/render/characters.ts`, and it returns `bench`, `idle` or `phone` and nothing else; `walk` and
`carry` are set in one place, `dress` in walkers.ts, and only while `walker.path.length > 0`, which
is a man actually moving. The one other `'walk'` in the renderer is `playableAnimation`'s last
fallback, which is frame 0 of the walk held still (`frozen: true`) for a role whose sheet has no
idle at all: a figure standing, not a figure walking on the spot. Pinned now by
`tests/render/walkers.test.ts`, "nobody walks on the spot": every station the game puts a man at
rests at something that is not a walk and not a carry, and no figure drawn in a hall carries
`data-rest="walk"` or `data-rest="carry"`.

**3. The helper.** `tests/scenarios/thirtyDays.test.ts`, "a month with a helper, where the owner
never unloads": a month played to day 31 on the `WITH_HELPER` script. Measured in it, 12 loads off
the lorry and 19 sweeps of the hall, and every one of the 31 chores has `doneBy` the helper and
never the owner. The owner's day meter carries no minutes for them: the `fixing` minutes across
every day log of the month are exactly the minutes of the repairs and services he did himself, and
nothing else. The van is never even put in front of him: no `deliveryArrived` question all month,
where the same month without a helper is asked in the first three days.

**4. The gate.** `tests/engine/hiringGate.test.ts`, "answers the brief's 2,500 a month joiner,
which is between two real classes". The brief's 2,500 a month joiner does not exist in the game:
**a poor joiner is 480 a week, which is £2,057.14 a month, and a normal one is 640 a week, which is
£2,742.86** (a super joiner is 800 a week and £3,428.57). So 2,499 in the bank is the answer to
both at once: the poor man is affordable and the normal one is refused, with the sentence
**"Not enough in the bank: needs £2,743"**, on the hire card as well as out of the engine, because
it is the one blockReason chain. The standing has to be there first: the bank is the last link,
which is what the third test in that file measures.

**5. Dusk.** `tests/engine/theDesk.test.ts`, "die at dusk, done or not, and carry nothing over": a
drawing with minutes in it, the clock run to five and the day ended. After it, no `emails` task and
no `clientCall` task is open at all, and the drawing is still there, not done, with minutes left and
`doneBy` the owner. The morning after it is in his hands without being assigned again, which is the
test above it, "is the same man's in the morning, and he carries on with it".

**6. The canteen.** `tests/cloud/migrate.test.ts`, "moves every seat and locker off the hall floor
and into the canteen": a real v24 save with a canteen seat at 7,9 and a locker at 13,9, both on the
hall floor, lifted to version 15. After it both stand inside the canteen block, the first seat on
`CANTEEN_SLOT_LAYOUT[0]`, the cell just inside the door, and a seat that was half way through a
move is not a move any more. Nothing of the welfare kit is on a hall cell.

**7. The look.** The ten pictures of T17-C4, below.
