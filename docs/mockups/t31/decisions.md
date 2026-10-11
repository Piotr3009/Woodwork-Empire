# Turn 31: the lead's readings of the brief, for the mockups (A2) and the code

Every figure and word here is the brief's (root CLAUDE.md, Turn 31) or the lead's reading of it,
marked [TUNE]. The mockups draw exactly this.

## 1. The line's running block (Contracts tab of the Orders board), 2.2 and 2.4

In `lineContractBlock` (src/ui/contracts.ts), in this order:
- head row as today: h3 `Windows off the line`, `End it` in `.row-action`.
- `p.figures`: `<strong class="contract-count">This week: 7 windows. In all: 111</strong> · £1,500 a
  window; the timber and the glass £600 a window, ordered ahead` (2.4's new words).
- `p.hint` `One window every 2 hours: about 20 a week` (as today).
- countRow `On the pallet` / `1 of 10`; countRow `At the gate for collection` / `1 pallet` (when any).
- countRow `Standing still` / `no timber` (or `no glass`, `no timber or glass`, or today's
  `one engineer on duty`), class `bad`: only while it stands. Engineers first: while an engineer is
  short the row says the engineer, as today; with two on duty it says the material.
- NEW countRow `Timber on the stores` / `24 boards, for 12 windows` with `, 40 more on the way` while
  a load of the line's is ordered and not yet unloaded.
- NEW countRow `Glass at module 6` / `for 8 windows` with `, 20 more on the way` while glass is
  ordered and not yet in.
- NEW the row of the two buttons, in the shape of the ended block's button row:
  `<div class="row"><span class="row-main"></span><span class="row-action">` + the two controls +
  `</span></div>`. Offered: `button('orderLineTimber', 'Order timber: 40 boards, £8,000')` and
  `button('orderLineGlass', 'Order glass: 20 windows, £4,000')` (plain `.btn`). Locked:
  `lockedButton(label, reason)`, and under the row one `<p class="lock">reason</p>` for each locked
  button, the same reason said once [TUNE]. The reasons: `No timber store`, `The timber stores hold
  fewer than 40 boards`, `Module 6 holds glass for 40 windows`, `Not enough cash`.

## 2. The strip, 2.4 and 2.6

- `lineNeedsMaterial`, directly under `lineNeedsEngineer`: `The line stands: no timber for its next
  window`, `The line stands: no glass for its next window`, `The line stands: no timber or glass for
  its next window`.
- `laneBlocked`, directly under `boardsAtTheGate`: `Kit stands on the forklift's lane: the sheet rack
  and a workbench` (catalogue names, joined as the game joins names), or `The line stands too near
  the front wall for its lane: move it back`.

## 3. The Accounting page's Production line tab, 2.5

- The tab bar: `Days`, `Summary`, `Monthly reports`, `Finance`, `Production line` (the fifth, shown
  only once the line has stood).
- `<div class="cols">` of four `.col`, each `<h3>` `Today`, `This week`, `This month`, `This year`, in
  the rows of the Summary tab's columns (`.row` with `.row-main` and `.row-figure good|bad`):
  `Windows made` (a count, no class), `Turnover` (good), `Timber and glass` (bad, minus),
  `Engineers` (bad), `Power` (bad), `Property cover` (bad, only drawn when the cover is held, else
  £0), `Net profit` (`.row.is-total`, good or bad), `Efficiency` (`88 of 96, 92%`, no class).
- Under the columns, `p.figures` lines: `A working day on average this month: 4 windows, £1,520 net`;
  `A year at this month's pace: £461,000 net`; `Paid back: £1,240,000 of £10,000,000 and the
  upgrades, 12%` (with no upgrade bought: `Paid back: £1,240,000 of £10,000,000, 12%` [TUNE]).
- And, when the month lost any minutes, `p.hint`: `Lost this month: 6 h for want of an engineer, 2 h
  for want of timber` (causes: `for want of an engineer`, `for want of timber`, `for want of glass`,
  `for want of timber and glass`, `while it was moved`) [TUNE].

## 4. The forklift's lane, 2.6

- Line at (2, 14) in the 800 m2 hall (40 by 20): the line x 2 to 37, y 14 to 16; its men at y 17;
  the lane's front strip x 0 to 38 (cells 0..37 inclusive, i.e. x from 0 to the line's end x + 36 =
  38), y 18 and 19; the left strip x 0 and 1, y 10 to 19.
- Drawn as two yellow lines on the floor along the lane's outer edges, corners joined: the lane is an
  L; its outline is the polygon (0,10) (2,10) (2,18) (38,18) (38,20) (0,20) closed, drawn as two
  lines: the inner edge (2,10)-(2,18)-(38,18) and the outer edge (0,10)-(0,20)-(38,20), joined at the
  two ends by the short edges (0,10)-(2,10) and (38,18)-(38,20) [TUNE]. Stroke the colour of
  `--lane-yellow`, #e3b51f [TUNE], about 2 px at x1, under every piece of kit and every man.

## 5. The hall that grows, 2.7

- The Premises page's third extension card, in the extension cards' shape (`card(...)` of
  src/ui/premises.ts), offered once the second is open: title `Extend the hall: 200 m² more`; price
  `£600,000` then ` · and £X more deposit. Needs £Y in the account.`; text: `Adds 200 m² along the
  rear wall: 50 m by 20 m, ready the next morning. Room for N joiners and M benches, and 40 lockers
  in the enlarged canteen. Rent ... → ... a month, rates ... → ..., standing power ... → ... a day.
  Insurance ... → ... a month. Security ... → ... a month.` (each figure from the engine at 1,000
  m2: `unitCostFactor` 2.5 at 1,000 m2, 8 lockers more a 200 m2); `Extend` button. Being built:
  `Being built` and the `Paid` badge, as the other two.
- The 60 m hall: the 800 m2 hall with ten metres more along x drawn as an outline (x 40 to 50, y 0
  to 20), in A2 only.

## 6. The shelter behind the rear wall, 2.8

- Declared 6 m along the wall by 3 m deep, behind the rear wall with the plant (`rear: true`): the
  art side's 0 view. Drawn clipped to what shows over the wall's top (3.5 m): it is 3 m high, so it
  is hidden. Its plate (`0 / 400` boards and room) hangs over the wall's top above it.
- On the apron the van alone.

## 7. Contracts that can be lost, 2.9

- A lost contract's closing card: title `Cut sheet packs for Northgate Interiors: the client went
  elsewhere`; body as an ended contract's card, its last sentence `The client has found another
  supplier: there is no other term.`; one choice as today.
- Its ended block on the Contracts tab: `h3` `Cut sheet packs for Northgate Interiors: the client
  went elsewhere`, the report rows as today, the weeks line without the client's offer, and one
  button, `Let it go`.
- A renewal with the cut: the closing card's last sentence `The client offers £96 a piece for
  another term, 9% less than now: the market has turned.`; the ended block's comparison as today
  (`The client offers £96 a piece for another term of 26 weeks, -£10 on £106.`).

## 8. The forklift and the pallet (L3), 2.10

- Waiting: on the lane's front strip in front of module 6's pallet, anchor on the strip's middle
  line (y 19), x at module 6's pallet end, facing `nw`, frame 0 of the empty sheet's `nw` row (row 2).
- Loaded on the front strip: the loaded sheet's `nw` row.
- At the gate: the pallet standing alone, `windowPallet.standard.png` (160 by 172, anchor 104, 164)
  at `LINE_PALLET_LAYOUT` (x 0 to 2, y 10, view 0 on the box's nearest corner); a second beside it
  along x at x 2 to 3, y 10 [TUNE: chat]; the label `Windows for collection: 1 pallet` as today.
- The sheets: 1,632 by 1,024, four rows of six cells of 272 by 256, anchor 136, 192 in each cell,
  rows sw 0, se 1, nw 2, ne 3. Drawn at half size (as every sprite: 2x files).
</content>
</invoke>
