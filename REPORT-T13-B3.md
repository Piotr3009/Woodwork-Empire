# Report: Turn 13, phase B, group B3 (orders and stock)

Branch `t13-b3` from `9dcfc9a` (phase A, T13-A2). Sections 3.2, 3.3, 3.4, 3.6, 3.7, 3.15's gate
and 3.24 of CLAUDE.md T13. Files owned: `src/engine/orders.ts`, `src/engine/board.ts`,
`src/engine/materials.ts`, `src/engine/reputation.ts`, `src/engine/jobs.ts`,
`src/engine/website.ts`, `src/ui/board.ts`, `src/ui/materials.ts`, `src/ui/shopping.ts`,
`src/ui/jobCard.ts`, `src/ui/website.ts`, and the tests named after them.

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B3a Stock page and the reservation rule | this commit | The Stock tab rebuilt in the style of Joinery Core: one `stockLines(state)` selector in `materials.ts` (kind, name, stock number, free, reserved, total, capacity, low) drawn as `.stock-line` rows with a placeholder thumbnail, the name and the `MFC-18-WHT-875` number, Free, Reserved and Total, and the Low stock badge; one Restock button at the top off `restockCheck(state)`, which brings the low line back to `RESTOCK_TO_SHEETS`, counts the sheets already on the road for stock so a second click buys nothing, and never orders more than the rack has room for; the projects under it with the material line green when held and red with the shortfall and Order for this job at the ad hoc price; the deliveries. The Turn 11 free form "buy sheets for stock" is gone (3.2 names one button; 3.3 says Restock and Order for this job are the only ways to clear a shortfall). The shopping list names the job a load is for. `materialLine` says "1 of 1 sheet in hand". | `tests/engine/materials.test.ts` ("the reservation rule and Restock": reserve on accept, short by what the rack could not spare and cleared by a restock, back to the figure at the stock price and no more, nothing when nothing is low, never past the rack's room, 175 and 200, the stock number stable across a save); `tests/ui/materials.test.ts` (one line per kind with thumbnail, name and number; free, reserved, total; the badge under the figure and not at it; one Restock button at the top with what it buys; greyed with the reason when nothing is low and while a load is on the way; projects green and red with the order button; no per project question, no free form order, none of the software's detail; no shelving) |

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| `STOCK_LINE_NAME` | sheet: "MFC 18 mm, white"; solidWood: "Oak, 27 mm" | `src/engine/materials.ts`, marked `T13-C1: move to constants.ts` | wording, to match the `MFC-18-WHT` and `OAK-27` prefixes phase A chose |
| `STOCK_LINE_KINDS` | `['sheet']` | same | the kinds held on the rack as stock; solid wood and bespoke material are ordered per job and never held (3.3), so tonight the page has one line and a second kind is one entry in this list |
| Restock room cap | the rack's free spaces less what is on the road | `restockSheets` | a rule and not a figure: a Restock never orders past the rack, because a lorry that cannot be unloaded is the Turn 2 overflow question and a button should not walk the player into it |

## 3. Notes for phase C

### `src/engine/index.ts`

Add to the `// Material and deliveries` export block from `./materials`:
`pendingStockSheets`, `restockCheck`, `stockLines`; and
`export type { RestockCheck, StockLine } from './materials';`.
Then drop the `// T13-C1: export from index.ts` import in `src/ui/materials.ts` and import from
`'../engine/index'`.

### `src/engine/constants.ts`

Move `STOCK_LINE_NAME` and `STOCK_LINE_KINDS` from `src/engine/materials.ts` (they sit under the
`stockIsLow` function, each marked `// T13-C1: move to constants.ts`) into the 8.9 Materials block
next to `STOCK_NUMBER_PREFIX`, keeping their comments and the `[TUNE]` tag.

### `src/ui/app.ts` and `src/ui/laptop.ts` (dead code the stock page left behind)

The page prints no `data-field="stockSheets"` and no `data-do="buyStock"` any more. `Ui.stockSheets`
(app.ts 162, 283, 401, 1901 to 1903), the `buyStock` click handler (app.ts 1507 to 1509) and
`LaptopView.stockSheets` with the second argument of `renderMaterials` (laptop.ts, B5's file)
can go; the `BUY_STOCK` action itself stays, the scripted player of `tests/scenarios/autopilot.ts`
and `tests/engine/phoneAndCancel.test.ts` dispatch it. `renderMaterials(state, sheets)` keeps its
second argument tonight so laptop.ts compiles unchanged; when laptop.ts drops it, drop it here.

### `src/ui/styles.css`

```css
/* The stock page (T13 3.2): a line of the software the player is meant to recognise. */
.stock-head { align-items: center; }
.stock-list { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 4px; }
.stock-line {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 10px; background: #fff; border: 1px solid #d9d1bd; border-radius: 4px;
}
.stock-thumb {
  flex: 0 0 auto; display: inline-block; padding: 3px; background: #fff;
  border: 1px solid #c9c1ad; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); line-height: 0;
}
.stock-thumb svg { display: block; }
.stock-line .row-main { display: flex; flex-direction: column; min-width: 160px; }
.stock-name { font-weight: 600; }
.stock-number { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: #6b6b6b; letter-spacing: 0.04em; }
.stock-free, .stock-reserved, .stock-total { min-width: 92px; }
.stock-free { font-weight: 600; }
.badge-low { margin-left: auto; }
/* The material line of a job (T13 3.6): green in hand, red short; .good and .bad carry the colour. */
.shortfall { font-weight: 600; }
.sheets-reserved { font-weight: 600; }
```

## 4. Foreign test edits

- `tests/ui/typing.test.ts`, "keeps the digits in the order they were typed across re-renders":
  the test typed into the stock page's free form sheet count (`data-field="stockSheets"`), which
  3.2 replaces with the one Restock button, so the field is gone. The test now types into the
  binder's loan amount (`data-field="loanAmount"`, the Finance tab, `app.ts`'s own contract), the
  numeric field the game has now. The desk purchase and the wait for the morning stay, because the
  binder sits on the desk; the helper `nextMorning` waits for the binder instead of the laptop.
  Nothing about what the test proves changed.

## 5. Art requested

Nothing for the stock page: the thumbnails are the placeholder helper's flat board in a fake photo
frame (`thumb.sheet`, 64 by 48), code side, as CLAUDE.md T13 9.8 says.

## 6. Not done

- The Turn 11 free form "buy sheets for stock" field is removed rather than kept: the brief names
  one button (3.2) and says the only ways to clear a shortfall are Restock and Order for this job
  (3.3). A player who wants stock before anything is low has no button for it tonight; Restock
  wakes up the moment the free count drops under `LOW_STOCK_SHEETS`. If Piotr wants a "top up
  now" that is one more line on `restockCheck`.

## 7. Cross check notes

- One ledger (10.2): every pound in B3's files goes through `pay()`, `receive()`, `charge()`,
  `chargeUnavoidable()` or `noteLoss()` in `economy.ts`; a grep for `state.cash` over the eleven
  files finds nothing. The one direct write to `state.stock.sheets` outside the deliveries is
  `dropJob` handing uncut sheets back to the rack, which moves no money.
- The company board's material value: `src/ui/company.ts` prints no material value tonight (the
  felt carries the reputation log and the output); the insured value in `insurance.ts` reads
  `state.stock.sheets * SHEET_VALUE`, which is the total and not the free count, as 3.2 says.
