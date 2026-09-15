# Report: Turn 13, phase B, group B3 (orders and stock)

Branch `t13-b3` from `9dcfc9a` (phase A, T13-A2). Sections 3.2, 3.3, 3.4, 3.6, 3.7, 3.15's gate
and 3.24 of CLAUDE.md T13. Files owned: `src/engine/orders.ts`, `src/engine/board.ts`,
`src/engine/materials.ts`, `src/engine/reputation.ts`, `src/engine/jobs.ts`,
`src/engine/website.ts`, `src/ui/board.ts`, `src/ui/materials.ts`, `src/ui/shopping.ts`,
`src/ui/jobCard.ts`, `src/ui/website.ts`, and the tests named after them.

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B3a Stock page and the reservation rule | `daa8360` | The Stock tab rebuilt in the style of Joinery Core: one `stockLines(state)` selector in `materials.ts` (kind, name, stock number, free, reserved, total, capacity, low) drawn as `.stock-line` rows with a placeholder thumbnail, the name and the `MFC-18-WHT-875` number, Free, Reserved and Total, and the Low stock badge; one Restock button at the top off `restockCheck(state)`, which brings the low line back to `RESTOCK_TO_SHEETS`, counts the sheets already on the road for stock so a second click buys nothing, and never orders more than the rack has room for; the projects under it with the material line green when held and red with the shortfall and Order for this job at the ad hoc price; the deliveries. The Turn 11 free form "buy sheets for stock" is gone (3.2 names one button; 3.3 says Restock and Order for this job are the only ways to clear a shortfall). The shopping list names the job a load is for. `materialLine` says "1 of 1 sheet in hand". | `tests/engine/materials.test.ts` ("the reservation rule and Restock": reserve on accept, short by what the rack could not spare and cleared by a restock, back to the figure at the stock price and no more, nothing when nothing is low, never past the rack's room, 175 and 200, the stock number stable across a save); `tests/ui/materials.test.ts` (one line per kind with thumbnail, name and number; free, reserved, total; the badge under the figure and not at it; one Restock button at the top with what it buys; greyed with the reason when nothing is low and while a load is on the way; projects green and red with the order button; no per project question, no free form order, none of the software's detail; no shelving) |
| T13-B3b Enquiry flow and the budget answer | `ad084fd` | The day's post off the one table plus the website's share: `websiteEnquiriesOn(day, weekly)` spreads the weekly figure over the working week as whole enquiries (a plus Monday first, a minus Friday first, nothing on a weekend), `enquiriesDueToday` adds it to the tier's figure; `enquiryQualityTier` moves the template weights a tier up or down with the website and never off the ladder, on the templates the reputation allows; the automatic refill after an acceptance is gone (phase A) and proved. The client's answer: `answerSkew` is a quarter per reputation tier either side of the neutral tier (`ANSWER_SKEW_NEUTRAL_TIER` 1, a new company), a quarter for an estimator, a quarter for the salesman, capped; `drawOffer` bends a uniform draw with it and never leaves the band; the offer is the price, the budget is kept on the job, declining costs nothing but the enquiry. The effective reputation (`effectiveReputation` in `reputation.ts`, earned plus the website bonus, clamped) is what every read on the board and the company totals use. The board tile says "Budget" and carries `data-kind`; the head prints the effective reputation and the website's share of it in green. | `tests/engine/board.test.ts` ("the day's post": one a day at the start and two at the top tier, arrives at the open and never after an acceptance, the weekly figure lands as whole enquiries over a week, the quality tier moves and stays on the ladder and is measured; "the client's answer": the skew a quarter at a time and capped, inside the band over a thousand draws at three skews, a good team up and a poor one down over three thousand draws with nothing guaranteed); `tests/engine/jobs.test.ts` ("the client answers with a number": the offer is the price and the budget is kept and the deposit follows the offer, declining costs nothing, asked once); `tests/engine/reputation.test.ts` (the effective figure per level, never past the scale, what the tiers and the company board read); `tests/ui/board.test.ts` (Budget on the tile, the kind, the head with the bonus) |
| T13-B3c Website | `53b5b10` | The Website tab under Admin: `websiteLadder(state)` in `website.ts` (each level with held, outgrown and the buy check) drawn as five `.website-level` rungs, the one held marked `is-on` with a Held badge, the ones below marked Outgrown; each rung prints its effects first (`.card-effects`: the enquiries a week, the quality tiers and, at 4 and 5 only, the reputation bonus, every one through `signedFigure` so the plus is green and the minus red) and its costs second (`.card-costs`: the price or "Nothing to buy", the weekly upkeep minutes or "No upkeep"), then Buy at the level's price for a level above the one held, greyed with the reason when the cash is short. The purchase (`setWebsiteLevel`, phase A) charges the full price of the level bought once through the `website` ledger category and the level only ever rises; the reputation bonus is read through `effectiveReputation` (B3b). The weekly upkeep task lands from `createDailyTasks` in tasks.ts (B2's, verified) with the level's minutes. | `tests/engine/website.test.ts` (five levels and the start at 1, levels 1 to 3 never touch the reputation, 4 and 5 add exactly the constant while held and never earn it, bought once through the ledger and only ever rises, refused past the overdraft floor with the reason, the upkeep task once a week with the level's minutes, the ladder's flags); `tests/ui/website.test.ts` (five rungs with effects before costs and the one held marked, every effect coloured by its sign and a reputation line only at 4 and 5, the upkeep minutes in the costs, buy buttons only above the level held and greyed with the reason when short) |
| T13-B3d Commercial enquiries and the insurance gate | this commit | Phase A's gate verified and finished: `qualifiesForCommercial` (effective reputation above `COMMERCIAL_MIN_REPUTATION`, at least `COMMERCIAL_MIN_STAFF` on the books), `buildEnquiry` draws the kind and scales the budget and the base price by `[COMMERCIAL_BUDGET_FACTOR_MIN, MAX]`, and now works the deadline out from the scaled work, off the same draw at the same place in the stream (`drawDeadline` and `deadlineDaysFrom` in jobs.ts; before, a commercial job got the days of the residential one, and the board's hands check greyed it as "too few people" once the gate was lifted); `refreshLocks` reads what is in the way in the order the player meets it, the kit and the hands first and then the two covers (`insuranceGateShut`), so a commercial enquiry greyed for the kit is never lifted by insurance, one greyed for insurance joins the band the moment both covers are held and is greyed again with the reason when one is dropped; `canAccept` and `acceptEnquiry` refuse it while greyed. The tile carries a Commercial badge, `data-kind`, "Cannot take this: no insurance" and an Open the laptop link to the covers. | `tests/engine/board.test.ts` ("commercial enquiries and the insurance gate": only asked above 20 with somebody on the books and about `COMMERCIAL_PROBABILITY` of the post; two to three times the residential budget by template with the work scaled; arrives greyed with the reason and never in the band; cannot be taken while greyed, one cover is not both, live with both, greyed again without, taken with the covers the job is commercial; a kit reason stays ahead of the insurance one); `tests/ui/board.test.ts` (the tile says Commercial, is greyed with the reason, carries no Accept and points at the laptop; goes live with Accept once both covers are held) |

## 2. Numbers chosen

| Number | Value | Where | Note |
|---|---|---|---|
| `STOCK_LINE_NAME` | sheet: "MFC 18 mm, white"; solidWood: "Oak, 27 mm" | `src/engine/materials.ts`, marked `T13-C1: move to constants.ts` | wording, to match the `MFC-18-WHT` and `OAK-27` prefixes phase A chose |
| `STOCK_LINE_KINDS` | `['sheet']` | same | the kinds held on the rack as stock; solid wood and bespoke material are ordered per job and never held (3.3), so tonight the page has one line and a second kind is one entry in this list |
| Restock room cap | the rack's free spaces less what is on the road | `restockSheets` | a rule and not a figure: a Restock never orders past the rack, because a lorry that cannot be unloaded is the Turn 2 overflow question and a button should not walk the player into it |
| `ANSWER_SKEW_NEUTRAL_TIER` | 1 | `src/engine/board.ts`, marked `T13-C1: move to constants.ts` | the reputation tier the client's answer is uniform at (a new company at reputation 0); under it the skew goes negative, which the brief's literal `0.25 * reputationTier` never does although it asks for a skew in [-1, +1] and for a poor team landing nearer 0.90 more often (see Not done) |
| the website's weekly spread | a plus on the first days of the week, a minus on the last | `websiteEnquiriesOn` | a rule and not a figure: one whole enquiry a day either way, so a week always carries exactly the weekly figure; the week is five working days and the post never lands on a weekend |

## 3. Notes for phase C

### `src/engine/index.ts`

Add to the `// Material and deliveries` export block from `./materials`:
`pendingStockSheets`, `restockCheck`, `stockLines`; and
`export type { RestockCheck, StockLine } from './materials';`.
Then drop the `// T13-C1: export from index.ts` import in `src/ui/materials.ts` and import from
`'../engine/index'`.

Add to the `./board` export block: `enquiryQualityTier`, `websiteEnquiriesOn`; and to the
`./reputation` block: `effectiveReputation`. Then drop the `// T13-C1: export from index.ts`
import of `effectiveReputation` in `src/ui/board.ts`.

Add to the `./website` export block: `websiteLadder`, and
`export type { WebsiteRung } from './website';`. `src/ui/website.ts` imports straight from
`'../engine/website'` (as phase A's stub did); it can move to `'../engine/index'` then.

### `src/engine/constants.ts`

Move `STOCK_LINE_NAME` and `STOCK_LINE_KINDS` from `src/engine/materials.ts` (they sit under the
`stockIsLow` function, each marked `// T13-C1: move to constants.ts`) into the 8.9 Materials block
next to `STOCK_NUMBER_PREFIX`, keeping their comments and the `[TUNE]` tag.

Move `ANSWER_SKEW_NEUTRAL_TIER` from `src/engine/board.ts` (above `answerSkew`, marked
`// T13-C1: move to constants.ts`) to the 8.8 block under `ANSWER_SKEW_MAX`.

### The other readers of `state.reputation` (not B3's files; optional, for one set of rules)

`effectiveReputation(state)` is the figure the board, the tier tables and the company totals
read now. Three gates outside B3's files still read the earned figure: the hiring pool
(`src/engine/staff.ts` 218, `state.reputation < spec.minReputation`), the equipment the
catalogue gates by standing (`src/engine/game.ts` 2289) and the salesman's meeting
(`src/engine/tasks.ts` 457). The brief says the tier tables read the effective figure and says
nothing of these gates, so B3 left them; if phase C wants one figure everywhere, each is a one
word change to `effectiveReputation(state)`. `src/ui/dayEnd.ts` 150 prints the earned figure on
the game over card; `formatReputation(effectiveReputation(state))` would print the one the
player has been reading.

### `src/engine/types.ts` (optional): `blockWhere: '' | 'catalogue' | 'team' | 'insurance'`

The tile's link for a greyed commercial enquiry goes to the laptop, where the covers are bought.
`Enquiry.blockWhere` cannot say so (types.ts is frozen), so `src/ui/board.ts` compares
`enquiry.blockReason === NO_INSURANCE_REASON` (the constant imported from constants.ts, a
string and not a figure). If phase C adds `'insurance'` to `blockWhere`, `refreshLocks` and
`buildEnquiry` in `board.ts` set it where they set `NO_INSURANCE_REASON`, and `blockLink` in
`src/ui/board.ts` reads `blockWhere === 'insurance'` instead. The laptop opens on its Tasks tab;
a `data-tab` on `openModal` that lands on the Insurance tab is app.ts's to add if wanted.

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
/* The website ladder (T13 3.7): five rungs, the one held framed. */
.website-level {
  display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; align-items: center;
  padding: 10px 12px; margin: 6px 0; border: 1px solid #d9d1bd; border-radius: 4px; background: #fff;
}
.website-level h3 { grid-column: 1; margin: 0; }
.website-level .row-action { grid-column: 2; grid-row: 1 / span 3; justify-self: end; }
.website-level .card-effects, .website-level .card-costs { grid-column: 1; margin: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.website-level .card-costs { color: #6b6b6b; }
.website-level.is-on { border-color: #1f5a3a; box-shadow: inset 3px 0 0 #1f5a3a; }
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

- The skew formula is built around a neutral tier and not literally `0.25 * reputationTier`:
  with tiers 0, 1 and 2 the literal formula never goes under nothing, so a poor company with a
  poor team would draw uniformly in the band and never "nearer 0.90 more often" as 3.24 asks, and
  the brief's own range for k is [-1, +1]. `k = 0.25 * (reputationTier - 1) + 0.25 * estimator +
  0.25 * salesman`, so a company under zero reputation is skewed down a quarter, a new company at
  zero is uniform, and the coefficients are the brief's. The salesman is one tier tonight
  (`HIRING_SPECS`), so "salesmanTier" is one when he is on the books.
- Raising the website charges the full price of the level bought, not the difference: the
  table's Cost column is what each site costs and a better agency does not credit the template
  the company had. One line in `websiteCheck` if Piotr wants the difference.
- The offer event's body reads "The budget was £9,000. The client offers £9,400. Accept?" (phase
  A's wording, one sentence more than the brief's, so the player sees what the number is against).
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
- One set of rules about people (10.3): `qualifiesForCommercial` counts `state.workers.length`,
  everybody on the books whatever the role and shift, and `answerSkew` asks the same list for an
  estimator and a salesman; the liability premium in `insurance.ts` (B1) counts the same list.
  A worker who has been hired and has not started yet counts in all three.
- The seeded stream is phase A's, draw for draw: `buildEnquiry` takes the deadline's one draw
  before it knows the kind of client (`drawDeadline` in jobs.ts keeps the cursor the draw was made
  from) and reads the days off it once the scaled work is known (`deadlineDaysFrom`, the same
  `int` on a copy of that cursor), so a residential enquiry gets the deadline it got before to the
  day and a commercial one gets the days its larger work takes, with no extra draw and no draw out
  of order. A first cut drew the kind first and moved the thirty day scenario from reputation 21
  to 18; the sixteen months of `tests/scenarios/` are green on the final code without an edit.
- The warning strip's "no insurance for a commercial job on the board" (B5, `warnings.ts`)
  should read `enquiry.kind === 'commercial' && enquiry.blockReason === NO_INSURANCE_REASON`,
  which is exactly what the board sets and clears; `coversHeld` alone is not enough, because a
  commercial enquiry greyed for its kit is not an insurance problem.
