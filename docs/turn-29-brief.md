# Turn 29: the production line, the five axis CNC, the timber stores, and four to a contract

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one writer, serial, effort
high). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 05.10.2026 from
Piotr's words of that afternoon, against main at v83.

Read this whole file (first line must say "Turn 29"; if the root CLAUDE.md does not, stop and
report), then REPORT-T28.md section 0 and its "what was not done", then docs/notes-t28.md, then
docs/ui-style.md, then the archived briefs in docs/ (docs/turn-28-brief.md is the last). Where
files disagree, this one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1,
one code path, constants never in the UI, [TUNE] for every figure you choose and [PIOTR] for his,
kill background processes, PR without merge, end the session, no PR watching, npm run check gated
on its own exit code, every click single, one APP_VERSION bump, delete the old track and never
write a parallel one, flip a test and never keep it beside a new one, the Skylon Development Ltd
header on every new code file). The rule relaxed in Turn 26 stays relaxed [PIOTR, 01.10]: a
scenario figure that moves is restated with ONE line of reason; a test that pins an exact pound of
a played month may be loosened to a range when the exact figure says nothing about the rule under
test, and the comment says so.

Before a line is written: clone, read what is there, and build with it. Every screen, card, tile,
tab, chip, modal and strip line this turn needs already has its kind in the repo (the catalogue's
folders and class cards, the hire tile, the board's tiles and their greyed reasons, the contract
tiles and their rows, the job card's lines, the Materials page's rows, the event modal, the
warning strip). Nothing here asks for a second version of any of them, and none is to be written
[PIOTR, 18.09: one game, one look].

Precondition. main carries Turn 28 merged: APP_VERSION 'v83', STATE_VERSION 41. If APP_VERSION is
not 'v83', stop and report. Turn 28 ended green (2,652 tests in 278 files); task A0 below runs
the suite once more before anything is touched.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside. The mockups this turn needs are in section 9, into docs/mockups/t29/ before the code
that makes them true. Piotr asked for this turn in one go and has not seen those mockups: they
are built only of what the game already draws, and the report shows each beside its nearest
existing screen so he can judge them afterwards.

**What chat decided for Piotr and he has not yet confirmed** is marked [TUNE: chat] throughout
and gathered in section 10, so the report can repeat it in one place. His own words are [PIOTR].

**The root CLAUDE.md of Turn 28 forbade and parked most of what this turn builds** (the five
axis CNC, the robot, the line, timber contracts, the logo). That was Turn 28's fence and it is
down: this file is the brief now.

## 0. What this turn is for (PIOTR, 05.10, the afternoon)

Turn 28 gave the company a timber department. Piotr played it the same day and said six things.

**The line.** "I do not see the production line for the millions anywhere." It was never built:
no picture of it existed. The art side has now delivered it, with the five axis CNC, the
spraying robot and two timber stores, and Piotr sent the pack with: "you have it in the zip",
"put everything into the next turn". On what the line gives at each step: "work it out and
propose." On what it costs to run: "the cost of running the production line will be
considerable: one or two engineers at 15k a month, depending on the size of the line."

**The glass.** "The glass, next day; ten working days will complicate things for us if we order
right after the drawing."

**Four to a contract.** "There should be a limit on the men put on one order, three or four at
the most; today on sheet goods as many go on as I like and the profit is fantastic, which does
not happen in life." And, when chat read that as jobs: "I mean the standing orders, the
contracts; do not touch the normal jobs." Asked which, he said four. Asked whether pieces past
the week's order should still be paid, he said: "no, we pay as it is now", so every piece is
still paid.

**Windows and doors as standing contracts.** "Are we doing something like standing orders for
windows and doors?" Chat said yes and how; he put it in the turn.

**The logo.** "Do the logo too." His logo pack is not in this ZIP; section 2.13 says what to do
when it is there and when it is not.

And one thing Turn 28's own report found: a second cutter set of the same kind can be bought and
does nothing.

What this turn is not: any change to a normal job's crew, a sheet job's plan, a wage, the tax's
arithmetic, the loan, the bank's rules, the security firm's price for a company with no line, or
the questions Piotr still has open after v82 (section 8).

## 1. Rules restated (short)

Everything from Turns 1 to 28 and the chat fixes to v82. Tonight in addition:

- APP_VERSION = 'v84'. STATE_VERSION 42, once (section 4); every save that loads today loads
  (`OLDEST_SAVE_VERSION` is 12), the fixtures in tests/fixtures among them.
- **A job takes as many men as the boss puts on it** [PIOTR, 17.09 and 05.10: "do not touch the
  normal jobs"]. Nothing of `addToJob`, `assignJob` or `canBuild` is touched, and the three
  tests that say a job has no limit stay as they are: `takes as many as the player wants, with
  no limit at all` in `tests/engine/assignees.test.ts`, `puts all three on it with no limit, and
  each keeps his own place` in `tests/scenarios/turn19.test.ts`, and the block `the row says who
  is on it` in `tests/ui/workPlan.test.ts`.
- **A standing contract takes four joiners at the most** [PIOTR, 05.10].
- **Every piece of a contract is paid, past the week's order too** [PIOTR, 21.09 and 05.10].
- **The sheet department is not touched**, with one exception said in 2.7: a spraying robot
  speeds the Finishing of a lacquered sheet job too, for the company that buys one.
- **The art side's pictures go in as they are** [PIOTR, 05.10, as in Turn 28]. No agent draws,
  repaints, trims or scales a picture. Chat renamed files and nothing else (2.4).

## 2. Changes to the design (the contract)

### 2.0 What Turn 28 left (for A0's reasons)

- v83 is green on its own exit code: lint, the build, 2,652 tests in 278 files, none skipped.
- `tests/ui/app.test.ts` plays the game in real time and failed nine of its tests in two of Turn
  28's checks while a sub-agent ran the suite beside the lead. On a quiet machine it passes.
  Tonight no sub-agent runs `npm test`, `npm run build` or `npm run check` while the lead's
  check is running (section 3).
- `tests/ui/t28Families.test.ts` asserts that `docs/art` holds no folder called `incoming`.
  The pictures of this turn are therefore in `docs/pictures-t29/` (2.4).

### A. The suite

**2.0.1 A0.** Run `npm run check` on main as it stands. It is expected green. A failing test is
handled exactly as Turn 27's A0 handled it: a moved figure re-pinned with one line of reason, a
scenario the bank closes given the smallest change of its own policy, a real fault fixed if the
fix is plain and otherwise left red, that thread stopped and put first in section 0 of the
report. Nothing of the engine is touched in A0 beyond that. One commit, or none if nothing moved.

### B. Three small things

**2.1 The glass comes the next working day [PIOTR, 05.10].** `GLASS_DELIVERY_WORKING_DAYS` is 1
and not 10: a glass ordered today is in at the open of the next working day, beside the boards
ordered with it. Everything else of the glass is as Turn 28 built it: ordered once the paperwork
is done, by the admin with the boards or by the owner's click, paid at the order, the stop
`waiting for glass` at the Glazing for the owner who forgot, the strip's `glassNotOrdered`.

- `TIMBER_LEAD_DAYS` is 3 and not 12: the glass's day and the two nights [TUNE: chat: it follows
  from his sentence; with twelve left standing every window would have nine idle days in its
  deadline]. It is a literal of its own today; write it so that it cannot drift from the glass
  again. `TIMBER_STANDS` is a private constant of `src/engine/jobs.ts`, and `constants.ts`
  imports types only while `jobs.ts` imports it: move `TIMBER_STANDS` into `constants.ts` and
  write `TIMBER_LEAD_DAYS = GLASS_DELIVERY_WORKING_DAYS + Object.keys(TIMBER_STANDS).length`.
- An enquiry already on the board keeps the days it was drawn with, and a job already taken
  keeps its due day: both are stored.
- A glass already on its way in a save is brought forward by the lift of section 4 to the next
  working day, so that nobody waits out an old ten days.
- The words that say ten or twelve are put right: the comments at `TIMBER_LEAD_DAYS`, at
  `orderGlass` and in `warnings.ts`, the test titles, the one literal 10
  (`tests/scenarios/turn28.test.ts`) and the two literal 12 (`tests/engine/t28Timber.test.ts`).
  The half of the test that says "the day before it is due it is still on its way" has lost its
  premise at one day: flip it to say what is true now.

**2.2 One cutter set of a kind [TUNE: chat; found by Turn 28's report].** One set serves every
moulder the company has, a set is never sold, and the card still offers `Buy another`: the second
is money thrown away. `canBuy` refuses a cutter set of a kind the company already has or has on
order, in the shape the tool changer's refusal has (owned and not sold, plus on order), with the
words `One set serves every moulder`. The card then shows the locked `Buy another` and the words
under it, with no change to the card. A save that holds two keeps both.

**2.3 A standing contract takes four joiners at the most [PIOTR, 05.10].**
`CONTRACT_MAX_JOINERS` 4.

Where it is asked. `contractAssignCheck` is the one door every path goes through (the engine's
`assignContract`, the Orders board's Contracts tab, the Work Plan's Contracts tab). It refuses a
man who is NOT on the contract when the contract already holds four, with the engine's own line,
`A contract takes four joiners at the most` (a function beside `contractsFullLine`, so the UI
prints the engine's words). Two things about that door:

- `assignContract` runs the same check before it takes a man OFF. The cap must never stop that:
  a man who is on the contract always passes.
- The four are the men put on it, whether or not they are in today. A man off after an accident
  or on the second shift holds his place.

What the player reads, on both tabs, in the classes those tabs already have:

- A count on every running contract, the engine's line, through `countRow`: `On it: 3 of 4`
  and, when full, `On it: 4 of 4, the most a contract takes`.
- Orders board tab, a free joiner's row on a full contract: the locked `Put on it` the tab
  already has for a refusal, which is the one allowed disabled button, its reason the line above.
- Work Plan tab, a full contract: the reason stands in place of `Assign to this contract`
  (`reasonLabel`), and the popover is not opened for it. Today that popover would open and say
  `Nobody is free: every joiner is on a job or a contract` with free men standing by: that
  sentence must never be shown for a contract that is merely full.
- The two lines that count men for a contract count four at the most: `contractMenNeeded`
  (never `for 5 men at the least`), and the hall line of the offer (`contractHallCapacity` and
  `contractHallLine`). Today that line sums every joiner on the books and reckons the places
  the hall is short of with `fullCrew` standing at the piece's machine (the owner and every
  joiner who is in today). With four or fewer joiners on the books nothing of it changes, the
  figure or the words `at full crew`. With more than four it sums the four joiners with the
  highest rate, the earlier hired winning a tie, reckons the places short with four men at the
  piece's machine in place of `fullCrew`, and reads `Your hall makes about N of these a week
  with four on it`.

What does not change: the offer, the price, the week, the short week, the renewal, the three a
shop runs at once, the material, and the payment of every piece. A job is not touched (section 1).

A save with more than four on a contract is trimmed by the lift of section 4, and the player is
told.

### C. The big kit

**2.4 The pictures [PIOTR, 05.10].** The art side delivered 22 files in three packs (the robot
and the five axis CNC; the line's five modules; two timber stores). They are in
`docs/pictures-t29/`, already named as the game names them, with `pictures-t29.json` (metres,
file size and anchor of each, checked by chat against `src/render/sprites.ts`: all 22 fit with no
table of pixels). `git mv` them into `public/sprites/`, run `npm run sprites:manifest`, and
delete the folder with its JSON once section 13 of `docs/art/SPRITES.md` carries the table. They
are not on main's `public/sprites/` already because three assertions in two test files pin
counts of pictures (the turned ones, 96, become 107 here, in `tests/engine/rotate.test.ts` and
`tests/render/spriteClasses.test.ts`; the measured class files, 96, become 107 as the families
land).

| File in `docs/pictures-t29/` (and its `.r`) | Family | Metres | The art side called it |
|---|---|---|---|
| `cnc5.standard.png`, `cnc5.pro.png`, `cnc5.industrial.png` | `cnc5` | 5 x 3 x 2.5, 6 x 3 x 2.75, 8 x 4 x 3 | the same |
| `sprayRobot.standard.png` | `sprayRobot` | 2 x 1 x 2.25 | the same |
| `windowLine1.standard.png` to `windowLine5.standard.png` | `windowLine1` to `windowLine5` | 6 x 3 x 2.5 each | `windowLine.stage1` to `stage5` |
| `timberRack.standard.png` | `timberRack` | 4 x 1 x 2.5 | `timberStorage.rack` |
| `timberShelter.standard.png` | `timberShelter` | 3 x 6 x 3 | `timberStorage.shelter` |

Why the names changed. A family in this game has the five classes or one class called
`standard`, and two test files hold it to that. Five modules at five prices and two stores of two
shapes are therefore seven families of one class each, the way the high capacity rack is a family
of its own beside the rack, and their files carry `.standard`. Chat renamed them and touched no
pixel.

The shelter's two views changed places. The art side drew it 6 m long by 3 m deep. It stands
outside on the apron, which is 3 m wide (2.11), so the game declares it 3 wide by 6 deep: the art
side's 90 view is `timberShelter.standard.png` and its 0 view is the `.r`. Kit outside is never
turned, so the `.r` is on disk for the tests and the Sprite check page and is never drawn on the
hall. Say so in SPRITES.md.

What they are, said plainly in SPRITES.md section 13 and in the report: all 22 are rendered from
models by the art side, exact to the contract, in the plainer look of Turn 28's pack 1 and not in
the look of the September machines; Piotr has seen that and it stays for now. No agent alters a
pixel. If one sits badly on its footprint in the Sprite check page, the report shows it and
`docs/art/REQUESTS-T29.md` names it.

Two places where the pictures and the game part, to be said in the same two places. Module 1 is
drawn as an infeed and a planer with no saw (the art side's own table: feeding, planing and
profiling). The game gives it the Cross cutting all the same [TUNE: chat]: Piotr's first stage
needs a five axis CNC and a press beside it and nothing else, and with the Cross cutting left at
the saws every man on the line would still be counted against the cross cut saws' two or three
places. Its card says what the game does, and a saw at module 1's infeed is on E1's list for the
art side. And the two timber stores are drawn full of timber, with no empty picture and no
layer: a store bought this morning shows a full load over a plate of `0 / 40`. That is known and
stays tonight; the stores drawn empty are on the same list.

**2.5 Three rules the new kit needs first.** Each is small, each is used by several sections
below, and each is written once.

*2.5.1 Kit that stands only in the big unit.* A spec may name the least unit it stands in. The
five axis CNC and the line's five modules name the 800 m² unit. `canBuy` refuses them in a
smaller one with `Needs the 800 m² unit`, straight after the reputation's refusal, and the card
shows the locked button and the words as it does for any refusal: they are in the catalogue from
day 1, as a thing to save for. No other family names a unit.

*2.5.2 A ladder of fewer than five classes.* `tests/engine/variants.test.ts` and
`tests/ui/machine.test.ts` allow a family exactly the five classes or exactly `standard`. The
five axis CNC has three: `standard`, `pro`, `industrial`. Flip both tests to the rule that a
family on `CLASS_LADDER_FAMILIES` has an unbroken run of `CLASS_ORDER`, in order, of two classes
or more; every family that is on the list today still has its five. The first class of a family
is what its catalogue line shows and what a default purchase buys: for `cnc5` that is `standard`.
The catalogue's first use tip says `Every machine family has five classes`, which the `cnc5`
makes false: `TIPS.catalogue` becomes `A machine family comes in classes, up to five: the
effects come first, then the costs, then what it is.` [TUNE: the wording].

*2.5.3 Where a stage of a timber job is done is asked of the hall.* Today `familyForStage(job,
stage)` knows nothing of what stands in the hall, and a timber job's plan is the constant
`TIMBER_STAGES`. Two things of tonight do a stage that another machine does today: the five axis
CNC does the Moulding (2.6), and a module of the line does the stages it covers (2.9). So for a
timber job, and for a timber job only, the family of a stage becomes a question asked of the
state. `familyForStage` has five call sites, three of them in `contracts.ts`, and every one has
the state at hand or is the price's fixed reference. Leave `familyForStage` and its two
arguments as they are (five test files call it so, `tests/scenarios/turn19.test.ts` among them,
which section 1 says is not touched) and write the one function beside it that has the state;
let `stageSpeed`, `stagePlanFor` and through them `jobPace`, `crewAtFamily`, `drawnPlaces` and
the Work Plan read that one answer.
No new `StageId` is made: the stage is still the Moulding or the Planing, its bar, its bag of
labour, its label and its night are what they were, and only the machine under it changes. A
sheet job's stage is done where it is done today whatever stands in the hall: the plan of a
sheet job with a five axis CNC, a robot and a whole line in the hall is, stage for stage and
family for family, what it is on v83, the robot's Finishing of 2.7 excepted.

The order of the answer for a timber job's stage, first that applies:

1. the line's module that covers it, while the line runs at that level (2.9);
2. for the Moulding, the five axis CNC, while one runs (2.6);
3. the family it has today.

*2.5.4 What a timber product asks for, when something stands in for it* [TUNE: chat].
`TIMBER_EQUIPMENT` asks a window for a cross cut saw, a planer, a spindle moulder, a sander, a
frame press and a booth, each tested with `has`. From tonight a machine on that list is not
missing while the thing that does its stage stands in the hall: a `cnc5` for the spindle
moulder; module 1 for the cross cut saw and the planer; module 2 for the spindle moulder; module
3 for the sander; module 4 for the frame press. The booth is always asked: nothing stands in
for it. "Stands" is `has` for the `cnc5`, as for every kit the board asks. For a module
it is being one of the unbroken run from module 1 (`lineModules`, 2.9.4): the modules that
stand, not the level the line runs at today, so that an engineer's day off never locks the
board. One table says who stands in for whom, and `missingEquipment`, `lockReasonFor`,
`kitBlockFor` and the second copy of the wanted list in `src/ui/board.ts` read it.

The words do not change with a stand in. A lock or a grey reason names only what is missing
with nothing standing in for it. The tile's `Needs` line prints everything the job wants,
owned or not, and goes on printing the list it prints today (with the timber store of 2.11.3
after it), whatever stands in the hall.

**2.6 The five axis CNC [PIOTR, 04.10: "one five axis CNC replaces four spindle moulders, from a
weak one at 150 thousand to a fully automatic one at 500 thousand"].** A family `cnc5`, name
`Five axis CNC`, folder `Five axis CNCs`, tab `cncCentre` (the tab `CNC centre` exists, is
empty, and a test pins it empty: flip it). Category `machine`. Three classes.

| | standard | pro | industrial |
|---|---|---|---|
| Price [PIOTR: 150 and 500; TUNE: chat: the middle] | 150,000 | 300,000 | 500,000 |
| Metres [the art side's] | 5 x 3 x 2.5 | 6 x 3 x 2.75 | 8 x 4 x 3 |
| Men it keeps busy (`MACHINE_CAPACITY`) [TUNE: chat] | 12 | 20 | 32 |
| Extraction wanted, m³ an hour [TUNE] | 2,000 | 2,400 | 3,000 |
| Power a day [TUNE] | 16 | 24 | 36 |
| Delivery, working days [TUNE] | 45 | 45 | 60 |

What it does [PIOTR: "one replaces four"; TUNE: chat: how]. While a five axis CNC runs, the
Moulding of every timber job is done on it and not at the spindle moulders, and goes at
`CNC5_STAGE_FACTOR` 4 times the hall's pace at it, the class's pace on top as for every family:
the CNC's own way with the Cutting of a sheet job, with a four where that has a two. The twelve
of the weak one is four moulders at three men each, which is how Piotr counted them on 04.10.

- "Runs" is `familyRuns`: one that is broken, away for its service, short of air or stopped by
  full bags does not, and the Moulding goes back to the moulders that minute, or by hand if
  there are none. Nobody waits.
- A timber job's men count against its places and not against the spindle moulders' while it
  runs; that follows from the plan (`crewAtFamily`) and needs no line of its own.
- A sheet job's Moulding stays at the spindle moulder. Nothing else of a timber job changes: the
  bench does not go faster for it, as it does behind the sheet CNC.
- It stands in for the spindle moulder on the board (2.5.4). The cutter sets are still asked:
  it cuts with them too.
- Each class card says what it does in one line among its effects, from the constant: `The
  Moulding of windows and doors goes 4 times as fast on it`. The sheet CNC's card says nothing
  of its own two, and that stays.

The rest of its rows [TUNE], on the CNC's pattern unless said: the 800 m² unit (2.5.1); zone its
footprint and a metre more each way; `requiresOneOf` the extractor or a central system, as the
CNC; dust 0.06 as the CNC; air 6.5 bar and 650 litres in every class as the CNC; no dry air
asked tonight; `enduranceFactor` 1.2, 1.5, 2 on the default hours; `HEAVY_SPECS`; serviced,
broken and repaired as any machine; `MACHINE_SHORT_WORDS` `five axis CNC`; `STATION_TABLE` the
front; `PORTS` one line a picture file, `.r` among them, measured off the pictures as Turn 28's
were, and the Sprite check page shows no red line; on the list that keeps sheet men from being
drawn at timber machines (`TIMBER_FAMILIES`), since only a timber job is made on it. An order
for one cannot be called off (2.10). One sentence a class in the catalogue's voice, from the
picture: an open gantry over a table of consoles and clamps, one head, loaded by hand; a closed
cabin with sliding doors, a carousel of tools and automatic clamps; fully automatic, with
loading and unloading tables and two heads.

**2.7 The spraying robot [PIOTR, 04.10: "the same spray booth at first and later a robot arm
that sprays by itself"].** A family `sprayRobot`, name `Spraying robot`, folder `Spraying
robots`, tab `spraying`, category `machine`, one class, 2 x 1 x 2.25 m in a zone of 3 by 2, price
120,000 [TUNE: chat], delivery 30 working days, power 8 a day, `requires: ['sprayBooth']`.

What it does [TUNE: chat]. While the hall has a robot that stands, is not broken and is not away
for its service, the Finishing done at a booth goes `SPRAY_ROBOT_FINISH_FACTOR` 2 times as fast.
It is the hall's, as the tool changer's five per cent is the hall's: the engine has no way to
say which booth a man's minute was at, and none is to be invented. So:

- It is written once, in `stageSpeed`, where the bench is doubled behind a CNC. The plan, the
  board's days, the Work Plan and the deadline then see it. It is NOT written into the two
  production minutes the way wet air is.
- One robot is enough, and a second would do nothing: `canBuy` refuses a second with `The hall
  has its spraying robot`.
- It speeds the Finishing of a lacquered sheet job too (about eight per cent on the whole job).
  That is meant, and it is the one thing of tonight a sheet job can feel.
- It has no places and no man stands at it: no row in `MACHINE_CAPACITY`. Its dust is nought (a
  row of nought in `DUST_OUTPUT_M3_PER_HOUR`, which a test asks of every machine family), it
  asks for no extraction and no air of its own. It is carried in, not unloaded as heavy kit.
- Its card says what it does in one line of its own, from the constant, in place of the Output
  line a machine's card has: `The Finishing at the booth goes 2 times as fast`. It has no line
  on the Output sheet, where the loop over the machine families would give it `best in the
  hall` at nought, and no row in `machineSavings`.
- Nobody stands at it, so no hours are booked to it and its life does not run down; it is
  serviced by the calendar as every machine is. Known and left tonight [TUNE].
- Wet air does to the Finishing what it does today, and the night the lacquer dries stands as
  it stands: the robot brings that night forward and never removes it.
- With no booth that runs it does nothing.

**2.8 The line engineer [PIOTR, 05.10: "one or two engineers at 15k a month, depending on the
size of the line"].** A new `WorkerRole`, `lineEngineer`: label `Line engineer`, one grade (no
tier), 15,000 a month [PIOTR], no reputation asked, duties `Keeps the production line running.
One keeps up to three modules, two keep all five.` [TUNE: chat: where the second begins].

- Hired on the Workshop tab, by the hire tile every role has.
- Two refusals of his own, in `hiringOptions` with the others: `The company has no production
  line` while no module stands and none is on order; `Two engineers keep the whole line` once
  two are on the books. Then the bank's line as for anybody.
- He builds nothing, takes no task and no job, needs no bench, locker or tools, and is not
  counted in the crew: all of that follows from the lists he is not on.
- He is not one of the men the production manager carries. They are counted twice, by
  `menCarried` (`src/engine/staff.ts`) and by `carriedBy` (`src/engine/usage.ts`, for Our
  team), and both pass over him.
- He is never drawn on the hall: no figure exists for him, as none exists for the office. Who
  is drawn is decided by `NEVER_ON_THE_HALL` (`src/engine/staff.ts`), and he goes on it.
- His eight hours a day are in the hours the company pays for, as everybody's on the books
  are, so the month's `real work out of paid for` reads lower for a company with a line; and
  he is a head for the liability premium. Both are meant and neither is touched.
- He is never called idle. Wherever the game would say a man with nothing in his hands is
  standing (the mark over a man, the line under his name, `free` on his card, `standing most of
  the week` on Our team), an engineer on duty in a company with a module that stands is `at the
  line`, and his week is a full week.
- On Our team his tile has a sentence of its own, as the manager's has: `The line runs as 3 of
  its 5 modules.` A full week would otherwise print `Near full. More work of this kind wants a
  second man.` for him, which asks for a man the game may refuse.
- "On duty" is on the books today: started, and not absent. It holds for the second shift too:
  the line runs at night under the engineers of the day.
- The tables the compiler forces (`ROLE_WORDS`, `ROLE_WORDS_MANY`, `NOBODY_WORDS`,
  `TRADE_OF_ROLE`) and the lists that decide silently (`USAGE_TRADES`, so that Our team has his
  tile; `CHARACTER_ROLES`, the Sprite check page's list of every role, where he stands as the
  capsule the office's three stand as; `NEVER_ON_THE_HALL`) each get him; the tests that pin
  the set of roles, the Workshop tab's candidates and the roles with no figure are flipped, by
  name, in the report.

**2.9 The production line [PIOTR, 04.10: "a production line through the whole hall, no spraying,
in five stages from 1.5 million to 5 million; it is extended, not replaced; the first is small
and needs a five axis CNC and a press beside it; the later ones stop needing the CNC, then the
sander, and so on; at each stage output goes up by a percentage, and the same percentage idea
for materials and labour"; 05.10: "work it out and propose"].**

*2.9.1 Five modules.* Five families of one class each, category `machine`, each 6 x 3 x 2.5 m,
its zone its footprint and not a cell more (the pictures butt end to end), in a new tab `line`,
label `Production line`, after `CNC centre` [TUNE: chat: a twelfth tab beside the eleven Piotr
named; the test that pins the eleven, and its title, are flipped].

| Family | Name | Folder | Price | Line so far | What it is, and the stage it does |
|---|---|---|---|---|---|
| `windowLine1` | Window line, module 1 | Line module 1 | 1,500,000 | 1,500,000 | Infeed and planing: the Cross cutting and the Planing |
| `windowLine2` | Window line, module 2 | Line module 2 | 750,000 | 2,250,000 | A CNC with two heads in the line: the Moulding |
| `windowLine3` | Window line, module 3 | Line module 3 | 750,000 | 3,000,000 | Through feed sanding: the Sanding |
| `windowLine4` | Window line, module 4 | Line module 4 | 1,000,000 | 4,000,000 | A press and frame assembly: the Pressing |
| `windowLine5` | Window line, module 5 | Line module 5 | 1,000,000 | 5,000,000 | A robot takes the frames off into a buffer: no stage of its own |

[PIOTR: five stages, 1.5 million to 5 million. TUNE: chat: that the 5 million is what the whole
line has cost, and how the 3.5 million between is shared.]

Every module is delivered in 30 working days [TUNE: chat], one figure for all five. A module can
be ordered only once the one before it is ordered (2.9.2), so with equal days none stands before
the one it follows, and the modules that stand are always an unbroken run from module 1. With a
shorter wait for the later ones, modules 2 to 5 would stand for days with no module 1.

*2.9.2 Buying a module.* The refusals a module can meet in `canBuy`, in the order they are
asked:

1. `Needs the 800 m² unit` (2.5.1), straight after the reputation's.
2. What it `requires`, where every kit's is asked and in the words that has. Module 1 requires
   a five axis CNC and a frame press [PIOTR]. Module 2 requires module 1, and so on: `Needs
   Window line, module 1 first`. A thing on order meets a `requires`, as it does for all kit
   (an order is checked against the hall as it will be once everything on the road has landed),
   so a company with the money may order all five in one morning.
3. One of each: a module the company has, or has on order, is refused with `The line has this
   module`, beside the tool changer's refusal and in its shape.
4. `Not enough cash`, as for all kit.
5. Its own piece of floor must be clear. That is asked in place of the question every other
   machine is asked last: `No free 6 m by 3 m in the hall` is never said of a module. The line
   stands in one place, chosen by the game: `WINDOW_LINE_ORIGIN` is the cell (5, 14), module N
   stands at x = 5 + 6 x (N - 1), y = 14, six cells along x and three along y, at orientation
   0, so the whole line takes the cells x 5 to 34, y 14 to 16, in the half of the hall the
   second extension added [TUNE: chat: the cells]. `anchorFor` gives a module those cells by a
   case of its own, before the default anchor is asked. They are NOT written as
   `STARTING_LAYOUT` slots: `tests/engine/metres.test.ts` stands every slot that is not `yard`
   on the 200 m² floor. If anything stands on a module's cells or is on order for them, the
   purchase is refused in the shape the canteen's enlargement has, through `standingOn`: the
   catalogue's own names as that refusal writes them (`andList`, and `inASentence`, which is
   private to `src/engine/premises.ts` today) and the module's metres as `metresBy` writes
   them, `Move the four sided planer and the sheet rack off the line's 6 m by 3 m`; and,
   while kit is half shifted, `The kit is half shifted. Finish the move first`. Nothing holds
   the cells of a module not yet bought: the refusal is the hold.

*2.9.3 A module is not ordinary kit.*

- It is never moved and never turned: `canPlace` refuses both, for the module that stands and
  for the outline of one on order (both branches of that function), with `The line stands where
  it is built`; its card has no Turn row and setup mode does not drag it.
- It is built in by the maker's fitters and stands in its place on the morning it is due: it is
  not heavy kit, there is no unloading task and no picture of it at the gate.
- It is sold only from the end: a module with a later one standing or on order is refused with
  `Sell the module after it first`. The last one sells for half its price, as any machine.
- Men do not walk across it, as they do not walk across any machine's picture.
- Kit that stands within two metres behind a module can be painted over it, as behind any long
  machine. That is known: show it in the report if it is seen, and do not mend it tonight.

*2.9.4 How much of the line runs.* `lineModules(state)` is the unbroken run from module 1 of
modules that stand: 1, 2 and 4 standing are 2. `lineLevel(state)` is what of that run its
engineers keep today: nothing with no engineer on duty, three modules at the most with one, all
five with two (2.8). So a line of five with one engineer in runs as a line of three, and a line
with none stands still: its stages go back to the machines that did them before, if they still
stand, and by hand if not, exactly as when any machine does not run.

A new line on the warning strip, `lineNeedsEngineer`, directly under `nobodyAssigned` [TUNE]:
`The line stands still: no engineer on duty`, or `The line runs as three modules: one engineer
on duty`. It is said only while modules stand that no engineer keeps.

*2.9.5 What a module covers.* While the line runs at level L, the stages of modules 1 to L are
done on those modules, for timber jobs and timber contract pieces and for nothing else (2.5.3):

| Stage of a timber job | Done on, from level |
|---|---|
| Cross cutting, Planing | `windowLine1`, from 1 (it is drawn with no saw: 2.4) |
| Moulding | `windowLine2`, from 2 (at level 1 it is on the five axis CNC, which module 1 required) |
| Sanding | `windowLine3`, from 3 |
| Pressing | `windowLine4`, from 4 |
| Finishing | the booth, always: the line does not spray [PIOTR] |
| Glazing | the benches, always |

A covered stage goes at the pace of an industrial machine [TUNE: chat], whatever class of the old
machine the company has or had, and the Moulding on module 2 at `CNC5_STAGE_FACTOR` times that:
a module is never slower than the best machine it stands in for. It is written in the one place
a family's pace is read: `classPaceOf` answers `MACHINE_PACE.industrial` for the module
families. Their one class is called `standard`, so left to the table a covered stage would run
at 1.05 and three screens would say so; with the one line in `classPaceOf`, `hallPace`,
`stageSpeed` and every screen agree.

Modules 1 to 4 each have a row in `MACHINE_CAPACITY` of 33 places [TUNE: chat: the 800 m² unit
takes 32 joiners and `crewAtFamily` counts the owner with them, so 33 is the whole company: the
line is never the thing a hall is short of]; module 5 has none. `MACHINE_SHORT_WORDS` gives all
five the words `line module`. The men of a timber job are drawn at the modules of their plan as
they are drawn at any machine of it (`TIMBER_FAMILIES`, `STATION_TABLE` the front).

What the line does not take off the hall: the booths. The Finishing is at the booth at every
level, so every man on timber is still counted against the booths' places, as the game counts
them today (section 8).

*2.9.6 What the line gives* [PIOTR: "output up by a percentage at each stage"; TUNE: chat: the
figures, which he asked chat to work out]. While the line runs at level L, every stage of a
timber job but the Finishing goes `LINE_FACTOR` times as fast, the stages the line does not
cover among them (below level 4 the stages still at their old machines, and at every level the
Glazing at the benches): the line is the department's flow, and what it feeds is fed faster. A
job made by hand uses no machine at any stage and feels none of it.

| Level | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| `LINE_FACTOR` | 1.4 | 1.6 | 1.8 | 2.1 | 2.4 |
| The same crew's windows, beside a hall with a `pro` five axis CNC, industrial machines elsewhere and no line (chat's arithmetic) | +32% | +46% | +60% | +79% | +97% |

It is written once, in `stageSpeed`, on a timber job's stages, so the plan, the board's days,
the Work Plan, the deadline and a timber contract's piece all read it. The second row is what
the first comes to on the engine's own sums in that one hall, with nothing else on the minute
and no family short of places (a `standard` five axis CNC gives +32, +47, +60, +79 and +97, an
`industrial` one +32, +46, +60, +79 and +96). Assert the first row and print the second in the
report from the built game, with the figure the built game gives if it differs.

*2.9.7 The timber the line saves* [PIOTR: "the same percentage idea for materials"; TUNE: chat].
The line cuts to a list and wastes less. A timber job taken while the line is N modules long
(`lineModules`, 2.9.4: the modules that stand, whatever the engineers keep today) is counted
`LINE_BOARD_SAVING` 3 per cent fewer boards for each of them, 15 per cent with all five.

One function counts a timber job's boards, and `takeEnquiry` and the board tile both read it.
Today each counts them for itself (`src/engine/jobs.ts`, `src/ui/board.ts`) and a test holds
the two equal only in a hall with no module. The saving comes off the boards' cost before the
boards are rounded up, never below one board: `sheetsForCost` of the boards' cost less the
saving. Nineteen boards with one module are eighteen (3,640 less 3 per cent, over 200, rounded
up). The job's `materialCost` is not changed and the glass's share is what it was: what is
saved is the boards that are not ordered. A job already taken is not recounted, and a
contract's piece is not touched (its timber is the client's, 2.12).

*2.9.8 Its cards, and the sheets that list machines.* Each module's card says, from the
constants and never in written figures, what it covers and what the line gives with it: `Does
the Cross cutting and the Planing of windows and doors`, and `With the line this long timber
work goes 1.4 times as fast, the Finishing excepted`. Module 5, which covers no stage, says
`Takes the finished frames off the line` for the first. Module 1's says what it needs beside
it. These lines stand in place of the lines a machine's card has, by a case of its own beside
the glue table's: a module's card prints no Output, Dust, Life or `Keeps up to N men busy`
line. What every card prints of its costs (the wait, the power, the insurance, the floor) is
unchanged.

On the sheets that list machines the line is one thing and never five:

- The Output sheet has one line for the line, `Production line, 3 modules`, worth `LINE_FACTOR`
  less one at the level it runs at today, acting on `timber work, the Finishing excepted`, and
  none for a module (its loop over the machine families would give each `best in the hall`).
- The top bar's plate (`paceLines`) the same: one line `Production line, 3 modules` with its
  per cent, and none for a module (each would read `Line module, standard`).
- A module is not on the Machines page: it has no life to run out and no service to call.
- A module has no row in `machineSavings` (the Company page's machine hours and the month's
  end): no hours are booked to kit that is not serviced.

Say in the report how each reads.

**2.10 What the dear kit costs to own.** Category `machine` brings a service at a tenth of the
price twice a year, a breakdown once a service is due, a repair at a twentieth, a burglar who
takes the dearest machine first, and a place in the security firm's price, which has no ceiling:
by the game's rules as they stand, five million of line would cost about 83,000 a month in
services, 51,000 to 122,000 a month in security, and could be carried off in a night. None of
that is what Piotr meant by "one or two engineers at 15k a month". So, for the five modules of
the line and for nothing else [TUNE: chat, all of it]:

- **Kept by its engineers.** A module is not serviced, has no life in hours and never breaks
  down. Two lines make that true and both are needed: `isServiced` is false of it, and
  `overdueBreakdownChance` is nought for it, as it is for the central systems. `isServiced`
  alone keeps it out of the day's roll only: the night's roll (`rollNightBreakdowns`) asks
  nothing but that chance of every machine a second shift man stood at, and for kit that is
  never serviced a service reads as due for ever once 180 days have passed. The hall's
  `(service due)` under a name asks `isServiced` too, as the Machines page does. That one line
  also takes a false `(service due)` off every bench, rack and tool cabinet older than 180
  days, which carry it on v83: meant, and the one thing of this section other kit feels.
  This is what the engineers are paid for, and without them the line does not run at all
  (2.9.4).
- **Not carried off.** A module is never a burglar's target (`burglaryTargets`).
- **Not in the security firm's price.** The firm's price reads the insured value less the
  modules. The Security page's sentence that shows the sum says so in one clause, only for a
  company that has a module: `the production line is not in it`.
- **Insured like everything.** A module is in the insured value and so in the property cover's
  premium at the game's own rate: about 5,000 a month for module 1 and 16,700 for all five, in
  the 800 m² unit. Not changed.
- **Power** 60 a day a module [TUNE], every day as for any machine.
- **Extraction of its own**, as the booth has: no row in `EXTRACTION_DEMAND`, a row of nought
  in `DUST_OUTPUT_M3_PER_HOUR` (a test asks one of every machine family), no port, no air,
  nothing into the hall's bags.
- **Built to order.** An order for a module cannot be called off: `Built to order: it cannot
  be called off`, in place of the refund. The same for the five axis CNC. Today any order is
  refunded in full until the lorry comes, and the tax takes a quarter of the cash on
  30 December: a million and a half ordered before Christmas and called off in January would
  save 375,000 of tax for nothing. The same hole is open for every other machine and is NOT
  closed tonight (section 8); say so in the report.

So the line of five costs, a month, in the 800 m² unit: two engineers 30,000, power about
9,000, the property cover about 16,700 if the company holds it. Print the built game's own
figures for each level in the report.

The five axis CNC and the robot are ordinary machines in every one of these respects: serviced,
repaired, insured, in the firm's price and a burglar's target, like the CNC. The one exception
is the five axis CNC's order, which cannot be called off.

**2.11 The timber stores [PIOTR, 05.10: sent with "you have it in the zip"; TUNE: chat: what
they do, which he has not said].** Boards are kept on a timber store and never on a sheet rack.

*2.11.1 Two families*, category `storage`, tab `storage`, one class each.

| | `timberRack` | `timberShelter` |
|---|---|---|
| Name, folder | Timber rack, Timber racks | Timber shelter, Timber shelters |
| Metres | 4 x 1 x 2.5, zone 4 by 2 | 3 x 6 x 3, zone its footprint |
| Where | on the hall floor, placed like a rack | outside on the apron, placed by the game |
| Boards it holds (`boardCapacity`, a field of its own) | 40 | 400 |
| Price | 1,200 | 18,000 |
| Delivery, working days | 3 | 15 |

A store is never given a `sheetCapacity`: that would make it a sheet rack everywhere. A spec key
called `capacity` is forbidden by a test; `boardCapacity` is not.

The shelter stands on the apron as the van does (`STARTING_LAYOUT`, `yard: true`, its first cell
x 0, y 1 of the apron), found a place by `apronPlaceFor` and refused with `No room on the apron`
when there is none. Like all kit outside it takes no cell of the hall, is never moved or turned,
and asks no free floor. It is not heavy kit: it is put up where it stands.

`canPlace` refuses the outline of kit on order that stands outside as it refuses the kit itself,
with `It stands in the yard`. Today only the branch for kit that stands refuses, the outline of
everything on the apron is drawn with the drag hook, and the shelter is fifteen working days on
order: its outline could be dragged into the hall. The same line closes it for a van on order.

*2.11.2 One counter, two kinds of storage.* The engine keeps one figure for sheets and boards
(`state.stock.sheets`), and it keeps it tonight: no second counter, no second stock. A board is
never free stock; it is always a timber job's own, ordered for it and held for it. So the boards
in the workshop are what the timber jobs hold (`job.timber` and its `sheetsReserved`), and
everything else in the counter is sheets. From that one reading:

- **Room.** The sheet racks hold the sheets and the timber stores hold the boards. A delivery
  for a timber job is unloaded onto the stores and needs room there. A delivery of sheets needs
  a rack, as today, and the racks' room is counted without the boards. `canUnload`, `stockFree`
  and `unloadIntoStock` ask by the delivery's kind. (`canUnload` is asked without the delivery
  in three places today: where the tasks are handed out, the owner's own start, and the lorry's
  card.) A delivery says whether it is boards (an optional mark set when it is made for a
  timber job, so a save's deliveries need no lift; one without the mark is read from its job).
- **Boards come off the lorry whole or not at all, and never go to the paid store** [TUNE:
  chat]. A load of sheets that does not fit leaves its overflow in the paid store for the
  night, while the job it was ordered for holds the whole of it from the unloading. For boards
  that would put the counter and the jobs' holdings apart by the overflow until the morning's
  fetch, and every reading of this section wrong by that much. So boards are unloaded only
  while the timber stores have room for the whole load. Until then the task is not handed out
  and the lorry stands at the gate. Once it is unloaded the whole load is on the counter and
  held for its job, and `moveOverflowToStorage` is never reached for boards. (Two loads begun
  in the same hour may leave a store over its figure until a job draws: the plate then says
  so, as a rack's does.)
- **A load that cannot come in is never silent** [TUNE: chat]. Today it is, wherever a labourer
  is on duty: the lorry's card is not raised for a load whose unloading is the labourer's
  (`unloadIsNotTheOwners`), at arrival or on a click on the pallet, and the owner's row says
  `Waiting for the labourer`, because `startTaskCheck` asks that before the room. A company
  with timber keeps a labourer. So from tonight, for boards and by the same lines for sheets
  with no rack: the card of a load that cannot be unloaded is raised at arrival and on the
  click whoever unloads; `startTaskCheck` asks the room before the labourer, so the row says
  `Nowhere to put it`; and the strip carries a line while a load of boards stands at the gate
  for want of room, `boardsAtTheGate`, directly under `glassNotOrdered`, the first of them by
  its job: `Boards at the gate, no timber store: Sash windows for Mrs Patel`, or `Boards at the
  gate, no room on the stores: Sash windows for Mrs Patel`. The pallet drawn at the gate is the
  first waiting load that can be unloaded, and the first waiting load when none can: today it
  is always the first, and a load that waits for days would keep its hook from every load
  behind it.
- **The lorry's card**, in the shape it has for sheets. With room: `19 boards have arrived.
  Nothing can be made until they are inside.` With no timber store: `19 boards have arrived and
  there is no timber store to put them on. Buy one from the catalogue.` With the stores too
  full: `19 boards have arrived and the timber stores have room for 16. They wait at the gate
  until a job uses its boards or another store is bought.` The last two carry the one choice
  the card has today with no rack, `Leave it at the gate`.
- **The plates and the page.** A sheet rack's plate and the Materials page's sheet line count
  sheets only. Each timber store's plate carries the boards on it, spread over the stores in
  the order they were bought as `sheetsOnRack` spreads sheets. The Materials page has one row
  more, in the rows it has, `Timber boards`, held and room.
- **The word.** Where a count of boards is printed with the word `sheets` today it says
  `boards`: the task `Unload 19 boards`, the pallet's `Delivery: 19 boards`, the ledger's
  `Order cancelled: 19 boards`, the Orders list's `19 boards`, a timber job's and a timber
  delivery's rows on the Materials page, the job card's count and the board tile's `19 boards
  of material`. Two more readings of the counter count sheets only from tonight: the Low stock
  card (`N sheets left of M`, which prints the whole counter today) and the mark over a
  contract man waiting for sheets (`held by jobs`, which sums every job's holding). The day
  summary's line for tomorrow's lorries is built from bare numbers kept in the day's record
  and goes on saying `sheets`: known, left tonight, and on the report's list. The paid store's
  own three lines (`Temporary storage for`, `Fetch N sheets from storage`, `are in paid
  storage`) stay as they are: no board goes there from tonight.
- **A job that is dropped.** Its boards are written off and leave the workshop: off the counter
  when the job goes, and every delivery of the job that is not yet unloaded, on the road or at
  the gate, is removed with its unloading task. The books already write the material off
  (`Material written off`); what changes is the boards themselves. Today the boards a job held
  stay behind as free sheets of MFC, which they never were, and a load at the gate loses its
  task with the job and stands there for ever with the pallet's hook.
- **Selling.** A timber store with boards on it is not sold: `Empty it first, 12 boards on it`,
  the rack's own refusal. A sheet rack's refusal counts sheets only.
- **The walk.** An unloading has one station today, the rack, which the hall resolves to the
  first sheet rack in every place that draws or walks the man. The man who unloads boards
  walks to a timber rack: a second station, given by `unloadStation` from the delivery's kind
  and resolved to the first timber rack on the floor. With a shelter and no rack he stays at
  the gate: nobody is walked out onto the apron tonight.
- **What does not change.** How many boards a job needs (but for 2.9.7), how they are ordered
  and paid, the day they come, how the job draws them, the insurer's reading of the stock and
  the burglar's (he takes free sheets, and a board is never free). The oak dining table, which
  is solid wood and not a timber job, is on the racks as it is today.

*2.11.3 The board asks for a store.* The five products ask for a timber store as they ask for a
machine: either family satisfies it (2.5.4's table: each stands in for the other), standing and
nothing less. It is the last name of the wanted list and is written `timber store`, in the form
the list has (lower case, no article, commas). A live tile without one is locked with `Needs
timber store` or, with a planer missing as well, `Needs four sided planer, timber store`; a
greyed one says `no timber store`, or `no four sided planer, timber store`. The tile's `Needs`
line prints what it prints today and `timber store` after it.

And the stores must be able to hold the job [TUNE: chat]. A load comes in whole (2.11.2), a big
commercial job's boards are more than two racks hold, and a job whose boards the company's
stores could not take even when empty would stand at the gate until another store was bought
and had come. So an enquiry is not taken while its boards (the one count of 2.9.7) are more
than the timber stores that stand hold between them. It is asked of the enquiry, in `canAccept`,
beside the big job's question of the crew and in its shape: a line of its own on the tile, in
the classes that line has, red, printed only while it is true, `113 boards, and the timber
stores hold 40`, and no Accept while it stands.

*2.11.4 A save.* Nothing a save holds is lost and nothing is moved by a lift: its timber jobs
hold their boards, the stores' plates show them from the first minute whether or not there is a
store or room on it, and it is the next delivery that needs the room. A timber job whose boards
are already in is finished without a store. One whose boards are still on the lorry or at the
gate needs a store before they can come in, like every load of boards from tonight, and the
card and the strip say so. Boards that a v41 save has in the paid store come back when the
fetch is done, as they do today; until then the plates read high by them, and a count of sheets
is never printed below nought. Known, and left. The board asks for the store at the next
enquiry.

**2.12 Windows and doors as standing contracts [PIOTR, 05.10: "are we doing something like
standing orders for windows and doors?"; TUNE: chat: everything below].**

*2.12.1 Three pieces*, appended to `CONTRACT_PIECES` after the three there are, in this order.
`ContractPieceSpec` gets an optional mark, `timber: true`. Its `stages` is a required field,
read in four places of `contracts.ts` and printed by the tile: for these three it is the seven
ids of `TIMBER_STAGES`, in its order.

| id | name | minutes | material | sheets |
|---|---|---|---|---|
| `casementWindow` | Casement window | 150 | 0 | 0 |
| `sashWindow` | Sash window | 190 | 0 | 0 |
| `frenchDoor` | French door | 180 | 0 | 0 |

*2.12.2 The client sends the timber and the glass.* A window company or a builder gives the
making out and supplies the material, which is how such work is given out: nothing comes off the
racks or the stores, nothing is ordered, the piece's price is the making alone. That is the
table's two noughts, and it is the path the engine already has for a piece with no sheets. No
glass is ordered and no night is stood on a contract. A contract is the plain way of making
windows: the making alone, nothing to order, no night to wait, and four men at the most. A job
is the whole of it.

*2.12.3 A timber piece is made as a timber job is made.* Today a piece is worked at the pace of
its first stage only, its men are counted against that one family, drawn at the sheet machines
and worn on one machine. For a piece with the mark, and for no other:

- its minute is the one pace of the whole timber plan as the hall stands: `jobPace` of a timber
  `StagedJob` of labour value 1, so every machine of the department, the five axis CNC, the
  robot and the line all show in it as they show in a job. The labour value matters: all six
  sites build their job with a labour value of 0 today, a plan's stages are as wide as the
  labour value, `jobPace` passes over a stage of no width, and the pace of an empty job is 1 in
  every hall, with no machine in it at all;
- its men count against every family of that plan, as a timber job's men do (`crewAtFamily`),
  and the hall line of its offer (2.3) reckons the places short at every family of the plan;
- its men go round the families of that plan and are drawn at them (`contractRoundOf`,
  `drawnPlaces`);
- the wear the card and the closing report figure is spread over the plan's stages by their
  shares (`TIMBER_STAGES`), not read as nought. `pieceMachineShare` is where it is nought
  today: it reads the shares off `PRODUCTION_STAGES`, which has no timber stage;
- `contractMachineTip`, one of the six sites, tips the one machine that would shorten a piece's
  first stage and has no rule for a plan of seven families: for a timber piece it answers
  null, and no tip is printed.

Wherever `contracts.ts` builds `stagedJob(0, 'sheet', false)` (six places) it asks the piece
which kind it is. A sheet piece is worked, counted, drawn and worn exactly as on v83.

*2.12.4 The offer.* Timber pieces are offered only to a company in the 800 m² unit
(`timberOnTheBoard`). The draw must not move for anybody else: `drawContract` picks from the
first three pieces below the 800 m² unit and from all six in it. Its `pick` is one draw
whatever the length of the list, so a company in a smaller unit draws the same piece from the
same stream as on v83. Two tests count `CONTRACT_PIECES` and are flipped to the three sheet
pieces: `tests/engine/contracts.test.ts` (200 seeded games in the 200 m² unit must draw every
piece) and `tests/engine/contractPrices.test.ts` (`toHaveLength(3)`).

Like every contract, a timber contract asks for no machine, no cutters and no store [PIOTR,
03.10: "standing contracts stay as they are"]: without the machines its men work by hand at the
by hand pace, and make little at it. One offer at a time, three contracts at once, the weekly
ring, the term, the short week and the renewal are shared with the sheet pieces and unchanged.

*2.12.5 The price and the minutes.* By `contractPriceFor`, as for every piece: the experienced
man at the standard class, a day's 200 of margin over the whole pieces he makes in a day. For a
timber piece the reference pace is the timber plan's with every family of the plan at its
standard class, the booth and the bench among them (1.05 throughout: no five axis CNC, no
robot, no line), and the reference machine for the wear is the standard four sided planer
[TUNE]. With the experienced man that is 179, 226 and 214 minutes a piece, two a day each, and
still two a day if the bench and the booth are read at 1.00 (188, 238 and 225). Assert two a
day for each at the reference. The quantity a week comes off the same bands through
`quantityForPiece`. Print the three reference prices in the report.

Why the pieces are half a day and no longer [TUNE: chat]. The cards count a contract by the day,
in whole pieces (`resultAtSpeed`, `contractMenNeeded`, `weekPace`): a man whose piece takes
more than his day reads no piece a day, nothing a day, a week or a term, and `short` all week,
while in the hall he goes on finishing them. That arithmetic is v83's and is not changed
tonight. At these minutes the slowest man the game has, a novice working by hand, still
finishes each in a day (375, 475 and 450 minutes), so no card of a timber piece reads nought.

*2.12.6 The words.* A contract's name is the piece's plural written out and not `name + 's'`,
which made `Drawer boxs` in Piotr's own save: `Drawer boxes`, `Sash windows`, `French doors`
(`pluralOf` is in `src/engine/text.ts`). Names already in a save stay. On a timber piece's tile
and cards the sheet words are not printed:

- the tile's line (`pieceLine`) reads `150 minutes of work a piece on the timber machines. The
  client sends the timber and the glass: nothing comes off your racks.` No raw stage ids, no
  `£0 of material in it` clause and no `It comes off the rack` sentence;
- the offer card has no `Material a piece, from stock` row, and its wear row reads `Machine
  wear a piece, the timber machines`, or `by hand` as today when the hall has none of them;
- `The timber machines stay in the general queue: better ones make more pieces without a
  click` for the saw's sentence.

### D. The logo

**2.13 The logo [PIOTR, 04.10: "the logo everywhere"; 05.10: "do the logo too"].** Piotr's pack
(`Woodwork-Empire-Tycoon-Logo-FINAL.zip`) was not in chat's hands when this was written. If the
folder `docs/logo-incoming/` exists on main with files in it, he has put the pack there: do this
section, last of all. If it does not exist or is empty, skip the section whole, touch none of
the four places, and say so first in section 0 of the report.

With the pack: read what is in it (its own README if it has one) and choose the files; no agent
redraws, recolours or trims a logo, and scaling a copy down for the web is all that is done.

1. The files go under `public/brand/`, served at `/brand/...`; the folder `docs/logo-incoming/`
   is deleted once they are there. A big file gets a smaller copy for the page (WebP if the
   session can make one, PNG if not), and the report says what size was served.
2. The start screen: the logo in place of the words of `<h1>Woodwork Empire</h1>`, its `alt`
   those words; the sketch of the unit under it stays where it is, and nothing else of the
   screen moves [TUNE: chat: Piotr was shown two variants on 04.10 and has not chosen; this is
   the one in which nothing disappears].
3. The menu: the logo, small, as the first thing under the cross.
4. The page's head: a `<link rel="icon">` from the pack's mark, the title `Woodwork Empire
   Tycoon`, and the tags a pasted link shows a picture by (`og:title`, `og:image`).

No new colour, font or token; a size rule beside `.start-panel` and one beside `.menu-pop` is
all the stylesheet gets. Mockup first (section 9).

## 3. How to run this session

**One writer.** Only the lead agent edits files under `src/` and `tests/`, changes
STATE_VERSION or APP_VERSION, commits and pushes, and it does the tasks strictly in the order of
section 5, one at a time. No worktrees and no parallel branches.

**Sub-agents are allowed, under that one rule** [PIOTR, 05.10, as in Turn 28]. They may only do
work that touches no file another agent is touching: read the repo and report; build the mockups
of section 9 under docs/mockups/t29/; measure the extraction ports off the new pictures and hand
the numbers to the lead; draft test cases for the lead to add; review each finished task's diff
against this brief and section 7 before its commit; write docs/art/REQUESTS-T29.md and
docs/notes-t29.md. A sub-agent never commits, and never runs `npm test`, `npm run build` or `npm
run check` while the lead's own check is running (2.0). If a sub-agent's result disagrees with
this brief, the brief wins.

**Do not stop and do not ask.** Piotr is not watching and nobody will answer a question. Where
this brief leaves a choice open, take the simplest reading that fits what is already in the
repo, mark it [TUNE] in the code and list it in the report. The only reasons to stop are the
brief's own: the first line of CLAUDE.md is not "Turn 29", or APP_VERSION on main is not 'v83'.
A red test is not a reason to stop the session: handle it as 2.0.1 says.

**Push after every task**, so that nothing is lost if the session ends early. If the session
runs short: stop cleanly at the end of a task, never in the middle of one, and say first in
section 0 of the report which tasks were not reached. Section 5 is in the order of what matters
and is built so that every stopping place is a whole game.

## 4. State

STATE_VERSION 42, once, in the first task that needs it (B3). A v41 save is at the current
version today and is loaded with no lift at all, so nothing below happens without the bump. A
v41 save opens with:

- every standing contract's `assigned` cut to the four men put on it first (the list is in the
  order they were put on), and each man taken off given back to the boss: his contract marker
  cleared (`worker.jobId`), so that he reads as a man who needs a job and is seen by the lists
  of free men from the first minute. The player is told once, by an event card that opens at
  the first settle after the save is loaded, and not the next morning. It is a new kind on
  `GameEventKind`, `contractsTrimmed`: title `Contracts take four joiners`; body `A standing
  contract takes four joiners at the most from now on.`, then one sentence a contract, `Taken
  off Cut sheet packs for Northgate Interiors: Ben and Pete.`, and last `They are waiting for
  work.`; one choice, `Right`. No lift queues an event today, and the lifts work on raw JSON
  before the state is whole: let the lift leave what it took off on the save (an optional
  field) for the first settle to queue through `queueEvent` and clear, or let the lift push a
  whole event on to `eventQueue` itself, whichever is the smaller. No card for a save in which
  nobody was taken off. (Turn 26 capped the shop at three contracts with no word to a save over
  the cap, and v65 had to mend it: this is that lesson.)
- a glass that is `ordered` with a day later than the next working day brought forward to the
  next working day;
- nothing else changed: no job, man, machine, board, price or place of a save is touched. The
  timber stores need no lift (2.11.4), the new role and the new kit have nothing in an old save.

Every save that loads today loads, the fixtures among them. Say in the report what the lift
does, what fields were added and where, and list the version pins flipped.

## 5. Task queue, in order

Branch turn-29-the-line from main. One commit per task, npm run check green on its own exit code
before each, the branch pushed after each, two report lines per task in REPORT-T29.md.

T29-A0 The suite on v83 (2.0.1).
T29-A1 Housekeeping and v84: docs/turn-28-brief.md is already in docs/ (this ZIP put it there),
this file as CLAUDE.md, the README's lines, APP_VERSION 'v84', the version pins.
T29-A2 The mockups of section 9 into docs/mockups/t29/ with a README.
T29-B1 2.1 the glass and the timber deadline's three days.
T29-B2 2.2 one cutter set of a kind.
T29-B3 2.3 four joiners to a contract, with STATE_VERSION 42 and the lift of section 4 (the
contract crews and the glass on its way).
T29-C1 2.4 the 22 pictures in, the manifest, the count of turned pictures, SPRITES.md section
13.
T29-C2 2.5 and 2.6: the unit a spec names, the ladder of fewer than five classes (with the two
tests that buy every family into the 200 m² unit, tests/engine/zones.test.ts and
tests/engine/layout.test.ts, taught to pass over kit that unit refuses for its size), where a
timber stage is done, who stands in for whom on the board, and the five axis CNC with every
side table, its ports and its station.
T29-C3 2.7 the spraying robot.
T29-C4 2.8 the line engineer. Nobody can hire him until C5 lands the modules: at the end of this
task his tile stands on the Workshop tab refused with `The company has no production line`,
which is a whole game. His refusals, his lists and his words are asserted here; hiring him, his
duty, `at the line`, his tile on Our team and the strip's line are asserted in C5.
T29-C5 2.9 and 2.10: the five modules, their purchase and their floor, the level, what each
covers, the factor, the boards saved, the cards, and what the line costs to own. The line is
bought and runs at the end of this task and not before: do not land a module that can be bought
and does nothing.
T29-C6 2.11 the timber stores.
T29-C7 2.12 windows and doors as standing contracts.
T29-D1 2.13 the logo, if `docs/logo-incoming/` is there.
T29-E1 notes (docs/notes-t29.md) and docs/art/REQUESTS-T29.md (anything that sits badly; a saw
at module 1's infeed; the two timber stores drawn empty; the three cutter sets and the twelve
stand in pictures of Turn 28 if still wanted; a figure for the line engineer; the products on
the hall, for Piotr to decide).
T29-E2 scenarios, one line a moved figure, and five new ones. (xx): a save with seven men on one
contract opens with four on it, three waiting for work and the card; a fifth man is refused on
both tabs in the engine's words; a man is taken off a full contract and another put on. (yy): a
company in the 800 m² unit with the timber kit buys a five axis CNC and a robot; a window's
Moulding moves to the CNC and its pace is the engine's own sum; with the CNC away for its
service the Moulding is back at the moulders that day; a lacquered kitchen's Finishing is
faster and nothing else of it has moved. (zz): the same company orders module 1, is refused
with a rack standing on its cells, moves the rack, orders, hires an engineer; the module lands
by itself on its day; the window's Cross cutting and Planing are on it and its pace is the
engine's sum at level 1; all five and two engineers give level 5; one engineer let go gives
three modules and the strip's line; none gives a line that stands still and the old machines'
pace; module 3 is refused for sale while 4 stands. (aaa), played with a labourer on duty: a
window's boards arrive with no timber store, are refused, and the card and the strip say so;
with a timber rack they are unloaded onto it and the sheet racks' plates count sheets only; a
second window's boards that the rack has not room for stand at the gate and come in whole once
the first has drawn its own; a window dropped with its boards at the gate leaves no load and
no board behind. (bbb): a company in the 800 m² unit is offered sash windows as a contract,
takes it with four men, is paid for every window with nothing off the racks, and makes more of
them a week with the line than without; a company in the 400 m² unit is never offered one and
its seeded offer is what it was on v83.
T29-E3 cross check. T29-E4 look and shoot: the pictures of section 7 into docs/report-t29/.
T29-E5 report (REPORT-T29.md, section 0 first: what was not reached, what is red, whether the
logo was done, section 10's list with what was built, and the two halls section 8 asks to be
printed) and PR titled `Turn 29: the production line, the five axis CNC, the timber stores, and
four to a contract`, do not merge, end the session.

**Tests chat already knows will move.** This brief was checked against v83 before it was sent,
and these are the tests that check found the turn will break. The list is a start and not the
whole; the lines are v83's. Each is flipped to say what is true now, never kept beside a new
one.

- B1: the one literal 10 and the two literal 12 named in 2.1.
- B3: `tests/engine/contractHall.test.ts`, lines 72 to 171: six joiners in the hall line (144;
  144 and 180; the words `at full crew`; 162 and 144; 156 and 168). Restated with four on it.
- C1: the three pins of 96 (2.4).
- C2: `tests/engine/variants.test.ts` and `tests/ui/machine.test.ts` (2.5.2);
  `tests/ui/catalogueTabs.test.ts` line 187 (the empty CNC centre); `tests/engine/ports.test.ts`
  line 60 (37 measured classes, 40 with the `cnc5`) and line 97 (84 files, 90);
  `tests/engine/metres.test.ts` lines 131 to 134 (every catalogue line is on one of its two
  lists of metres: the `cnc5` here, then the robot, the modules and the stores as each lands).
- C3: `tests/engine/dust.test.ts` lines 18 to 22 (a row in `DUST_OUTPUT_M3_PER_HOUR` for every
  machine family: the robot here, the five modules in C5); `tests/engine/layout.test.ts` line
  195 (`hallItems` 23, and 24 once the robot is in the catalogue).
- C4: the pins of the set of roles and of the roles with no figure:
  `tests/engine/boothJoiner.test.ts` line 87, `tests/ui/spriteCheck.test.ts` line 237,
  `tests/render/capsule.test.ts` line 115, and `tests/ui/team.test.ts` for the Workshop tab.
- C5: `tests/ui/catalogueTabs.test.ts` lines 142 to 155 (the eleven tab labels in order, and
  the title that says eleven); `tests/engine/warnings.test.ts` lines 399 to 418 (the whole of
  `WARNING_ORDER`, and its title) and lines 423 to 448 (every key but five named ones, in a
  hall with no module: `lineNeedsEngineer` joins the five).
- C6: the same two tests of `warnings.test.ts` again, for `boardsAtTheGate`;
  `tests/ui/catalogueTabs.test.ts` lines 198 to 205 (the Storage tab's folders);
  `tests/engine/layout.test.ts` line 195 again (25 with the timber rack, or still 24 if the
  rack's line comes after the robot's and the 200 m² floor then has no free 4 m by 2 m: say
  which in the report). `tests/engine/t28Timber.test.ts`: its helpers `timberHall` (lines 104
  to 124) and `bigHall` (635 to 662) have no store, so every case that takes a window through
  them fails on the store (151 to 190, 222 to 230, 700 to 738): give the helpers a store; line
  143 pins the six of `TIMBER_EQUIPMENT`; lines 747 to 749 pin the tile's `Needs` line; line
  751 reads `sheets of material`. `tests/scenarios/turn28.test.ts` lines 42 to 77:
  `windowCompany` has no store, so neither (vv) block takes its window: give it one.
- C7: `tests/engine/contracts.test.ts` lines 889 to 901 and
  `tests/engine/contractPrices.test.ts` line 86 (2.12.4).
- Every pin of STATE_VERSION 41 and of `v83`.

## 6. Do not (tonight)

- No limit on the men of a normal job, and nothing of `addToJob`, `assignJob`, `canBuild`.
- No change to the payment of a contract's pieces, its price formula for the three sheet
  pieces, its bands, its term, its short week or its renewal.
- No change to a sheet template, a sheet stage, its shares, or a sheet job's plan; the one thing
  a sheet job may feel is the robot at the Finishing (2.7).
- No change to the places, pace, price or power of any family the game already has. The spindle
  moulder's places stay 2, 4, 4, 6, 8 (section 8).
- No change to the two nights, the glass's share, its payment or its stop.
- No change to the tax's arithmetic, the loan, the overdraft, the bank's count, the wages, the
  owner's base, the reputation, the insurance's rate.
- No change to the security firm's price but the one clause of 2.10, which no company without a
  module can feel. No change to the service, breakdown or burglary of any kit but the modules
  (the false `(service due)` label of 2.10 goes from kit that is never serviced, and nothing
  else of it changes).
- No second counter of stock, no stock of timber bought ahead, no timber on a contract's books.
- No picture drawn, repainted, trimmed or scaled by an agent (a smaller copy of the logo for the
  web is the one exception); no placeholder drawn for a product on the hall; no figure drawn
  for the engineer; no sound; no new screen, modal kind or CSS token.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `npm run check` green on its own exit code; the count of tests and files in the report; every
  `it.skip` in the tree listed with its line of reason (the aim is none).
- Glass: ordered on a working day it is in at the next working day's open; a timber enquiry's
  deadline is the old rule's plus three working days; a save's glass on its way is in on the
  next working day; `TIMBER_LEAD_DAYS` is the sum of 2.1 and no literal. Asserted.
- A second cutter set of a kind is refused in the words of 2.2, on order or owned; a first of
  each kind is not. Asserted.
- A fifth joiner is refused by `contractAssignCheck` in its words; a man on a full contract is
  taken off; a refused man stays on the contract he was on; the Work Plan's popover is not
  offered for a full contract and the false sentence is not printed; the count row reads on both
  tabs; `contractMenNeeded` never says more than four; the hall line of an offer counts the four
  joiners with the highest rate and reads `with four on it` for a company of six, and is to the
  figure what it was on v83 for a company of three. Asserted.
- A job takes a fifth, a ninth and a twentieth man as on v83; the three tests named in section 1
  are untouched (`git diff main` shows no changed line in any of the three).
- A v41 save with seven on a contract opens with the first four, three men with no marker, and
  the `contractsTrimmed` card at its first settle; one with four or fewer opens with no card.
  Asserted, on a raw save in tests/cloud/migrate.test.ts as v24's lift is.
- The 22 files are in `public/sprites/` and the manifest; `docs/pictures-t29/` is gone; the
  Sprite check page shows a file and a footprint for each new family and no red port line.
- A company in the 200 or the 400 m² unit is refused a five axis CNC and every module with
  `Needs the 800 m² unit`, and buys a robot, a timber rack and a shelter. The two tests that buy
  the whole catalogue into the 200 m² unit pass over what it refuses for its size and nothing
  else. Asserted.
- The plan of a sheet job, laminate and lacquered, in a hall with a five axis CNC, a robot, a
  whole running line and both stores is family for family what it is with none of them, and its
  pace differs only by the robot at the Finishing. Asserted.
- Five axis CNC: each figure of 2.6's table; a timber job's Moulding is on it while it runs and
  at the moulders when it does not; the Moulding's speed is four times the class's pace; a
  window is takeable with a `cnc5` and no moulder, and not without its cutters. Asserted.
- Robot: the Finishing's speed in `stageSpeed` is twice the booth's with a robot that stands and
  runs, and the booth's own with it broken or away; a second is refused. Asserted.
- Engineer: hired only with a module standing or on order; a third refused; never one of the
  men the manager carries, by `menCarried` or by `carriedBy`; never drawn; never read as idle
  while a module stands; his tile on Our team says how much of the line runs and never `Near
  full`. Asserted.
- `lineNeedsEngineer` is on the strip only while modules stand that no engineer keeps, in the
  words of 2.9.4, and sits directly under `nobodyAssigned` in `WARNING_ORDER`. Asserted.
- Line: each price and each refusal of 2.9.2 in its order; a module on occupied cells refused
  with the names of what stands there; a module never moved, turned or sold out of the middle;
  five modules ordered in one morning stand on one morning; `lineModules` and `lineLevel` for
  0, 1 and 2 engineers and for a gap in the run; each stage of 2.9.5 on its module from its
  level and back on its old family below it; the speed of a covered stage in `stageSpeed` is
  `LINE_FACTOR` times 1.12 at its level, and of the Moulding on module 2 `LINE_FACTOR` times 4
  times 1.12; `LINE_FACTOR` on every stage but the Finishing; 33 men on timber work with the
  whole line raise no `Too few` line for a module; the boards saved on a job taken with 0, 1
  and 5 modules, the tile's count and the job's the same each time; a line that stands still
  gives the pace of the hall without it. Each asserted.
- What the line costs: no service is due for a module; no breakdown is rolled for one by day or
  on the second shift, 200 days after it was bought; the hall prints no `(service due)` under
  one, nor under a bench or a rack of that age; a burglary never takes one; the security firm's
  price for a company with five modules is what it is for the same company without them; the
  property premium counts them; a module is not on the Machines page and has no row in
  `machineSavings`, and the five have one line between them on the Output sheet and on the top
  bar's plate; an order for a module or a five axis CNC is not called off, and an order for a
  planer is. Asserted.
- Stores: boards are unloaded only onto a timber store and sheets only onto racks; with no store
  the task is refused; with room for 16 a load of 19 stands at the gate and comes in whole once
  a job has drawn three; with a labourer on duty the card of a refused load is raised at
  arrival and on the click, the owner's row says `Nowhere to put it`, and `boardsAtTheGate` is
  on the strip directly under `glassNotOrdered`; no board is ever in the paid store; the plates,
  the Materials page and the Low stock card count each kind on its own; a dropped window's
  boards are gone from the counter and its load is gone from the road or the gate with its
  task; a store with boards on it is not sold; the outline of a shelter on order is not dragged
  into the hall; a window is not takeable without a store, is with either, and is not while
  its boards are more than the stores hold; a v41 save's timber job whose boards are in is
  finished without one. Asserted.
- Timber contracts: never drawn for a company below the 800 m² unit, whose seeded offers are
  those of v83 (assert it on the seeds the scenarios already pin); a timber piece's minute is
  the timber plan's pace, which is not 1 in a hall with the machines and is higher with a five
  axis CNC than without; its men are counted against every family of the plan; nothing is
  taken off the counter and no glass is ordered; each of the three is two a day at the
  reference and one a day for a novice by hand; no machine tip is offered for one; a sheet
  piece's minute, count, round and wear are what they were on v83. Asserted.
- A contract drawn tonight for drawer boxes is called `Drawer boxes for ...`. Asserted.
- `git diff main --stat -- src/ui/styles.css` shows no new token; every changed screen is in the
  report beside its nearest existing one.
- The pictures: the catalogue's CNC centre tab with the five axis CNC's three classes; the
  Production line tab with its five folders, module 1's card locked and unlocked; the 800 m²
  hall with the whole line standing, the five axis CNC and the robot at a booth, men at the
  modules; the same hall with module 1 alone; a module refused for what stands on its cells;
  the hire tile of the engineer; the strip's line with no engineer; the Output sheet with the
  line's row; a timber rack on the floor with its plate and the shelter on the apron; the
  Materials page with the boards' row; the lorry's card with no timber store and with the
  stores too full; the strip with boards at the gate; a window's tile the stores cannot hold; a
  full contract on each of the two tabs; the offer tile of a sash window contract; the card of
  the trimmed save; the Security page's sentence for a company with the line; and, if the logo
  was done, the start screen, the menu and the browser tab.

## 8. Parked

- **A spindle moulder takes three men at most** [PIOTR, 04.10]. Still parked from Turn 28: it
  would reach the sheet department and every running save. Chat asks Piotr.
- **The tax and an order that is called off.** Any order is refunded in full until the lorry,
  so money ordered away before 30 December and called back in January is never taxed. Closed
  tonight for the modules and the five axis CNC only (2.10); the rule for everything else is
  Piotr's to decide.
- Whether the line's 5 million is the whole line or each stage's own price; the split between
  the stages; where the second engineer begins.
- A spraying robot for each booth; the line's own lacquer hall [PIOTR, 04.10: "a separate hall
  later"].
- Timber bought ahead as stock on the stores, and a contract that uses the company's own timber.
- The frames that are drying taking floor; the grade of the timber; remedial visits.
- The products drawn on the hall; a figure for the engineer; the twelve stand in pictures and
  the two sanders of Turn 28 that stand off their anchors.
- The thicknesser's place in the timber department (it still has no stage).
- The night's breakdown roll asks nothing of what kind of kit a second shift man stood at, so
  a workbench can break down at night once 180 days have passed. Seen while this brief was
  checked against v83; no kit but the modules is touched tonight (section 6).
- A sheet job dropped with its delivery at the gate: the load loses its unloading task with the
  job and stands there for ever (v83). Mended tonight for boards only (2.11.2).
- Four men on one window in a hall of standard timber machines, two places each, are short at
  five families at once, and the five lines between them put every man in the hall on the floor
  of 0.25 (v83: Turn 28's places under the hall wide rule of v53). A timber contract's four men
  will do the same. Piotr's to decide; print that hall's Output sheet in the report.
- The booths a company with the line needs: every man on timber is counted against the booths'
  places, as the game counts them, so thirty men on the line want several industrial booths
  with racks. The line's own lacquer hall is Piotr's later step. Print in the report what the
  800 m² hall with the whole line and twenty men on timber is short of.
- The spraying robot's life, which does not run down because nobody stands at it (2.7).
- A man walked out to the shelter on the apron (2.11.2); the stores drawn empty; the day
  summary's word for tomorrow's boards.
- The board after a closure (the enquiries all gone on the first day back); the bank's count
  through a closure; a save standing in late December that never pays that month's wages.
- Piotr's open questions after v82: the security firm at 800 m², the waste collection, the
  second extension's card shown early.
- The owner's forced holidays once he has a manager; accidents; the crisis.
- From Turn 27: the account at nought and the tax; the one off licence that runs out with no
  card; the first month's wage of a man hired late.

## 9. Mockups (docs/mockups/t29/)

Before the code, each in the classes of the screen it belongs to and beside that screen as it is
today: (1) a running contract on the Orders board tab and on the Work Plan tab, with three of
four and with four of four, the locked row and the reason in place of `Assign to this
contract`, and the card a trimmed save opens with; (2) the CNC centre tab with the five axis
CNC's folder open on three classes, and the Spraying tab with the robot's card; (3) the
Production line tab with its five folders, module 1's card as a 200 m² company sees it, as an
800 m² company with no five axis CNC sees it, and as one that can buy it sees it, and a module's
refusal for what stands on its cells; (4) the engineer's hire tile on the Workshop tab, refused
and offered, and the strip with `lineNeedsEngineer`; (5) the Storage tab with the two timber
stores, the Materials page with the boards' row, the lorry's card with no timber store and with
the stores too full, the strip with `boardsAtTheGate`, and a window's tile that the stores
cannot hold, beside a big job's tile with its crew line;
(6) the offer tile of a sash window contract beside a cut sheet pack's; (7) if
`docs/logo-incoming/` is there, the start screen and the menu with the logo, beside both as
they are. A README names which is which. No art is asked of the art side before the code; what
is asked of it afterwards is in docs/art/REQUESTS-T29.md.

## 10. What chat decided and Piotr has not confirmed

For the report to repeat, each with what was built:

1. The timber deadline's twelve days become three with the glass at one day.
2. A second cutter set of a kind is refused.
3. A save over four on a contract is cut to the first four, with a card; the hall line of an
   offer counts the four best men. And chat's reading of his answer on payment: every piece of
   a contract is still paid, past the week's order too, as on v83.
4. The five axis CNC: 300,000 for the middle class; the Moulding four times as fast in every
   class; 12, 20 and 32 men kept busy; only in the 800 m² unit; its order cannot be called off.
5. The robot: 120,000, one for the hall, the Finishing twice as fast, sheet jobs too.
6. The engineer: on the Workshop tab, one for up to three modules and two for all five, hired
   only once the line is ordered, two at the most, never drawn.
7. The line: 5 million for the whole of it, shared 1.5, 0.75, 0.75, 1 and 1; a tab of its own
   in the catalogue, the twelfth; only in the 800 m² unit; 30 working days for every module;
   what each module covers (the Cross cutting and the Planing, the Moulding, the Sanding, the
   Pressing, and no stage for the fifth), module 1 doing the Cross cutting though it is drawn
   with no saw; a covered stage at the pace of an industrial machine; 33 places a module; who
   stands in for whom on the board (a five axis CNC or module 2 for the spindle moulder,
   module 1 for the cross cut saw and the planer, 3 for the sander, 4 for the press); a fixed
   place on the cells x 5 to 34, y 14 to 16; never moved; sold only from the end; the factor
   1.4, 1.6, 1.8, 2.1 and 2.4 on every stage but the Finishing; three per cent of the boards
   saved a module.
8. What the line costs to own: no service, no breakdown, no burglar, out of the security
   firm's price, in the insurance, 60 a day of power a module, extraction of its own; an order
   for a module cannot be called off.
9. The timber stores: 40 and 400 boards, 1,200 and 18,000; the shelter outside on the apron;
   boards only on a store and a window not takeable without one, nor while its boards are more
   than the stores hold; a load of boards unloaded whole or left at the gate, and never sent
   to the paid store; a strip line for boards at the gate; a dropped job's boards and its load
   gone.
10. Timber contracts: three pieces of 150, 190 and 180 minutes; the client's timber and glass,
    no nights, no glass to order; made on the whole timber plan; only in the 800 m² unit; no
    machine asked.
11. The logo: in place of the title's words with the sketch kept, in the menu, as the tab's
    icon, and the title `Woodwork Empire Tycoon`.
12. Small things: the catalogue's first tip no longer says every family has five classes; the
    cards of the five axis CNC, the robot and the modules each say what they do in a line of
    their own; a load that cannot be unloaded raises its card with a labourer on duty too,
    sheets with no rack among them; the false `(service due)` goes from benches, racks and
    cabinets.

End of brief.
