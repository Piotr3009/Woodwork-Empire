# Report: Turn 2

Playability, balance from the owner, and the moving workshop.
Branch `claude/turn-2-playability-fblsuo`, one commit per task, `npm run check` green before each.

## 1. Done

T2-01 Clock. One game minute per real second at 1x (`REAL_SECONDS_PER_DAY_AT_1X = 480`), the loop
audited so no minute is dropped, and a day off with an empty hall jumps straight to the summary.

T2-02 Balance. Every row of the Turn 2 table: rent at 12 per m2, the deposit as one month held,
overdrafts by difficulty, PAY_ARREARS with interest on large arrears, the cheapest machine first,
the software bundle, express uplift as pure profit with one a week, the minus 50 to 100 reputation
scale with its new gates, and pro rata fatigue.

T2-03 Materials as sheets. A sheet is 200 of material value, the rack is shelving bought from the
catalogue (50 or 75 sheets), every delivery lands on it, and the sheets come off it as the job is
made, with the empty rack stopping the bench and the low stock alarm in the morning.

T2-04 Finished goods and transport. A made piece stands at the gate until transport is ordered,
the balance is paid only when the client has it, a courier costs 120 and comes the next working
day, the van costs 90 minutes and goes today, and a fourth piece at the gate slows the hall to 0.7.

T2-05 Emails and bookkeeping. Emails belong to the job now, on the same count curve as the calls,
and the ones nobody answered cost 1% of the price each and a slice of the rating. Skipped books
freeze the Accounting modal at the last day written up, put a "?" in the top bar, and cost 100 a
month on the 1st.

T2-06 Office staff working day. The office admin, the purchasing clerk and the salesman each have
480 minutes of their own and work their tasks off through the same runner as the owner; the clerk
stops at 16 orders, what is not finished waits for tomorrow, and the owner can take any of it on.

T2-07 Extractor and service. A broken extractor slows the hall to 0.25 instead of stopping it, no
extraction at all means no machine runs, and every machine wants a service every 30 days or takes
a 2% chance a working day of giving up until it is repaired.

T2-08 Board as tiles. The order board is a full page modal of tiles, three columns at 1280 px and
four at 1600, each carrying the name, the price, the finish, the deadline, the expiry, the sheets,
the owner days, the tools it needs, and either an Accept button or the reason it is locked.

T2-09 Start production and stations. Every job card carries a Start production button that puts
the owner on the job and takes the player to the hall, and every figure has a station the engine
works out: the bench and machine cycle while producing, the gate, the rack, the office or idle.

T2-10 Moving figures. Each figure is drawn at its station's anchor tile as a translated SVG group
with a 0.8 s CSS transition, and the render loop puts a moved figure back where it was so the
transition actually runs. The tooltip names the machine a figure is standing at.

T2-11 Hall setup. A Set up hall button stops the clock and lets the machines, benches and shelving
be dragged about on the tile grid, with a ghost footprint that goes green or red with the reason.
The layout lives in the state, and a new purchase lands on the first free tile when its own is taken.

T2-12 Audit fixes. The hall and the office draw at one screen pixel per unit with a 48 by 24 tile,
so no label is ever scaled down; the job name is printed once on every row; and there is one plural
helper in the engine that the UI re-exports.

T2-13 Why strings. Twelve real life notes live in engine/constants.ts as WHY, reachable from an "i"
text link on the event modal and on the Accounting rows that have one, with a small popover. The
start screen carries a "Show real-life notes" checkbox, on by default, and the Menu toggles it.

## 2. Not done or partial

## 3. Tests

## 4. How to run

## 5. Deviations from CLAUDE.md

## 6. Duplicate paths

## 7. Line balance

## 8. Open questions for Piotr

## 9. Known risks

## 10. Constants retagged
