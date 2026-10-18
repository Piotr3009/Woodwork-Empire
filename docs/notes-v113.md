# Notes from v113: the hall's six levels

Built in chat on 18.10.2026 on v112 (STATE_VERSION 52 to 53). Piotr, 18.10: "you have the rest of
the art, code it one picture at a time", then "5 koduj" to chat's five points for the art side's P2
(`Woodwork-Empire-P2-PODGLAD-2026-10-18.zip`): a card on the Premises page with the levels one after
the other, ready the next morning; the prices; two points of reputation a level; the names; and the
art side's fix of the deep cutter for levels 2 to 6, level 1 left as it is.

## 1. The levels (`HALL_LEVELS`, `src/engine/constants.ts`)

| Level | Name | Price |
|---|---|---|
| 1 | the hall as it was built (today's layers, never bought) | |
| 2 | A proper joinery | £50,000 |
| 3 | A growing firm | £150,000 |
| 4 | A big works | £400,000 |
| 5 | A factory | £1,000,000 |
| 6 | The empire | £2,500,000 |

Each with two points of reputation and a sentence of what the art side painted [TUNE: chat: the
sentences]. No other figure of the game changes with the level: it is seen, and it earns the points.

## 2. The refit (`src/engine/premises.ts`), in the office's pattern (v98)

- `hallLevelOf` (1 for an older save with no figure), `nextHallLevel`, `refitHallCheck` (in the order
  the card reads: `The hall is at its best`, `The fitters are in`, `Not enough cash`, the cash asked
  with `canAfford` as the office's), `refitHall` (paid at the click on its own line, `Hall refit: A
  proper joinery`, category `unitExtension`; the fitters in until the morning), `openHallRefit` (at
  the day's open after the office's and the canteen's: the level written, the two points asked and
  booked at the gain factor, the card `The hall is refitted` with the next level and its price, or
  `There is no better hall to be had.`).
- The action `REFIT_HALL`; the event `hallRefitted`; the click `refitHall`.

## 3. The page

The Premises page has a fourth heading, `Hall`, under `Office`, with one card in the office card's
markup and its three states: offered (`Refit the hall: A proper joinery`, `£50,000 · level 2 of 6,
ready the next morning. Today: the hall as it was built.`, the sentence, `Refit` or the greyed button
with its reason), being done (`Being refitted`, the `Paid` badge) and done (`The hall: The empire`,
`level 6 of 6`, the `Done` badge).

## 4. The pictures

- The fifteen delivered layers in `public/sprites/` byte for byte, and fifty five pieces of the bigger
  halls cut from them by the game's own scripts, eleven a level (`docs/art/SPRITES.md` 21): 70 files,
  13 MB; the manifest has 435 sprites. The ground round the hall is today's file at every level.
- **The scripts** (`scripts/hall-wide.py`, `hall-deep.py`, `hall-long.py`, `hall-wider.py`) take the
  level as their one argument and read and write `<layer>.levelN.png`; with none they cut today's
  files, byte for byte as they are in the repo (checked). The deep one takes the art side's fix for
  levels 2 to 6 only: its floor copy three metres along (the joints of level 2 stay on the metre) and
  the left wall's tone from 1.2 to 2.2 m on both walls (no jump of tone with a 0.8 m plinth or the
  LED). Every piece of every level is the size and at the offset of today's.
- **The drawing** (`hallScene`, `src/render/hall.ts`): every layer picked with the level as its tier
  (`hallLevelTier`), so a layer with no file of its level is today's (`pictureFor`). Seen in Chromium
  on Piotr's save of day 4,300 at levels 3 and 6.
- **The status**: P2 is PODGLĄD, with no `approval.json`; Piotr's word is taken as his use of it. A
  FINAL is to keep the same bytes, and the checksums tell.

## 5. The save: STATE_VERSION 53

`liftToVersion53` gives an older unit `hallLevel` 1 and `hallRefit` null. A new game starts the
same.

## 6. Tests

- `tests/engine/v113Hall.test.ts` (10): the five levels at their names, prices and points; every layer
  of every size of hall on disk for every level, each the size of today's, and no ground file of a
  level; a new game at level 1 with level 2 on offer; the refusals in the card's order; the click on
  its own line and the morning with the level, the card and the reputation; level by level to the
  top; the hall painted from its level's files and the built hall from today's; a hall grown longer
  and wider at level 5 on today's ground; the page's card in its three states; a v52 save.
- Pins flipped: STATE_VERSION 53 (`saveCheck`, `types`, `v67`, `v94Lanes`, `v93Lines`, `v106Canteen`,
  `v107Door` and the lifted versions of `migrate`); APP_VERSION 'v113' (`version`, `saveCheck`).
- The full check (`npm run check`) run on its own exit code, on v110 to v113 together: 332 files,
  3,194 tests, green.

## 7. What chat decided and Piotr has not confirmed

1. The five sentences of the levels.
2. The ground round the hall left at today's file for every level, one colour at all of them.
