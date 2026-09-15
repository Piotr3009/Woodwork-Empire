# Turn 10: air and dust that have to add up, a team in tabs, and a board worth reading twice a day

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 14.09.2026, from Piotr's decisions of
13 and 14.09 (Petros: software/woodwork-empire, STAN "Tura 10" points 1 to 7, the rule entries on
weekends, single clicks and the media tables).

Read this whole file (first line must say "Turn 10"; if the root `CLAUDE.md` does not, stop and
report), then `docs/art/SPRITES.md` in full, then `REPORT-T9.md`, then the archived briefs in
`docs/`. Where files disagree, this one wins. All standing rules apply (no em or en dashes, scope
1:1, one code path, constants never in the UI, retag `[TUNE]` to `[PIOTR]`, kill background
processes, PR without merge, end the session, no PR watching, `npm run check` gated on its own exit
code, every click single).

State of `main`: Turn 9 merged plus the post-merge fix of 13.09 (flat character manifests, the
`files` option on `objectArt`, two file-independent tests). 850 tests green, `APP_VERSION` `v11`.
Sprites on `main`: 21 machines of Turn 7, 15 extraction and air sprites (all five classes of
extractor and compressor, both systems with duct segments, the pelletiser), the joiner's four
sheets. Machine sprites are being repainted on templates by the art side; nothing to do about that
in code.

---

## 0. What this turn is for

1. Piotr's tables for extraction and compressed air (13.09): every machine has a demand, every
   extractor and compressor has a capacity, and the sums decide whether the hall runs clean. (3.1,
   3.2, 3.3)
2. The five classes of extractors and compressors as data, with their sprites and the ducts along
   the walls. (3.4)
3. "Deadlines never count weekends, that makes no sense." (3.5)
4. "The team in big tabs by trade; the office admin is the one who must be there; the boss draws
   until he hires a draftsman." (3.6)
5. "More express jobs, properly profitable; the board changes twice a day; show the jobs we cannot
   take and say why." (3.7)
6. "Machines stand at an angle to the walls": a machine can be rotated in setup. (3.8)
7. "The hall opens one zoom step closer." (3.9)
8. Bug: production started on a saw that was only on order. (3.10)
9. `APP_VERSION = 'v12'`, the single-click test on every new control. (3.11)

---

## 1. Rules restated (short)

Everything from Turns 1 to 9 and the chat fixes. Tonight in addition:

- **A machine on order is a drawing on the floor, nothing more.** It does not cut, extract,
  compress, unload or count for anything but the board's "you could take this" locks.
- **Media are sums of what is running this minute.** Nothing is pre-booked; the check is per
  minute, per family, one selector each for extraction and air.

---

## 3. Changes to the design (the contract)

### 3.1 Extraction demand and capacity `[PIOTR: bands]` `[TUNE: class figures]`

Demand in m³/h while the machine is taken by a worker (Turn 7 stages), per class
used / budget / standard / pro / industrial:
- tableSaw 800 / 900 / 1,100 / 1,400 / 2,200
- edgebander floor classes: standard 1,400 / pro 1,800 / industrial 2,400 (hand classes 0)
- thicknesser 1,200 / 1,300 / 1,500 / 1,700 / 1,800 (one class tonight: 1,500)
- solidWoodTools 1,100 / 1,200 / 1,300 / 1,400 / 1,500 (one class tonight: 1,300)
- cnc standard 1,600 / pro 2,000 / industrial 2,400 (one class tonight: 1,600)
- sprayBooth: its own extraction, not counted here.

Capacity in m³/h: extractor used and budget 1,000 (one bag), standard 2,000 (two bags), pro 3,600
(four), industrial 8,000 (ten); dustSystem 12,000; flexiSystem 15,000. Several extractors add up.

Rule, every minute: sum of the demand of taken machines <= capacity × 0.83 `[PIOTR: 20% margin]`.
Above it the hall is **under-extracted** for that minute: dust rises at 3× (Turn 2), the hall
productivity factor carries minus 0.30 (through `outputBreakdown`, one path), and every job delivered
while the minute count of under-extraction on it exceeds 10% of its production minutes loses 1
point of rating ("dusty workshop") `[TUNE]`. The hall says "Extraction short: 2,500 of 1,660" under
the hall and on the company board. No machine stops.

### 3.2 Compressed air demand and capacity `[PIOTR: bands from the trade]` `[TUNE]`

Demand (bar needed / l per minute while running): bench work per joiner (nailer, driver) 6 / 30;
pneumatic sanding at Finishing per joiner 6 / 200; edgebander floor classes standard 7 / 250, pro
7 / 350, industrial 10 / 500 `[PIOTR: 10 bar for the big one]`; cnc 6.5 / 650; sprayBooth 7 / 350
(the gun itself at 4 bar); solid wood press later.

Compressors, class used / budget / standard / pro / industrial: bar 8 / 8 / 10 / 10 / 13; l per
minute 150 / 250 / 450 / 1,100 / 2,300; endurance in running minutes 60,000 / 120,000 / 200,000 /
400,000 / 800,000; prices from the Turn 8 table `[TUNE]`. Every compressor is **assigned** to
machines (default: all; the machine modal and the Owned tab show "Air: compressor 2"); a machine
draws from its compressor only.

Rules, every minute:
1. **Bar:** a machine whose bar exceeds its compressor's cannot run: status "needs 10 bar, compressor
   gives 8". The catalogue says it on the tile before the purchase.
2. **Litres:** for each compressor, sum of the l/min of its running consumers × 0.6 `[PIOTR: the
   trade's diversity factor 0.5 to 0.6]` <= its l/min × 0.85. Above it, every pneumatic consumer on
   that compressor runs at 0.7 for the minute ("low air"), shown as a lamp on the compressor sprite
   and a line under the hall.
3. A compressor's hours run only while a consumer draws from it.

### 3.3 The air dryer `[PIOTR]`

- New item `airDryer`, Extraction tab (renamed "Extraction and air"), 1 × 1 × 1.5 m, 1,500 `[TUNE]`,
  assigned to one compressor. The industrial compressor has one built in.
- CNC needs dry air: without a dryer on its compressor it does not run ("needs dry air"). The spray
  booth without dry air still runs, but Finishing takes 1.5× the minutes and the job loses 1 point
  of rating ("finish defects") `[TUNE]`.

### 3.4 Extractor and compressor classes, ducts

- Extractor family: five classes used / budget / standard / pro / industrial with the Turn 8 prices
  where set, else `[TUNE]` 400 / 600 / 1,400 / 3,200 / 7,500; footprints 1 × 1 × 2, 1 × 1 × 2,
  2 × 1 × 2, 3 × 1 × 2.5, 5 × 1 × 2.5; zones = footprint; bag intervals per class factor as the saw's.
- Compressor family: five classes, footprints 1 × 1 × 1, 1 × 1 × 1, 2 × 1 × 1.5, 2 × 1 × 1.5,
  2 × 2 × 2.5; prices `[TUNE]` 300 / 1,200 / 3,500 / 9,000 / 22,000.
- The dust system and the flexi system stand **outside** on the apron by the shutter (like the van)
  and draw **ducts** along the rear wall with the `dustSystem.ducts` / `flexiSystem.ducts` sprites
  repeated every 4 m at 3 m height, with a drop to each ducted machine (a thin line). Decoration
  and status: a machine on ducting shows a small ring at its port; with the flexi system the ring is
  green (reconnection free, Turn 4).
- The Sprite check page lists every class.
- Tests: demand and capacity sums for a two-man shop with a saw and a floor edgebander on a standard
  extractor are short and on a pro extractor are fine; a bar shortfall stops the edgebander; a litre
  shortfall slows to 0.7; the dryer gates the CNC; the ducts render with the system.

### 3.5 Working-day deadlines `[PIOTR: never count weekends]`

- Deadlines, slack, "Latest start", late penalties (5% and 30% per day) and delivery days count
  **working days only**. A job accepted on Friday with a 3 day deadline is due Wednesday. The Work
  Plan's time axis shows working days only (Monday after Friday, no gap).
- One helper `addWorkingDays` / `workingDaysBetween` used by all of them; the Turn 8 delivery code
  already has one, so it is the one.
- Tests: Friday plus 3 is Wednesday; a job late over a weekend is one day late, not three; the Work
  Plan axis skips Saturday and Sunday.

### 3.6 The team in tabs, the admin, the draftsman `[PIOTR]`

- The Team tab of the laptop becomes a **full page Team modal** (reachable from the laptop tab and
  from the office door of the hall) with tabs by trade: **Workshop** (joiners poor / normal / super,
  helper), **Office** (office admin, purchasing clerk, salesman, draftsman), **Management** (empty:
  "Nothing here yet", the CEO is parked). Candidates as tiles like the shop: role, class, rate,
  weekly or monthly wage, "available from reputation N", Hire (single click, the interview as in
  Turn 7). Owned frame on the roles the company has, with count.
- **Office admin** is the base office person: at least one before any other office role can be
  hired ("Hire an office admin first"). She does everything office: emails, bookkeeping, daily
  ordering, calls at 30 minutes and per-job orders at double time when no specialist exists (Turn
  7 3.4). Never design.
- **Draftsman**: new role, Office tab, monthly wage 2,400 `[TUNE]`, available from reputation 15
  `[TUNE]`, rate 0.8 of the owner's design speed × the software factor `[TUNE]`. He takes Design
  tasks off the owner in laptop order; the owner may still draw beside him (assign in the Drawings
  tab). Until he is hired, design is the owner's, as today.
- Tests: the Team modal has three tabs; the clerk cannot be hired before an admin; the draftsman
  takes a design task at 0.8 and the owner's queue shrinks.

### 3.7 The board, livelier `[PIOTR]`

- Express: price +30% to +50% `[PIOTR]` (draw uniformly), penalty 30% per working day late, deadline
  0.6× standard (minimum 3 working days), drawn with probability 0.25 `[TUNE]` at every refresh.
- The board **refreshes twice a day**, at 08:00 and 13:00: expired enquiries go, new ones come, up
  to the band size (Turn 3), independent of whether something was taken.
- **Unreachable enquiries are on the board** (2 to 3 of them at a time `[TUNE]`), greyed, with the
  reason in plain words: "no timber machines", "needs a spray booth", "too few people for the
  deadline" (the workshop's average rate against the deadline, the "Latest start" arithmetic of
  Turn 9), "reputation too low (needs 20)". Accepting is disabled; the tile's reason links to the
  catalogue or the Team modal where it applies.
- Tests: two refreshes a day; express within the band and with the short deadline; an unreachable
  tile carries its reason and no Accept.

### 3.8 Rotating machines in setup `[PIOTR]`

- In setup mode, R (and a "Rotate" button on the ghost) turns the dragged item by 90 degrees:
  footprint and zone swap width and depth, the sprite is drawn mirrored horizontally (a
  `transform="scale(-1, 1)"` around the anchor) when no `family.class.r.png` exists in the manifest;
  when it does, that file is used unmirrored. `canPlace` checks the rotated zone. A rotated item
  keeps `rotated: true` in the state.
- Tests: rotating a 3 × 1 saw needs a free 1 × 3; the sprite is mirrored without an `.r` file and
  not with one.

### 3.9 Default zoom `[PIOTR]`

The hall opens at 1.2× fit; the wheel zooms out to fit and in to 4× fit as before; Fit returns to fit.
Test: the initial camera scale is 1.2 × fit.

### 3.10 On-order kit does not work `[PIOTR: bug]`

- `hasMachine`, stage stations, extraction and air sums, unloading with the forklift and every
  other "is it in the hall" question ignore on-order items. Only the board's locks ("you could take
  this") may count them. Cutting on a job whose only saw is on order shows "waiting for table saw
  (on order, due day 2)".
- If a chat fix of 13/14.09 already did this on `main`, keep it and only add the test.
- Test: with a saw on order and none in the hall, a sheet job's Cutting stage waits with that text.

### 3.12 The sprite anchor of asymmetric footprints (bug, found 14.09)

`spriteBox` in `render/sprites.ts` centres the image on the footprint's bottom corner. The corner of a
`w × d` diamond is not at the image's centre unless `w = d`: it is `w × 48` (at 2x) from the left
edge of the diamond, `d × 48` from the right. So every 2 × 1 and 3 × 1 machine stands 12 to 24 px
(at 1x) off its tile, part of what Piotr saw as machines "sinking into the floor". Fix:
`x = anchor.x - (SPRITE_PADDING + w × TILE_WIDTH) / SPRITE_SCALE` at 1x, one line, plus the same
rule in the Sprite check page's anchor mark. `docs/art/SPRITES.md` section 2 already states the
corrected rule. Test: a 3 × 1 sprite's image left edge sits `d × 24` left of the corner at 1x, and a
1 × 1 sprite is unchanged.

### 3.11 Version and the single-click test

`APP_VERSION = 'v12'`. Every new control of this turn (Rotate, Hire tiles, the reason links, the
compressor assignment) is covered by the 200-clicks-in-200-ticks test of Turn 9 (extend its list of
selectors).

---

## 4. Task queue, in order

Branch `turn-10-air-and-dust` from `main`. One commit per task, `npm run check` green on its own
exit code before each, two report lines per task.

**T10-01 Housekeeping and v12.** `docs/turn-9-brief.md` from git history; `APP_VERSION = 'v12'`.
Done.

**T10-02 On-order kit does not work, and the sprite anchor.** 3.10 and 3.12. Early, because 3.1
and 3.2 depend on "in the hall" and every sprite depends on the anchor. Done: the tests.

**T10-03 Working-day deadlines.** 3.5. Done: the tests.

**T10-04 Extractor and compressor classes.** 3.4 data, sprites, the dryer item. Done: the class
tests, Sprite check.

**T10-05 Extraction sums.** 3.1. Done: the tests.

**T10-06 Air sums, bar, litres, assignment, the dryer gates.** 3.2 and 3.3. Done: the tests.

**T10-07 Ducts.** 3.4 render side. Done: the render test.

**T10-08 The Team modal, the admin rule, the draftsman.** 3.6. Done: the tests.

**T10-09 The board, livelier.** 3.7. Done: the tests.

**T10-10 Rotating machines.** 3.8. Done: the tests.

**T10-11 Default zoom.** 3.9. Done: the test.

**T10-12 Single-click coverage.** 3.11. Done: the extended test passes.

**T10-13 Scenarios.** Update the fourteen months for working-day deadlines, the media sums and the
board refresh; add (o) a month with two joiners, a saw and a floor edgebander on a standard
extractor that asserts under-extraction minutes and the rating hit, and (p) the same on a pro
extractor with none.

**T10-14 Report and PR.** `REPORT-T10.md` in the usual structure plus "Media numbers chosen" (every
`[TUNE]` of 3.1 to 3.4 with its value). Kill background processes, push, PR titled `Turn 10: air and
dust that have to add up, a team in tabs, and a board worth reading twice a day`, do not merge, end
the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, or the sprite files.
2. No new templates (the house and the villa stay parked), no sanding machines, no CEO.
3. No sprites drawn in code.
4. No PixiJS, sound, mobile.
5. No persistence changes other than `STATE_VERSION`.
6. No watch loops, nothing left running.

---

## 6. Parked

1. Sanding machines and the Finishing stage on them; the solid wood press.
2. Second orientation sprites (`.r`) from the art side; machine sprites repainted on templates.
3. Owner, helper and office staff character sheets; the floor catalogue picture; the company board
   picture.
4. House 100 k and villa 500 k, 180 degree view, movable rooms, rates and power for 200 m², morale.

End of brief.
