# Report, Turn 28: the timber department, the holidays, and the pelletiser outside

Woodwork Empire, Turn 28. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 28").
Branch `turn-28-timber` off `1624d33`, the tree `origin/main` stands on (v82, STATE_VERSION 40).

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
row reads the stage the bar has moved on to, `Sanding, glue curing`, where the mockup wrote
`Pressing, glue curing`; left so and said. STATE_VERSION 41's lift gives every job of a save
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
