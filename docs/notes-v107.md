# Notes from v107: the door line

Built in chat on 18.10.2026 on v106 (STATE_VERSION 50 to 51). Piotr, 18.10: "a door line, two times
the windows; only the look of the line different", then "3: yes" to chat's design of it (twenty
million, six modules of 6 by 3 by 3 m, a door at £3,000, four engineers), "koduj", and on its look
until the art side draws it: "windows in grey" (the window line's pictures recoloured).

## 1. A line is of a kind (`LINE_KINDS`, `src/engine/constants.ts`)

- **Two kinds**, `LineKind` = `window` | `door` (`src/engine/types.ts`). A line's record says which
  (`WindowLineState.kind`), written once when it is bought (`newLineRecord(state, line, kind)`) and
  kept after its sale for its books. A module's kind is its catalogue id, looked up in one map
  (`LINE_MODULE_INDEX`: id to kind and place), so a module can never disagree with its spec and no
  module or order of a save is lifted.
- **One rule makes the door line** [PIOTR: "two times the windows"]: every money figure of a kind is
  the window line's times its `factor` (the door line's 2), its minutes the window line's times its
  `minutesFactor` (the door line's 1). So a door line nets exactly twice what a window line nets at
  every pace, on twice the money paid in: the same return, the rule Piotr asked for ("one to one as
  the windows, only bigger money"). The window line's figures stay its own constants of Turns 29 to
  32 and are the base the rule multiplies.
- **The readers**: `lineModulesOf`, `linePriceOf`, `lineUnitPriceOf`, `lineMaterialPerUnitOf`,
  `lineModulesKept`, `ALL_LINE_MODULES`; in `machines.ts` `moduleKind`, `lineKindOf` (the record's
  kind, else its kit's, else a window line) and `lineEngineerSlot`. Every function of a line asks its
  kind by its number; none changed its signature but `linePowerPerDay(kind)`, `newLineRecord` and
  `lineContractName(line, kind)`.
- **Gone**: `LINE_MODULES_KEPT` (0, 3, 6), now the kind's rule (`lineModulesKept`: the share of the
  modules the share of the crew on duty keeps, rounded down), which gives the window line its 0, 3
  and 6 to the module. `makeWindow` is `makeUnit`. One code path for both kinds throughout.
- **The names stay the window line's** (`state.windowLines`, `LineDay.windows`, `windowsMade`,
  `lineWindowMinutes`): they count a line's units of whatever kind, said in a comment at the type.

## 2. The door line [PIOTR, 18.10]

| | Window line | Door line |
|---|---|---|
| Price | £10,000,000 | **£20,000,000**: shares 4, 5, 2.5, 2.5, 3 and 3 million |
| Modules | 6 x (6 x 3 x 3 m), 36 m | the same, `doorLine1` to `doorLine6`, built to order in 30 working days |
| Unit | a window, £1,500 | **a door set, £3,000** |
| Material | £600: 2 boards, 1 glass unit | **£1,200: 4 boards, 2 glass units**, off the same stores |
| Minutes | 60, 10 off an upgrade, never under 20 | the same |
| Upgrades | £400k, 300k, 500k, 600k | **£800k, 600k, 1.0M, 1.2M**, its own ids, the same names and steps |
| Engineers | 2 | **4** [PIOTR] |
| Power | £360 a day | **£720 a day** (£120 a module) |
| Pallet | 10 windows | 10 doors |
| Sale | whole, for half | whole, for half: £10,000,000 |

- **Engineers by need, in line order** (`lineEngineerSlot`): the lines that stand take their crews
  line 1 first, two a window line and four a door line, so a line behind others gets its own only
  once those before it have theirs; the books pay each line for its own slice of the engineers on the
  books. The hire card allows the sum (`Six engineers keep the two lines`). With one, two or three of
  its four on duty a door line runs as one, three or four modules [TUNE: chat].
- **The timber jobs get a window line only** (`jobsLine`, the board's stand ins): a door line off its
  contract stands still and never speeds a timber job up [TUNE: chat].
- **Its contract**: offered with its four engineers on the books; `Doors off line 2`; the offer card
  `A door company will take every door line 2 makes, at £3,000 a door. The timber and the glass cost
  £1,200 a door, ...`; each door on the books as `Doors off line 2: doors`; four boards and two glass
  units off the stores a door, held for the week as the window line holds its; the office restocks
  for it as for any line.
- **The strip**: `Line 2 runs as three modules: two engineers on duty` (the plural is new; a window
  line short of its crew still reads `one engineer`), `Line 2 stands: no glass for its next door`.

## 3. What the player sees

- **The catalogue's Production line tab**: a folder a kind, `Window production line` (the window
  line's folder, renamed from `Production line` so the two read apart; its card was already called
  so) and `Door production line, from £20,000,000` [TUNE: chat: the names]. The door line's card in
  the window line's markup: its six rows (`Module 6: the Glazing, hung in its frame, then wrapped and
  stacked on a pallet`), `With four engineers it makes a door every 1 hour on a contract of its own`,
  the sale line, £20,000,000, `Power £720 a day`, its sentence; and its four upgrade cards with a Buy
  for each door line only (`Takes 10 minutes off each door of the line's contract`).
- **The Contracts tab**: the door line's running block in its words (`This week: 3 doors`, `£3,000
  a door; the timber and the glass £1,200 a door, from the stores`, `One door every 1 hour`,
  `Timber held: 16 boards, for 4 doors`).
- **The Production line tab**: `Doors made` in a door line's block, its pace in doors, `Paid back:
  ... of £20,000,000`; under `All lines` a row a kind, `Windows made` and `Doors made`.
- **The hire card**: `Keeps a production line running. A window line takes two: one keeps up to
  three modules, two keep all six. A door line takes four.` [TUNE: the words].
- **The hall** [PIOTR: "windows in grey"]: until the art side's own door line lands (order P3), a
  door line's module is drawn from the window module in the same place, its work sheet and its
  stacks, through the door line's grey (`BORROWED_SPRITES` and `borrowedSprite` in
  `src/render/sprites.ts`, `doorLineFilter` in `src/render/hall.ts`): how light each point is, lifted
  along a curve that keeps black black, so the blue housings come out a light grey, the shadows stay
  dark, and the timber and the yellow markings keep their colours (the store filter's rule for its
  wood) [TUNE: the curve, seen in Chromium]. The card's picture the same, through the same filter.
  Its four engineers walk in two pairs, the second pair starting from the middle of the line. Its
  pallets wait at the gate after the windows', in the same grey, and the label names both kinds:
  `Doors for collection: 1 pallet`, `For collection: 1 pallet of windows and 1 of doors`.
- **When the art side's files land** (`doorLine1..6.standard.png` with their `.r`, sheets and
  stacks, and `doorPallet.standard.png`), they are drawn and nothing is borrowed: `borrowedSprite`
  borrows only while no file of the door key is in the manifest. The forklift loaded with a door
  pallet (P3 item 5) wants one line of code when it comes: today a door line's forklift carries the
  window pallet's picture.

## 4. The save: STATE_VERSION 51

`liftToVersion51` gives every line record of a v50 save `kind: 'window'`, sold or standing; nothing
else of a line, its kit or its orders is touched. Asserted on a raw save in
`tests/engine/v107Door.test.ts`.

## 5. Tests

- `tests/engine/v107Door.test.ts` (16): the door line in the table, twice the window line in money
  and its own in minutes; the kept modules of both kinds; its six specs; ordered whole for twenty
  million with its record a door line's, refused for want of its own price; the engineers shared by
  need in line order and the strip's words; no timber job on a door line; the offer with four and
  not three, its words; a door an hour off four boards and two glass units at £3,000 on its own
  ledger line; pallets by kind; the strip's `no glass for its next door`; its own upgrades at twice
  the price, refused across kinds, to twenty minutes; sold whole for ten million in its name; **the
  rule**: a window line and a door line on contract in one game, ten days played, the door line's
  turnover, material, engineers, power and cover each exactly twice the window line's on the same
  number of units; a v50 save.
- `tests/ui/v107Door.test.ts` (7): the tab's two folders; the door line's card, its picture in grey
  and its upgrades with a Buy for the door line alone; the running block; the books; the hall's
  borrowed pictures in the filter and the window line untouched; four and two engineers; the gate.
- Pins flipped: STATE_VERSION 51 (`saveCheck`, `types`, `v67`, `v94Lanes`, `v93Lines`, `v106Canteen`,
  `migrate`: the version, its lifted versions and the line record of the v42 save with its kind);
  APP_VERSION 'v107' (`version`, `saveCheck`); the window line's folder (`t29Line`, `catalogueTabs`);
  the line families named for the 800 m² unit (`t29CrossCheck`); the door line's metres (`metres`);
  the engineer's sentence and the kept modules as the rule (`t29Engineer`).

## 6. What chat decided and Piotr has not confirmed

1. The window line's folder renamed `Window production line`; the door line's `Door production
   line`, its contract `Doors off line N`, its client `A door company`.
2. The door line's module sentences, its card's rows and sentence, and its upgrades' names (the
   window line's four).
3. With one, two or three of its four engineers on duty a door line runs one, three or four modules.
4. A door line off its contract stands still: only a window line serves the timber jobs.
5. The grey of the borrowed pictures, and the forklift carrying the window pallet's picture until the
   art side's loaded forklift comes.
6. The hire card's sentence for the two kinds.
