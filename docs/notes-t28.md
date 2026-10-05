# Notes from Turn 28

One writer, serial, no worktrees: the lead agent made every change under `src/` and `tests/`, every
commit and every push, task by task in the order of the brief's section 5 (Piotr's amendment of
section 3 for this run). Sub-agents read the code and reported, built the mockups, measured the
ports, drafted the closures' tests, reviewed the diffs and wrote `docs/art/REQUESTS-T28.md`; none of
them committed. This file is what did not fit in `REPORT-T28.md`'s lines a task: the readings of the
brief that were not the only possible one, what the work found in the engine, and what a later
turn will want to know before it touches the same code.

---

## 1. The calendar of the closures

Thirty day months, day 1 Monday 1 March 2025, so the weekdays walk round the dates:

| what | day | date |
| --- | --- | --- |
| the first working day of December, the tax's card and the break's | 271 | Friday 1 December 2025 |
| the last working day before the break, December's wages | 291 | Thursday 21 December 2025 |
| the first closed day | 292 | Friday 22 December 2025 |
| the tax, booked in the walk over the closed days | 300 | Saturday 30 December 2025 |
| the last closed day | 305 | Thursday 5 January 2026 |
| the first day back: the tax's card, the break's, then December's report | 306 | Friday 6 January 2026 |
| the first working day of July, the summer's card | 481 | Friday 1 July 2026 |
| the last working day before the summer | 509 | Friday 29 July 2026 |
| the summer closure | 511 to 524 | Sunday 1 to Saturday 14 August 2026 |
| the first day back | 526 | Monday 16 August 2026 |
| Christmas 2026 | 652 to 665 | Monday 22 December 2026 to Sunday 5 January 2027 |

The summer of 2025 (days 151 to 164) is worked. Every 30 December from 2025 on is inside a closure,
so the tax is always booked in the clock's walk over closed days; the test of a working 30 December
lost its premise and says so now.

The break's card counts every day it stepped over, the weekends either side among them: Christmas
2025 is 14 days, the summer of 2026 is 16 (the Saturday before and the Sunday after), Christmas
2026 is 16 too. The brief's `14 days` is its example of 2025.

## 2. Where the rule lives

`closureOf(day)` in `clock.ts`, off `CLOSURES` in constants, is the one place the calendar is asked
whether the workshop is closed, and `isWorkingDay` is false on a closed day, so everything that
already counted in working days (a deadline, a sheet delivery, a machine's order and its return
from service, a booked courier, a new man's first day, the client's calls, the last working day of
the month that the wages and the month's summary fall on, a standing contract's week) steps over a
closure with no code of its own. `turn27CrossCheck.test.ts` pins the callers of `calendarYearOf` to
`clock.ts` and `tax.ts`, which is why every year-keyed helper of the closures (`closureOf`,
`closureSpan`, `closureAhead`, `closureBefore`) is in `clock.ts` and the cards and the strip line
in `closures.ts` call only those.

The Work Plan's axis counts open days with a kept count (`WORKING_DAYS_TO` in `clock.ts`), grown as
far as it is asked: the calendar never changes under a game, so the count is the same every time,
and the Work Plan pays an array read per call instead of a walk from day 1. Before day 1 it keeps
the old five in seven arithmetic, which a latest start drawn before the first day still needs, and
a point that is no day (`Infinity`) is returned as it is.

## 3. Readings of the brief

- **Closures** [TUNE: chat]: 22 December to 5 January from December 2025, 1 to 14 August from
  2026, told on the first working day of December and of July; the card and the strip line go by the
  closure's first day (`state.closureWarnedFor`), not by a year, so no year is read outside clock.ts.
- **The draw** is charged on `isWeekday`, Monday to Friday by the week alone. The Team page's line
  said `paid every working day`, which a closure made untrue; it says `paid Monday to Friday`.
- **The first day back's money** is every cost of the stepped over days but the tax: the day's own
  books (`finance.day.costs`), not the cash before and after, so a pellet sale on a closed 1st does
  not make the figure smaller, and not the ledger, which keeps only its last 2,000 lines.
- **The strip line** says `1 working day left` on the last day [TUNE]; the brief's `9 working days
  left` is the figure on Monday 11 December.
- **The glue table's zone** is its footprint and a metre on the long side: 3 by 2 [TUNE].
- **The cutter sets' Sprite check rows**: a one class family that holds no floor had no row; the
  three are given one, `kept at the spindle moulders`, `no file yet`, so the art side can check its
  delivery there. A one class family's row also looks for its class file now (`glueTable.standard`),
  which shows the air dryer's, the pelletiser's, the systems', the desk's, the chair's, the
  laptop's, the locker's and the high rack's pictures that were always on disk.
- **The lock words** of a window without its set are the generic lock's, `Needs sash window cutter
  set`, with no article [TUNE]; the oak table keeps `Needs a thicknesser and a spindle moulder`.
- **The tile's `Needs` line** names the template's machines and its cutter set after them, and its
  sheets line counts the boards only (the material less the glass's 0.35), the figure the job will
  hold; the mockup's page was written again to say so after the review of the timber tasks.
- **The timber mark** is optional on a job (`timber?: boolean`), absent meaning false, so a save
  needs no field for it; `curing`, `glass` and `glassDay` are real fields, set by the lift to 41.
- **Who draws a timber man**: only at the families of his own plan, so a window man is never at an
  edgebander or a table saw, and nobody else at a timber machine.
- **The Work Plan's row of a standing job** names the stage the frame stands after, `Pressing, glue
  curing` and `Finishing, lacquer drying`, as the mockup has it: `jobStage` answers the stood stage
  while the job stands, and the engine's own walk of the bar (`currentStage`) is not changed by it.
  The bar counts the night being stood by the open that ends it and not as a whole day, so the
  projected end does not jump back overnight.
- **The glass button's reason** names the piece of the paperwork still to do: the drawing, the site
  measure or the material list.
- **The glass's admin order**: she orders it with the boards (`autoOrderMaterial`) and, for a job
  whose boards came another way or when the money was short, at the next settle (`refreshMaterial`).

## 4. What keeps running on calendar days through a closure, unchanged

An enquiry's expiry and a contract offer's (the board is thin on the first day back), a standing
contract's end day, a let go notice, a machine's six monthly service, the overdraft's interest and
the bank's count of days past the limit (the break's card says so to an account under nought). The
owner's holiday, a man's days off after an accident and an insurance claim's daily payments are
counted on open days and are not used up by a closure.

## 5. What the work found and left

- **A v40 save standing on a closed December day** (21 to 29 December 2025, or 19 to 29 December
  2026) opened that day before the closure existed, so that December's wages, due on the last
  working day before the 22nd, are never charged, and the closed day it stands on has no night
  shift and no paid hours. A job of such a save due on a now closed day is one day late on the first
  day back. Section 4 touches no job of a save; said, not changed.
- **The weekly summary** shows on a Friday; the week of 18 to 21 December 2025 has its Friday closed
  and shows none.
- **A frame press and the used sander are not ducted for a move**: `needsDucting` passes over a
  timber class with no extraction demand, so moving one asks for no pipe; the glue table is storage
  and never was. The spray booth of the sheet department is counted as it always was.
- **The owner can walk onto a standing job** (`jobForTheOwner` has no stop filter) and the engine can
  give free joiners one with nobody on it; the same is true today of a job stopped for want of a
  booth, and the brief writes no new rule for the men of a standing job.
- **`tests/ui/app.test.ts` plays the game in real time** (its seed is the clock and its frames are
  the browser's), and under a heavy load on the machine nine of its tests fail; on a quiet machine
  they pass, every run. Two of this session's full checks met it while a sub-agent was running the
  suite in a scratch copy; nothing of tonight's changes touches it.
- **The sanders of pack 2 are off the contract's projection** and their pro and industrial pairs
  stand 41 to 47 px off their anchors; their port cells are approximate. `REQUESTS-T28.md` asks for
  them again, with the twelve stand ins of the presses and the glue table.
- **The thicknesser still has no stage** (section 8): its card no longer promises one.

## 6. The copyright header

Piotr's rule of 22.09 puts the Skylon Development Ltd header on every new code file; tonight's new
files carry it (`src/engine/closures.ts`, `tests/engine/t28Pelletiser.test.ts`,
`tests/engine/t28Closures.test.ts`, `tests/ui/t28Families.test.ts`, `tests/engine/t28Timber.test.ts`
and the new scenario file). No older file was given it.
