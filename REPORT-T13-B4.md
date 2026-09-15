# Report: Turn 13, phase B, group B4 (machines and the hall)

Branch `t13-b4` from `9dcfc9a` (phase A, T13-A2). Sections 3.1 (the class cards), 3.11, 3.12,
3.13, 3.17, 3.19 and 3.21 of CLAUDE.md T13, plus the character frame list of 3.23. Written as the
work went, one commit per task; phase C consolidates it into `REPORT-T13.md`.

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B4a Five classes everywhere, the spindle moulder, the badges | `fe143bf` | One layout function `classCard` in `src/ui/machine.ts` for every class card of every family: effects (output, dust, extraction and air needed, life, the class's own effects: what a fan pulls and holds, what a compressor gives, what a rack holds, that a machine with a drop takes a gate), a gap, costs (price, delivery, power, the insurance it adds a year, the floor), a gap, the description in the body font; every signed line through `signedFigure`; the badge and frame colour of the class from `CLASS_BADGE` on every card and on the Owned tile (`classBadge`, `classFrame`, a `--class-colour` custom property). `insuranceAddedYearly(price)` in `src/engine/machines.ts`. The spindle moulder's classes and the pallet truck draw as the placeholder in the hall (`objectArt`) and on the sprite check page (`PLACEHOLDER_SPRITES`, `placeholderKindFor` in `src/render/sprites.ts`). Verified: the two kitchens grey without a spindle moulder through `kitBlockFor`; `TIMBER_BRANCH_MIN_SPINDLE_CLASS` is read by nothing. | `tests/ui/machine.test.ts` (effects then costs then description on every card of every family; the badge and frame; every signed line through the helper), `tests/engine/variants.test.ts` (every ladder family has the five classes in `CLASS_ORDER` with a badge, no class carries a dust figure), `tests/engine/catalog.test.ts` (the kitchens need the spindle moulder; the timber constant is unread), `tests/ui/spriteCheck.test.ts`, `tests/render/hall.test.ts` |
| T13-B4b Gates | `acad7c3` | `hasGate`, `outputFactorOf(state, item)` (the class factor times `1 + GATE_OUTPUT_BONUS` once a gate is on) and `gateCheck` in `src/engine/machines.ts`; `claimMachine`, `bestOutputFactor` and `machineOutputFactor` read the factor through it (the one place left is game.ts line 1599, a note). `extractionRunning` and `extractionLoad` in `src/engine/media.ts`: while the fan runs at all, the demand is every connected ungated machine plus every gated one a man is at; `extractionCheck` sums the load. `footprintOrigin` and `portCell` in `src/engine/pipes.ts` (the one arithmetic the hall draws by and the pipe drops by). The Owned tile carries `Automatic gate, 1,000` (`data-do="buyGate" data-id="<equipment id>"`), greyed `Gate fitted` once fitted, absent on a machine with no demand, and the signed `+2%` line (`gateAction`, `src/ui/catalogue.ts`). The collar is drawn on the drop cell above the machine at the ducting's height in the new pipe layer of `src/render/hall.ts` (`pipeCellArt`, `gateCollar`, `gateCollars`, `pipeLayer`), as `placeholder('gate.collar', ..., { dimetric: true })` until the file lands. | `tests/engine/machines.test.ts` (+2% on that machine only, through the man, the projection and the board; the gated one is preferred; refused with no demand, twice, and without cash), `tests/engine/extraction.test.ts` (an ungated connected machine counts whenever the fan runs, a gated one only while it runs, nothing counts while nothing runs, an unconnected one is unserved and never in the sum; the gate changes the air sum and not the dust), `tests/ui/catalogueTabs.test.ts` (the button, the greyed state, the bench without one), `tests/render/hall.test.ts` (the collar on the drop cell, lifted, in the live part above the equipment, the file taking its place) |
| T13-B4c Pipes | `372b9d4` | `src/engine/pipes.ts` rewritten around a path of cells: `pathBetween` (Manhattan, the long leg first, one elbow at most, x first on a tie), `tileKeysFor` (drop, ns, ew, the four elbows by their arms, inlet or tee), `bestPath` (straight to the unit's inlet, or a tee onto the nearest cell of a run that already goes to that unit where that is shorter; a tie goes to the unit), `nearestTarget` by the walk of the pipe with tees counted, `routePipe` (signature kept), `connectCheck` and `connectExtraction` charging `metres * PIPE_PRICE_PER_METRE` on the `pipes` ledger category, `removeRun` (a branch that joined a run takes over its tail when it goes, so nothing hangs in the air; refunds nothing), `disconnectExtraction`, `dropOrphanPipes`. The pipe occupies no cell: `canPlaceSpec` and `freeFloorM2` never read `state.pipes`. `src/render/hall.ts`: `pipeRunArt`, `pipeRuns`, `pipeLayer` draw every tile of every run through `pipeCellArt` (the placeholder in the 2:1 dimetric at the ducting's height, or the delivered file by the same anchor) above the equipment, `pipe-short` on a run whose machine is running while the hall is short, and `(no pipe)` in the tooltip of an unconnected machine. The Owned tile carries `Connect to extraction, <cost>` (`data-do="connectExtraction" data-id="<equipment id>"`, the cost from `connectCheck`), greyed `Connected` with the metres once on, nothing on a bench or under a central system (`connectAction`, `src/ui/catalogue.ts`). The sprite check page lists the eight tiles and the collar in a section of their own (`PIPE_LAYER_KEYS`). | `tests/engine/pipes.test.ts` (the path: straight, the long leg first, x on a tie; the keys of every tile; routing: straight, one elbow by its arms, a tee onto an existing run to the same unit, never onto a run to another unit, the metres and the ledger line, no cell occupied and the free floor unchanged, the nearer of two extractors, no refund on a disconnection and the new length on a reconnection, the branch taking over a trunk that goes, orphans dropped, the refusals), `tests/render/hall.test.ts` (every tile key maps to a placeholder draw and to the file, the runs in the hall above the equipment, the red outline only while short and running), `tests/ui/catalogueTabs.test.ts` (the button with its cost, the greyed state with the metres, the bench without one, one click connects), `tests/ui/spriteCheck.test.ts` (the nine keys once each) |
| T13-B4d Security | this commit | `src/engine/security.ts`: `securitySubscriptionParts` (the base, the area factor, the value factor and the monthly, so the tab prints the formula in words with this hall's figures; `securitySubscriptionMonthly` reads it), `burglaryPaidOut` (property cover held and at least level 1, the two conditions `claimBurglary` books on), `burglaryTargets` (the company's machines standing in the hall, dearest first; the fan, the compressor and the fittings stay), `burgle` (one or two of them by the seeded count, their pipe, gate and open jobs of work with them, and the free stock, the reserved sheets being what is left; the loss on the `burglary` ledger category through `noteLoss`, no cash moved; `lastBurglaryDay`; the `burglary` event naming what went, the value, and whether the insurer pays; returns the lost value for `claimBurglary`). `rollBurglary` unchanged: level 5 never rolls. `src/ui/security.ts`: the ladder of six cards (`.security-level`, `is-held`), name, cost in words (once, a month, both, or the scaled figure at this hall), the risk a month, a `Buy` or `Go back to this` button (`data-do="setSecurityLevel" data-id="<level>"`) greyed with the reason, the formula spelled out for levels 4 and 5, and the insurer's warning at level 0 with property cover held. | `tests/engine/security.test.ts` (the ladder; the one off price on the way up, nothing down, the monthly on the 1st; the subscription scales by the formula with the area and the insured value; level 5 never burgles over 10,000 rolls with the stream advancing, level 0 does and level 1 less; the dearest first, one or two, never the fan; the free stock goes and the reserved sheets stay, the pipe and the gate go with the machine, the ledger line, the event; level 0 pays nothing with property cover, level 1 books the payout over ten days), `tests/ui/security.test.ts` (the Admin tab, the six cards with the one held, the costs and risks in words, the formula on the firms only, the way back down, the greyed button, the insurer's warning) |

---

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| `GATE_COLLAR_SCALE` | 0.5 | `src/render/hall.ts` | how much smaller than a cell the collar is drawn; a render figure like `HALL_CLOCK_GAP` |

---

## 3. Notes for phase C

### `src/engine/index.ts`

- Export `insuranceAddedYearly`, `gateCheck`, `hasGate`, `outputFactorOf` from `./machines`
  (imported by module path with the `T13-C1` comment in `src/ui/machine.ts` and
  `src/ui/catalogue.ts`).
- Export `extractionLoad`, `extractionRunning` from `./media`.
- Export `footprintOrigin`, `portCell`, `pathBetween`, `tileKeysFor`, `runCells` from `./pipes`
  (the last three are read by tests only; the render imports the first two by module path).

- Export `burglaryPaidOut`, `burglaryTargets`, `burgle`, `securitySubscriptionParts` from
  `./security` (imported by module path with the `T13-C1` comment in `src/ui/security.ts`).

### `src/engine/game.ts` (T13-B4d, the burglary)

`runBurglary` rolls and takes nothing. Replace its body with:

```ts
function runBurglary(state: GameState): void {
  if (!rollBurglary(state)) return;
  const lost = burgle(state);
  claimBurglary(state, lost);
}
```

and add `burgle` to the import from `./security`. `burgle` sets `security.lastBurglaryDay`
itself and queues the `burglary` event (choices `ok`; `resolveEvent` needs no handler for it).
The insured value is refreshed by `settle` after the tick, as for every other change of the hall.

### `src/engine/game.ts` (T13-B4b, the gate's output)

The one place a machine's output factor is still read off the class alone is the production
minute. Replace, at the line that reads `variantOf(specOf(machine.specId), machine.variantId).outputFactor`
(about line 1599):

```ts
    let speed = machine === null
      ? stage.speed
      : outputFactorOf(state, machine);
```

and add `outputFactorOf` to the import from `./machines`. `bestOutputFactor` (the projection,
`stageSpeed`) and `claimMachine` already read it, so without this line the man on a gated saw
would be projected at +2% and paid at +0%.

`buyGate` in `game.ts` carries its own four refusals; `gateCheck(state, equipmentId)` in
`machines.ts` is the same four in the same words, and the Owned tile's button reads it. One code
path: replace the body of `buyGate` up to the payment with

```ts
  const check = gateCheck(state, equipmentId);
  if (!check.ok) return check;
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return { ok: false, reason: 'No such machine' };
```

and import `gateCheck` from `./machines` (the `extractionDemandOfItem` alias and the `GATE_PRICE`
`canAfford` check in `buyGate` then go).

### `src/ui/styles.css`

The class badge and frame (T13-B4a). The colour comes from `CLASS_BADGE` on the element as
`--class-colour`, so the CSS carries no colour of its own:

```css
.badge-class {
  background: var(--class-colour, var(--panel));
  border-color: var(--class-colour, var(--border));
  color: var(--page);
  margin-right: 4px;
}
.tile.class-used,
.tile.class-budget,
.tile.class-standard,
.tile.class-pro,
.tile.class-industrial {
  border-color: var(--class-colour);
  box-shadow: inset 0 0 0 1px var(--class-colour);
}
.tile.is-owned.class-used,
.tile.is-owned.class-budget,
.tile.is-owned.class-standard,
.tile.is-owned.class-pro,
.tile.is-owned.class-industrial {
  box-shadow: inset 0 0 0 1px var(--class-colour), 0 0 0 2px var(--good);
}
.card-effects,
.card-costs {
  margin-bottom: 10px;
}
.card-costs {
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.card-description {
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.sprite-shot.is-placeholder {
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
```

The security ladder (T13-B4d):

```css
.security-level.is-held {
  border-color: var(--good);
  box-shadow: inset 0 0 0 1px var(--good);
}
```

The pipe layer (T13-B4b, T13-B4c). The layer is a picture and never a control; the placeholder
writes its kind on every tile, which is noise on a pipe, so the label is hidden here and shown
on the sprite check page only; the red outline of 3.19 is a stroke on the placeholder's faces
and a red shadow on the delivered file:

```css
.pipe-layer {
  pointer-events: none;
}
.pipe-tile .placeholder text,
.gate-collar .placeholder text {
  display: none;
}
.pipe-tile .placeholder polygon {
  stroke: #163f2a;
  stroke-width: 0.5;
}
.pipe-short .pipe-tile .placeholder polygon {
  stroke: var(--bad);
  stroke-width: 1.5;
}
.pipe-short image {
  filter: drop-shadow(0 0 1px var(--bad)) drop-shadow(0 0 1px var(--bad));
}
```

---

## 4. Foreign test edits

None.

---

## 5. Art requested

In the style of `docs/art/REQUESTS-T13.md`; phase C merges these into it.

- **Spindle moulder, five classes** (`spindleMoulder.used` to `spindleMoulder.industrial`), on
  the machine templates: drawn tonight as `placeholder('spindleMoulder.<class>', size, { dimetric:
  true })` in the hall and on the sprite check page. Footprints off the ladder: used, budget and
  standard 2 by 1 by 1 m; pro 3 by 1 by 1 m; industrial 3 by 2 by 1.2 m. The industrial one
  heavier, with a power feed.
- **Pallet truck** (`palletTruck`), 1 by 1 by 1 m, a handling item like the forklift: drawn tonight
  as `placeholder('palletTruck', size, { dimetric: true })`.
- **Pipe tiles, eight, plus the inlet** (`pipe.ns`, `pipe.ew`, `pipe.ne`, `pipe.nw`, `pipe.se`,
  `pipe.sw`, `pipe.tee`, `pipe.drop`, `pipe.inlet`): one cell each, drawn at the ducting's height
  (3 m) **in the hall's 2:1 dimetric and never straight on**, dark green steel with a lighter top
  edge, no cast shadow. `pipeCellArt` in `hall.ts` places the file with its centre on the centre of
  the cell lifted by 3 m, in a box one cell wide and a cell and a half high (48 by 72 at 1x, 96 by
  144 in the file), so a tile is drawn at that size and anchored at its centre. The elbows are
  named by their arms: `pipe.ne` joins a north arm (world minus y, up right on screen) to an east
  arm (world plus x, down right on screen). The drop is the vertical from the run down to the
  machine's port, with the run's arm towards the next cell on it; the inlet is the run's last cell
  turning down into the unit. Tonight every one is `placeholder('pipe.<key>', size, { dimetric:
  true })`, listed on the sprite check page under "The pipe layer".
- **Gate collar** (`gate.collar`): sits on the drop cell of a gated machine, half a cell wide,
  drawn at the ducting's height (3 m) in the 2:1 dimetric; tonight
  `placeholder('gate.collar', size, { dimetric: true })` through `pipeCellArt` in `hall.ts`, which
  places the delivered file by the same anchor (the centre of the cell, lifted).

---

## 6. Not done

Nothing yet.

---

## 7. Cross check notes

- **The load rule (10.1).** CLAUDE.md 3.11 says an ungated machine counts "whenever it is
  connected". Read literally, two connected saws would make a hall short at 08:00 with nobody at
  either, and during a pure bench minute, when the fan is not even running (`machineInUse` on the
  extractor is "any machine at work"). `extractionLoad` therefore counts the open branches only
  while the fan runs at all (some machine with a demand has a man at it); while it runs, every
  connected ungated machine counts, at work or idle, and a gated one only at work. With nothing
  running the demand is zero and the hall is not short. The sixteen months and every engine test
  hold under it without edits; the fan month (o) gets shorter, as it should.
- **The pipes change nothing in the sums beyond connection (10.1):** a running machine with no
  run is in `unservedMachines` and the hall is short with the line "not connected"; the moment
  a run exists for it, it is in the load and counted by its demand. Both directions are asserted
  in `tests/engine/extraction.test.ts` ("counts a machine with no pipe as not served, and never as
  part of the sum"). Which unit a run goes to changes nothing in the sum either: the hall is one
  duct run and every fan adds up (T10 3.1), so `nearestTarget` picks by the walk of the pipe alone.
- **The burglary and the ledger (10.2):** what a burglary takes is a `burglary` line through
  `noteLoss` with `unpaid: true` and no cash moved, the way a written off delivery is booked;
  the payout comes back through B1's `claim` lines. B1's month end should show the burglary
  line as a loss and not count it in the cash delta (its `unpaid` flag is what says so).
- **One rule in two places:** `burglaryPaidOut` in `security.ts` and the guard inside B1's
  `claimBurglary` both say "property cover held and level at least 1". Phase C may export a
  predicate from `insurance.ts` and have both read it.
- **One ledger (10.2):** every metre goes through `charge(state, 'pipes', ...)` in
  `connectExtraction`; a disconnection writes nothing and refunds nothing; a branch taking over a
  trunk's tail writes nothing.
- The gates change the air sum only: `extractionLoad` is read by `extractionCheck` and by nothing
  in the dust path (`accumulateMachineMinute` reads `dustOutputOf` by family); asserted in
  `tests/engine/extraction.test.ts`.
- The class cards read the dust off `DUST_OUTPUT_M3_PER_HOUR` by family and nothing else; the
  variants test now asserts that no class of any ladder carries a `dust` field (10.1).
- The insurance line on a card is `price * PROPERTY_INSURANCE_RATE_YEARLY` through
  `insuranceAddedYearly`; B1's `propertyPremiumYearly` reads the same constant over the hall, so
  the Insurance tab and the sum of the cards agree by construction (10.2).
