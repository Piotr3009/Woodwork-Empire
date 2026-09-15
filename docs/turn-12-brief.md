# Turn 12: dust in cubic metres, bags only on the extractor

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 15.09.2026, from the voice session
of 15.09 (Petros: software/woodwork-empire, STAN points T15-15 to T15-28 and S-STRAT-1 to
S-STRAT-6).

Read this whole file (first line must say "Turn 12"; if the root `CLAUDE.md` does not, stop and
report), then `REPORT-T11.md`, then the archived briefs in `docs/`. Where files disagree, this one
wins. All standing rules apply (no em or en dashes, scope 1:1, one code path, constants never in
the UI, retag `[TUNE]` to `[PIOTR]`, kill background processes, PR without merge, end the
session, no PR watching, `npm run check` gated on its own exit code, every click single, one
`APP_VERSION` bump).

State of `main`: Turn 11 merged (PR #12, commit `0449e03`), `APP_VERSION` `v18`.

---

## 0. What this turn is for (Piotr, 15.09)

This is a **foundation turn**: short, and only about units and the shape of the data. It exists
so that the next, much larger session (Turns 13 to 15 in one pass: finance, contracts, security,
the owner's house, the extraction pipes) is built on one consistent model of dust. Nothing in this
turn is a feature the player asked for. Everything in it is a rule the later features stand on.

Piotr's words:

1. "Bags at the machines do not exist. Bags exist only at the extractor. If one saw gives 0.1
   cubic metres an hour and I connect ten saws, a one cubic metre bag fills in an hour. Simple."
2. "Every machine gives dust in cubic metres. We remove the bag count and the emptying from the
   machines. That stays only at the extractor, its size and its quality."
3. "Two numbers at every machine: cubic metres an hour of extraction power it needs, and cubic
   metres an hour of sawdust it makes."
4. "Dust is one figure per family. A dearer saw does not make more dust; the material makes the
   dust, not the price of the machine. Extraction power stays per class, because a big edgebander
   has five pipes and a small one has one."
5. "Show it in cubic metres an hour, straight. Joiners know their maths. One unit in the whole
   game."
6. "At the extractor write both: eight bags, and eight cubic metres. A bag is one cubic metre."
7. "Write the zone as 4 m by 3 m, not 4 by 3. Nobody knows what 4 by 3 is."

---

## 1. Rules restated (short)

Everything from Turns 1 to 11. Tonight in addition:

- **`APP_VERSION = 'v19'`.**
- **One unit for dust: cubic metres an hour** (`m3/h`) everywhere in the engine, the catalogue,
  the machine card, the extractor card, the tooltips and the reports. No bag factors, no "bag
  every N minutes" on a machine, anywhere.
- **A bag is one cubic metre.** `BAG_M3 = 1`, one constant, used by every place that turns bags
  into cubic metres or back.
- **Scope 1:1.** This turn removes one mechanic and adds its replacement. It adds no machine
  family, no pipe, no house, no security, no contract, no finance change. Those are the next
  session and they are in section 6.

---

## 2. The model (engine)

### 2.1 Dust output, one figure per family `[PIOTR]`

A new table in `src/engine/constants.ts`, keyed by family (equipment spec id), in cubic metres of
sawdust per hour that somebody stands at the machine. These are Piotr's figures from the point of
reference "a CNC cutting all day fills half a bag, a saw four times less", a bag of one cubic
metre, a day of eight hours:

```
export const DUST_OUTPUT_M3_PER_HOUR: Record<string, number> = {
  tableSaw: 0.015,       // an eighth of a bag a day
  edgebander: 0.01,      // a bag in about two weeks of use
  thicknesser: 0.25,     // two bags a day, it takes 6 to 8 mm off two faces
  cnc: 0.06,             // half a bag a day, Piotr's point of reference
  cncHead: 0.06,         // the same head, the same chips
  solidWoodTools: 0,     // the helper sweeps up after hand tools
  sprayBooth: 0,         // its own extraction, off this table
  drill: 0,              // a drill makes nothing a bag notices
};
```

Families that do not exist yet are written in the comment above the table, in full, so the
figures are there the day the classes land (the same convention `EXTRACTION_DEMAND` uses):
spindle moulder 0.12 (a bag a day), planer 0.12 (one face, a bag a day), four sided planer 0.5
(four times the spindle moulder), wide belt sander 0.03, brush sander 0.03. **Do not add these
families tonight.**

The figures are `[PIOTR]`. Anything you have to invent to make the arithmetic close is `[TUNE]`
and goes in the report.

### 2.2 Extraction demand stays as it is `[PIOTR]`

`EXTRACTION_DEMAND` (per family, per class, m3/h of air) and `EXTRACTION_CAPACITY` (per
extraction class, m3/h of air) are untouched. Piotr confirmed the split: air is per class, dust
is per family. The under extraction rule (`underExtracted`), the dust band, the broken extractor
multiplier and the no helper multiplier all stay exactly as they are. This turn is about the
**bag**, not the **air**.

### 2.3 The bag lives on the extractor, and only there `[PIOTR]`

Today every machine spec carries `bagInterval` (minutes of use per bag), every variant carries
`bagIntervalFactor`, every `Equipment` carries `minutesUsed` and `bagFull`, and
`accumulateMachineMinute` fills a bag per machine. All of that goes.

What replaces it:

- **Bag capacity per extractor class**, in bags, from the descriptions already on `main`:
  `EXTRACTOR_BAGS: Record<string, number> = { used: 1, budget: 1, standard: 2, pro: 4,
  industrial: 10 }`. Capacity in cubic metres is `EXTRACTOR_BAGS[class] * BAG_M3`, computed in
  one function, never written out twice.
- **A hall is one duct run.** That is already the rule for air (several extractors in one hall
  add up). The same for the bag store: the hall's bag store is the sum of the bags of every
  extractor in it, and dust from every machine in the hall goes into that one store. There is no
  per machine connection tonight (the pipes are the next session); do not build one.
- **Filling.** Each simulated minute, for every machine somebody stood at (the same
  `minutesByItem` map `accumulateMachineMinute` already receives), add
  `DUST_OUTPUT_M3_PER_HOUR[family] / 60 * personMinutes` to the hall's store. Hours of use
  (`hoursUsed`, the wear) keep being booked exactly as today; only the bag part of that function
  changes. Use the existing six place rounding.
- **State.** One new field per extraction unit, `bagFillM3: number`, or one field per hall if
  the store is kept per hall; pick the one that keeps a single code path for "how full is this
  hall's store" and say which in the report. `STATE_VERSION` bumps and the migration zeroes the
  new field and drops `minutesUsed` and `bagFull` from every saved equipment item. Saves from
  v18 must load.
- **Full.** When the hall's store reaches its capacity, the store is full: every machine in the
  hall with a dust output above zero stops being usable until it is emptied, the way a machine
  with a full bag is unusable today. One event, "Bags full in the workshop", not one per machine.
- **Emptying.** The same chore as today (`ASK_BAG_CHANGE`, `BAG_CHANGE_MINUTES`, the helper does
  it when there is one, otherwise the owner or a joiner, the Turn 11 rules), except it is
  requested on the extractor, and its length is `BAG_CHANGE_MINUTES` times the number of bags in
  the hall's store (ten bags take ten times as long as one). Emptying sets the store to zero.
  Rename the action and the task to say bags, plural, on the extractor; keep one action type.
- **Central systems.** `dustSystem` and `flexiSystem` have no bags (that is already their
  effect line) and their monthly waste collection fee stays. With a central system in the hall
  the store is infinite: dust is still summed for the reports, nothing ever fills. `bagsExist`
  keeps its meaning.
- **No extractor at all.** As today: no bags, the air rule punishes the player, dust output is
  still summed for the reports so the number is visible before the first extractor is bought.

### 2.4 What is deleted

- `EquipmentVariant.bagIntervalFactor` (type and every variant of every family, including
  `BAG_BY_CLASS` and the extractor variants that reference it).
- `EquipmentSpec.bagInterval` and every `bagInterval:` line.
- `Equipment.minutesUsed`, `Equipment.bagFull`, `bagIntervalFor`, `bagMachinesFor`, `emptyBag`
  in its per machine form, and the `bagFull` diagnostic key.
- The catalogue and machine card line "Bag every N min of use" and "No bag to change".

If anything else reads these, it is in scope: rewrite it against the new model or delete it, and
list it in the report. Do not leave a shim.

---

## 3. Changes to the UI (the contract)

### 3.1 The machine card and the catalogue class line `[PIOTR]`

For every family with classes, the class card shows, in this order, one line each:

1. `Output +5%` in the game's green, `Output -5%` in the game's red, `Output as a standard
   machine` in the body colour. The sign decides the colour; one helper does it for every plus
   and minus line on a card (the same rule Piotr set earlier for every efficiency figure).
2. `Dust 0.015 m³/h of use` (three decimals, trailing zeros trimmed: `0.25`, `0.06`, `0.015`;
   `Dust none` when the family's figure is zero). This replaces the bag line. It is the family's
   figure and therefore the same on every class of the family; that is the point, do not hide it.
3. `Needs 1,100 m³/h of extraction` (the existing air line, unchanged in substance).
4. `Life about 3,600 hours` (unchanged).
5. `Power 4 a day` (unchanged tonight; the unit is an open question in section 6).
6. `Takes 3 m by 1 m, works in 4 m by 3 m` (footprint and zone, both with the unit, both with
   "by"). Every place that prints a footprint or a zone uses one formatter.

### 3.2 The extractor card `[PIOTR]`

The extractor class card shows: `Pulls 8,000 m³/h` (existing), `Bags 10, holds 10 m³` (new, from
`EXTRACTOR_BAGS` and `BAG_M3`), life, power, footprint as in 3.1. The central systems show
`No bags. Waste collection £400 a month` (from the constant, not typed).

### 3.3 The extractor on the floor

Hovering or clicking an extractor on the floor shows the hall's store: `Bags 4.6 / 10 m³` and a
small bar, red when full. The helper's chore list and the owner's task list name it as "Empty the
bags (10 bags, 150 min)". The full state on the floor uses the same visual the full bag used on
a machine today (move it, do not draw a second one).

### 3.4 Reports

The day end summary and the monthly report get one line: `Dust made today 0.31 m³` (the summed
output), next to the air figures they already show. Nothing else in the reports changes.

---

## 4. Task queue, in order

Branch `turn-12-dust-in-cubic-metres` from `main`. One commit per task, `npm run check` green on
its own exit code before each, two report lines per task.

**T12-01 Housekeeping and v19.** `docs/turn-11-brief.md` from git history; `APP_VERSION = 'v19'`.
Done.

**T12-02 Constants.** `DUST_OUTPUT_M3_PER_HOUR`, `EXTRACTOR_BAGS`, `BAG_M3`, the capacity
function, the comment block for the future families; delete `BAG_BY_CLASS`, every
`bagIntervalFactor`, every `bagInterval`. Done: a test that every machine family has an entry in
`DUST_OUTPUT_M3_PER_HOUR` and every extractor class has an entry in `EXTRACTOR_BAGS`.

**T12-03 Types and migration.** The new state field, the two removed fields, `STATE_VERSION`,
the migration. Done: a v18 save fixture loads and its equipment has no `bagFull`.

**T12-04 Filling, full, emptying.** 2.3 in `machines.ts`, `tasks.ts`, `game.ts`. Done: the engine
tests (one saw eight hours fills an eighth of a bag; ten saws and a one bag extractor fill it in
about eight hours; a thicknesser and a single bag are full before lunch; a central system never
fills; emptying ten bags takes ten times fifteen minutes; machines stop when full and resume
when emptied).

**T12-05 The cards.** 3.1 and 3.2, the formatter for metres, the colour helper for signed lines.
Done: a test that the standard saw card prints `Dust 0.015 m³/h of use`, `Takes 3 m by 1 m,
works in 4 m by 3 m`, and that the pro extractor card prints `Bags 4, holds 4 m³`.

**T12-06 The floor and the reports.** 3.3 and 3.4. Done: the tests.

**T12-07 Scenarios.** Update the sixteen months for the new fill rule; every scenario that
asserted a per machine bag now asserts the hall store instead. Add (s) a month with a thicknesser
and a single bag extractor that asserts the helper empties it more than once a day.

**T12-08 Report and PR.** `REPORT-T12.md` in the usual structure plus "Numbers chosen" (every
`[TUNE]`), "Deleted" (every symbol removed in 2.4 and anything found beyond it) and "Where the
store lives" (per extractor or per hall, and why). Kill background processes, push, PR titled
`Turn 12: dust in cubic metres, bags only on the extractor`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the sprite files or the
   font file.
2. No new machine families (no sander, no spindle moulder, no planer, no four sider), no pipes, no
   per machine extractor connection, no house, no security, no contracts, no loans, no insurance.
3. No change to `EXTRACTION_DEMAND`, `EXTRACTION_CAPACITY`, the air rule or the dust band.
4. No storage access outside `src/cloud/store.ts`.
5. No PixiJS, sound, mobile, Steam, Electron.
6. No watch loops, nothing left running.

---

## 6. Parked (the next session, one pass)

1. Turns 13 to 15 as designed in Petros: loans and overdraft, insurance, the gate to commercial
   work, standing contracts, security in five levels, the owner's house in eight tiers, the
   extraction pipes drawn by the game on the grid, the production manager who connects machines
   when the hall is big.
2. The unit of `powerPerDay` (kWh, pounds, or a game unit): open.
3. Starting capital 50 k or 40 k: open, stays 50 k.
4. Every `[TUNE]` figure on the machine class ladders except prices and the used saw's three
   effects: never confirmed by Piotr.

End of brief.
# Turn 12: dust in cubic metres, bags only on the extractor

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 15.09.2026, from the voice session
of 15.09 (Petros: software/woodwork-empire, STAN points T15-15 to T15-28 and S-STRAT-1 to
S-STRAT-6).

Read this whole file (first line must say "Turn 12"; if the root `CLAUDE.md` does not, stop and
report), then `REPORT-T11.md`, then the archived briefs in `docs/`. Where files disagree, this one
wins. All standing rules apply (no em or en dashes, scope 1:1, one code path, constants never in
the UI, retag `[TUNE]` to `[PIOTR]`, kill background processes, PR without merge, end the
session, no PR watching, `npm run check` gated on its own exit code, every click single, one
`APP_VERSION` bump).

State of `main`: Turn 11 merged (PR #12, commit `0449e03`), `APP_VERSION` `v18`.

---

## 0. What this turn is for (Piotr, 15.09)

This is a **foundation turn**: short, and only about units and the shape of the data. It exists
so that the next, much larger session (Turns 13 to 15 in one pass: finance, contracts, security,
the owner's house, the extraction pipes) is built on one consistent model of dust. Nothing in this
turn is a feature the player asked for. Everything in it is a rule the later features stand on.

Piotr's words:

1. "Bags at the machines do not exist. Bags exist only at the extractor. If one saw gives 0.1
   cubic metres an hour and I connect ten saws, a one cubic metre bag fills in an hour. Simple."
2. "Every machine gives dust in cubic metres. We remove the bag count and the emptying from the
   machines. That stays only at the extractor, its size and its quality."
3. "Two numbers at every machine: cubic metres an hour of extraction power it needs, and cubic
   metres an hour of sawdust it makes."
4. "Dust is one figure per family. A dearer saw does not make more dust; the material makes the
   dust, not the price of the machine. Extraction power stays per class, because a big edgebander
   has five pipes and a small one has one."
5. "Show it in cubic metres an hour, straight. Joiners know their maths. One unit in the whole
   game."
6. "At the extractor write both: eight bags, and eight cubic metres. A bag is one cubic metre."
7. "Write the zone as 4 m by 3 m, not 4 by 3. Nobody knows what 4 by 3 is."

---

## 1. Rules restated (short)

Everything from Turns 1 to 11. Tonight in addition:

- **`APP_VERSION = 'v19'`.**
- **One unit for dust: cubic metres an hour** (`m3/h`) everywhere in the engine, the catalogue,
  the machine card, the extractor card, the tooltips and the reports. No bag factors, no "bag
  every N minutes" on a machine, anywhere.
- **A bag is one cubic metre.** `BAG_M3 = 1`, one constant, used by every place that turns bags
  into cubic metres or back.
- **Scope 1:1.** This turn removes one mechanic and adds its replacement. It adds no machine
  family, no pipe, no house, no security, no contract, no finance change. Those are the next
  session and they are in section 6.

---

## 2. The model (engine)

### 2.1 Dust output, one figure per family `[PIOTR]`

A new table in `src/engine/constants.ts`, keyed by family (equipment spec id), in cubic metres of
sawdust per hour that somebody stands at the machine. These are Piotr's figures from the point of
reference "a CNC cutting all day fills half a bag, a saw four times less", a bag of one cubic
metre, a day of eight hours:

```
export const DUST_OUTPUT_M3_PER_HOUR: Record<string, number> = {
  tableSaw: 0.015,       // an eighth of a bag a day
  edgebander: 0.01,      // a bag in about two weeks of use
  thicknesser: 0.25,     // two bags a day, it takes 6 to 8 mm off two faces
  cnc: 0.06,             // half a bag a day, Piotr's point of reference
  cncHead: 0.06,         // the same head, the same chips
  solidWoodTools: 0,     // the helper sweeps up after hand tools
  sprayBooth: 0,         // its own extraction, off this table
  drill: 0,              // a drill makes nothing a bag notices
};
```

Families that do not exist yet are written in the comment above the table, in full, so the
figures are there the day the classes land (the same convention `EXTRACTION_DEMAND` uses):
spindle moulder 0.12 (a bag a day), planer 0.12 (one face, a bag a day), four sided planer 0.5
(four times the spindle moulder), wide belt sander 0.03, brush sander 0.03. **Do not add these
families tonight.**

The figures are `[PIOTR]`. Anything you have to invent to make the arithmetic close is `[TUNE]`
and goes in the report.

### 2.2 Extraction demand stays as it is `[PIOTR]`

`EXTRACTION_DEMAND` (per family, per class, m3/h of air) and `EXTRACTION_CAPACITY` (per
extraction class, m3/h of air) are untouched. Piotr confirmed the split: air is per class, dust
is per family. The under extraction rule (`underExtracted`), the dust band, the broken extractor
multiplier and the no helper multiplier all stay exactly as they are. This turn is about the
**bag**, not the **air**.

### 2.3 The bag lives on the extractor, and only there `[PIOTR]`

Today every machine spec carries `bagInterval` (minutes of use per bag), every variant carries
`bagIntervalFactor`, every `Equipment` carries `minutesUsed` and `bagFull`, and
`accumulateMachineMinute` fills a bag per machine. All of that goes.

What replaces it:

- **Bag capacity per extractor class**, in bags, from the descriptions already on `main`:
  `EXTRACTOR_BAGS: Record<string, number> = { used: 1, budget: 1, standard: 2, pro: 4,
  industrial: 10 }`. Capacity in cubic metres is `EXTRACTOR_BAGS[class] * BAG_M3`, computed in
  one function, never written out twice.
- **A hall is one duct run.** That is already the rule for air (several extractors in one hall
  add up). The same for the bag store: the hall's bag store is the sum of the bags of every
  extractor in it, and dust from every machine in the hall goes into that one store. There is no
  per machine connection tonight (the pipes are the next session); do not build one.
- **Filling.** Each simulated minute, for every machine somebody stood at (the same
  `minutesByItem` map `accumulateMachineMinute` already receives), add
  `DUST_OUTPUT_M3_PER_HOUR[family] / 60 * personMinutes` to the hall's store. Hours of use
  (`hoursUsed`, the wear) keep being booked exactly as today; only the bag part of that function
  changes. Use the existing six place rounding.
- **State.** One new field per extraction unit, `bagFillM3: number`, or one field per hall if
  the store is kept per hall; pick the one that keeps a single code path for "how full is this
  hall's store" and say which in the report. `STATE_VERSION` bumps and the migration zeroes the
  new field and drops `minutesUsed` and `bagFull` from every saved equipment item. Saves from
  v18 must load.
- **Full.** When the hall's store reaches its capacity, the store is full: every machine in the
  hall with a dust output above zero stops being usable until it is emptied, the way a machine
  with a full bag is unusable today. One event, "Bags full in the workshop", not one per machine.
- **Emptying.** The same chore as today (`ASK_BAG_CHANGE`, `BAG_CHANGE_MINUTES`, the helper does
  it when there is one, otherwise the owner or a joiner, the Turn 11 rules), except it is
  requested on the extractor, and its length is `BAG_CHANGE_MINUTES` times the number of bags in
  the hall's store (ten bags take ten times as long as one). Emptying sets the store to zero.
  Rename the action and the task to say bags, plural, on the extractor; keep one action type.
- **Central systems.** `dustSystem` and `flexiSystem` have no bags (that is already their
  effect line) and their monthly waste collection fee stays. With a central system in the hall
  the store is infinite: dust is still summed for the reports, nothing ever fills. `bagsExist`
  keeps its meaning.
- **No extractor at all.** As today: no bags, the air rule punishes the player, dust output is
  still summed for the reports so the number is visible before the first extractor is bought.

### 2.4 What is deleted

- `EquipmentVariant.bagIntervalFactor` (type and every variant of every family, including
  `BAG_BY_CLASS` and the extractor variants that reference it).
- `EquipmentSpec.bagInterval` and every `bagInterval:` line.
- `Equipment.minutesUsed`, `Equipment.bagFull`, `bagIntervalFor`, `bagMachinesFor`, `emptyBag`
  in its per machine form, and the `bagFull` diagnostic key.
- The catalogue and machine card line "Bag every N min of use" and "No bag to change".

If anything else reads these, it is in scope: rewrite it against the new model or delete it, and
list it in the report. Do not leave a shim.

---

## 3. Changes to the UI (the contract)

### 3.1 The machine card and the catalogue class line `[PIOTR]`

For every family with classes, the class card shows, in this order, one line each:

1. `Output +5%` in the game's green, `Output -5%` in the game's red, `Output as a standard
   machine` in the body colour. The sign decides the colour; one helper does it for every plus
   and minus line on a card (the same rule Piotr set earlier for every efficiency figure).
2. `Dust 0.015 m³/h of use` (three decimals, trailing zeros trimmed: `0.25`, `0.06`, `0.015`;
   `Dust none` when the family's figure is zero). This replaces the bag line. It is the family's
   figure and therefore the same on every class of the family; that is the point, do not hide it.
3. `Needs 1,100 m³/h of extraction` (the existing air line, unchanged in substance).
4. `Life about 3,600 hours` (unchanged).
5. `Power 4 a day` (unchanged tonight; the unit is an open question in section 6).
6. `Takes 3 m by 1 m, works in 4 m by 3 m` (footprint and zone, both with the unit, both with
   "by"). Every place that prints a footprint or a zone uses one formatter.

### 3.2 The extractor card `[PIOTR]`

The extractor class card shows: `Pulls 8,000 m³/h` (existing), `Bags 10, holds 10 m³` (new, from
`EXTRACTOR_BAGS` and `BAG_M3`), life, power, footprint as in 3.1. The central systems show
`No bags. Waste collection £400 a month` (from the constant, not typed).

### 3.3 The extractor on the floor

Hovering or clicking an extractor on the floor shows the hall's store: `Bags 4.6 / 10 m³` and a
small bar, red when full. The helper's chore list and the owner's task list name it as "Empty the
bags (10 bags, 150 min)". The full state on the floor uses the same visual the full bag used on
a machine today (move it, do not draw a second one).

### 3.4 Reports

The day end summary and the monthly report get one line: `Dust made today 0.31 m³` (the summed
output), next to the air figures they already show. Nothing else in the reports changes.

---

## 4. Task queue, in order

Branch `turn-12-dust-in-cubic-metres` from `main`. One commit per task, `npm run check` green on
its own exit code before each, two report lines per task.

**T12-01 Housekeeping and v19.** `docs/turn-11-brief.md` from git history; `APP_VERSION = 'v19'`.
Done.

**T12-02 Constants.** `DUST_OUTPUT_M3_PER_HOUR`, `EXTRACTOR_BAGS`, `BAG_M3`, the capacity
function, the comment block for the future families; delete `BAG_BY_CLASS`, every
`bagIntervalFactor`, every `bagInterval`. Done: a test that every machine family has an entry in
`DUST_OUTPUT_M3_PER_HOUR` and every extractor class has an entry in `EXTRACTOR_BAGS`.

**T12-03 Types and migration.** The new state field, the two removed fields, `STATE_VERSION`,
the migration. Done: a v18 save fixture loads and its equipment has no `bagFull`.

**T12-04 Filling, full, emptying.** 2.3 in `machines.ts`, `tasks.ts`, `game.ts`. Done: the engine
tests (one saw eight hours fills an eighth of a bag; ten saws and a one bag extractor fill it in
about eight hours; a thicknesser and a single bag are full before lunch; a central system never
fills; emptying ten bags takes ten times fifteen minutes; machines stop when full and resume
when emptied).

**T12-05 The cards.** 3.1 and 3.2, the formatter for metres, the colour helper for signed lines.
Done: a test that the standard saw card prints `Dust 0.015 m³/h of use`, `Takes 3 m by 1 m,
works in 4 m by 3 m`, and that the pro extractor card prints `Bags 4, holds 4 m³`.

**T12-06 The floor and the reports.** 3.3 and 3.4. Done: the tests.

**T12-07 Scenarios.** Update the sixteen months for the new fill rule; every scenario that
asserted a per machine bag now asserts the hall store instead. Add (s) a month with a thicknesser
and a single bag extractor that asserts the helper empties it more than once a day.

**T12-08 Report and PR.** `REPORT-T12.md` in the usual structure plus "Numbers chosen" (every
`[TUNE]`), "Deleted" (every symbol removed in 2.4 and anything found beyond it) and "Where the
store lives" (per extractor or per hall, and why). Kill background processes, push, PR titled
`Turn 12: dust in cubic metres, bags only on the extractor`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the sprite files or the
   font file.
2. No new machine families (no sander, no spindle moulder, no planer, no four sider), no pipes, no
   per machine extractor connection, no house, no security, no contracts, no loans, no insurance.
3. No change to `EXTRACTION_DEMAND`, `EXTRACTION_CAPACITY`, the air rule or the dust band.
4. No storage access outside `src/cloud/store.ts`.
5. No PixiJS, sound, mobile, Steam, Electron.
6. No watch loops, nothing left running.

---

## 6. Parked (the next session, one pass)

1. Turns 13 to 15 as designed in Petros: loans and overdraft, insurance, the gate to commercial
   work, standing contracts, security in five levels, the owner's house in eight tiers, the
   extraction pipes drawn by the game on the grid, the production manager who connects machines
   when the hall is big.
2. The unit of `powerPerDay` (kWh, pounds, or a game unit): open.
3. Starting capital 50 k or 40 k: open, stays 50 k.
4. Every `[TUNE]` figure on the machine class ladders except prices and the used saw's three
   effects: never confirmed by Piotr.

End of brief.
