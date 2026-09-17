# Report: Turn 18

Easy and friendly. Built in Claude Code, cloud, on branch `claude/festive-ramanujan-9p66nw`,
17.09.2026.

Base: the branch's own head, which carried `APP_VERSION` `v25` and `STATE_VERSION` 15, the brief's
precondition. The report is written as the turn is built: one entry per task, in the order the task
queue of section 4 names them.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, 168 test files, 1,638
tests and one todo, up from 164 files and 1,601 tests at the end of Turn 17. One agent, serial, ten
commits, `npm run check` green on its own exit code before every one of them.

---

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.9 is built, tested and photographed,
and nothing on the "do not" list of section 5 was done. Seven things are worth Piotr's eye, and each
one is a decision rather than an accident.

1. **The branch, and what `main` actually holds.** The brief says to branch
   `turn-18-easy-and-friendly` from `main` and that "main carries Turn 17 merged (PR #17)". It does
   not: `main` in this repository is still two commits, the initial commit and a `CLAUDE.md`, and
   the whole game lives on the branch this session is required to push to,
   `claude/festive-ramanujan-9p66nw`, which does carry the Turn 17 merge. The turn is built there,
   on top of the v25 head, and both of the brief's preconditions were checked against that head:
   `CLAUDE.md`'s first line said Turn 18, `APP_VERSION` was `'v25'` and `src/engine/rate.ts` exists.
   This is the same thing Turn 17's report said about Turn 17.

2. **2.7's "until the hall has been set up once" has no flag in the state to read.** There is no
   record anywhere in `GameState` of the player ever having left setup mode: setup is UI state, and
   section 3 of the brief says the state version does not bump, so one could not be added. The step
   is read off the floor instead: it is done once there is a workbench standing in the hall, which
   means the day 1 kit has been delivered and put down. On the README's own first ten minutes that
   retires the step exactly where it should, on the morning of day 2 when the lorry is unloaded. If
   Piotr wants it to mean "has pressed Done in setup mode once", that is one boolean on the state
   and a state version bump, which is a decision for a turn that is bumping it anyway.

3. **2.9's "the same margin figure the job card would show" describes a figure the job card does
   not show.** The job card has never printed a margin, and printing one is not in this brief. What
   the brief is naming is the arithmetic, and that arithmetic already existed: the scripted player
   of Turn 13's 10.4 playthrough has decided on it since it was written. It is `marginOfPrice` in
   the engine now, the accept dialogue prints it, and the playthrough calls it, so "from the same
   function" is true even though there is only one caller in the UI.

4. **2.5 moved the cross out of the modal's head, which the brief does not ask for.** The brief
   asks for one `closeButton()` helper and one look. That was built first, and the pictures of
   T18-09 showed it was not enough: the same disc in the same colours hung 27 px off the Company
   board, 11 px off a folder, 10 px off the Work Plan and 8 px **inside** the laptop's frame,
   because three of the four skins place their own head and the cross was the head's child, so each
   skin was hanging it off a different box. The cross is the modal's own last child now. Measured on
   the running page, every modal reads 54 by 54, the same three colours and the same overhang. The
   brief says "same size, same place ... same hit area", and without the move it was not the same
   place.

5. **The month headings changed too, which 2.2 does not spell out.** 2.2 is written about "day N",
   and the game also printed "Month 1" in three places: the month end's heading and the books' month
   chips and empty month line. A date that reads like a date and a month that reads like a serial
   number would have been half a job, so `monthName(month)` serves all three. Nothing else about the
   month end or the books changed.

6. **Three of the six pictures are stacked crops of the running game.** The strip carries one line
   at a time and one modal is open at a time, so "the strip with both money lines" and "a modal with
   the cross beside the Company board's" cannot be one screen of the game. Each crop is the real app
   at 1280 by 800; they are put one above the other so the comparison the brief asks for can be seen
   in one picture. Every crop is named in the list of the six below.

7. **One test of Turn 17 was flaky and is now deterministic.** `tests/ui/laptopTeam.test.ts` failed
   about one run in three under load, on the hire that runs an interview through the clock: a
   question the engine raises stops the clock where it stands, so one call to `advanceMinutes` can
   come back with minutes still owed. Turn 17's report records the same test failing under CPU load.
   It gives the minutes until the hire lands now. Nothing in `src` changed for it, and the session
   rule is that `npm run check` is green on its own exit code before every commit, which a test that
   fails one run in three makes impossible to honour honestly.

---

## Tasks

- **T18-01 Housekeeping and v26.** `docs/turn-17-brief.md` is the root `CLAUDE.md` of the Turn 17
  merge commit (`fa5131d`), byte for byte, 19,209 bytes, checked with `cmp`; the README's briefs
  line names it and its reports line reaches `REPORT-T18.md`; `APP_VERSION` is `'v26'` and
  `STATE_VERSION` stays 15.
  Done: the two version assertions (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`) read
  `v26`, and the third still finds the string in `constants.ts` and nowhere else in `src`.
- **T18-02 A man walks slower, and the rack's number is a third of the size (2.1, 2.3).**
  `WALK_CELLS_PER_SECOND` is 1.0, one cell of the hall a second of real time at every speed in the
  game; nothing else about the walker is touched, and the walk test still reads the constant rather
  than a figure of its own, for its pace assertion and now for the cap on its own loop as well. The
  number over the rack is a third of the height, the stroke, the digit width and the padding Turn 17
  gave it, in the same place: `RACK_COUNT` is Turn 17's four figures over `RACK_COUNT_SHRINK`, and
  the stroke is written onto the text as a `font-size` attribute off the same constant, so the
  stylesheet no longer sets it and the plate and the glyph cannot be shrunk apart.
  Done: the new size test in `tests/render/views.test.ts` reads the plate's height and width and
  the glyph's `font-size` at a third of 26, 48 and 26, and checks the plate is still centred where
  it was; the new pace test in `tests/render/walkers.test.ts` pins the constant at 1.0.
- **T18-03 The date reads like a date (2.2).** One formatter, `formatCalendarDay(day)` in
  `src/engine/clock.ts`: the weekday, the day of its month and the month's name, `Mon 12 March`.
  `formatDate` calls it and puts the clock after it, and every one of the forty places that printed
  "day N" at the player calls it too, in the UI, in the renderer, in three engine strings and in the
  cloud save's note. Month names are `MONTH_NAMES` with `START_MONTH` [TUNE: March], twelve cycling,
  no year; `monthName(month)` is the second formatter and the three places that printed "Month N"
  (the month end's heading, the books' month chips, the books' empty month) call it.
  `state.clock.day`, `monthOfDay`, `dayOfMonth` and every engine figure are untouched: this is copy.
  Done: `tests/ui/calendarDate.test.ts`, five tests, of which the sweep opens the hall, the office,
  all eight screens, every page of the laptop and the day end and asserts that none of them matches
  `day N` for the current day, or `day` followed by any number at all; twenty-one existing tests
  moved onto the formatter rather than onto a new hard-coded string.
- **T18-04 One cross to close everything (2.5).** `closeButton(action)` in `src/ui/modal.ts` is the
  one helper and the one markup; the modal layer calls it for every skin and the Menu calls it with
  `closeMenu`. The disc itself is the one `.modal-close` rule in the stylesheet, lifted off the
  Company board: a cream face, a 3 px oak edge, the glyph in the title hand at the display size,
  54 px, hanging 11 px off the top right corner of whatever it shuts. The folder's small dark cross
  in the corner, the board's pale one, the screen's grey one and the Menu's own are gone, and the
  five figures behind the disc are tokens on `:root`, with one override each on the felt board and
  the Menu because their own frame is padding and an absolute child is placed against the padding
  box.
  Done: `tests/ui/oneCross.test.ts`, four tests: the openers table is checked against `MODAL_IS_FULL`
  so no `ModalId` can escape it, every one of the nine renders exactly one `.modal-close` whose
  outer HTML is `closeButton()` to the character and shuts on a click, the Menu's is the same helper
  with the one action that differs, and the stylesheet carries no per skin cross and the source
  spells the class in one file.
- **T18-05 Chips over tips (2.4).** `hallBottom` puts everything that stands under the hall in one
  column, bottom left: `.hall-bottom`, with the chips of T17 2.5 first and the first use tip last,
  both in the flow of that column. The chips are no longer placed on the view themselves, so a long
  tip pushes them up instead of being covered by them, and the column stops 76 px short of the right
  edge so a wide tip cannot run under the camera's three chips either. The tip is still `renderTip`
  through the one `withTip` helper, and the office, which has no hall to stand under, has neither.
  Done: `tests/ui/chipsOverTips.test.ts`, four tests: the DOM order of the column with a full bag
  store making a second chip, the same order with a tip forty sentences long, the camera's own
  corner, and neither of the two on the office.
- **T18-06 The money speaks before the month end, and the first days say what to do (2.6, 2.7).**
  Three new keys in `warnings.ts`, in the order section 7 asks for. `belowZero`: while the account
  is under zero, `Account below zero: the overdraft costs £X a day`, X off the engine's own
  `overdraftInterestForDay`, so the line and the charge cannot disagree, to the pound or to the
  pence while it is under a pound, recomputed every render off the balance.
  `spendingOverEarning`: over the last five closed days the Company board reads, what went out on
  wages, the draw and the fixed charges against the labour the same days earned, which is the
  rate's own numerator; `You spend more than you earn: £X out, £Y in this week`, from the sixth day
  the game has closed and never before. `firstSteps`: on days 1 to 3 and last in the order, `Set up
  the hall`, then `Accept an enquiry on the board`, then `Press Start production on the work plan`,
  gone for good after the third step or from day 4, and off with the tips setting. Nothing touches
  the ledger, the rate or a figure.
  Done: `tests/engine/warnings.test.ts`, up from 11 tests to 22: the overdraft line shows and
  clears and counts the pence, a week of wages with no work shows, a week that earns more than it
  spends does not, the line is never said before the sixth closed day, it counts the draw and the
  fixed charges and not the material or the kit, it reads the board's own five days, the three
  first steps in order, the line's last day, the tips switch, and the whole order asserted twice.
- **T18-07 The keyboard (2.8).** `P` stops the clock and starts it again at the speed it was doing,
  which the UI remembers in `speedBeforePause` and which is x1 for a clock that was never running;
  `1` to `5` are `SPEEDS[1]` to `SPEEDS[5]`, x1, x2, x4, x10 and x30. Both make the same
  `SET_SPEED` dispatch the top bar's knobs make, so there is one way the speed is ever set. Escape,
  Space and the setup mode's R are untouched. A key does nothing at all while the caret is in an
  input, a textarea or a select, and nothing before there is a game to run.
  Done: `tests/ui/keyboard.test.ts`, six tests, including the knob on the top bar lighting for the
  key that was pressed, and Escape still closing a modal without touching the clock.
- **T18-08 The margin on the client's answer (2.9).** `marginOfPrice(basePrice, bespokeMaterial,
  price)` in `src/engine/jobs.ts` is the one margin figure in the game: what a price leaves after
  the material and the labour, both off the base price, so the express uplift and the client's own
  haggle never flatter it. The answer event carries it in its data and the accept dialogue prints it
  after the offer, `The client offers £9,400: margin 18%`, in the game's green over `MARGIN_GOOD`
  (20%), its red under `MARGIN_THIN` (10%) and the body colour between. The scripted player of the
  10.4 playthrough now decides on the same function, so what the autopilot reads and what a real
  player reads are the same number.
  Done: `tests/ui/board.test.ts`, four new tests: the sentence to the character, the three colours
  with a hair either side of both lines, the same function answering for a job already taken, and no
  margin at all on an event that carries none.
- **T18-09 Look and shoot.** Six pictures in `docs/report-t18`, taken against the real app in
  headless Chromium at 1280 by 800 and looked at one by one. **One thing was wrong in the first set
  and is fixed:** the cross of 2.5 was the same disc and the same colours everywhere but not in the
  same place. Measured on the running page it hung 27 px off the Company board, 11 px off the
  folder modals, 10 px off the Work Plan and 8 px *inside* the laptop's frame, because three of the
  skins place their own head and the cross was the head's child. The cross is the modal's own last
  child now, so every skin hangs it off the same box: measured again, 54 by 54 on all of them, the
  same three colours and the same 11 px of overhang, to the pixel a skin's 1 px border takes off it.
  Done: the measurement above, `--close-out` declared once and asserted once
  (`tests/ui/oneCross.test.ts`), and the cross asserted as the modal's last child.

---

## Numbers chosen

Every figure this session picked, rather than took from the brief, is tagged `[TUNE]` where it is
declared. The brief's own figures are marked as its.

- **2.1 `WALK_CELLS_PER_SECOND` 1.0** [PIOTR's figure]. Declared in `constants.ts`. The walker steps
  in real seconds and never reads the speed, so this is a man's pace at x1 and at x30 alike.
- **2.3 `RACK_COUNT_SHRINK` 3** [TUNE, from the brief's "a third"]. `RACK_COUNT` is Turn 17's four
  figures divided by it: the plate 8.67 px where it was 26, a digit 5 where it was 15, the padding
  3 where it was 9, and the stroke 8.67 px where the hand was 26. The stroke is written onto the
  text as a `font-size` attribute off the same constant, because a third of the plate and a third
  of the glyph have to be one decision and the stylesheet cannot see the constant.
- **2.2 `START_MONTH` 2** [TUNE: March, which the brief names]. An index into `MONTH_NAMES`, where 0
  is January. Twelve names cycle after it and there is no year on a date: a year number is nothing
  the player does anything with, and the game's year is 360 days, so the weekday does not come round
  with the month.
- **2.2 the shape of a date** [TUNE]: `Mon 12 March`, the weekday first as the brief asks, then the
  day of its month, then the month's name, with no comma and no ordinal. `formatDate` puts the clock
  after it behind the middle dot the top bar already had. A day under 1, which `previousWorkingDay`
  can return, is clamped to day 1 rather than printed as day 0 of a month before the game.
- **2.5 the disc** [TUNE, all five on `:root`]: `--close-disc` 54 px, `--close-out` −11 px,
  `--close-face` #f7f1e4, `--close-edge` #8a5424, `--close-ink` #1f5a3a. They are the Company
  board's own figures of Turn 15, lifted out of `.modal-felt` so every skin wears them. One
  `--close-out` for all of them, because the cross is the modal's child now and every skin hangs it
  off the same box.
- **2.4 the column's right edge** [TUNE]: `.hall-bottom` stops 76 px short of the view's right edge,
  which is the camera's three chips at their widest plus the gutter, so a long tip cannot run under
  them. Its rows are 8 px apart, which is the gap the chips already had plus two.
- **2.6 `SPEND_WARNING_FROM_CLOSED_DAYS` 6** [the brief's figure: "from the sixth day the game has
  closed"]. Declared as `RATE_WEEK_DAYS + 1`, so it moves with the window it reads.
- **2.6 `SPEND_WARNING_CATEGORIES`** [TUNE, from the brief's list]: `wages`, `wagesNight`,
  `salaries`, `ownerDraw`, `rent`, `rates`, `power`, `insurance`, `security`, `loanInterest`,
  `overdraftInterest`, `software`. The brief says "wages, draw and fixed charges (rent, rates,
  power, insurance, security, loan and overdraft interest, software)". `wagesNight` and `salaries`
  are wages under the ledger's other two names, so they are in. The loan's **capital** instalment is
  not, because the brief names the interest; it is money out, and if Piotr wants it counted it is
  one line in that table. An entry that became arrears is counted: it is spending the company could
  not pay for, which is the very thing the line is about.
- **2.6 the window** [TUNE]: the last five closed days `ratedDays` gives, which is exactly the five
  the Company board reads its rate over, and the "in" is that rate's own numerator. So the strip and
  the board can never disagree about what a week earned.
- **2.6 the overdraft's pence** [the brief's rule]: `formatMoney` to the pound at a pound and over,
  `toFixed(2)` under it. At Piotr's `OVERDRAFT_RATE_YEARLY` of 25% a year over 360 days, £10,000
  under reads £7 a day and £500 under reads £0.35.
- **2.7 `FIRST_STEPS_LAST_DAY` 3** [the brief's figure]. The line is gone from day 4 whatever the
  player has done, and gone the moment the third step is done whatever the day is.
- **2.7 "the hall has been set up once"** [TUNE, and see the blocker below]: read as a workbench
  standing in the hall. There is no flag in the state for having left setup mode and Turn 18 does
  not bump the state version, so the step is read off the floor: a workshop with a bench in it has
  had its day 1 kit delivered and put down, which is what setting the hall out is for and what the
  first job cannot start without.
- **2.8 the focus guard** [TUNE]: `P` and `1` to `5` do nothing while the caret is in an `input`, a
  `textarea` or a `select`, because a "1" typed into the stock box is a number of sheets.
  `Escape`, `Space` and setup mode's `R` are untouched, exactly as the brief says ("Escape closes as
  it does", "Space stays what it is"): making those three obey the focus guard would change
  behaviour the brief asks to be left alone.
- **2.8 what P starts** [TUNE]: the speed it was stopped at, remembered in the UI's
  `speedBeforePause`, and x1 for a clock that was never running, which is what a new game opens on.
- **2.9 `MARGIN_GOOD` 0.2 and `MARGIN_THIN` 0.1** [the brief's two lines, declared in
  `constants.ts`]. Over the first is the game's green, under the second its red, between them the
  body colour. On the line itself is the body colour: "over 20%" and "under 10%" are both strict.
- **2.9 the margin itself** [TUNE]: the price less the material and the labour, over the price, with
  the material and the labour both taken off the **base** price, because the express uplift and the
  client's own haggle are pure profit and change neither. That is the arithmetic the scripted player
  of the Turn 13 10.4 playthrough has used since it was written; it is now the engine's
  `marginOfPrice` and the playthrough calls it.
- **The pictures** [TUNE]: 1280 by 800, the viewport Turn 17 shot at, at one device pixel. Three of
  the six are two or three crops of the running game stacked in one picture, because the thing being
  shown is a comparison the game cannot put on one screen: the strip carries one line at a time, and
  one modal is open at a time.

---

## Where "day N" was still printed, and what it became (2.2)

Forty-one call sites in five layers. Every one now calls `formatCalendarDay(day)`; the three that
printed a month call `monthName(month)`. The figures behind them are untouched: this is a formatter,
not a clock.

| Where | Was | Is |
| --- | --- | --- |
| `engine/clock.ts` `formatDate` | `Mon, day 12 · 09:30` | `Mon 12 March · 09:30` |
| `engine/game.ts` `summaryTitle` | `End of day 12` | `End of Fri 12 March` |
| `engine/jobs.ts` the blocked line | `waiting for table saw (on order, due day 2)` | `... due Tue 2 March)` |
| `engine/jobs.ts` the material line | `material arrives on day 2` | `material arrives on Tue 2 March` |
| `engine/staff.ts` the second shift | `The production manager starts on day 3` | `... on Wed 3 March` |
| `cloud/saves.ts` the save note | `Saved on day 12.` | `Saved on Fri 12 March.` |
| `render/hall.ts` a reserved floor, twice | `..., due day 17` | `..., due Wed 17 March` |
| `ui/topbar.ts`, `ui/laptop.ts` the clock | through `formatDate` | through `formatDate` |
| `ui/dayEnd.ts` the heading | `Day 12 done` | `Fri 12 March done` |
| `ui/dayEnd.ts` the two columns | `Your minutes, day 12`, `The hall, day 12` | `..., Fri 12 March` |
| `ui/app.ts` a past day's title | `Day 12` | `Fri 12 March` |
| `ui/app.ts` the move's finish note | `Finished on day 13 by 11:20.` | `Finished on Sat 13 March by 11:20.` |
| `ui/app.ts` the reserved floor note | `On order, due day 17 at 08:00.` | `On order, due Wed 17 March at 08:00.` |
| `ui/monthEnd.ts` the heading | `Month 1` | `March` |
| `ui/accounting.ts` a ledger row | `day 12 ...` | `Fri 12 March ...` |
| `ui/accounting.ts` a day row | `+ Day 12` | `+ Fri 12 March` |
| `ui/accounting.ts` the month chips | `Month 1`, `Month 2` | `March`, `April` |
| `ui/accounting.ts` an empty month | `Nothing has moved in month 2.` | `Nothing has moved in April.` |
| `ui/accounting.ts` the books warning | `Books not up to date since day 1.` | `... since Mon 1 March.` |
| `ui/accounting.ts` the two due lines | `Wages, day 5`, `Monthly bills, day 30` | `Wages, Fri 5 March`, `Monthly bills, Tue 30 March` |
| `ui/company.ts` a rating's day | `day 12` | `Fri 12 March` |
| `ui/contracts.ts` a running contract | `ends day 68` | `ends Fri 8 May` |
| `ui/finance.ts` the loan | `borrowed on day 4` | `borrowed on Thu 4 March` |
| `ui/catalogue.ts` an order, a sale, a service | `due day 2`, `collection on day 3`, `service on day 40` | the date each time |
| `ui/machine.ts` a tile on order | `On order, due day 2` | `On order, due Tue 2 March` |
| `ui/materials.ts` a delivery | `arrives day 2` | `arrives Tue 2 March` |
| `ui/shopping.ts` the arrival, the bar, the row | `arrives day 2 at 08:00`, `ordered day 1, due day 2` | the date each time |
| `ui/jobCard.ts` booked out, due, finished | `leaves day 5`, `due day 15`, `finished day 14` | the date each time |
| `ui/workPlan.ts` the row, the DL flag, the latest start, the span | `due day 15`, `Due day 15`, `Latest start day 9`, `Day 12 to day 26` | the date each time |
| `ui/team.ts` a man's start | `started day 1`, `starts day 3` | `started Mon 1 March`, `starts Wed 3 March` |
| `ui/start.ts` Continue | `Woodwork Empire, day 12` | `Woodwork Empire, Fri 12 March` |

Not changed, and why: the board tile's `deadline 14 days` and `expires in 2 days`, the contract's
`about 3 months`, a holiday's `5 days` and every other `plural(n, 'day', 'days')` are **durations**,
not dates. The brief's list names "the enquiries' deadlines", and an enquiry's deadline on the board
is a duration in days: it becomes a date the moment the job is taken, on the job card and the Work
Plan, and both of those are in the table above. The sprite check page prints no day at all.

---

## Cross check (section 7)

**1. `grep -rn "day \${" src/ui src/render`.** No hits at all, in either folder, and none in
`src/engine` or `src/cloud` either:

    $ grep -rn "day \${" src/ui src/render
    (nothing)
    $ grep -rni "day \${" src
    (nothing)

The formatter itself does not spell the words: `formatCalendarDay` builds `Mon 12 March` out of
`weekdayName`, `dayOfMonth` and `monthName`. The sprite check page prints no date. The test that
holds it is `tests/ui/calendarDate.test.ts`, which opens the hall, the office, all nine modals,
every page of the laptop and the day end, and asserts of each that it matches neither `day <the
current day>` nor `day` followed by any number at all.

**2. `grep -rn "modal-close" src/ui`.** Nine hits, and every one is accounted for:

    src/ui/modal.ts:77    the one helper, `closeButton(action)`, which writes the markup
    src/ui/modal.ts:151   the one place that puts it on a modal or takes it off
    src/ui/styles.css:968, 989      the one rule and its hover
    src/ui/styles.css:2162, 2179, 2441, 2462   four `:not(.modal-close)` guards on button rules
    src/ui/styles.css:3170          a comment on the Menu

No skin has a cross of its own: `.modal-folder .modal-close`, `.modal-board .modal-close`,
`.modal-screen .modal-close`, `.modal-felt .modal-close` and `.menu-close` are all deleted, which
`tests/ui/oneCross.test.ts` asserts by reading the stylesheet. The catalogue's small dark cross was
`.modal-folder .modal-close { color: #444 }`; it is gone with the rest. Measured on the running page
at 1280 by 800, every modal's cross is 54 by 54, cream on oak with the green glyph in Patrick Hand
at 34 px, and hangs 11 px off the top right corner (10 px on the two skins that keep the modal's own
1 px border).

**3. The warning strip's order.** `WARNING_ORDER` is
`['bagsFull', 'nobodyAssigned', 'deadlineAtRisk', 'noInsurance', 'belowZero', 'spendingOverEarning',
'crewFull', 'firstSteps']`, which is the brief's order with the code's own names for the first four.
`tests/engine/warnings.test.ts` asserts the list itself, and asserts it twice more against a real
workshop: seven of the eight at once in that order, and the first steps line under everything the
game actually has to warn about. The eight cannot all be true at once, and that is not a fault: the
first steps line is only said while production has never started, and "a started job nobody is on"
**is** production started, so those two are mutually exclusive by construction.

**4. The keyboard test.** `tests/ui/keyboard.test.ts`: `1` to `5` set `SPEEDS[1]` to `SPEEDS[5]`
read off the constant, and the top bar's own knob lights for the key that was pressed; `P` and `p`
stop the clock and start it again at the speed it was doing; a clock that was never running starts
at x1; nothing happens for any of them while an `input` has focus, and everything works again the
moment it is blurred; `Escape` still closes a modal and does not touch the clock; `Space` is not a
speed; and no key does anything before there is a game to run.

**5. The six pictures.** In `docs/report-t18`, listed below.

---

## The six pictures

All six are the real app in headless Chromium at 1280 by 800, at one device pixel, driven by
clicks. Four of them stand in front of a saved game, and every one of those saves was written by the
game's own `encodeSaveFile` and opened through the game's own Continue button, so each picture
stands in front of a state the game itself could have saved.

1. **01-top-bar-date.png.** The top bar of a workshop on the twelfth day: `Fri 12 March · 09:30`
   where it used to say `Mon, day 12`. The warning strip under it is the bags.
2. **02-money-lines.png.** The two money lines of 2.6, one above the other:
   `Account below zero: the overdraft costs £7 a day` on a workshop £9,800 under, and
   `You spend more than you earn: £3,160 out, £0 in this week` on one with a week of wages and a
   draw behind it and nothing earned for them. Two crops of the running game, because the strip
   carries one line at a time.
3. **03-first-steps-day-1.png.** A brand new game, day 1, 08:00: the strip says `Set up the hall`
   and nothing else, the date reads `Mon 1 March`, and the hall's own column carries the Set up hall
   chip above the camera tip. Not staged at all: this is what the game opens on.
4. **04-one-cross.png.** The top right corner of three modals, one above the other: the Company
   board on its felt, the catalogue on its folder and the laptop on its screen. The same disc, the
   same cream face, the same oak edge, the same green glyph, in the same place on all three.
5. **05-chips-over-tip.png.** The column under the hall: three chips (the bags full with Empty bags,
   the hall messy with Clean up, and Set up hall) above the first use tip, with the tip the last
   thing on the page and nothing overlapping. Staged: the dust and the bag store were set on the
   saved hall, as Turn 17's own hall pictures were.
6. **06-answer-margin.png.** The client's answer on a £12,000 fitted wardrobe:
   `The budget was £12,000. The client offers £12,540: margin 23%`, with the margin in the game's
   green because it is over a fifth.

---

## Names the brief uses that the code does not

- **"the top bar's `formatDate`" (2.2).** `formatDate` is in `src/engine/clock.ts`, not in the top
  bar: the top bar and the laptop's own clock both call it. The new formatter sits beside it there.
- **"the deliveries' 'due day N'" (2.2).** There is no one delivery line: an order on the road is
  `OrderLine` (the shopping list, the catalogue tile, the machine tile, the hall's reserved floor)
  and a load of sheets is `Delivery` (the stock page, the job's blocked line). Both are in the table
  above.
- **"the enquiries' deadlines" (2.2).** An enquiry's deadline is `deadlineDays`, a duration, and the
  board prints it as one. The date is `Job.dueDay`, which the job card and the Work Plan print, and
  both now print it as a date.
- **"Our team's 'started on day N'" (2.2).** The code's line is `started day N`, in `src/ui/team.ts`,
  off `Worker.startDay`.
- **"the house" (2.2).** The house card (`src/ui/house.ts`) prints no day at all: it is a tier, a
  picture and a line about the draw. Nothing to change there.
- **"the reports" (2.2).** The month end's own heading was `Month N` and is the month's name; every
  day figure inside the reports comes through the day rows and the ledger rows of the books, which
  are in the table.
- **"the accept dialogue" (2.9).** The client's answer is a `GameEvent` of kind `clientOffer`, drawn
  by `renderEvent` in `src/ui/eventModal.ts`. It has two choices, so it is a decision and carries no
  cross: the two buttons are the way out, which is the rule of `ModalSpec.closable` and is why 2.5's
  test is about `ModalId`s and not about every panel on the page.
- **"the same margin figure the job card would show" (2.9).** The job card shows no margin, and
  showing one is not in this brief. The figure is the one the scripted player of Turn 13's 10.4
  playthrough has always used; it is `marginOfPrice` in the engine now, and the playthrough calls it,
  so there is one function as the brief asks.

---

## Section 5: what was not done tonight

Every line of the brief's "do not", checked against the diff.

- **No change to the engine's economy, the rate, Output or Efficiency.** The two money lines read
  `state.ledger`, `ratedDays` and `weekRate` and write nothing. `economy.ts`, `rate.ts`,
  `efficiency.ts` and `finance.ts` carry no change at all this turn: `git diff` touches none of
  them. The one engine figure that moved is `WALK_CELLS_PER_SECOND`, which the renderer reads and
  the economy does not.
- **No change to the hall labels.** `hall.ts` changed in two places only: the rack's number is a
  third of the size, and two reserved floor titles print a date.
- **No confirmation step on Sell, no catalogue greying, no shorter day end.** None of the three is
  touched.
- **No pipe colour change.** `src/render/pipes.ts` and the pipe rules of the stylesheet are
  untouched.
- **Nothing touched in `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the mockups, the
  sprite files, the character sheets or the font.** The only file added under `docs` besides the six
  pictures is `docs/turn-17-brief.md`, which task T18-01 asks for and which is the Turn 17 merge
  commit's `CLAUDE.md` byte for byte.
- **No storage access outside `src/cloud/store.ts`.** `src/cloud/saves.ts` changed by one line, the
  wording of the note it returns; it reaches no storage it did not already reach.
- **No PixiJS, no sound, no mobile, no Steam, no Electron.** None added.
- **No watch loops, nothing left running.** The dev server and the headless browser of T18-09 were
  started for the pictures and killed; nothing is left running at the end of the session.

## What Turn 18 leaves for Piotr to decide

- **What counts as "the hall has been set up"** (blocker 2 above). A real flag wants a state version
  bump.
- **The loan's capital instalment in the spending line.** The brief names "loan and overdraft
  interest", so the line counts the two interest charges and not the monthly capital repayment. The
  capital does go out of the account; if it should be in the figure, it is one word in
  `SPEND_WARNING_CATEGORIES`.
- **A margin on the job card.** 2.9 talks as though there were one. The function is there and
  exported; putting it on the card is a line of `jobRow` whenever Piotr wants it.
- **The Menu wears the big cross now.** It is the literal reading of "every modal, page and card",
  and a 54 px disc is large beside a small popover. If it looks wrong on the real screen it is one
  rule in the stylesheet.
