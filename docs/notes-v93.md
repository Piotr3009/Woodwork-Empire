# Notes from v93: more production lines than one

Built in chat on 12.10.2026 from Piotr's words of that morning, on main at v92 (STATE_VERSION 44).
Piotr: "I want to see the next line, and that is all: 1 metre for the engineers, 2 for the
forklift, and add one more metre of free space; it will hide a little but it will be fine; the next
line costs 10 million as always". Chat's plan, which Piotr answered "ok": each line takes 7 m in
depth (the metre behind it, its 3 m, its engineers' metre and the lane's 2 m), so two lines stand one
behind the other in the 800 m² hall, and side by side along a longer one; every line costs
£10,000,000 and has a number; each has its own contract, its own two engineers (line 1 staffed
first), its own timber, glass, pallet, forklift and upgrades and its own books; each is sold and
moved on its own; the line a save held is line 1.

## 1. The state (STATE_VERSION 45)

- `GameState.windowLine` (one record) is now `GameState.windowLines`, a list of the same records
  with a `number`. A record is written the first time its line is asked for (`lineState` in
  `machines.ts`, also exported from `lineContract.ts`), fresh at a line's purchase
  (`newLineRecord`), and kept after the line is sold, for its books.
- A module carries its line's number in `Equipment.line` and `OnOrderItem.line`; a module with none
  is line 1's (`lineOf`).
- A load of a line's timber carries the line's number in `Delivery.line` (it was `true`).
- `liftToVersion45` in `migrate.ts`: the old record becomes line 1 when the save had any kit of the
  line or anything in the record (a contract, upgrades, boards, glass, a day it first stood); a save
  that never had a line opens with an empty list. Every module and every line load gets the number 1.
- The `lineContractOffered` card carries `data.line`; a v92 card with none is line 1's.

## 2. The engine

- Every function of the line takes the line's number: `lineModules`, `lineLevel`,
  `lineEngineersOnDuty`, `lineStandsWhole`, `lineItems`, `lineSalePrice`, `lineContractRuns`, and
  all of `lineContract.ts` and `lineBooks.ts`. `lineNumbers` lists the lines with kit (standing,
  sold and waiting, or on order); `standingLines` the lines with module 1 on the floor, worked out
  in one pass over the kit (`standingModuleMasks`), so a big hall's minute asks the kit no more
  often than one line did.
- The engineers on duty are shared out two to a line along the standing lines in order, line 1
  first (`lineEngineersOnDuty`); the books charge each line the pair of engineers on the books in
  the same order (`lineEngineersOf`). A line's offer wants its own pair on the books. The hiring
  card allows two engineers a line (`lineEngineersWanted`), refused in the words
  `Four engineers keep the two lines`.
- The jobs get the first line that stands and is not on its contract (`jobsLine`), at the level
  that line runs at: `lineLevelForJobs`, `lineFactor`, `lineModuleFor`, `familyRuns` of a module,
  the places at a module (`placedMachines`), the boards it saves.
- `lineBuyCheck` no longer refuses a second line: the cash, the half shifted kit, then a place.
  `nextLineNumber` gives one more than the highest number a line has had; a number is given again
  only when its line never ran a day and has no contract.
- Each line's minute, day, offer, end, material, office orders, sale and write off run on their
  own. The ledger names the line: `Windows off line 2: windows`, `Timber for line 2: 40 boards`,
  `Line 2 upgrade: Diamond tooling`, `Window production line, line 2, ordered`, `Sold: Window
  production line, line 2`.

## 3. The ground a line claims (`layout.ts`)

- `lineGround(state, at)`: the metre behind the line (none at the rear wall), its 36 m by 3 m, its
  engineers' metre in front, and the lane: the front strip two metres in front of the engineers'
  metre from x 0 to the line's end, and the left strip up the left wall between the front strip and
  the pallets at the gate. `LINE_BEHIND_CELLS` 1 is the new constant. Line 1 at (2, 14) in the
  800 m² hall has exactly the lane of Turn 31.
- `laneTrouble`: `frontWall` (the lane off the floor), `rearWall` (the lane across the way to the
  gate), `leftWall` (the lane across the line). So in the 800 m² hall a line stands with module 1 at
  y 6 to 14.
- `claimedGround` lists every line's lane, path and metre behind; `canPlaceSpec` refuses other kit
  on any of them (`That is the forklift's lane`, `That is the engineers' path`, `That is the metre
  behind the line`). `lineFits` asks a line's own ground clear and out of every other line's way;
  two lines may share lane cells. `canPlaceLine` says `That is in another line's way` when only
  another line is in the way.
- `lineSite`: `WINDOW_LINE_ORIGIN`, then seven metres behind and in front of each line at its x,
  then cell by cell. The second line in an empty 800 m² hall goes to (2, 7).
- The strip's `laneBlocked` names the first line whose ground has kit on it: `Kit stands in line
  1's way: the sheet rack`. From v93 the metre behind a line and its engineers' metre count, so a
  save with kit there now reads this line; nothing is moved.

## 4. What the player sees

- Tiles and the hall: `Line 2, module 3` (`itemName`); `Sell line 2 for £5,000,000`.
- The strip: `Line 2 stands still: no engineer on duty`, `Line 2 runs as three modules: one
  engineer on duty`, `Line 2 stands: no glass for its next window`.
- The Contracts tab: one running block a line, `Windows off line 2`, its buttons carrying
  `data-line`.
- The line's catalogue card: `Owned 2`, `Buy another`, the order's due day beside it. Each upgrade
  card has a Buy a line (`Buy for line 2`) and the reasons by line.
- The Production line tab: one block a line under its name, and `All lines` added up when there
  are more lines than one. One line reads as it did.
- The hall: a yellow lane a line (`data-lane` carries the number), a forklift a line
  (`data-forklift-line`), the pallets at the gate of every line together.
- The Materials page: one glass row a line, `Glass at line 2`.

## 5. Left for later (Piotr's list of 12.10)

- Upgrades one at a time, 10 to 20 working days each (chat proposed 10, 12, 16, 20; not confirmed).
- The hall made deeper as well as longer.
- The engineers in red shirts walking along their line (a picture from the art side first).
- Glass racks of 300 glasses for £20,000 (a picture first).
- The second pallet at the gate is drawn at x 2 to 3, y 10, which is the engineers' metre of a
  line standing with module 1 at y 7: a drawing only, nothing stands there.
