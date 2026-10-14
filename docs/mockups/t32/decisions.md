# The lead's readings for the Turn 32 mockups and the code

Written by the lead before the mockups were built, so that the six pages and the code that makes
them true say the same words (CLAUDE.md T32 section 9). Every line here is the brief's where the
brief gives the words, and the lead's reading, marked [TUNE], where it leaves them open. The code
(T32-B1, T32-B2) is held to this file; where the code had to read otherwise, `REPORT-T32.md` says so.

## 1. The Materials page (2.3, 2.7)

- Three blocks, in the order sheets, boards, glass. Each block is the head row of today,
  `<div class="row stock-head" data-stock-head="sheets|boards|glass">`, with its name in the
  `row-main` (`Sheets`, `Timber boards`, `Glass`), then its control, and under it a
  `<div class="stock-list">` holding that kind's one stock line in today's `stock-line` markup.
- The control of each block is today's sheets' control in the same order: the field
  (`data-field="stockSheets"`, `stockBoards`, `stockGlass`; `class="num"`, the placeholder the number
  that fills the kind's free places less what is on its way) and its unit word after it (`sheets`,
  `boards`, `glass units`), the price line (`data-ladder="1"`), the storage line (`data-storage="1"`),
  and the Restock button in the `row-action`.
- The price line: sheets and boards on the ladder, `40 sheets at £180 = £7,200`,
  `60 boards at £170 = £10,200`; glass at one price, `20 glass units at £200 = £4,000`.
- The storage line, only when the order is past the free places [TUNE wording]:
  `60 sheets: 40 on the rack, 20 to storage at £150` (today's words), `60 boards: 40 on the stores,
  20 to storage at £150`, `30 glass units: 20 on the racks, 10 to storage at £150`.
- The Restock button: `Restock: 40 sheets, £7,200`, `Restock: 60 boards, £10,200`,
  `Restock: 30 glass units, £6,000`. Locked (`lockedButton('Restock', reason)`) with its reason, in
  this order: no room at all of the kind (`No shelving yet`, `No timber store`, `No glass rack`);
  nothing to buy while some is on its way (`12 sheets are on the way`, `12 boards are on the way`,
  `5 glass units are on the way`, and the singular `1 glass unit is on the way`); nothing to buy and
  nothing on its way (`No room on the rack` as today, `No room on the timber stores`,
  `No room on the glass racks`) [TUNE]; `Not enough cash`.
- The stock line under each block, today's markup (`stock-line`, `data-stock="sheets|boards|glass"`):
  the thumbnail (`thumb.sheet` as today, `thumb.solidWood` labelled `TMB`, `thumb.glass` labelled
  `IGU`, the label the number's first part as today), the name and the number (`MFC 18 mm, white`
  `MFC-18-WHT-nnn` as today; `Timber boards` `TMB-63-RED-nnn`; `Sealed glass units`
  `IGU-4-16-4-nnn`), `Free N`, `Reserved N`, `Total N of room`, and the badge
  `Low stock, under 4` while that kind has a room and its free count is under 4.
- The boards' block and the glass block are drawn once a store of their kind stands, or anything of
  their kind is on the counter, on its way or in the paid store [TUNE]. The sheets' block is always
  drawn, as today. The `No shelving yet` warning above it stays the sheets'.
- The hint under the three blocks names what is in the paid store, only the kinds that are there
  [TUNE]: `12 sheets, 30 boards and 5 glass units are in paid storage.`, `30 boards are in paid
  storage.`, `1 sheet is in paid storage.`
- The old boards row (`Held`, `Room`) and the glass rows of each line (`Glass at line 1`) go.
- Projects and Deliveries below are today's. A load of glass reads `7 glass units`.

## 2. The job card's material line (2.4, 2.7)

- The boards' figure as today: `12 of 12 boards of timber in hand` (`row-figure good
  sheets-reserved`) or `5 of 12 boards of timber short` (`row-figure bad shortfall`).
- Beside it, for a window or a door, the glass's in the same classes, with `data-glass="1"`:
  `7 of 7 glass units in hand` (held and used) or `3 of 7 glass units short` (the shortfall of the
  units).
- One `Order for this job, £N` button (`data-do="orderForJob"`) while either is short, the sum of
  the two orders; locked with `On its way already` while any load of the job is not unloaded.
- Gone: the hint `Timber is ordered for the job: the racks hold sheets.`, `Glass not ordered`,
  `Glass ordered, here on ...`, `Glass is in` and the `Order glass` button.

## 3. The line's running block (2.5)

- The figures line ends `£1,500 a window; the timber and the glass £600 a window, from the stores`.
- Its two rows, in the private `countRow`: `Timber held` / `24 boards, for 12 windows` and
  `Glass held` / `for 8 windows`, what the contract holds. No row of buttons and no `p.lock`.
- `Standing still` / `no timber` (or `no glass`, `no timber or glass`) keeps its words.

## 4. The hall (2.1)

- Each glass rack drawn as kit with no picture is (`objectArt`'s last branch: the flat box in the
  kit's colours with its name), its name saying what is on it and what it holds, `Glass rack: 7 /
  40` and `Large glass rack: 0 / 200`, and its plate (`rackCount`) the count on it, `7` and `0`,
  exactly as a timber rack's name reads `Timber rack: 12 / 40` and its plate `12`. The brief's
  "plate `7 / 40`" is read as the two together, the plate and the name's count (2.1: "the plate and
  the name's count on the hall").

## 5. The board's tile (2.7)

- A window's or a door's material line: `12 boards and 7 glass units of material · about N owner
  days`, the owner days as today. A sheet product's is today's `9 sheets of material · ...`.
- The red line `N boards, and the timber stores hold M` goes.
- The `Needs` line of a window ends `..., timber store, glass rack`.

## 6. The catalogue's storage tab (2.1)

- The storage tab is a list of folder cards, one a family (`renderFolders`: a tab holds folders and
  a folder holds the classes of one family, ui-style.md and the `folder` field). The two glass racks
  are two families of one class each, as the timber rack and the timber shelter are, so the tab
  gains two folder cards after `Timber shelters`, in the folder card's own markup: `Glass racks`
  (`from £1,500 · 1 class · Holds the glass units of the windows and doors on the hall floor,
  upright in their frames.`) and `Large glass racks` (`from £6,000 · 1 class · Holds five times a
  glass rack's units on twice its floor.`) [TUNE: the second folder's name, the brief's `Glass
  racks` read as the family of the two, each folder named for its family in the plural as
  `Timber racks` and `Timber shelters` are].
- Opened, the `Glass racks` folder shows its one class card in the machine card's markup: `Glass
  rack`, `Holds 40 glass units`, £1,500, `3 working days`, with the empty picture slot the cutter
  sets showed (docs/mockups/t28/timber-catalogue.html), since no picture has landed. The large
  one's card: `Large glass rack`, `Holds 200 glass units`, £6,000, `5 working days`.
- The class cards' own sentences [TUNE]: `A steel A frame holding the sealed units upright on
  rubber, two metres of it on the hall floor.` and `A slotted steel rack holding the sealed units
  upright in rows, four metres of it on the hall floor.`
