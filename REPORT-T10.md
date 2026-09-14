# Report: Turn 10

Air and dust that have to add up, a team in tabs, and a board worth reading twice a day.

Branch `claude/happy-franklin-spf6kq` (the cloud environment names the branch; the brief's task
queue would have called it `turn-10-air-and-dust`). Base: `8d0c5d3` on that branch, which is
Piotr's commit putting this brief in the repository. 943 tests green, up from the 850 at the end
of Turn 9. `npm run check` clean on its own exit code before every commit.

---

## 1. Done

| Task | Commit | What went in |
|---|---|---|
| T10-01 Housekeeping and v12 | `7ca9e22` | `docs/turn-9-brief.md` out of git history, the README pointing at it, `APP_VERSION = 'v12'`, and the two generated sprite indexes written again so the art the repository already holds is visible to the loader at all. |
| T10-02 On-order kit, and the anchor | `70e0844` | A machine on the road cuts nothing and the stage that wants it says which lorry it is waiting for. `spriteBox` places a picture by its real anchor, which is not the middle of the file for any object whose width and depth differ. |
| T10-03 Working-day deadlines | `8f21dcd` | `workingDaysBetween` and `workingDayIndex` beside the `addWorkingDays` Turn 8 wrote. Friday plus three is Wednesday, a weekend is no days late, and the Work Plan's axis has no column for a Saturday. |
| T10-04 Extractor and compressor classes | `fe2d968` | Five classes each, with Piotr's footprints, capacities, bar and litres; the air dryer; the tab renamed; three footprints measured against the art that was actually delivered. |
| T10-05 Extraction sums | `8861357` | `src/engine/media.ts`: demand against capacity every minute, the 20% margin, the dust at 3x, the 0.30 off the hall and the point of rating a dusty piece loses. |
| T10-06 Air sums | `1c922b1` | Bar, litres, the compressor a machine is assigned to, the dryer, the wet air finish, and a compressor whose clock runs only while something draws on it. |
| T10-07 Ducts | `19e3ba2` | The plant outside on the apron, the run along the rear wall every four metres, the drop to every ducted machine and the green ring with the flexi system. |
| T10-08 The Team board | `f1c793e` | A page of the game in tabs by trade, the office admin every other desk is hired behind, and the draftsman. |
| T10-09 The board, livelier | `ba8233e` | Twice a day, express at 30% to 50% with no weekly cap, and the jobs the workshop cannot take standing on it greyed with the reason. |
| T10-10 Rotating machines | `6b6f138` | R and a Rotate button, the zone turned, `canPlace` checking it, the picture mirrored about its anchor or taken from a `.r` file. |
| T10-11 Default zoom | `095ecc6` | The hall opens at 1.2 of the fit, in the middle of the frame. |
| T10-12 Single-click coverage | `43fb6f7` | The four controls this turn added on the Turn 9 list, and the greyed enquiries drawn better for it. |
| T10-13 Scenarios | `4964b14` | The fourteen months re-measured, and months (o) and (p). |
| T10-14 Report and PR | this commit | This file. |

---

## 2. Media numbers chosen

Every `[TUNE]` of 3.1 to 3.4, with the figure that went in. Piotr's own bands are marked; the rest
are placeholders chosen so the sums run, and none of them is presented to the player as a fact.

### 2.1 Extraction (3.1)

| Number | Value | Where |
|---|---|---|
| Demand, table saw | 800 / 900 / 1,100 / 1,400 / 2,200 m3/h | `EXTRACTION_DEMAND` `[PIOTR: bands]` |
| Demand, edgebander | hand classes 0; floor 1,400 / 1,800 / 2,400 | the same |
| Demand, thicknesser | 1,200 / 1,300 / **1,500** / 1,700 / 1,800 | the ladder is written out in full; the one class the game has is the standard one |
| Demand, solid wood tools | 1,100 / 1,200 / **1,300** / 1,400 / 1,500 | the same |
| Demand, CNC | **1,600** / 2,000 / 2,400 | the same |
| Demand, spray booth | not on the table | its own extraction, as the brief says |
| Capacity, extractor | 1,000 / 1,000 / 2,000 / 3,600 / 8,000 m3/h | `EXTRACTION_CAPACITY` `[PIOTR]` |
| Capacity, central dust system | 12,000 | the same |
| Capacity, flexi system | 15,000 | the same |
| Margin | 0.83 | `EXTRACTION_MARGIN` `[PIOTR: 20% margin]`, the brief's own figure |
| Dust while short | 3x | `UNDER_EXTRACTION_DUST_MULTIPLIER`, the same 3 a broken extractor makes it |
| Output while short | minus 0.30 | `UNDER_EXTRACTION_OUTPUT_PENALTY` `[PIOTR]` |
| Dusty job share | 0.10 of its own production minutes | `DUSTY_JOB_SHARE` `[TUNE]` |
| Dusty job rating | 1 point | `DUSTY_JOB_RATING` `[TUNE]` |

### 2.2 Compressed air (3.2)

| Number | Value | Where |
|---|---|---|
| Bench work, per joiner | 6 bar, 30 l/min | `AIR_BENCH_DEMAND` `[PIOTR]` |
| Pneumatic sanding at Finishing, per joiner | 6 bar, 200 l/min | `AIR_SANDING_DEMAND` `[PIOTR]` |
| Edgebander, floor classes | 7 / 250, 7 / 350, 10 / 500 | `AIR_DEMAND` `[PIOTR: 10 bar for the big one]` |
| CNC | 6.5 bar, 650 l/min | the same |
| Spray booth | 7 bar, 350 l/min | the same |
| Compressor bar | 8 / 8 / 10 / 10 / 13 | `COMPRESSOR_AIR` `[PIOTR]` |
| Compressor l/min | 150 / 250 / 450 / 1,100 / 2,300 | the same |
| Compressor endurance | 60,000 / 120,000 / 200,000 / 400,000 / 800,000 running minutes | `ENDURANCE_MINUTES_BY_CLASS` `[PIOTR]` |
| Compressor prices | 300 / 1,200 / 3,500 / 9,000 / 22,000 | `[TUNE]`, the brief's own ladder. Deviation 2 |
| Diversity factor | 0.6 | `AIR_DIVERSITY` `[PIOTR: 0.5 to 0.6]` |
| Headroom | 0.85 | `AIR_HEADROOM` `[PIOTR]` |
| Low air factor | 0.7 | `LOW_AIR_FACTOR` `[PIOTR]` |

### 2.3 The dryer (3.3)

| Number | Value | Where |
|---|---|---|
| Air dryer | 1 by 1 by 1.5 m, 1,500 | `AIR_DRYER_PRICE` `[TUNE]` |
| Built into | the industrial compressor | `COMPRESSOR_WITH_DRYER` `[PIOTR]` |
| CNC on wet air | does not run at all | `needsDryAir` `[PIOTR]` |
| Spray booth on wet air | Finishing at 1.5x, and a point of rating | `WET_AIR_FINISH_FACTOR`, `WET_AIR_FINISH_RATING` `[TUNE]` |

### 2.4 The classes and the ducting (3.4)

| Number | Value | Where |
|---|---|---|
| Extractor prices | 400 / 600 / 1,400 / 3,200 / 7,500 | `[TUNE]`, the brief's own ladder. The budget one keeps the 600 the single class cost |
| Extractor footprints | 1x1x2, 1x1x2, 2x1x2, 3x1x2.5, 5x1x2.5 m | `[PIOTR]`, and exactly the sizes the art side drew |
| Extractor zones | the footprint | `[PIOTR]` |
| Compressor footprints | 1x1x1, 1x1x1, 2x1x1.5, 2x1x1.5, 2x2x2.5 m | `[PIOTR]`, and exactly the sizes the art side drew |
| Bag and endurance factors | the saw's ladder | `BAG_BY_CLASS`, `ENDURANCE_BY_CLASS` |
| Extractor power | 2 / 3 / 5 / 8 / 14 a day | `[TUNE]` |
| Compressor power | 2 / 3 / 6 / 10 / 20 a day | `[TUNE]` |
| Central systems | 3 by 2 by 4 m, outside on the apron | measured against the delivered art. Deviation 3 |
| Pelletiser | 2 by 2 by 2.5 m | the same |
| Duct run | one length every 4 m at 3 m up | `DUCT_SPAN`, `DUCT_HEIGHT` `[PIOTR]` |
| Duct sprite | a 4 by 0.5 by 0.5 m object | which is the 232 by 148 file the art side delivered |

### 2.5 Everything else this turn chose

| Number | Value | Why |
|---|---|---|
| `APP_VERSION` | `v12` | The brief. |
| `STATE_VERSION` | 11 | A machine carries its compressor and its turn; a job carries its minutes. |
| `EXPRESS_PRICE_UPLIFT_MIN` / `MAX` | 0.3 / 0.5 | `[PIOTR]` 3.7, drawn uniformly. |
| `EXPRESS_PROBABILITY` | 0.25 | `[TUNE]` 3.7, flat at every draw. |
| `UNREACHABLE_MIN` / `MAX` | 2 / 3 | `[TUNE]` 3.7. |
| `BOARD_MIDDAY_MINUTE` | 300, which is 13:00 | `[PIOTR]` 3.7. |
| `DRAFTSMAN_RATE` | 0.8 | `[TUNE]` 3.6. |
| `DRAFTSMAN_MONTHLY_WAGE` | 2,400 | `[TUNE]` 3.6. |
| `DRAFTSMAN_REPUTATION` | 15 | `[TUNE]` 3.6. |
| `HALL_ZOOM_START` | 1.2 | `[PIOTR]` 3.9. |

---

## 3. Air and dust, which is most of the turn

`src/engine/media.ts` is the one place both sums are done, and both are done per minute over what
is actually running that minute.

**Extraction.** The demand is the sum of what every machine a man is standing at pulls; the
capacity is the sum of every fan in the hall, because a hall is one duct run however many fans are
on it. The hall may be worked to 0.83 of what it pulls. Above that line nothing stops: the dust
rises at three times the rate, every minute of production is worth 0.30 less through the one
output breakdown, and the hall and the company board both say "Extraction short: 2,500 of 1,660".
The piece on the bench keeps its own count of the minutes that went into it and of how many of
them were dusty ones, and a job delivered out of a workshop that was short for more than a tenth
of its own minutes loses a point of rating, with "dusty workshop" beside it on the board.

Piotr's figures bite from the first day: a used extractor pulls 1,000 and allows 830, which holds
the used saw at 800 and nothing dearer. A budget saw at 900 is already short of it. That is the
shape of the turn and it is not a rounding: the day 1 shopping list works, and the first upgrade
the player buys makes his hall worse until he buys the fan for it.

**Air.** Bar first: a machine whose pressure is above what its compressor gives does not run at
all, and the stage that wants it waits with "edgebander needs 10 bar, compressor gives 8". The
catalogue tile says the same figures before the money is spent. Then litres: for each compressor,
what is drawn on it at the trade's diversity factor of 0.6 against its own figure at 0.85. Above
that, every pneumatic consumer on that compressor runs at 0.7 for the minute, an amber lamp comes
on over it and the hall says "Low air on compressor 1: 192 of 128 l/min". The men at the benches
are consumers too, at 30 l/min for a nailer and 200 for pneumatic sanding.

The assignment is a valve and nothing else: every machine and every dryer carries the compressor
it draws from, null meaning the first one in the hall, and the Owned tab gives a chip per
compressor once there is more than one to choose between.

**The production minute was turned round** to make all of this true. The machines are taken first
and the hall is measured afterwards, so the sums are the sums of what is running this very minute
and not of last minute's. Nothing else about the minute changed.

---

## 4. Deviations from the contract

1. **The branch name.** `claude/happy-franklin-spf6kq`, not `turn-10-air-and-dust`: the
   environment names the branch and the session may only push to the one it was given. The same
   deviation as Turns 7, 8 and 9.
2. **There is no Turn 8 price table.** 3.2 and 3.4 say "prices from the Turn 8 table" and "the
   Turn 8 prices where set". Turn 8's table is a *delivery days* table; it sets no prices at all,
   and neither does its report. So the `[TUNE]` ladders the brief itself writes are what went in:
   extractors 400 / 600 / 1,400 / 3,200 / 7,500 and compressors 300 / 1,200 / 3,500 / 9,000 /
   22,000. The extractor's budget class keeps the 600 the single class of Turns 1 to 9 cost; the
   compressor's 350 has no place on the new ladder and is gone. Open question 1.
3. **Three footprints were wrong against the art that was delivered.** The central dust system,
   the flexi system and the pelletiser are drawn by the art side at sizes the engine did not
   have: 256 by 328 is a 3 by 2 by 4 m object and 208 by 232 is a 2 by 2 by 2.5 m one. They are
   those sizes in the engine now, because a picture drawn for one footprint and placed on another
   stands wrong in the hall, which is the whole of 3.12. `docs/art/SPRITES.md` section 6 still
   lists the old canvas sizes for them and cannot be touched tonight. Open question 2.
4. **The anchor test of 3.12 does not follow from its own formula.** 3.12 asks for
   `x = anchor.x - (SPRITE_PADDING + w x TILE_WIDTH) / SPRITE_SCALE` and then for a test that "a
   3 x 1 sprite's image left edge sits `d x 24` left of the corner at 1x". Those two disagree: by
   the formula the left edge sits `4 + w x 24` left of the anchor, which is 76 px for a 3 x 1 and
   not 24. The formula is what went in, because it is what `docs/art/SPRITES.md` section 2 states
   and what the delivered 4x templates carry, and the test asserts it exactly, together with the
   12 and the 24 px the old centred rule was out by for a 2 x 1 and a 3 x 1.
5. **A machine that is only on order makes the stage wait, where it used to fall back to hands.**
   3.10 asks for "waiting for table saw (on order, due day 2)" on the Cutting of a job whose only
   saw is on order. Nothing in the engine counted on-order kit as being in the hall already, so
   what was missing was the other half: the job was quietly made by hand at the Turn 1 penalty.
   It waits now. A family nobody owns and nobody has ordered still falls back to hands.
6. **The hiring still counts a bench that is on the lorry.** 3.10 says only the board's locks may
   count on-order kit. Turn 8 3.2 deliberately made the hire count it too, because the man starts
   the next working day and his bench lands at 08:00 that morning, and it has a test. That is not
   an "is it in the hall" question, so it stands. Open question 3.
7. **A broken extractor keeps its capacity in the sums.** 3.1 does not say what a broken fan
   pulls. Turn 2 3.9 already charges the hall for a breakdown, at a quarter speed, and charging
   the under extraction on top of it would take the same fault twice. The breakdown has its own
   line of the output breakdown and the sums read the fans as fitted.
8. **The draftsman's rate is 0.8 and the software factor is not applied again.** 3.6 says "0.8 of
   the owner's design speed x the software factor". The minutes of a drawing already carry
   `SOFTWARE_DESIGN_FACTOR` from Turn 1, so multiplying again would count the licence twice. His
   rate is the 0.8.
9. **The Rotate button is beside Done and not on the ghost.** 3.8 asks for "a Rotate button on the
   ghost". The ghost exists only while the mouse is down, because a drag in this game is press,
   move, release: a button drawn on it could never be pressed. It is in the setup control bar
   where a mouse can reach it, it lights while the turn is armed, and R does the same thing.
10. **The compressor moved onto the Extraction tab.** 3.3 renames the tab "Extraction and air" and
    puts the dryer on it. Leaving the compressors under Hand tools would have made the rename
    mean nothing, so they moved with the dryer. A compressor is not a hand tool; it is what the
    hand tools run on.
11. **The men at the benches draw on the first compressor.** 3.2 assigns *machines* to
    compressors. It says nothing about the hose reels a nailer and a sander are plugged into, so
    they are on the first compressor in the hall, which is where the pipe starts. A second, bigger
    compressor beside it feeds only the machines assigned to it.
12. **"Needs a spray booth" is written and dormant.** It is one of the four reasons 3.7 names, and
    no product in the catalogue allows a lacquered finish yet, because the booth itself is parked.
    The rule is in `blockFor` and proved on a product that does allow it; the day a template
    asks for lacquer the board says it with no further code.
13. **One express enquiry a week is gone.** 3.7 asks for "more express jobs" and a 0.25 chance at
    every refresh, which one a week makes meaningless. `EXPRESS_MAX_PER_WEEK`, the reputation
    ladder that fed the chance and `expressAllowed` are deleted. `state.lastExpressDay` is still
    written and is now read by nothing. Open question 4.
14. **The day 1 shopping list buys the extraction before the machine that wants it.** A floor
    edgebander cannot be ordered until a fan is at least on the road, and months (o) and (p) buy
    one. The list is the same eleven items in a different order.
15. **`src/ui/hiring.ts` is deleted.** 3.6 says the Team tab *becomes* the Team board. One board,
    one path; the laptop's Team chip opens it.

---

## 5. What reviewing the diff turned up

1. **The sprite manifests on `main` were months out of date.** `public/sprites/` holds the fifteen
   extraction and air pictures, the two duct runs, the pelletiser and nine character sheets;
   `manifest.json` listed none of them and `characters.json` was `{}`. The build writes both from
   what is on disk, so every one of those pictures was invisible to the game and the joiner was
   still a capsule. Writing them again is the first commit of the turn, and it is what turned up
   the three wrong footprints of deviation 3.
2. **A test was measuring the wrong thing the moment the deadlines moved.** The careful month
   asserted `job.dueDay - job.acceptedDay <= 5` for a small job. With the deadline in working days
   that span is seven calendar days for the same five working ones. It counts working days now.
3. **The greyed enquiries were rolled for and sometimes missed.** A workshop short of one template
   in six was rejection sampling twelve times and coming up empty about one time in nine. The
   templates it is short of are picked out first now, and the deadline reason is the fallback.
4. **The office door of the hall was under the room's own click.** Adding the door as a control of
   its own put it exactly where a test had been clicking to walk into the office. Both behaviours
   are real and both have a test now: the door opens the team, the block around it opens the room.

---

## 6. Paths: how many code paths do the same job?

| Question | The one path |
|---|---|
| Is the hall short of air for the dust? | `extractionCheck(state)`, and `underExtracted` over it |
| What does this machine pull? | `extractionDemandOf(item)` |
| What does this fan give? | `extractionCapacityOf(item)` |
| Is this compressor short of litres? | `hallAirCheck(state)`, and `compressorIsLow` over it |
| Will this machine run on the air it has? | `airBlockFor(state, item)`, and `familyAirBlock` per family |
| Which compressor is this on? | `compressorFor(state, item)` |
| Has it dry air? | `compressorHasDryer(state, compressor)` |
| How far apart are two days? | `workingDaysBetween(from, to)`, and `addWorkingDays` the other way |
| Where does a day sit on the Work Plan? | `workingDayIndex(day)`, and `dayOfWorkingIndex` back |
| What does this class stand on? | `footprintOf(specId, variantId, rotated)`, `itemFootprint(item)` for one in the hall |
| What floor does it hold? | `zoneOf(...)`, `itemZone(item)` |
| Where does the picture go? | `spriteAnchorIn(w, d, h)`, which `spriteBox` and the Sprite check page both read |
| Which file, and is it mirrored? | `pickSprite(files, key, tier, rotated)` and `mirrorNeeded(...)` |
| Why can the company not take this job? | `blockFor(state, entry, deadlineDays, basePrice)` |
| May this man be hired? | `canHire`, asked by the tile and by the action |
| Which trade is he? | `tradeOf(role)` |
| What is the ducting on? | `ductSystemOf(state)` |
| What build is this? | `APP_VERSION` |

---

## 7. Deleted

| Gone | Where it was | Why |
|---|---|---|
| `EXPRESS_PRICE_UPLIFT` | Turn 2 3.4 | A band of 30% to 50% replaces one flat 20%. |
| `EXPRESS_MAX_PER_WEEK`, `expressAllowed` | Turn 1 | "More express jobs" (PIOTR, 13.09). |
| `EXPRESS_PROBABILITY_BASE`, `_PER_REPUTATION_STEP`, `_REPUTATION_STEP`, `_MIN`, `_MAX` | Turn 2 3.4 | The chance is a flat 0.25 at every draw. |
| `src/ui/hiring.ts` | Turn 1 | The Team tab became the Team board. |
| The laptop's Team body | Turn 4 3.1 | The chip opens the board instead. |

---

## 8. Known risks

1. **Piotr's extraction figures are tight against the day 1 kit.** 800 of demand against 830 of
   allowance is thirty cubic metres an hour of headroom. Any class of saw above the used one, or
   a second machine running beside it, puts the hall in the penalty until a bigger fan is bought.
   That is what the numbers say and the tests say it out loud, but it is the one place a player
   could feel punished for buying a better machine.
2. **The seeded stream moved four times this turn** and every measured month moved with it: the
   express uplift is a draw, the greyed enquiries are draws, and the day 1 shopping list is in a
   different order. Every figure in the scenarios was measured again against the code that went
   in, not adjusted to keep a test green, and the report says which ones moved and why.
3. **The air side has one rule that is dormant and one that is nearly so.** No product allows a
   lacquered finish, so the spray booth's wet air penalty is proved on a synthetic template; and
   the CNC is a 45,000 machine, so the dry air gate is a rule most games will never meet.
4. **Rotation is armed on the drag, not on the machine.** The player picks a machine up, presses
   R or Rotate, and drops it. There is no way to turn a machine without picking it up, and
   picking it up and putting it down turned is a move, with the Turn 4 ducting bill on it.
5. **The Team board's Management tab is empty on purpose.** It says "Nothing here yet", which is
   what the brief asks for and is also the only empty tab in the game.

---

## 9. Tests

943 green, up from 850. New files:

- `tests/engine/onOrderKit.test.ts`: six on the kit that is bought and still on the road.
- `tests/engine/workingDays.test.ts`: Friday plus three, the inverse over three weeks, a weekend
  that is no days late, and the axis with no gap in it.
- `tests/engine/extraction.test.ts`: Piotr's tables, the two man shop short on a standard fan and
  fine on a pro one, the 0.30, the 3x dust, the line under the hall and the dusty piece.
- `tests/engine/air.test.ts`: the tables, the bar that stops a machine, the litres that slow
  everything on a compressor to 0.7, the hours, the assignment and the dryer.
- `tests/render/ducts.test.ts`: the plant on the apron, the run every four metres, the drop and
  the green ring.
- `tests/ui/team.test.ts`: the three tabs, the trades, the tiles, the admin rule and the draftsman.
- `tests/ui/boardLively.test.ts`: the two refreshes a day, the four reasons and the greyed tile.
- `tests/engine/rotate.test.ts`: the turned footprint and zone, the 1 by 3 that only fits turned,
  the mirror and the `.r` file.

Rewritten or extended: `tests/render/sprites.test.ts` and `tests/render/spriteClasses.test.ts` for
the corrected anchor and for a new test that holds every delivered PNG's own header against the
footprint the engine keeps; `tests/ui/workPlan.test.ts` for the working day axis;
`tests/ui/oneClick.test.ts` for the four controls this turn added; `tests/engine/board.test.ts`
for the express band and the greyed enquiries; `tests/scenarios/thirtyDays.test.ts` for the
re-measured months and for months (o) and (p).

---

## 10. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 10 added is reachable from the game: the five classes of extractor and
compressor and the air dryer on the Extraction and air tab, the sums under the hall and on the
company board, the ducting along the rear wall with the plant outside on the apron, the Team board
behind the laptop's Team chip and behind the office door of the hall, the board written again at
13:00 with the jobs the workshop cannot take greyed on it, Rotate in setup mode, and the hall
opening a fifth closer than it did.

---

## 11. Line balance

| Task | Files touched | Lines added | Lines removed |
|---|---|---|---|
| Whole turn | 73 | 5,105 | 458 |

275 of those added lines are `docs/turn-9-brief.md`, which is the archive and not code, and 405
are the two generated sprite indexes. New modules: `src/engine/media.ts`, `src/ui/team.ts`.

---

## 12. Open questions for Piotr

1. **What should an extractor and a compressor cost?** The brief points at a Turn 8 price table
   that does not exist. The `[TUNE]` ladders it writes itself went in: 400 / 600 / 1,400 / 3,200 /
   7,500 and 300 / 1,200 / 3,500 / 9,000 / 22,000. Say the word and they are one line each.
2. **May `docs/art/SPRITES.md` be brought into line with the art?** Section 6 still lists the
   central systems at 3 x 3 x 4 tiles and the pelletiser at 2 x 2 x 3, and the files the art side
   delivered are 3 x 2 x 4 m and 2 x 2 x 2.5 m. The engine matches the files; the contract does
   not match either. Whoever owns that file should write the delivered numbers into it.
3. **Should a bench that is on the lorry still let a joiner be hired?** Turn 8 says yes and 3.10
   says only the board may count on-order kit. It is left as Turn 8 has it.
4. **`state.lastExpressDay` is written and read by nothing** now the weekly cap is gone. It can
   come out of the save at the next `STATE_VERSION`, or it can stay as a record of when the last
   express job came in.
5. **Is a used extractor meant to be this tight?** 800 of demand against 830 of allowance is the
   day 1 hall with one saw and one man. A second machine, or any saw above the used one, is over
   the line. It is exactly what the tables say; it is also the sharpest edge in the game.
6. **What should the air dryer look like?** There is no `airDryer.png`, so it draws as a
   placeholder box. The Sprite check page lists the key and the canvas size for it.
7. **Should a hall with no compressor at all be penalised?** It is not: the men work as they always
   have. Only a compressor that is overloaded slows anybody down, which means buying a small one
   can be worse than buying none.

---

## 13. Parked, carried forward

1. Sanding machines and the Finishing stage on them; the solid wood press, which 3.2 names and
   leaves for later.
2. Second orientation sprites (`.r`) from the art side: the loader takes one the day it lands.
   The air dryer's picture.
3. The CEO and the Management tab; owner, helper and office staff character sheets; the floor
   catalogue picture; the company board picture.
4. House 100 k and villa 500 k, 180 degree view, movable rooms, rates and power for 200 m2,
   morale.
5. Everything parked before.
