# Report, Turn 28: the timber department, the holidays, and the pelletiser outside

Woodwork Empire, Turn 28. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 28").
Branch `turn-28-timber` off `1624d33`, the tree `origin/main` stands on (v82, STATE_VERSION 40).
`APP_VERSION` v82 to v83, `STATE_VERSION` 40 to 41. One writer, serial, no worktrees, one commit a
task, `npm run check` green on its own exit code before each (2,652 tests in 278 files at the end,
none skipped). Under Piotr's amendment of section 3 for this run, read-only sub-agents read the
code, built the mockups, measured the ports, drafted tests, reviewed the diffs and wrote the art
requests; none of them edited `src/` or `tests/`, committed or pushed.

## 0. What Piotr should read first

**Not reached: nothing.** Every task of section 5, T28-A0 to T28-D5, is done, one commit each, in
the order of the brief, with `npm run check` green on its own exit code before each; and one commit
more, `T28-C the review`, made after D2, for what the read-only review of the timber tasks found.
The timber department is open: a company in the 800 m2 hall is offered windows and doors.

**Red: nothing.** The last full check: lint, the build and 2,652 tests in 278 files, none
failing and none skipped (no `it.skip`, `describe.skip`, `.only` or `.todo` in the tree). One test
file, `tests/ui/app.test.ts`, plays the game in real time (its seed is the clock and its frames are
the browser's) and failed nine of its tests in two of this session's checks while a sub-agent ran the
suite beside it; on a quiet machine it passes every time, and nothing of tonight touches it (notes
5).

**What chat decided and you have not confirmed (section 10), with what was built:**

1. *Christmas 22 December to 5 January from December 2025; summer 1 to 14 August from 2026.* Built
   so, in one table (`CLOSURES` in `constants.ts`) and one rule (`closureOf` in `clock.ts`). Told on
   the first working day of December and of July; the card counts every day it stepped over, so
   Christmas 2025 says `14 days closed` and the summer of 2026 `16 days closed` (the weekend before
   it and the one after are in it).
2. *The whole company is closed, the owner with it; his draw is paid on the closure's weekdays.*
   Built so: the draw is charged Monday to Friday whatever the calendar says, and his house keeps
   its tier.
3. *A closed day counts for no deadline.* Built so: every count in working days steps over a
   closure, a deadline, a delivery, a courier, a service return, a new man's first day, the Work
   Plan's columns.
4. *The bank's count and a contract's term run through a closure.* Built so, as through a weekend;
   the break's card tells an overdrawn company that the bank's clock does not stop.
5. *Kit that stands outside asks for no free floor in the hall.* Built so for the pelletiser, the
   two systems and the van.
6. *Timber opens with the 800 m2 hall and is not shown before it; one crew for both departments;
   the oak table stays off; the cutter sets cannot be sold.* Built so. No draw of a 200 or 400 m2
   company's board moved; the machines and the sets are in the catalogue from day one.
7. *Every price, place count, share and delivery day of 2.4 to 2.7.* Built as the brief's tables,
   each asserted.
8. *The cutter sets; the glass at ten working days and 0.35 of the material; the two nights, the
   men of a job that stands left to the player; twelve working days on a timber deadline.* Built so.
   The engine still puts a free owner, or a manager's free joiner, onto a window that is standing,
   as it does onto a sheet job stopped for want of a booth (2.8 makes the stand that stop "in every
   respect"; a reviewer asked for a filter and the check of the brief refused it).
9. *A cross cut saw, a planer, a moulder, a sander, a frame press and a booth to take timber work;
   not the glue table or the thicknesser.* Built so.
10. *The twelve stand in pictures of the presses and the glue table.* In, as chat cut them;
    `docs/art/REQUESTS-T28.md` asks the art side for them again, and for the sanders, whose pro and
    industrial pairs stand off their anchors.

**Found tonight and left for you:**

- **A second cutter set can be bought and does nothing.** One set serves every moulder (2.5); the
  card offers `Buy another` and a set is never sold, so the second is £3,000 to £5,000 lost. A hand
  tool set is held to the cabinet's slots; nothing holds a cutter set, and the brief writes no
  refusal, so none was invented.
- **A save made before tonight late in December** (standing on 21 to 29 December 2025, or 19 to 29
  December 2026) opens on that day: December's wages, due on the last working day before the 22nd,
  are never charged, and a job due on a day now closed is one day late on the first day back (notes
  5).
- **The week of 18 to 21 December 2025 has no weekly summary**: it shows on a Friday, and that Friday
  is closed.
- **The first days back are thin**: the enquiries expired through the break and the board fills only
  as fast as any morning. The same calendar days run for a contract offer, a contract's end, a let go
  notice, a service interval, the overdraft's interest and the bank's count.
- **The pelletiser behind the wall is about a third seen**: the wall's line crosses its picture
  about 42 of its 116 px down (picture 01), much as chat's arithmetic said; nothing is done about it.
- **The pelletiser stays on the floor of a lifted save only with no length of wall left**: in the 200
  m2 unit with four systems already behind it, in the larger ones with nine.
- **The strip shows one line**: in December a company with cash to tax reads the tax's line, and is
  told of the closure by the cards (the brief's own reading).

## The tasks

**T28-A0 The suite settled on v82.** On main as it stands `npm run check` is green on its own exit
code: lint, the build and 2,557 tests in 273 files, none failing and none skipped, so v82 moved no
figure a test pins, no scenario is closed by the bank and no fault was found; nothing was changed.

**T28-A1 Housekeeping and v83.** `docs/turn-27-brief.md` was already in `docs/` and `CLAUDE.md` is
this turn's brief (first line "Turn 28"), so nothing was moved; the README names the Turn 27 brief,
`REPORT-T28.md` and `docs/art/REQUESTS-T28.md`. `APP_VERSION` goes v82 to v83 with the two tests
that name it flipped (`version.test.ts`, `saveCheck.test.ts`); `STATE_VERSION` is B1's.

**T28-A2 The mockups.** `docs/mockups/t28/` with its README, five pages built by a sub-agent that
touched nothing else: the game's own markup made by its own functions (`renderEvent`,
`renderWarningStrip`, `renderBoard`, `renderCatalogue`, `renderWorkPlan`, the job card's lines),
in its own classes, with tonight's change written in, each beside its nearest existing screen: the
break's two cards beside `Tax is coming` and the strip with `closureComing`; the timber tile live,
locked and greyed; the job card's glass in its three states with `Order glass`; the Timber machines
and Sanding tabs with the planer's folder open and a cutter set's card; the Work Plan's rows
`glue curing` and `waiting for glass`.

**T28-B1 The pelletiser behind the wall, STATE_VERSION 41.** `STARTING_LAYOUT.pelletiser` has
`yard: true, rear: true` [PIOTR, 05.10], and everything the systems have behind the wall follows by
the code that was there: its place (`rearYardPlaceFor`, a metre further back than a system's, its
zone being 3 by 3), the refusal `No room behind the hall`, no cell of the floor, no walking,
dragging or turning, and the clip at the wall; it is in neither `DUCT_SYSTEMS` nor
`CENTRAL_EXTRACTION_SPECS`. `canBuy` no longer asks free floor of anything `standsOutside` is
true of (the pelletiser, the two systems and the van) [TUNE: chat]. `STATE_VERSION` 41:
`liftToVersion41` marks the saves, and `standThePlantBehindTheWall` takes an `only` filter so its
second gate (`version < 41`, after the `< 38` one) moves the pelletiser alone, on the floor or on
order, writing the anchor and booking no moving time (a drag of it not yet confirmed is
forgotten); a system an older lift left on the apron is not tried again, and on the `< 38` path
the pelletiser goes after the systems, so it never takes a system's place. It stays on the floor
when the wall has no length left: in a 200 m² unit with four systems already behind the wall, and
in the 400 and 800 m² units only with nine. A pelletiser turned on the floor keeps its turn
behind the wall, where nothing can turn it back. It breathes behind the wall in
`machineFx.test.ts` as it did at 14, 7; SPRITES.md section 6 and the first batch test say
2 × 2 × 2.5 and 192 × 216, and the whole catalogue stands 18 things on the floor and not 19.

**T28-B2 The company's holidays.** `closureOf(day)` in `clock.ts` is the one rule: Christmas from
22 December to 5 January from December 2025, and 1 to 14 August from 2026 [PIOTR: the fortnights
and the years; TUNE: chat: the 22nd and the first fortnight], off `CLOSURES` in constants;
`isWorkingDay` is false on a closed day, so the day loop steps over a closure as over a weekend and
runs its bills, and every deadline, delivery, courier, return from service and first day of a new
man steps over it. Done on top of that: the owner's draw on every weekday (`isWeekday`), closed or
open, so his house keeps its tier; `workingDayIndex` and `dayOfWorkingIndex` count the days
`isWorkingDay` is true of (a kept count, so the Work Plan pays nothing per call); the first day
back has its own card, `closureOver` (`Back from the Christmas break`, `14 days closed ... £X
out.`, `Back to work`), in place of the Weekend card and after the tax's, its money everything that
left the account on the stepped over days but the tax; the overtime debt is cleared on it
(`closureBefore`); and `Tax is coming` says `The workshop is closed from 22 December, so the last
day to spend is Thu 21 December.` before `Invest, or pay.`. The card before, `closureComing`
(`Christmas break`, every date computed, the overdrawn sentence under nought), is raised after the
tax's on the first working day of December and of July from 2026, once (`state.closureWarnedFor`,
null in a v40 save, so a save loaded in the window is told on its next open), and the strip's
`closureComing` line, `Closed from 22 December: 9 working days left` [TUNE: `1 working day left`
on the last], stands directly under `taxComing`. The Team page's line on the draw says `paid Monday
to Friday` and not `paid every working day`, which a closure made untrue. Re-dated honestly, to the
last working day before the break and the first day back: `tax.test.ts` (the quarter is now of
what the eight closed days before the 30th leave, read off the ledger), `taxCards.test.ts` and the
(uu) scenario (15 working days with the strip's line and not 21); the test of a working 30
December is flipped to say every 30th is closed, and the order pins of `warnings.test.ts` and
`tax.test.ts` take `closureComing`. 22 new tests in `tests/engine/t28Closures.test.ts`, drafted by
a sub-agent against the API and checked here.

After the review (one commit more, `T28-B2 the review`): the first day back's money is read off each
stepped over day's own books (`finance.day`, its costs and not its income, the tax taken out) and
not off the ledger, which keeps its last 2,000 lines only and so lost the tax from the sum once a
company's books were full; the axis returns a point that is no day (`Infinity`, a projection that
never ends) as it is instead of counting to it; and a closure over two months knows which of them
begins it. Six more tests: a full ledger, the courier, a machine's return from its service, a new
man's first day, the client's calls, and the loan and the security on the closed 1st. What runs on
calendar days through a closure, on purpose and unchanged [TUNE: chat], one line each:
- an enquiry's expiry and a contract offer's: the board is empty on the first day back and fills
  only as fast as it does on any morning, so the first days back are thin;
- a standing contract's end day: its term is not made longer;
- a let go notice: the man leaves on his day, closed or not;
- a machine's service interval: six months on the calendar;
- the overdraft's interest and the bank's count of days past the limit: a company far past its
  limit on the last working day can be closed during the break, which its break card says to an
  account under nought.
What is counted on open days, unchanged: the owner's own holiday and a man's days off after an
accident, so a closure does not use them up, and an insurance claim's daily payments. Edge cases
left as they are and said here: a v40 save standing on a December day from the 22nd to the 29th
(2025) opened that day before the closure existed, so that December's wages, due on the 21st, are
never charged, and the closed day it stands on has no night shift and no paid hours; a job of such
a save due on a day now closed is one day late on the first day back; a player on the weekly
summary gets none for the week of 18 to 21 December 2025, whose Friday is closed.

**T28-C1 The pictures in.** The 42 files of `docs/art/incoming/t28/` are `git mv`ed into
`public/sprites/` as they came [PIOTR, 05.10]: no pixel of them was touched. The manifest is 258
sprites and not 216, and the two counts of turned pictures read 96 and not 75 (`rotate.test.ts`,
`spriteClasses.test.ts`). `docs/art/SPRITES.md` section 12 carries their table (file, metres, file
size, anchor, pack) and says what they are: pack 1 rendered to the contract, the sanders as
delivered and off the contract's projection, the presses and the glue table chat's stand ins. Its
section 2 now says the anchor is at `8 + w × 48` (and `8 + d × 48` in a `.r` file), as the code has
had it since 14.09; sections 5 and 7 still describe the bottom centre and are left for the art
side's next brief. The incoming folder and its JSON are gone.

**T28-C2 The five families.** `crossCut` (Cross cut saw), `planer` (Four sided planer),
`framePress` (Frame press) and `glueTable` (Glue table) in the Timber machines tab, and `sander`
(Sander) in the Sanding tab that was empty, each defined as the thicknesser is: a variant table of
five classes for the four ladders (the art side's metres, the zone a metre more each way, the
prices of 2.4 as written, power and endurance on the thicknesser's ladder, the planer's power its
own, one sentence a class from the picture), its row in `VARIANTS_BY_FAMILY`,
`DELIVERY_DAYS_BY_CLASS`, `MACHINE_CAPACITY`, `EXTRACTION_DEMAND`, `AIR_DEMAND`,
`DUST_OUTPUT_M3_PER_HOUR`, `MACHINE_ENDURANCE_HOURS`, `CLASS_LADDER_FAMILIES`, `HEAVY_SPECS` (the
planer whole, the other three from standard up, their used and budget in `LIGHT_CLASSES`),
`MACHINE_SHORT_WORDS` (`machinesWord` says `presses`), `STATION_TABLE` (the front, as the moulder)
and 28 lines of `PORTS`, measured off the pictures by a sub-agent the way v56 measured the CNC's
[TUNE until Piotr confirms them]. The glue table is storage, one class, 3 by 1 in a 3 by 2 zone
[TUNE: the metre on the long side], and adds `GLUE_TABLE_PLACES` 2 to one frame press a table by
the drying racks' line of `placesAt`, refused past the presses with `Every frame press has its glue
table`. The thicknesser's card loses `and its own stage comes with the timber branch`. Until a
timber job exists (C5) no man is drawn at the four new families, so a hall with them draws its men
as v82 did. The Sprite check page now looks for a one class family's class file, so the glue
table's row (and the air dryer's, the pelletiser's, the systems', the desk's, the chair's, the
laptop's, the locker's and the high rack's, whose pictures were always there) shows its picture and
not `no file`. Flipped: the Sanding tab's `Nothing here yet.`, the Timber machines folders, the
measured class files 75 to 96, the ports 23 to 37 and 56 to 84, the catalogue's metres list, and
the whole catalogue on the floor 18 to 23.

**T28-C3 The cutter sets.** `cuttersSash` (Sash window cutter set, £4,000), `cuttersCasement`
(Casement window cutter set, £3,000) and `cuttersDoor` (Door cutter set, £5,000), five days each, in
the Timber machines tab with folders of their own, category `tools`, one class, no zone [TUNE: chat:
the idea is Piotr's "ok", every figure chat's]. Kept as a hand tool set is kept and asking for no
cabinet or slot, their card says `Kept at the spindle moulders` where a hand tool says `Kept in a
tool cabinet`, and they are never sold (`Nobody buys second hand fittings`, as any tool). No
picture exists: the card shows the empty picture box, and the Sprite check page lists the three,
`kept at the spindle moulders`, `no file yet`, so the art side has its rows (`REQUESTS-T28.md`).

**T28-C4 The five products and their deadline.** `casementWindows`, `sashWindows`, `frenchDoors`,
`patioDoors` and `bifoldDoors` at the prices, standings and weights of 2.6 [PIOTR: the five and that
they pay better; TUNE: chat: every figure], solid wood, lacquer alone, measured, never by hand,
`calls` 4 as the kitchens of nearest price, and a new field `cutters` (null on the nine the game
had). `requiredEquipment` is `TIMBER_EQUIPMENT` (the cross cut saw, the planer, the spindle
moulder, the sander, the frame press and the booth); `missingEquipment` counts the cutters, and the
oak table's branch (`SOLID_WOOD_EQUIPMENT`, the thicknesser) is passed over for a template with
cutters in `lockReasonFor` and `kitBlockFor`, so the reasons come in the brief's order: the
reputation, the booth, the machines by name with the cutters among them (`no sash window cutter
set`, the catalogue's link), then the hands. A live tile without its set is locked `Needs sash
window cutter set` [TUNE: the words, the generic lock's]. The deadline is `enquiryDeadlineDays`:
`deadlineDaysFrom` with its express factor, and `TIMBER_LEAD_DAYS` 12 on top [TUNE: chat];
`blockFor` holds the hands against the days without it. A window's material is never bespoke (the
draw is kept, so the stream keeps its shape) and the agency never draws one of the five. Timber
stays off the board (`TIMBER_ON_THE_BOARD` false) until C8; until C5 a timber enquiry's owner days
are the oak table's plan. The test of the catalogue opening by 20 says 5 fewer and all of it by 35.

**T28-C5 A timber job's stages.** A job of one of the five carries `timber: true` (set in
`takeEnquiry` off the template's cutters; absent, so false, on every other job and in every save,
the oak table's of the day 149 fixture among them), and so does the `StagedJob` an enquiry's owner
days and its hands against the deadline are read from (`stagedJob`, `ownerDaysFor`, `blockFor`,
the tile). Its plan is `TIMBER_STAGES`, four new `StageId`s and the two the game has: Cross cutting
0.08 at the cross cut saw, Planing 0.12 at the planer, Moulding 0.25 at the spindle moulder,
Pressing 0.15 at the frame press, Sanding 0.12 at the sander, Finishing 0.13 at the booth, and the
benches' stage labelled `Glazing` (`glazing` over a man) [TUNE: chat: every share]; a sheet job's
plan and the oak table's are what they were. `stageDone` lists the four new ids, they go by hand at
the cutting's rate with their machines gone, and a window is never on the CNC (it never was:
`jobOnCnc` takes sheet work only). `stageLabel` takes the job, so the person card says `glazing`; the
Company page's line says it through `stageDoing`. A man on a timber job is drawn only at the
families of his own plan; every other man is drawn over the spots that are not the four new
families, which is v82's drawing in a hall with no timber job.

**T28-C6 The two nights.** When a timber job's bar fills its Pressing, and again its Finishing, the
job stands until the next working day opens (`job.curing`: `glue curing` or `lacquer drying` and
the day whose open ends it, set in `addLabour` the minute the stage fills and cleared by
`endTheStands` at the open) [PIOTR: "a bit more complicated"; TUNE: chat: the rule]. While it
stands `hallStops` gives its reason, so it is a stop like the one for want of a booth in every
respect: its minutes are `hallStopped`, `blockedBy` carries the reason to the job card and the Work
Plan's row, its men stay on it with no bubble and are not moved by the engine, no `No material`
card is raised, and the night shift does nothing to it either. A weekend or a closure in between
adds nothing (`nextWorkingDay`). The Work Plan counts a working day on the bar and in the latest
start for each night not yet stood (`nightsLeft`), and leaves them out of the minutes lost. A
sheet job never stands, lacquered or not; the drying racks and the wet air do what they did. The
row reads the stage the frame stands after, `Pressing, glue curing`, as the mockup has it (set
right by the review of the timber tasks, below). STATE_VERSION 41's lift gives every job of a save
`curing: null`.

**T28-C7 The glass.** A timber job carries its glass (`job.glass`: `none` on every other job, the
oak table's among them, then `toOrder`, `ordered`, `in`, and `job.glassDay`), and its material is
`GLASS_SHARE` 0.35 glass and ironmongery and the rest boards (`glassCostOf`, `boardsCostOf`, to the
penny), the boards ordered, delivered, racked and drawn as the oak table's are (`sheets` is
`sheetsForCost` of the boards) [TUNE: chat: the rule and the figures]. The glass can be ordered
once the paperwork is done (`orderGlassCheck`: `The drawing is not finished`, `Not enough cash`,
`Ordered already`): by the office admin the moment she orders the boards (`autoOrderMaterial`,
and `refreshMaterial` for one whose boards came another way), or by the owner's `Order glass,
£X` beside `Order for this job`, a click of the same kind and no minutes of his day
(`ORDER_GLASS`). It is paid in full at the click, one line under `material`, `Glass for <job>`
(`, ordered by Sue` when the admin did), through the overdraft as the boards are, and is in at the
open of the tenth working day after (`GLASS_DELIVERY_WORKING_DAYS`, `arriveGlass`): no lorry, no
unloading, no rack, no card. The card says `Glass not ordered` in red, `Glass ordered, here on Thu
12 March`, then `Glass is in` in green. Production starts without it; at the Glazing with the glass
not in, `hallStops` says `waiting for glass`, a stop of the same kind as the nights. A job dropped
after its glass was ordered writes it off (`Glass written off`), its boards as before, and the drop
card adds the two. The strip's `glassNotOrdered`, `Glass not ordered: Sash windows`, stands
directly under `drawingDone` [TUNE]. STATE_VERSION 41's lift gives every job `glass: 'none'`.

**T28-C8 The opening.** `TIMBER_ON_THE_BOARD` is gone; `timberOnTheBoard(state)` asks whether the
second extension is open, and `offeredOnTheBoard(state, entry)` offers all the sheet work, and the
five windows and doors once it is, never the oak table [PIOTR, 04.10: era 3; TUNE: chat: the oak
table]. Before the 800 m2 hall the five are nowhere on the board, neither drawn into the band nor
among what a greyed tile is drawn from, so the templates a 200 or 400 m2 company is offered are
exactly the ones it was offered before tonight and no draw of its seeded stream moves; in the 800
m2 hall they are templates like any other, live or greyed. Asserted: no window on the board of the
small and the middle hall in 300 draws and 120 greyed tiles, and the offered list equal to the
sheet templates; the big hall with its kit and its cutters is offered windows and doors, unlocked,
never bespoke, with the lead on the deadline; without the sash cutters a live sash tile is locked
`Needs sash window cutter set`; greyed tiles say `no cross cut saw, four sided planer` (`, door
cutter set` for a door) and `needs a spray booth`; and the agency never draws one of the five in
300 throws. A live tile shows only on the template site or better: the do it yourself website takes
a tier off the standing, and the five weigh nought below the top tier, as the lacquered and the
handleless kitchens do.

**T28-D1 Notes and the art requests.** `docs/notes-t28.md`: the calendar of the closures, where
the rule lives and why, every reading of the brief chat or this session made, what runs on
calendar days through a closure, and what the work found and left (a v40 save standing on a closed
December day, the weekly summary of a week whose Friday is closed, the ducted frame press, the
owner on a standing job, the real-time UI test that fails under load, the sanders off the
projection). `docs/art/REQUESTS-T28.md`, written by a sub-agent off the pictures in
`public/sprites/`: the twelve frame press and glue table files again, with each one's canvas, anchor
and what is wrong with the stand ins; the sanders again when there is time; the three cutter sets
at the hand tool set's 112 by 112; and, for Piotr to decide and not to be drawn yet, a pack of
timber at the gate, a trolley of machined parts, a rack of frames drying and a stillage of finished
windows.

**T28-D2 Scenarios.** `tests/scenarios/turn28.test.ts`, two new scenarios. (vv): a company in the
800 m2 hall with the five families, a spindle moulder, a booth and the sash cutters, no admin,
takes a sash window job on day 3 (14,710, due day 87 with the twelve days of lead); the strip
says `Glass not ordered: Sash windows` once the paperwork is done and the owner orders it on day
5 (in on day 19, ten working days on); the job stands one night for the glue (day 23) and one for
the lacquer (day 33), is finished on day 39 and paid on day 40, nought days late. Its second run
leaves the glass until the Glazing: the job stops `waiting for glass`, ten working days, and is
then glazed and paid. (ww): played from Tuesday 28 November 2025 to Monday 9 January 2026, the
break's card comes on Friday 1 December after the tax's, every working day to the 21st is worked,
December's wages go out on Thursday the 21st, the closed days are not opened and book their rent,
their rates, the draw on the weekdays and the tax on the 30th, and Friday 6 January opens with the
tax's card and then `Back from the Christmas break`, `14 days closed`, and no `Weekend` card;
August 2025 is worked with no card; the summer of 2026 is told on Friday 1 July, wages on Friday
29 July, closed from Saturday 1 to Sunday 15 August, `16 days closed` on Monday 16 August. The
late run found one fault and it is fixed in the engine: a window whose glass came while nobody was
on it kept `waiting for glass` as its reason; `arriveGlass` now clears it (the reason's words
moved to `constants.ts` so that `materials.ts` can name them). No figure of any other scenario
moved in this task; the only scenario figures moved this turn are B2's re-dating of
`tests/scenarios/turn27.test.ts`.

**T28-C the review.** Four read-only reviewers went over C2 to C8 against the brief and section
7, and a fifth checked the one finding they rated medium. That one is refuted and left: the engine
gives a free owner, or a manager's free joiner, a timber job that is standing, as it gives them a
sheet job stopped for want of a booth; 2.8 makes the stand a booth stop "in every respect" and
writes no new rule for the men, and `jobForTheOwner` and `jobsInManagerOrder` are main's. Fixed,
each with its test: the Work Plan's row and the job card's step name the stage the frame stands
after (`Pressing, glue curing`, `Finishing, lacquer drying`, `Production: Pressing`), as the mockup
has it (`jobStage` answers the stood stage while it stands; the engine's own walk of the bar is
`currentStage` and unchanged); the bar counts the night being stood by the open that ends it and
not as a whole day, so its end no longer jumps back by most of a day overnight and no false
`deadlineAtRisk` line stands on the strip the evening of a stand; the `Order glass` button names the
piece of the paperwork still to do (`The drawing is not finished`, `The site measure is not done`,
`The material list is not made`); a timber tile's sheets line counts the boards only, the figure
the job will hold, and its `Needs` line ends with the cutter set (the mockup's page written again
and shot again to say so); a frame press and the used sander, which pull on no extraction, ask for
no pipe when moved (the sheet department's booth is counted as it was); a window whose glass came
while nobody was on it no longer keeps `waiting for glass` (D2); the drawn places work a timber
job's plan out once a job and not once a man. The oak table's no night and no glass, and the
bubble a standing job's man does not wear, are asserted now.

**T28-D3 Cross check.** Section 7, claim by claim: a read-only sub-agent mapped all 47 claims to the
expect() that pins each and found none missing and six only partly pinned; the eight tests it
drafted are in the tree now, each run first on a scratch copy. The break's card once for Christmas
2026 and the summer of 2027 and its back card once (`t28Closures`); the reputation before the booth
and the kit before the hands, each with both conditions true at once; the seeded board of the 200
and the 400 m2 hall and a sheet job's plan, labels and speeds pinned against figures recorded on main
at v82 (identical: the sub-agent compared the two trees directly too, 150 live draws, 60 greyed and
20 played days of each hall, and 30 stage plans); the `ORDER_GLASS` action refused before the
paperwork; the agency's never a window, now also asserting the tier where the five are weighted
above nought and that it drew something (flipped in place, the weaker test gone); the 42 pictures
on disk and in the manifest with `docs/art/incoming/` gone, and the men of a hall with no timber job
drawn as v82 drew them (`t28Families`). One comment set right (`tax.test.ts`: 6 January 2027 is a
Monday). No `it.skip`, `describe.skip`, `.only` or `.todo` anywhere in `tests/` or `src/`;
`git diff main --stat -- src/ui/styles.css` is empty; `APP_VERSION` 'v83', `STATE_VERSION` 41,
`OLDEST_SAVE_VERSION` 12.

**T28-D4 Look and shoot.** Thirteen pictures in `docs/report-t28/`, every one drawn by the game's own
renderer and UI functions (`renderHall`, `renderEvent` and `renderEventFooter` through `syncModals`,
`renderTopbar`, `renderWarningStrip`, `renderCatalogue`, `renderBoard`, `renderWorkPlan`,
`renderSpriteCheck`) from states the engine played or the tests' own helpers set up, in the game's
stylesheet, and shot in headless Chromium; nothing in the markup is written by hand. The holidays are
the (ww) company played by the careful script; the window is the (vv) company with four joiners and
the glue table, played until it was paid, the owner's one click putting his crew on it; the tiles are
drawn by `generateEnquiry` and `generateUnreachable` off halls short of what each reason names. The
pages were served by a static server inside the shooting script, which stops it before it exits, and
the pages themselves were deleted once shot.

**T28-D5 Report and PR.** This file, section 0 first, and the pull request titled `Turn 28: the
timber department, the holidays, and the pelletiser outside`, against main and not merged. Nothing
was left running: the checks, the scenario runs, the review and the audit ran to their ends, the
shooting script stopped its own server, and no watcher or server is up.

## The pictures

The third column is the nearest existing picture of the same screen; what each pair differs by is
what this turn did to it.

| picture | what it shows | beside |
| --- | --- | --- |
| `01-the-pelletiser-behind-the-wall.png` | a day one hall with the flexi and a pelletiser bought today: the pelletiser stands behind the rear wall beside the flexi and takes no cell of the floor. The wall hides about two thirds of it: its picture is 116 px high and the wall's clip line crosses it about 42 px down at its middle, so the top of the hopper is what is seen (2.1 asked for this measure; nothing is done about it) | `report-t26/01-day53-one-minute.png`: a hall of the same skin; there is no picture of the pelletiser on the floor in the tree |
| `02-the-christmas-break-card-in-december.png` | Friday 1 December 2025, the first two cards of the morning: `Tax is coming` with its new sentence (`The workshop is closed from 22 December, so the last day to spend is Thu 21 December.`), then `Christmas break` | `report-t27/02-the-tax-is-coming-card.png`: the tax's card without the sentence; `docs/mockups/t28/closure-cards.png` |
| `03-the-strip-line-in-july.png` | Tuesday 19 July 2026: the strip's one line, `Closed from 1 August: 9 working days left`, under the top bar | `report-t27/03-the-strip-line-in-december.png`: the tax's line in the same place; `docs/mockups/t28/closure-cards.png` |
| `04-the-first-day-back.png` | Friday 6 January 2026: `Tax for 2025` (booked on the closed 30 December), then `Back from the Christmas break`, `14 days closed. Rent, rates and the bills ran anyway: £3,698 out.`, `Back to work`, and no `Weekend` card | `report-t27/04-the-card-after-30-december.png`; `docs/mockups/t28/closure-cards.png` |
| `05-the-timber-machines-tab.png` | the Timber machines tab of a company in the 800 m2 hall: the thicknesser (its line without the stage it was promised) and the moulder, then cross cut saws, four sided planers, frame presses, glue tables and the three cutter sets | `docs/mockups/t28/timber-catalogue.png`: today's two folders beside the nine |
| `06-the-planer-folder.png` | the planer's folder open on its five classes, the art side's pictures as they came, each card with its men at once, extraction, life, price, delivery, power, metres and the brief's sentence | `report-t27/06-the-cnc-folder-at-90000-and-144000.png`: a folder of five classes; `docs/mockups/t28/timber-catalogue.png` |
| `07-the-sanding-tab.png` | the Sanding tab, empty until tonight, with its one folder, Sanders from £400 | `docs/mockups/t28/timber-catalogue.png` (today's empty tab) |
| `08-a-cutter-set-card.png` | the sash window cutter set's card before and after it is bought: £4,000, five working days, `Kept at the spindle moulders`, and the empty picture box the catalogue shows for a file that is not there yet | `docs/mockups/t28/timber-catalogue.png`: the hand tool set it is kept like |
| `09-timber-tiles-live-locked-and-greyed.png` | a sash window tile live with its Accept; the same tile locked `Needs sash window cutter set` in a hall without the set; four greyed tiles, one for each reason in `kitBlockFor`'s order: `reputation too low (needs 30)`, `needs a spray booth`, `no cross cut saw, four sided planer`, `no door cutter set` | `docs/mockups/t28/timber-tiles.png`; `report-t26/10-big-job-red-and-green.png` |
| `10-a-timber-job-card-and-its-glass.png` | the sash window's row of the Work Plan, its head the job card: Friday 5 March with the strip's `Glass not ordered: Sash windows`, the red `Glass not ordered` and `Order glass, £1,960` beside `Order for this job`; the same morning after the owner's click, `Glass ordered, here on Fri 19 March`; and Friday 19 March, `Glass is in` | `docs/mockups/t28/glass-job-card.png` |
| `11-the-work-plan-glue-curing.png` | Wednesday 17 March: the frame has filled its Pressing, the row says `Pressing, glue curing` and the step `Production: Pressing`, its five men left on it | `docs/mockups/t28/work-plan-stops.png` |
| `12-the-800-m2-hall-with-the-timber-machines.png` | the 800 m2 hall on Monday 8 March at 09:35 with one of each new machine standing at its standard class and the glue table by the press: the owner at the cross cut saw, Tom at the planer, Ben at the moulder, Sam at the sander, Joe at the frame press. Each machine of the plan wears the `too few places` mark: five men on one window are more than one standard machine of each family holds, which is 2.4's rule and the reason to buy a second | `report-t25/01-four-men-and-one-used-saw.png`: the same mark on the sheet side |
| `13-the-sprite-check-rows.png` | the Sprite check page's 24 rows of the five families and the three cutter sets: a file, a footprint and no red port line for every class, `no file yet` for the three sets | `report-t22/10-the-sprite-check-page.png` |

## The state: STATE_VERSION 41

Lifted once, in B1. What a save carries from tonight, and where:

- `GameState.closureWarnedFor` (`types.ts`, B2): the first day of the closure the break's card was
  raised for, or null. The lift writes null, so a save loaded between a card's day and its closure
  is told on its next open.
- `Job.curing` (`types.ts`, C6): `{ reason, untilDay }` while a window stands for its glue or its
  lacquer, else null. The lift writes null on every job.
- `Job.glass` and `Job.glassDay` (`types.ts`, C7): `none`, `toOrder`, `ordered` or `in`, and the day
  it arrives. The lift writes `none` and null on every job.
- `Job.timber` and `StagedJob.timber` (C5): optional, absent meaning false, so no save needs it.
- The pelletiser's anchor (B1): a pelletiser on the floor or on order is stood behind the wall by
  `standThePlantBehindTheWall`, its second gate `version < 41`; no moving time is booked.

Nothing else of a save is touched: no machine, man, price or job. Every save that loaded on v82
loads (`OLDEST_SAVE_VERSION` 12), the fixtures in `tests/fixtures` among them. New kinds that are not
state: the event kinds `closureComing` and `closureOver`, the action `ORDER_GLASS`, the warning keys
`closureComing` and `glassNotOrdered`, the template field `cutters`.

## What was not done tonight

- Section 8's parked list, untouched: the spindle moulder's three men (its places stay 2, 4, 4, 6,
  8); the thicknesser's place in the timber department; frames drying on floor or racks, the grade
  of the timber and its waste, remedial visits; the products drawn on the hall (asked of the art
  side in `REQUESTS-T28.md`, for you to decide first); timber standing contracts and timber big
  jobs; the five axis CNC, the spraying robot and the line; the bank's count and a contract's term
  through a closure; the owner's forced holidays, accidents, the crisis; your open questions after
  v82 (the security firm at 800 m2, the waste collection, the second extension's card shown early)
  and the logo; Turn 27's account at nought, the one off licence that runs out with no card, and
  the first month's wage of a man hired late.
- Section 6 kept: no sheet template, stage, share, place, pace, price or power moved; nothing of the
  wages, the owner's base, the courier, the loan, the overdraft, the reputation, the contracts, the
  agency's big jobs, the security, the insurance or the waste; the tax gained one sentence and
  nothing else; no picture drawn, trimmed or scaled, no sound, no new screen, modal kind, tab kind
  or CSS token (`git diff main --stat -- src/ui/styles.css` is empty), nothing of `public/brand/`.
- The pictures the art side owes: the twelve frame press and glue table files again, the sanders
  again, the three cutter sets (`docs/art/REQUESTS-T28.md`).
