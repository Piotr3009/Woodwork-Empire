# Turn 28: the timber department, the holidays, and the pelletiser outside

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one agent, serial, effort high).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 05.10.2026 from Piotr's
words of 04.10 and of that night, against main at v82.

Read this whole file (first line must say "Turn 28"; if the root CLAUDE.md does not, stop and
report), then REPORT-T27.md section 0 and its "what was not done", then docs/ui-style.md, then the
archived briefs in docs/ (docs/turn-27-brief.md is the last). Where files disagree, this one wins.
All standing rules apply (no em or en dashes anywhere, scope 1:1, one code path, constants never
in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill background processes, PR
without merge, end the session, no PR watching, npm run check gated on its own exit code, every
click single, one APP_VERSION bump, delete the old track and never write a parallel one, flip a
test and never keep it beside a new one). The rule relaxed in Turn 26 stays relaxed [PIOTR,
01.10]: a scenario figure that moves is restated with ONE line of reason; a test that pins an
exact pound of a played month may be loosened to a range when the exact figure says nothing about
the rule under test, and the comment says so.

Before a line is written: clone, read what is there, and build with it. Every screen, card, tile,
tab, chip, modal and strip line this turn needs already has its kind in the repo (the catalogue's
folders and class cards, the board's tiles and their greyed reasons, the job card's lines, the
event modal, the warning strip, the Work Plan's reasons). Nothing here asks for a second version
of any of them, and none is to be written [PIOTR, 18.09: one game, one look].

Precondition. main carries Turn 27 merged and the chat fix v82: APP_VERSION 'v82', STATE_VERSION
40. If APP_VERSION is not 'v82', stop and report. v82 went onto main with `tsc`, lint, the build
and about sixty of the test files run, and never the whole suite: task A0 below runs it and
settles it before anything else is touched. What v82 changed is in section 2.0.

Nothing runs beside this session. No file is fenced off.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside. The mockups this turn needs are in section 9, into docs/mockups/t28/ before the code
that makes them true. Piotr asked for this turn in one night and has not seen those mockups: they
are built only of what the game already draws, and the report shows each beside its nearest
existing screen so he can judge them in the morning.

**What chat decided for Piotr and he has not yet confirmed** is marked [TUNE: chat] throughout
and gathered in section 10, so the report can repeat it in one place. His own words are [PIOTR].

## 0. What this turn is for (PIOTR, 04.10 and 05.10)

Piotr's company has a hall of 800 m² since v82, half of it empty, and more money than things to
spend it on. On 04.10 he wrote the next era himself: a timber department that makes windows and
doors beside the sheet work, with machines "much dearer" and work that pays better. On the night
of 05.10 the first two packs of its machines came from the art side and he said: "you have the
graphics, so go; we are going to expand", and "put the graphics in as you have them and we will
refine them later".

Three things, then.

**The pelletiser goes outside.** "The pelletiser is to go where the flexi is, outside the
building."

**The company has holidays.** "After a year we add holidays: two weeks around Christmas, to
5 January (the costs run, only the people do not work), and two weeks in the summer, but that
only in the second year."

**The timber department.** Sash and casement windows, french, patio and bifold doors, made on
cross cut saws, four sided planers, the spindle moulders the game has, frame presses, sanders and
the spray booths the game has. And his other sentence of that night: "think how to make it a bit
more complicated now, so that it is not so easy." Three things make timber harder than sheet,
all of them true of a real joinery: a set of cutters for each kind of product, the glass that is
ordered from outside and takes two weeks, and two nights a job stands still while the glue and
the lacquer dry.

What this turn is not: the five axis CNC, the spraying robot and the production line (era 4; no
picture of them exists yet), a product drawn on the hall (no picture exists), and anything of
the sheet department, which works beside the timber exactly as it does today [PIOTR, 04.10].

## 1. Rules restated (short)

Everything from Turns 1 to 27 and the chat fixes to v82. Tonight in addition:

- APP_VERSION = 'v83'. STATE_VERSION 41, once (section 4); every save that loads today loads
  (`OLDEST_SAVE_VERSION` is 12), the fixtures in tests/fixtures among them.
- **The sheet department is not touched** [PIOTR]. No sheet template, stage share, price, place
  count or pace of an existing family moves.
- **A closed day is a day nobody works and every bill is paid** [PIOTR].
- **Timber work is offered only to a company in the 800 m² hall** [PIOTR, 04.10: era 3].
- **The art side's pictures go in as they are** [PIOTR, 05.10]. No agent draws, repaints, trims
  or scales a picture.

## 2. Changes to the design (the contract)

### 2.0 What the chat fix v82 changed (for A0's reasons)

- The second extension: `UNIT_SECOND_EXTENSION_PRICE` 1,000,000, `secondExtensionOf(unit)`,
  `UnitState.secondExtension?` (optional, so STATE_VERSION stayed 40), `EXTEND_UNIT { stage? }`,
  the Premises card `extendSecond`. The hall becomes 40 by 20 cells the morning after.
- `M2_PER_PERSON` 25 and not 24, so the crew is 8, 16 and 32. `CANTEEN_LOCKERS_DEEP` 32, and the
  canteen room shows sixteen plates a page (`canteenPages`, `ui.canteenPage`).
- `unitCostFactor(unit)`: rent, rates, the hall's fixed power and the security firm follow the
  area; both insurance covers and the flat security level are doubled at 800 m².
- `hallBackgroundDeep.png`, `HALL_CANVAS_DEEP`, `hallLayersOf(unit)`.
- Its own tests sit at the end of `tests/engine/v67.test.ts` and `tests/ui/v67.test.ts`.

### A. The suite

**2.0.1 A0.** Run `npm run check` on main as it stands. Every failing test is one of three
things, exactly as in Turn 27's A0: a figure v82 moved (re-pin it, one line of reason); a
scenario the bank now closes (the smallest change in the scenario's own policy, never in the
engine); a real fault (fix it if the fix is plainly what v82 meant, otherwise leave it red, stop
that thread and put it first in section 0 of the report). Nothing of the engine is touched in A0
beyond that. One commit.

### B. Two small things

**2.1 The pelletiser stands behind the rear wall [PIOTR, 05.10].** `STARTING_LAYOUT.pelletiser`
gets `yard: true, rear: true`, and everything the two central systems have behind the wall
follows by the code that is already there: the place (`rearYardPlaceFor`), the refusal `No room
behind the hall`, no cell of the floor, no walking, no dragging, no turning, the clip at the
wall. It is not added to `DUCT_SYSTEMS` or `CENTRAL_EXTRACTION_SPECS`, which mean something else.

- A pelletiser that stands on the hall floor in a save, or is on order for it, moves behind the
  wall when the save is lifted to 41, by `standThePlantBehindTheWall`, whose call is gated on
  `version < 38` today and gets a second gate. It writes the anchor and books no moving time.
  With no room left behind the wall it stays where it is; say in the report when that can be.
- Kit that stands outside does not ask for free floor in the hall. Today `canBuy` refuses any
  kit with a zone with `No free 3 m by 3 m in the hall` (the zone's own metres), the two systems
  among them, which never stand there. That refusal is dropped for everything `standsOutside`
  is true of [TUNE: chat; it follows from Piotr's sentence but he did not say it].
- Its zone stays 3 by 3 [TUNE]. By chat's arithmetic most of a 2.5 m machine is hidden by the
  wall; one of the report's pictures shows how much of it is seen, and nothing is done about it
  tonight.
- `docs/art/SPRITES.md` section 6 still has it at 3 m high; the engine has 2.5. Put the line
  right.
- `tests/render/machineFx.test.ts` stands one in the hall at 14, 7 to see it breathe; it breathes
  behind the wall as it did on the floor, and the test is moved there, not kept beside a new one.

**2.2 The company's holidays [PIOTR, 05.10].** The workshop is closed twice a year:

| Closure | Closed, both days counted | From |
|---|---|---|
| Christmas | 22 December to 5 January | December 2025, every winter |
| Summer | 1 August to 14 August | August 2026, every summer; not in 2025 |

[PIOTR: two weeks around Christmas ending on 5 January, from the first year's end; two weeks in
the summer from the second year. TUNE: chat: the 22nd, and the first fortnight of August.]

The rule is one function. `closureOf(day)` in `clock.ts` says `'christmas'`, `'summer'` or
`null`, and `isWorkingDay(day)` is false on a closed day as it is on a Saturday. `clock.ts` is
the only file that asks it of the calendar (`tests/engine/turn27CrossCheck.test.ts` pins who may
call `calendarYearOf`; keep to it). The day loop already steps over every day that is not a
working day and runs that day's bills, so a closure is one long weekend and most of what Piotr
asked follows with no more code. Checked by chat on the code; assert each:

- Nobody works, nothing is made, no enquiry, call, delivery or event arrives.
- Rent, rates and power run every closed day; the monthly bills, the loan, the insurance and the
  security are taken on a 1st that is closed; the tax is booked on 30 December inside the
  closure, as it already is on a Saturday.
- The month's wages go out on the last working day of the month, which in December is the last
  working day before the 22nd.
- A client's deadline, a delivery, a booked courier, a machine's return from service and a new
  man's first day are counted in working days, so each steps over the closure. A closed day is
  never a day late.
- A standing contract's week is wanted pro rata by its open days, so a wholly closed week wants
  nothing and costs no reputation.

What does not follow, and is done tonight:

1. **The owner's draw is paid on every weekday of a closure** [PIOTR: the costs run]. Today it is
   charged on working days only, and a fortnight without it would also take his house down a
   tier (`houseTierFor` reads the last thirty days). It is charged on Monday to Friday whether
   the workshop is open or closed; Saturdays and Sundays stay as they are.
2. **The Work Plan's axis.** `workingDayIndex` and `dayOfWorkingIndex` are five in seven
   arithmetic and know no closure, so a bar, a due point and a latest start would sit up to ten
   days wrong and the `deadlineAtRisk` line with them. They count the days `isWorkingDay` is
   true of. A closed day is not a column, as a Saturday is not.
3. **The card on the first day back.** The `Weekend` card would say `14 days off` and `Monday
   then` on a Friday. When the days stepped over hold a closure the card is the closure's
   (section 2.2.2).
4. **The overtime debt** is cleared on the first day back from a closure as it is on a Monday.
5. **The tax's warning.** With the workshop closed from the 22nd, the last day money can be
   spent is the last working day before it. The `Tax is coming` card gets one sentence more,
   before `Invest, or pay.`: `The workshop is closed from 22 December, so the last day to spend
   is Thu 21 December.` (the day computed, never written out). Nothing else of the tax moves.

What keeps running through a closure on calendar days, on purpose, as it does through a weekend
today; say each in the report in one line and change none [TUNE: chat]: an enquiry's and a
contract offer's expiry (the board is empty on the first day back and fills only as fast as it
does on any morning, so the first days back are thin); a standing contract's end day (its term
is not made longer); a let go notice; a machine's service interval; the overdraft's interest and
the bank's count of days past the limit.
That last one means a company far past its limit on the last working day can be closed by the
bank during the break; the warning card of 2.2.1 says so to a company that is under nought.

A save whose clock already stands on a day that is now closed finishes that day as it is and the
closure takes the days after it. The owner's own holiday (`TAKE_HOLIDAY`) and a man's days off
after an accident are counted on opened days, so a closure does not use them up; unchanged.

**2.2.1 Told before.** On the first working day of December, and from 2026 on the
first working day of July, an event card, once for that closure:

- title `Christmas break` (or `Summer break`);
- body `The workshop is closed from 22 December to 5 January. Nobody works; wages, rent and the
  bills are paid as always. The last working day is Thu 21 December and the first day back is
  Fri 6 January. A client's deadline does not count the closed days.` (every date computed);
- with the account under nought one sentence more: `The account is overdrawn, and the bank's
  clock does not stop for the break.`;
- one choice, `Right`.

In December it is queued after the `Tax is coming` card, so the tax is read first. And from that
day to the last working day before the closure a line on the warning strip, a new `WarningKey`
`closureComing`: `Closed from 22 December: 9 working days left` (today counted). Its place in
`WARNING_ORDER` is directly under `taxComing` [TUNE]. The strip shows one line, so in December a
company with cash to tax reads the tax's line and is told of the closure by its card and by the
tax card's new sentence; the closure's line is what the strip shows in July, and in December to
a company with nothing to tax. That is known and is left so. `tests/engine/warnings.test.ts`
pins the whole order and `tests/engine/tax.test.ts` pins `crewFull` directly after `taxComing`;
both are flipped. A save loaded after the card's day and before the closure
gets its card on the next day's open and not never (section 4).

**2.2.2 Told on the first day back.** In place of the `Weekend` card: title `Back from the
Christmas break` (or `the summer break`), body `14 days closed. Rent, rates and the bills ran
anyway: £3,480 out.` (the days and the money are what was stepped over, weekend days on either
side among them), one choice `Back to work`. A new event kind, so `weekend` keeps the meaning
its tests pin. It is queued where the `Weekend` card is queued today, after the cards of the days
stepped over, so the `Tax for 2025` card, when the tax was booked inside, is met before it, as
it is met before the `Weekend` card today. The money on the break's card is everything that left
the account on the days stepped over but the tax, which has a card of its own.

### C. The timber department

**2.3 When it opens [PIOTR, 04.10: era 3 is the 800 m² hall].** Timber enquiries come onto the
board once the second extension is open: `secondExtensionOf(state.unit) === 'open'`. The constant
`TIMBER_ON_THE_BOARD` becomes a question asked of the state. The machines and the cutter sets
can be bought on any day, by any company: they are in the catalogue from day 1.

Before the hall is 800 m² the five products of 2.6 are nowhere on the board: not offered and
not among what a greyed tile is drawn from (`generateUnreachable`). So no draw of the seeded
stream moves for a company in the 200 or the 400 m² hall, and no scenario of such a company
shifts by this turn. In the 800 m² hall they are templates like any other, live or greyed. The
advertising agency never draws one of the five as a big job: `drawBigJob` leaves them out
(section 8). The
oak dining table, the one solid wood template the game already has, stays off the board as it is
today [TUNE: chat; it is not a window or a door].

The crew is one crew [TUNE: chat; Piotr has not answered]. A joiner works on a timber job as he
works on a sheet job, at his own rate; there is no timber trade, no second team, no second
canteen, and the crew limit and the lockers are what v82 made them. That is what the code is
since Turn 26 took the trades out, and it is the least that can be built.

**2.4 Five families of machine.** Each is defined as the thicknesser and the spindle moulder are
(`SPEC_DRAFTS`, a variants array, `VARIANTS_BY_FAMILY`, and its row in every side table). The
classes are the five the game has. Width, depth and height are per class and are the art side's
envelope, so the engine's own canvas and anchor arithmetic fits every file with no table of
pixels: chat checked all 42 files against it (docs/art/incoming/t28/timber-machines.json).

| Family id | Name | Folder | Tab |
|---|---|---|---|
| `crossCut` | Cross cut saw | Cross cut saws | `timberMachines` |
| `planer` | Four sided planer | Four sided planers | `timberMachines` |
| `framePress` | Frame press | Frame presses | `timberMachines` |
| `glueTable` | Glue table | Glue tables | `timberMachines` |
| `sander` | Sander | Sanders | `sanding` (it exists, empty) |

Metres, width by depth by height, in view 0 [the art side's, fixed]:

| Family | used | budget | standard | pro | industrial |
|---|---|---|---|---|---|
| crossCut | 2 x 1 x 1.25 | 3 x 1 x 1.25 | 4 x 1 x 1.5 | 5 x 1 x 1.75 | 7 x 2 x 2 |
| planer | 3 x 1 x 1.5 | 3 x 1 x 1.5 | 4 x 1 x 1.5 | 5 x 1 x 1.75 | 6 x 2 x 2 |
| sander | 2 x 1 x 1 | 2 x 1 x 1.25 | 2 x 1 x 1.5 | 3 x 2 x 1.75 | 6 x 2 x 2 |
| framePress | 2 x 1 x 1 | 3 x 1 x 1.25 | 3 x 1 x 2.25 | 4 x 1 x 2.5 | 5 x 2 x 2.75 |
| glueTable | one class, `standard`: 3 x 1 x 1 | | | | |

The working zone of every class is its footprint and one metre more each way: `width + 1` by
`depth + 1` [TUNE]. The glue table's is its footprint and a metre on the long side.

Prices, in pounds [PIOTR: "timber machines much dearer"; TUNE: chat: every figure]. The used
and budget classes are the hand way of doing the job and are cheap on purpose; it is from
`standard` up that timber costs more than sheet. They are final as written: the twenty per cent
of v81 is not put on them again.

| Family | used | budget | standard | pro | industrial |
|---|---|---|---|---|---|
| crossCut | 300 | 2,500 | 8,000 | 24,000 | 60,000 |
| planer | 6,000 | 14,000 | 28,000 | 60,000 | 120,000 |
| sander | 400 | 3,000 | 9,000 | 36,000 | 96,000 |
| framePress | 250 | 1,500 | 7,000 | 24,000 | 72,000 |
| glueTable | 2,500 | | | | |

Men at once (`MACHINE_CAPACITY`) [TUNE]. A row here makes the family one the hall can be short
of (`placeShortages`), and a hall short of places at a planer is slowed as a hall short at the
saw is, every man in it. That is the game's rule for every family and it is the reason to buy a
second machine or a better one; it is not changed and not softened for timber.

| Family | used | budget | standard | pro | industrial |
|---|---|---|---|---|---|
| crossCut | 1 | 1 | 2 | 2 | 3 |
| planer | 1 | 2 | 2 | 3 | 4 |
| sander | 1 | 1 | 2 | 3 | 4 |
| framePress | 1 | 2 | 2 | 3 | 4 |

The glue table is not a row of that table. It does for a frame press what the drying racks do
for a booth, and by the same line of `placesAt`: each glue table adds `GLUE_TABLE_PLACES` 2 to
the places of one frame press, one table counted for each press that stands [TUNE]. A glue table
beyond the number of frame presses that stand is refused, as a drying rack beyond the booths is
and in that refusal's words. Its catalogue card says what it does; being `storage` it opens no
card on the hall.

Extraction wanted, cubic metres an hour (`EXTRACTION_DEMAND`) [TUNE]:

| Family | used | budget | standard | pro | industrial |
|---|---|---|---|---|---|
| crossCut | 600 | 700 | 900 | 1,200 | 1,800 |
| planer | 2,000 | 2,200 | 2,800 | 3,400 | 4,500 |
| sander | 0 | 1,200 | 1,500 | 2,200 | 3,500 |

The used sander has a vacuum of its own; the press and the glue table make no dust. Dust made
(`DUST_OUTPUT_M3_PER_HOUR`): planer 0.5 and sander 0.03, the figures the table's own comment has
kept for them; crossCut 0.02; framePress 0; glueTable 0 [TUNE]. Air (`AIR_DEMAND`): framePress
standard 6 bar and 100 litres, pro 7 and 200, industrial 7 and 300; crossCut pro 6 and 100,
industrial 6 and 200; the rest none [TUNE].

The rest of each family's rows, all [TUNE] and all on the pattern of the thicknesser unless said:
pace by class is the one ladder every paced family has; `enduranceFactor` 0.25, 1, 1.2, 1.5, 2;
`MACHINE_ENDURANCE_HOURS` planer 4,000, crossCut 3,000, sander 3,500, framePress 6,000;
`powerPerDay` 3, 3, 4, 5, 7, and the planer's 4, 5, 7, 10, 14; delivery days by class crossCut
1, 3, 5, 10, 20, planer 3, 7, 12, 20, 30, sander and framePress 1, 3, 7, 12, 25, glueTable 5;
`CLASS_LADDER_FAMILIES` gets the four families with classes; `HEAVY_SPECS` gets the planer whole
and the other three from `standard` up (`LIGHT_CLASSES` holds their `used` and `budget`);
`MACHINE_SHORT_WORDS`: `cross cut saw`, `planer`, `sander`, `press`, and `machinesWord` gives
`presses` and not `presss`; category `machine` for the four, and `storage` for the glue table,
as the drying racks are.

One sentence of description a class, in the catalogue's voice, from what the picture shows:

- crossCut: a chop saw on a folding stand; a mitre saw on a fixed table with roller tables; a
  pull saw built into a bench with stops on a rail; an up cut saw in a closed guard with a
  positioning stop; a computer set optimiser with conveyors in and out.
- planer: four heads, set by hand, second hand; four heads, new and plain; five heads with a
  roller feed; six heads in a sound enclosure with readouts; six heads, set by computer, with an
  automatic infeed.
- sander: a hand sander at a bench with its own vacuum; a downdraught sanding table; an edge
  belt sander; a through feed brush and belt sander; an automatic sanding line that takes a
  whole frame in and out.
- framePress: a bench with a handful of sash cramps; a cramping table with long cramps fitted;
  a hand frame press; a hydraulic frame press; an automatic window press with rollers in and out.
- glueTable: a glue table with a roller spreader.

`STATION_TABLE`: the operator stands at the long side that faces the camera in view 0, the
`front` side, as the spindle moulder's row has it. `PORTS`: one line a picture file, `.r` among
them, for every class that wants extraction, measured off the picture as v56 measured the CNC's;
the Sprite check page shows a
red line for any that is missing and must show none. `machineFx`: nothing new.

**2.5 The cutter sets [TUNE: chat; Piotr said "ok" to the idea, not to a figure].** A spindle
moulder cuts a profile with the cutters it is given, and each kind of product has its own set.
Three single class families, tab `timberMachines`, category `tools`, kept as a hand tool set is
kept: no cell of the floor, nothing drawn on the hall, and, like a hand tool set, never sold.
They ask for no cabinet and no slot, so the line that says `Kept in a tool cabinet` of kit with
no zone reads `Kept at the spindle moulders` for these three (the catalogue's card and the
Sprite check's row).

| Family id | Name | Folder | Price | Delivery days |
|---|---|---|---|---|
| `cuttersSash` | Sash window cutter set | Sash cutters | 4,000 | 5 |
| `cuttersCasement` | Casement window cutter set | Casement cutters | 3,000 | 5 |
| `cuttersDoor` | Door cutter set | Door cutters | 5,000 | 5 |

Effect line: `The profile cutters for sash windows. Without the set the workshop cannot take
them.` and its like. One set serves every moulder the company has. No picture of them exists:
the catalogue shows the empty picture box it shows for any file that is missing, and
`docs/art/REQUESTS-T28.md` asks the art side for three.

**2.6 Five products.** Five `ProductTemplate`s, material `solidWood`, `allowedFinishes`
`['lacquer']` and nothing else, `needsMeasure` true, `byHandAllowed` false, and one new field,
`cutters`, the family id of the set the product wants (`null` on every template the game has).

| id | name | basePrice | cutters | minReputation | weightsByTier |
|---|---|---|---|---|---|
| `casementWindows` | Casement windows | 9,000 | `cuttersCasement` | 25 | [0, 0, 12] |
| `sashWindows` | Sash windows | 14,000 | `cuttersSash` | 30 | [0, 0, 10] |
| `frenchDoors` | French doors | 6,000 | `cuttersDoor` | 25 | [0, 0, 10] |
| `patioDoors` | Patio doors | 10,000 | `cuttersDoor` | 30 | [0, 0, 8] |
| `bifoldDoors` | Bifold doors | 18,000 | `cuttersDoor` | 35 | [0, 0, 6] |

[PIOTR: the five products and that they pay better. TUNE: chat: every figure; `calls` as the
kitchen of nearest price has it.] The size multiplier, the express uplift, the commercial budget,
the client's answer, the deposit, the forty, forty and twenty of the price: all as every job has
them. A timber job's material is never bespoke.

`requiredEquipment` of all five: `crossCut`, `planer`, `spindleMoulder`, `sander`, `framePress`
and `sprayBooth` (the lacquered kitchen has the booth in its list too: it is the list that locks
a live enquiry). The cutters are kit the enquiry needs exactly as a machine is:
`missingEquipment` and `lockReasonFor` count the template's `cutters`, so a live tile without
the set is locked and a greyed one says why. These five are not held to `SOLID_WOOD_EQUIPMENT`:
its branch in `kitBlockFor` and in `lockReasonFor` is passed over for a template with `cutters`,
and the thicknesser is not asked of them [TUNE: chat]. What a company in the 800 m² hall is
short of is said in the order `kitBlockFor` already has: the reputation; the spray booth; the
machines by name (`no cross cut saw, four sided planer`); the cutters among them (`no sash
window cutter set`, link to the catalogue); and then `blockFor`'s hands against the deadline.

**2.7 How a timber job is made.** From here to 2.10 "a timber job" is a job of one of the five
templates of 2.6, the ones with `cutters`, and nothing else. `Job` and `StagedJob` carry a mark
for it. The oak dining table is `solidWood` too and is NOT one: in a save (the day 149 fixture
has one in production) and in every test it keeps the four stage plan, the deadline and the
material it has today, stands no night and has no glass.

A timber job has a plan of its own in `stagesOf`, and four new `StageId`s. The model is the one
every job has: all its men at one pace, every minute booked onto the bar's stage in the plan's
order.

| Order | Stage id | Label | Share | Family |
|---|---|---|---|---|
| 1 | `crossCutting` | Cross cutting | 0.08 | `crossCut` |
| 2 | `planing` | Planing | 0.12 | `planer` |
| 3 | `moulding` | Moulding | 0.25 | `spindleMoulder` |
| 4 | `pressing` | Pressing | 0.15 | `framePress` |
| 5 | `sanding` | Sanding | 0.12 | `sander` |
| 6 | `finishing` | Finishing | 0.13 | `sprayBooth` |
| 7 | `assembly` | Glazing | 0.15 | `workbench` |

[TUNE: chat: every share; they sum to one.] The seventh is the stage the game has, at the
benches, and on a timber job its label is `Glazing` and its doing word `glazing`: the glass goes
in and the ironmongery on. `stageLabel` and `stageDoing` are asked with the job so that they can
say so (the person card prints both). `stageDone` lists the stage ids by hand: the four new ones
join it, or labour in their bags is counted twice.
A timber job is never put on the CNC (`jobOnCnc`). The speed of a stage is its family's pace as
for every stage; with the family's machines all broken or away, the four new stages go by hand
at the rate cutting, edging and moulding go by hand today. The thicknesser has no stage, as it
has none today.

Where the men are drawn. Since v66 every working man is drawn going round every machine that
has a row in `MACHINE_CAPACITY`, whatever his job (`workSpots`, `drawnPlaces`), and four new rows
would send kitchen men to the planer. So: the four new families are spots only for a man on a
timber job, and a man on a timber job is drawn only at the families of his own plan. Every other
man, the men of a standing contract among them, is drawn exactly as today over the spots that
are not the four new families. Standing contracts are sheet work and are not touched.

The thicknesser's catalogue sentence promises it a stage "with the timber branch". It gets none
tonight (section 8): cut that clause and leave the rest of its card.

**2.8 Two nights [PIOTR: "a bit more complicated"; TUNE: chat: the rule].** Glue cures and
lacquer dries, and nothing can be done to a frame meanwhile. When the bar of a timber job fills
its `pressing` stage, and again when it fills `finishing`, the job stands until the next working
day opens. While it stands it is stopped by `hallStops` with the reason `glue curing` or `lacquer
drying`, and it is a hall stop like the one for want of a booth in every respect: the minutes
are booked as `hallStopped`, the reason is on the Work Plan's row and on the job card through
`blockedBy`, its men stay on the job, are not moved by the engine and wear no bubble, and the
`No material` card is not raised. The player, or his manager, puts them on other work for the
rest of the day or leaves them standing: that is the difficulty, and no new rule is written for
them. The stand is a day on the job (`job.curing`: the reason
and the day it ends), never a timer of minutes.

- The stand is over when the day it names opens, whatever the men do in between; a closure or a
  weekend in between is more than enough and adds nothing.
- The Work Plan's projection of a timber job (`rowFor`, its bar and its latest start) counts one
  working day for each night it has not yet stood.
- The drying racks do nothing for it, and wet air is what it is for any lacquer job [TUNE].
- A sheet job, lacquered or not, never stands. Only `solidWood`.

**2.9 The glass [PIOTR: "a bit more complicated"; TUNE: chat: the rule and the figures].** A
window's glass is made to size by a glazier and cannot be ordered before the drawing says the
sizes. It takes `GLASS_DELIVERY_WORKING_DAYS` 10.

- Of a timber job's material cost, `GLASS_SHARE` 0.35 is glass and ironmongery and the rest is
  boards. The boards are ordered, delivered, unloaded onto a rack and drawn exactly as the oak
  table's would be: `sheetsForCost` on the boards' share, never fewer than one, paid at the
  ladder's price for the order as any order is.
- The job carries its glass: `none` (every sheet job), `toOrder`, `ordered`, `in`, and the day
  it arrives.
- It can be ordered once the job's paperwork is done (`paperworkDone`). An office admin on duty
  orders it the moment she orders the boards (`autoOrderMaterial`). Without her the owner presses
  `Order glass` on the job card, beside `Order for this job`, a click of the same kind and no
  minutes of his day.
- It is paid in full when it is ordered, one ledger entry, the category the boards are booked
  under, label `Glass for <job>`, through the overdraft as the boards are.
- It arrives at the open of its day. No lorry, no unloading, no rack, no card: the glazier
  carries it to the benches. The job card says `Glass ordered, here on Thu 12 March` and then
  `Glass is in`.
- Production starts without it. When the bar reaches `Glazing` and the glass is not in, the job
  is stopped with `waiting for glass`, a hall stop of the same kind as 2.8's and treated the
  same.
- A job dropped after its glass was ordered loses that money as it loses its boards.
- A new line on the warning strip, `glassNotOrdered`: `Glass not ordered: Sash windows`, for a
  timber job whose paperwork is done and whose glass is still to order. Its place in
  `WARNING_ORDER` is directly under `drawingDone` [TUNE].

**2.10 A timber job's deadline [TUNE: chat].** The client knows windows take longer. The
deadline of a timber enquiry is the deadline every enquiry is given by `deadlineDaysFrom`, the
express factor in it, and then `TIMBER_LEAD_DAYS` 12 working days on top: the glass's ten and
the two nights. `blockFor` holds the workshop's hands against the days without the lead. The
hole chat knows of in a sheet job's deadline (the bespoke material's three days are not in it)
is not touched tonight.

**2.11 The pictures [PIOTR, 05.10: "put the graphics in as you have them"].** The 42 files are
in `docs/art/incoming/t28/`, already named as the game names them (`planer.used.png`, and
`planer.used.r.png` for the art side's 90 view). `git mv` them into `public/sprites/`, run
`npm run sprites:manifest`, and delete the folder with its JSON once section 12 of
`docs/art/SPRITES.md` carries the table. They are not on main's `public/sprites/` already
because two tests pin the count of turned pictures (75; it becomes 96) and main was to stay
green.

What they are, said plainly in SPRITES.md section 12 and in the report:

- Pack 1, `crossCut` and `planer`, 20 files: rendered from a model by the art side, exact to
  the contract. Plainer than the September machines; Piotr has seen that and it stays for now.
- Pack 2, `sander`, 10 files: as the art side delivered them.
- Pack 2, `framePress` and `glueTable`, 12 files: the art side's files were cut wrong (half
  size, off the anchor, with pieces of the neighbouring machine). Chat cut them again from the
  preview board Piotr approved, scaled each to its canvas and stood it on its anchor line. They
  are stand ins: the registration is by eye and not by geometry. `docs/art/REQUESTS-T28.md` asks
  the art side for the twelve again.

No agent alters a pixel of any of them. If one sits badly on its footprint in the Sprite check
page, the report shows it and the request names it. SPRITES.md section 2 still says the anchor
is at the canvas's middle; the code has had it at `8 + w x 48` since 14.09. Put the sentence
right while section 12 is written.

## 3. How to run this session

One agent, serial, in the order of section 5. No worktrees, no agent teams. A0 first and alone,
one commit, `npm run check` green on its own exit code. Then the mockups of section 9, then the
B tasks, then the C tasks, one commit each, then the scenarios, the cross check of section 7, the
pictures, the report, the PR. If the night runs short, the order of section 5 is the order of
what matters: stop cleanly at the end of a task, never in the middle of one, and say in section 0
of the report which tasks were not reached.

## 4. State

STATE_VERSION 41, once, in the first task that needs it. A v40 save opens with:

- its pelletiser, if it has one on the floor or on order, behind the wall (2.1);
- every job with `curing` null and glass `none`;
- no closure warned of, so that a save loaded between a warning's day and its closure gets the
  card on the next day's open (the same promise the tax's warning keeps);
- nothing else changed: no machine, man, price or job of a save is touched.

Every save that loads today loads, the fixtures among them. Say in the report what fields were
added and where.

## 5. Task queue, in order

Branch turn-28-timber from main. One commit per task, npm run check green on its own exit code
before each, two report lines per task in REPORT-T28.md.

T28-A0 The suite settled on v82 (2.0.1).
T28-A1 Housekeeping and v83: docs/turn-27-brief.md is already in docs/ (this ZIP put it there),
this file as CLAUDE.md, the README's lines, APP_VERSION 'v83', the version pins.
T28-A2 The mockups of section 9 into docs/mockups/t28/ with a README.
T28-B1 2.1 the pelletiser, and STATE_VERSION 41 with section 4's lift.
T28-B2 2.2 the closures: the rule, the five things that do not follow, the two cards, the strip
line. The three test files chat found pinned to the old January (tests/engine/tax.test.ts,
tests/ui/taxCards.test.ts, tests/scenarios/turn27.test.ts) are re-dated honestly, to the real
last working day; the test of a working 30 December has lost its premise and is flipped to say
the 30th is always closed.
T28-C1 2.11 the pictures in, the manifest, the two counts of turned pictures (75 to 96:
tests/engine/rotate.test.ts and tests/render/spriteClasses.test.ts), SPRITES.md section 12.
T28-C2 2.4 the five families, with every side table, the ports and the stations (the third 75
of spriteClasses.test.ts, `checked`, becomes 96 here).
T28-C3 2.5 the cutter sets.
T28-C4 2.6 and 2.10: the five products, their locks and greyed reasons, the deadline. Timber
stays OFF the board through this task and the next three, so that a night that stops early
never ships windows made on a table saw.
T28-C5 2.7 the stages of a timber job.
T28-C6 2.8 the two nights.
T28-C7 2.9 the glass.
T28-C8 2.3 the opening: timber comes onto the board of a company in the 800 m² hall. If the
night ends before this task, say so first in the report: the machines are in the catalogue and
no work for them is offered.
T28-D1 notes (docs/notes-t28.md) and docs/art/REQUESTS-T28.md (the twelve files again; three
cutter sets; and, for Piotr to decide, the products on the hall: a pack of timber at the gate, a
trolley of machined parts, a rack of frames drying, a stillage of finished windows).
T28-D2 scenarios, one line a moved figure, and two new ones. (vv): a company in the 800 m² hall
with the five families, a spindle moulder, a booth and the sash cutters takes a sash window job
with no admin; the
strip says the glass is not ordered; the owner orders it; the job stands a night after pressing
and a night after finishing, waits for the glass if it is late, is glazed, delivered and paid.
(ww): a company played from 28 November 2025 to Mon 9 January 2026 gets the break's card on the
first working day of December after the tax's, works to the 21st, pays its wages that day, is
closed to the 5th with rent, rates, the draw on weekdays and the tax on the 30th booked, and
opens on Fri 6 January with the tax's card and then the break's; and the same for August 2026,
with no closure in August 2025.
T28-D3 cross check. T28-D4 look and shoot: the pictures of section 7 into docs/report-t28/.
T28-D5 report (REPORT-T28.md, section 0 first: what was not reached, what is red, section 10's
list answered or not) and PR titled `Turn 28: the timber department, the holidays, and the
pelletiser outside`, do not merge, end the session.

## 6. Do not (tonight)

- No change to a sheet template, a sheet stage, its shares, or the rule a sheet job's deadline
  is drawn by (a closure moves every due day, as a weekend does; that is 2.2 and is meant).
- No change to the places, pace, price or power of any family the game already has. In
  particular the spindle moulder's places stay 2, 4, 4, 6, 8 (section 8).
- No change to the wages, the owner's base, the courier, the loan, the overdraft's rules, the
  bank's count, the reputation, the contracts, the advertising agency's big jobs.
- No change to the tax but the one sentence of 2.2.
- No change to the security firm's cost, the insurance, the waste collection or the second
  extension's card: Piotr has three questions open on them.
- No five axis CNC, no spraying robot, no production line, no timber standing contract, no
  timber big job.
- No picture drawn, repainted, trimmed or scaled by an agent; no placeholder drawn for a product
  on the hall; no sound; no new screen, modal kind, tab kind or CSS token.
- No logo work, nothing of `public/brand/`.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `npm run check` green on its own exit code; the count of tests and files in the report; every
  `it.skip` in the tree listed with its line of reason (the aim is none).
- A pelletiser bought today stands behind the wall and takes no cell of the floor; a v40 save
  with one on the floor opens with it behind the wall and the cells free; with the wall full it
  is refused with `No room behind the hall`; a full hall floor does not refuse it or a central
  system. Each asserted.
- `closureOf` is `'christmas'` on days 292 to 305 (22 December 2025 to 5 January 2026) and
  `'summer'` on 511 to 524 (1 to 14 August 2026), and `null` on 291, 306, 510, 525 and on 1 to
  14 August 2025 (151 to 164); the winter of 2026 and the August of 2027 likewise.
  `isWorkingDay` is false on every closed day, true on Thu 21 December 2025 (291), on Fri
  6 January 2026 (306) and on Mon 16 August 2026 (526). Asserted.
- A job taken on Thu 21 December 2025 (291) with a deadline of five working days is due on Thu
  12 January 2026 (312), the fifth working day from and including the first day back, and
  delivered that day is not late. Asserted.
- The owner's draw is in the ledger for every weekday of a closure and for no Saturday or
  Sunday; his house is the same tier the day before and the day after. Asserted.
- December's wages are booked on the last working day before the 22nd. Asserted.
- The Work Plan's columns hold no closed day, and a job's due point sits on its due day's column
  on both sides of a closure. Asserted.
- The break's card is raised once for each closure and never for August 2025; a save loaded on
  10 December that never saw it sees it on the next open; `closureComing` is on the strip from
  the card to the last working day and not after; it sits directly under `taxComing`. Asserted.
- The first day back raises the break's card and no `Weekend` card, the tax's card before it;
  the money on the break's card leaves the tax out. Asserted.
- The 42 files are in `public/sprites/` and the manifest; the Sprite check page shows a file, a
  footprint and no red port line for every class of the five families; `docs/art/incoming/` is
  gone.
- Each price, place count and metre of 2.4 asserted from its table; the fourteen prices of v81
  and every other figure of every older family unchanged, asserted by the tests that already pin
  them.
- A company in the 200 or the 400 m² hall never sees a timber tile, live or greyed, and its
  seeded board is what it was before this turn; one in the 800 m² hall with all the kit and the
  cutters is offered timber; without the cutters the live tile is locked. Each reason of 2.6
  asserted in its order. `drawBigJob` never draws one of the five. Asserted.
- The oak dining table's plan, in the day 149 fixture and in `tests/engine/stages.test.ts`, is
  what it was; it stands no night and carries no glass. Asserted.
- A timber job's plan has the seven stages in the order and shares of 2.7; a sheet job's plan is
  byte for byte what it was. Asserted.
- A timber job stands exactly one night after pressing and one after finishing and a sheet
  lacquer job stands none; while it stands its minutes are `hallStopped` and no `No material`
  card is raised. Asserted.
- A kitchen man is never drawn at one of the four new families and a window man never at an
  edgebander or a table saw; a company with no timber job draws its men as v82 drew them.
  Asserted.
- Glass: cannot be ordered before the paperwork is done; is ordered by the admin with the
  boards; costs `GLASS_SHARE` of `job.materialCost`, and the boards are `sheetsForCost` of the
  rest; arrives ten working days on; the job
  stops at `Glazing` without it and goes on with it; `glassNotOrdered` is on the strip while it
  is to order and sits directly under `drawingDone`. Each asserted.
- A timber enquiry's deadline is the old rule's plus twelve working days. Asserted.
- `git diff main --stat -- src/ui/styles.css` shows no new token; every changed screen is in the
  report beside its nearest existing one.
- The pictures: the pelletiser behind the wall; the break's card in December; the strip line;
  the first day back; the Timber machines tab with its folders; the planer's folder open on its
  five classes; the Sanding tab; a cutter set's card; a timber tile on the board, live, locked,
  and greyed for each reason; a timber job's card with the glass to order, ordered and in; the Work
  Plan with a job `glue curing`; the 800 m² hall with one of each new machine standing and men
  at them; the Sprite check page's rows for the five families.

## 8. Parked

- **A spindle moulder takes three men at most** [PIOTR, 04.10]. Today's places are 2, 4, 4, 6,
  8 and every sheet job has a moulding stage, so the change would reach the sheet department and
  every running save. Chat asks Piotr before anything is done.
- The thicknesser's place in the timber department (it still has no stage).
- The frames that are drying taking floor or racks; the grade of the timber and its waste;
  remedial visits after fitting.
- The products drawn on the hall (asked of the art side in REQUESTS-T28).
- Timber standing contracts; timber big jobs from the advertising agency.
- The five axis CNC that stands in for four moulders, the spraying robot, the line in five
  stages [PIOTR, 04.10: era 4].
- The bank's count of days past the limit during a closure; whether a standing contract's term
  should be made longer by a closure.
- The owner's forced holidays once he has a manager; accidents; the crisis.
- Piotr's open questions after v82: the security firm at 800 m², the waste collection, the
  second extension's card shown early. The logo.
- From Turn 27: the account at nought and the tax; the one off licence that runs out with no
  card; the first month's wage of a man hired late.

## 9. Mockups (docs/mockups/t28/)

Before the code, each in the classes of the screen it belongs to and beside that screen as it is
today: (1) the break's two cards in the event modal's own classes, beside the `Tax is coming`
card for size, and the strip with the `closureComing` line; (2) the board with a timber tile
live, the same tile locked for want of the cutters, and greyed for missing machines and for
missing cutters; (3) a timber job's card with the glass line in its three states and the `Order
glass`
button beside `Order for this job`; (4) the Timber machines tab with its seven new folders and
the two it has, the Sanding tab with one, and the planer's folder open; (5) the Work Plan's row
of a job that is `glue curing` and of one `waiting for glass`. A README names which is which. No
art is asked of the art side before the code; what is asked of it afterwards is in
docs/art/REQUESTS-T28.md.

## 10. What chat decided and Piotr has not confirmed

For the report to repeat, each with what was built:

1. Christmas is 22 December to 5 January, from December 2025; summer is 1 to 14 August, from
   2026.
2. The whole company is closed, the owner with it; his draw is paid on the closure's weekdays.
3. A closed day counts for no deadline.
4. The bank's count and a contract's term run through a closure.
5. Kit that stands outside asks for no free floor in the hall.
6. Timber opens with the 800 m² hall and is not shown before it; one crew for both departments;
   the oak table stays off; the cutter sets cannot be sold.
7. Every price, place count, share and delivery day of sections 2.4 to 2.7.
8. The cutter sets, the glass at ten working days and 0.35 of the material, the two nights (the
   men of a job that stands are left to the player), the twelve days on a timber deadline.
9. A cross cut saw, a planer, a spindle moulder, a sander, a frame press and a booth are needed
   to take timber work; the glue table and the thicknesser are not.
10. The twelve stand in pictures of the presses and the glue table.

End of brief.
