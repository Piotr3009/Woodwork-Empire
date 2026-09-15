# Report: Turn 13

The workshop grows up: everything designed on 15.09, in one session, on the one model of dust
Turn 12 laid down.

Branch `claude/nice-clarke-yk11fj` (the cloud environment names the branch; the brief's task queue
would have called it `turn-13-the-workshop-grows-up`). Base: `317f344` on `main`, the Turn 12 merge,
with `APP_VERSION` `v19` and no `bagIntervalFactor` anywhere, which is the brief's precondition.
Thirty three commits on top of it: two of phase A, twenty one of phase B in five worktrees merged
back as five merge commits, and eight of phase C. 1,421 tests green and three todo in 139 files,
up from the 1,098 and one todo in 103 files at the end of Turn 12. `npm run check` clean on its
own exit code before every commit of phase A, B and C (phase C's six T13-C1 commits were checked
as one series, with `tsc` between them; section 5 says why).

The five phase B groups wrote their own reports from their worktrees, `REPORT-T13-B1.md` to
`REPORT-T13-B5.md`, and they are kept in the repository as they were written: the detail of
every task, every note phase C applied, and every reading a group made is there. This file is
the consolidation: what is built, what was chosen, what the cross check found, and where the
brief and the economy disagree.

---

## 0. Blockers, and the one finding Piotr should read first

Nothing in the brief was impossible to build, and every section of 3 is built. One thing the brief
asserts is not true of the game as it stands, and it is the playthrough of 10.4:

**The brief's three month script sinks on Easy, and the raised draw sinks it on Very easy too.**
Played headless exactly as 10.4 says (`tests/scenarios/playthrough.test.ts`: a poor joiner on
day 1, the standard saw and the standard extractor connected, every residential enquiry with a
margin over 20% after the client's answer, the first contract offered, the estimator on day 31,
the manager on day 61, five days away from day 64, the draw at 400 from day 31, level 1 security
and both covers from day 31, the licence on subscription), the numbers are:

- Month 1 on Easy: 20,000 of capital, 13,035 of kit (the 7,000 saw, the 1,400 fan, the day 1
  list and the joiner's kit), 5,250 of rent, rates and deposit, 4,400 of draw, 1,920 of wages,
  against 4,512 of job revenue and 960 of contract margin. The bank is 3,205 under at the end of
  the month, and the overdraft interest line follows on day 61.
- Month 2 on Easy: the raised draw (400 a day is 8,800 a month) and the covers take the account
  to the overdraft limit in the middle of the month; from there every bill goes to the arrears
  (4,875 by day 61, 16,334 by day 91) and the draw is not actually paid, so the house tier never
  moves.
- Month 3 on either difficulty: with the one joiner on the contract and the owner away for five
  days, the jobs on the books wait and go out late (four to eight days each), and the reputation
  falls from 15 to minus 17 on Easy and to minus 5 on Very easy.
- The same script on Very easy (50,000) ends month 2 at 15,288 in the bank and house tier 2, and
  month 3 at minus 1,155 after the manager's 3,400, the estimator's 2,600, the draw's 8,400 and
  the holiday's late jobs.

What holds of 10.4's assertions, on Easy: the crew, the kit and the paper arrive as scripted; no
loan is ever needed or taken; the first contract offered is taken, every week of it is made in
full and the client renegotiates it up; the month end report has every line and the lines sum to
the cash delta; the efficiency is above 55% in month 3 (56%, 64%, 69% over the three months).
What does not hold: "cash never hits the overdraft interest line" and "the house tier reaches 2
in month 3". Both are `it.todo` entries with the measured figures, the way Turn 12 marked its
blocker, so the suite shows them as pending and not as passing.

This is not a bug in any one rule: every line of the month end is the rule the brief asked for.
It is the economy Turn 12 balanced for a used saw at 1,800 and a living cost of 200 a day, asked
to carry a 7,000 saw in month 1, a 400 a day draw from month 2 and 6,000 a month of desk
salaries from month 3, on 20,000. Two figures phase C tuned on the way, so that the script could
be played at all: the contract quantity band, from 40 to 80 a week down to 20 to 40 (a poor
joiner makes about 32 pieces a week, so the old band was short every week and cost a point of
reputation a week); and the estimator's standing, from reputation 5 down to 0 (the script hires
him on day 31 and the reputation is 0 then). The rest is Piotr's to weigh: section 9 lists the
levers (the draw tiers, the standard saw's price, the desk salaries, the starting capital that
section 8 of the brief keeps at 50,000 or 40,000).

---

## 1. Done

### Phase A: the contracts (one agent, serial)

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-A1 Housekeeping and v20 | `8cd0c82` | `docs/turn-12-brief.md` out of git history, byte for byte the `CLAUDE.md` of `08ef09b`; `docs/art/REQUESTS-T13.md` with the section 9 list; the README's brief and report lines; `APP_VERSION = 'v20'`. | `tests/ui/version.test.ts` |
| T13-A2 Contracts and stubs | `9dcfc9a` | Section 4 in `types.ts` and `STATE_VERSION` 14 with `liftToVersion14` in `migrate.ts`; every constant of section 3 in `constants.ts` with its tag; the roles `estimator` and `productionManager`; the laptop's Admin group (`website`, `insurance`, `security`), the binder's `finance` tab, the Orders page's `contracts` tab, the `settings` modal; twenty one new action types routed in `game.ts`; `charge()` in `economy.ts` writing dated ledger lines; the shared placeholder helper `src/render/placeholder.ts`; the new engine modules `finance`, `insurance`, `website`, `security`, `pipes`, `contracts`, `efficiency`, `warnings` and the new UI modules `finance`, `contracts`, `monthEnd`, `website`, `security`, `insurance`, `house`, `tips`, `settings`, all stubbed and compiling. Phase A also carries every rule change with a wide blast radius (the client's answer, the reservation rule, one enquiry a day, the pipe connection rule, the crew limit, the unload table, the five class ladders), so that no phase B agent had to touch a test outside its group to stay green. | `tests/engine/turn13Contracts.test.ts`: every action the union declares is routed, and the v19 fixture `tests/fixtures/save-v19.woodwork.json` loads with every section 4 default |

### Phase B (five groups, parallel, in worktrees)

One row per task; the detail, the tests case by case and every reading are in the group's own
report. Every commit was `npm run check` green in its worktree before it was made.

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B1a Finance | `af46e53` | The loan counts its instalments off the calendar so the month runs once however many hooks ask; the sixtieth instalment closes the balance; a part repayment re-amortises over the same term; the overdraft accrues daily below zero and is charged on the 1st, interest only; the Finance tab of the binder with Take loan, Repay and Repay it all; the loan and interest lines labelled in the binder. | `tests/engine/finance.test.ts`, `tests/ui/finance.test.ts` |
| T13-B1b Insurance | `5cf9086` | The two covers with their premiums, the insured value split into machines and stock, the first premium pro rata by the days left in the month (nothing is free), the uninsured accident's claim drawn once in the band, the burglary payout over ten days with cover and an alarm and nothing at level 0; the Insurance tab under Admin with the red line at level 0. | `tests/engine/insurance.test.ts`, `tests/ui/insurance.test.ts` |
| T13-B1c Contracts | `67a0dae` | The offer off its own seeded stream (the seed and the day), the term from the day accepted, the week in hand pro rata for part weeks, joiners only, the piece made minute by minute on the saw that stays in the general queue, one ledger line a day per contract, the short week's point of reputation, the renegotiation in whole pounds, the closing report event, renew or let go on the Contracts tab; the standing bar on the Work Plan. | `tests/engine/contracts.test.ts`, `tests/ui/contracts.test.ts` |
| T13-B1d Month end | `a930ef8` | `monthReport(state, month)` in `economy.ts`: seventeen lines off the ledger's dated lines, every ledger category on exactly one line, the cash at open and close, bills that went to the arrears counted apart; the Month end modal in the folder skin. | `tests/engine/economy.test.ts`, `tests/ui/monthEnd.test.ts` |
| T13-B2a Estimator and the material list | `6ac31d6` | The take off verified line by line against 3.8: gated behind the drawing, the owner's until an estimator is in, five a day, ten with Joinery Core, five more per extension and never more than two, at the estimator's tier speed; Joinery Core and its extensions bought on the Technical tab; the button says "Create material list". | `tests/engine/tasks.test.ts`, `tests/ui/team.test.ts` |
| T13-B2b Production manager, second shift, holiday | `fd40725` | `isWorkingToday(state, worker, shift)` the one predicate; `workMinute()` in `production.ts` is the production minute factored out and proved equal to the clock's; `runNightShift` works the night crew after the day at the night rate with the owner gone, the night's tier on the rating, the accident roll doubled, the breakdown roll doubled; the assign minutes on the manager's day log and off the owner's; the two absence penalties; the Holiday buttons and the countdown. | `tests/engine/staffSecondShift.test.ts`, `tests/engine/ownerHoliday.test.ts`, `tests/engine/production.test.ts`, `tests/ui/teamShift.test.ts` |
| T13-B2c Crew limit | `2076961` | Verified against 3.10: the owner, the floor roles and the manager count, the desks do not; "Crew 4 / 5, floor limited" on the Workshop and Management tabs; the hire refused with the reason. | `tests/engine/staffCrewLimit.test.ts`, `tests/ui/teamCrew.test.ts` |
| T13-B2d The owner's draw and the house | `d551e49` | The eight draw chips on the owner's card, the house tier and its thirty day sum, no slider, no suggestion; `houseTierFor` verified to follow the ledger's paid lines and never the setting; `renderHouseCard` over the placeholder. | `tests/engine/ownerHouse.test.ts`, `tests/ui/teamDraw.test.ts`, `tests/ui/house.test.ts` |
| T13-B3a Stock page and the reservation rule | `daa8360` | The Stock tab rebuilt in the style of Joinery Core: `stockLines`, the thumbnail, the stock number, Free, Reserved, Total, the Low stock badge, one Restock button that never double buys or over fills the rack; the projects in red and green; the Turn 11 free form field gone. | `tests/engine/materials.test.ts`, `tests/ui/materials.test.ts` |
| T13-B3b Enquiry flow and the budget answer | `ad084fd` | The day's post off the one table plus the website's share spread over the week as whole enquiries, the quality tier shift, the client's answer inside the band with the skew around a neutral tier, `effectiveReputation` read by the board and the tier tables, the tile says Budget. | `tests/engine/board.test.ts`, `tests/engine/reputation.test.ts` |
| T13-B3c Website | `53b5b10` | The Website tab under Admin: the five rungs, effects before costs, every sign coloured, bought once and only ever raised, the upkeep task verified weekly. | `tests/engine/website.test.ts`, `tests/ui/website.test.ts` |
| T13-B3d Commercial enquiries and the insurance gate | `e74e229` | The gate finished: the kit first, the covers second, the commercial deadline off the same seeded draw so residential enquiries are bit for bit what they were; the tile says Commercial and links to the laptop. | `tests/engine/board.test.ts` |
| T13-B4a Five classes, the spindle moulder, the badges | `fe143bf` | One `classCard` layout for every family: effects, costs with the insurance a year, description; the badge and the frame colour off `CLASS_BADGE`; the spindle moulder and the pallet truck through the placeholder helper; the two kitchens greyed without a spindle moulder; `TIMBER_BRANCH_MIN_SPINDLE_CLASS` proved unread. | `tests/engine/variants.test.ts`, `tests/ui/machine.test.ts`, `tests/ui/spriteCheck.test.ts` |
| T13-B4b Gates | `acad7c3` | `hasGate`, `outputFactorOf`, `gateCheck`; `extractionLoad` counts an ungated connected machine whenever the fan runs and a gated one only while it runs; the gate button on the Owned tile; the collar on the drop cell. | `tests/engine/machines.test.ts`, `tests/engine/extraction.test.ts` |
| T13-B4c Pipes | `372b9d4` | `pipes.ts` rewritten around a path of cells: Manhattan, the long leg first, one elbow at most, a tee onto an existing run to the same unit where shorter, the tiles from the arms, the metres charged, a branch taking over a trunk's tail; the tiles drawn in the 2:1 dimetric above the equipment; the red outline while short; Connect with its cost on the Owned tile. | `tests/engine/pipes.test.ts`, `tests/render/ducts.test.ts`, `tests/render/views.test.ts` |
| T13-B4d Security | `f750edb` | The ladder on the laptop with the firm's formula in words, `burgle` taking one or two of the dearest machines with their pipes, gates and tasks and the free stock, the burglary loss line and event, paid out with cover and an alarm, zero risk at level 5 over ten thousand rolls. | `tests/engine/security.test.ts`, `tests/ui/security.test.ts` |
| T13-B4e Deliveries at the gate and the walk | `6c5d7ca` | The pallet at the gate as what it is, the arrived kit drawn as itself with a new tag, the unloading walk gate to rack by `unloadTrips` and `unloadLegAt`, 45 / 30 / 15 off the one table, every role on the sprite check page. | `tests/engine/stations.test.ts`, `tests/engine/deliveries.test.ts`, `tests/render/views.test.ts` |
| T13-B5a Side menu, colour audit, settings | `f5e9b46` | The menu's own close control and the gear on the top bar; the day end's In, Out and Net through `signedFigure`; the audit test that walks every class card of every family, the summary and the day figure; the settings modal with tips on and off. | `tests/ui/menu.test.ts`, `tests/ui/modal.test.ts`, `tests/ui/settings.test.ts` |
| T13-B5b Efficiency number and breakdown | `325b2c2` | `Efficiency 73%` live next to the clock as a details element with the plate of four lines behind a click; `topCause`; the day end's efficiency line; `patch.ts` leaves a details' open attribute alone. | `tests/engine/efficiency.test.ts`, `tests/ui/topbar.test.ts` |
| T13-B5c Tips and the warning strip | `502c92f` | `warnings()` complete in one order of urgency (bags full, a started job nobody is on, a deadline at risk, a commercial enquiry with no insurance, the crew at the floor limit); the bubbles once each, dismissed, remembered, off with the setting. | `tests/engine/warnings.test.ts`, `tests/ui/tips.test.ts` |
| T13-B5d The day end house card and frame fallbacks | `b0de333` | The day end flow proved end to end through the page with the seconds faked; the Home row on the summary; the fallback rule proved; the frame table per role. | `tests/ui/dayEnd.test.ts`, `tests/render/frameFallbacks.test.ts` |

### Phase C (one agent, serial)

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-C1 Apply the notes | `e0d4916`, `021ddab`, `222b13e`, `46d740d`, `aad16df`, `93d71c3` | One commit per frozen file (section 3), and one for the cross group notes in files nobody was frozen out of. | the suite |
| T13-C2 Scenarios | `3451e67` | The five months (t) to (x) in `tests/scenarios/turn13.test.ts`; the three month playthrough of 10.4 with its Very easy control in `tests/scenarios/playthrough.test.ts`; the scripted player's hooks for them (`acceptOffer`, `takeContracts`, `onDay`, `joinerTier`, `licence`). The sixteen months were re-measured in phase A for the enquiry rate, the reservation rule, the draw and the crew limit (section 5) and hold under phase B without an edit. | green |
| T13-C3 The cross check | `d022166` | Section 6 of this file, every line answered; the two scenario assertions of 10.1 and 10.2 added to `turn13.test.ts`; the look opened once in the browser and screenshotted into `docs/report-t13/`; four look fixes. | green, and the pictures |
| T13-C4 The playthrough | `3451e67` | Section 7 of this file. | `tests/scenarios/playthrough.test.ts` |
| T13-C5 Report and PR | this commit | This file, `docs/art/REQUESTS-T13.md` brought up to date with the groups' additions, the PR. | |

---

## 2. Numbers chosen

Every `[TUNE]` this turn added, grouped by the section of the brief, with what went in. Piotr's
own figures are marked as his and are not in this list unless a figure next to them was chosen.
Phase A's figures first, then what the five groups added, then phase C's two.

### 3.2 Stock

| Number | Value | Where | Note |
|---|---|---|---|
| `LOW_STOCK_SHEETS` | 4 | `constants.ts` | the brief's own suggestion |
| `RESTOCK_TO_SHEETS` | 12 | `constants.ts` | the brief's own suggestion |
| `STOCK_NUMBER_PREFIX` | `MFC-18-WHT`, `OAK-27` | `constants.ts` | wording; three digits off the seed follow |

### 3.4 and 3.24 Enquiries and the client's answer

| Number | Value | Where | Note |
|---|---|---|---|
| `ENQUIRIES_PER_DAY_BY_REPUTATION_TIER` | `[1, 1, 2]` | `constants.ts` | PIOTR: one at the start, two at most |
| `ANSWER_SKEW_PER_REPUTATION_TIER`, `ANSWER_SKEW_ESTIMATOR`, `ANSWER_SKEW_SALESMAN` | 0.25 each | `constants.ts` | the brief's `k = 0.25 * ...`; clamped at `ANSWER_SKEW_MAX` 1 |
| `COMMERCIAL_BUDGET_FACTOR_MIN` / `MAX` | 2 / 3 | `constants.ts` | the brief's "2 to 3 times" |
| `COMMERCIAL_PROBABILITY` | 0.3 | `constants.ts` | the share of a qualifying day's post that is commercial |

### 3.7 Website

| Number | Value | Where | Note |
|---|---|---|---|
| level 1 effect | -1 enquiry a week, quality -1 tier | `WEBSITE_LEVELS` | the brief's suggestion |
| level 3 price and effect | 2,500; +1 a week | `WEBSITE_LEVELS` | the brief's suggestion |
| level 4 effect | +2 a week, quality +1 tier, +2 reputation | `WEBSITE_LEVELS` | price 8,500, PIOTR's band |
| level 5 effect | +3 a week, quality +1 tier, +3 reputation | `WEBSITE_LEVELS` | PIOTR's 15,000 |
| upkeep minutes | 0, 10, 13, 17, 20 a week | `WEBSITE_LEVELS` | PIOTR: 10 at level 2 to 20 at level 5; the two between interpolated |

### 3.8 Estimator

| Number | Value | Where | Note |
|---|---|---|---|
| `JOINERY_CORE_PRICE_YEARLY` | 1,200 | `constants.ts` | the brief's suggestion, charged a twelfth a month |
| `JOINERY_CORE_EXTENSION_PRICE_YEARLY` | 600 | `constants.ts` | the brief's suggestion; at most two |
| `ESTIMATOR_MONTHLY_WAGE` | 2,400 / 2,600 / 2,900 | `constants.ts` | the brief's 2,600 as the normal tier |
| `ESTIMATOR_RATES` | 0.8 / 1 / 1.2 | `constants.ts` | speed at the take off against the owner |
| `ESTIMATOR_REPUTATION` | 5 | `constants.ts` | the standing he is hired from |

### 3.9 Production manager and the second shift

| Number | Value | Where | Note |
|---|---|---|---|
| `PRODUCTION_MANAGER_MONTHLY_WAGE` | 3,400 | `constants.ts` | the brief's suggestion |
| `PRODUCTION_MANAGER_REPUTATION` | 10 | `constants.ts` | |
| `OWNER_AWAY_PENALTY_WITH_PM` | 0.08 | `constants.ts` | PIOTR's 0.05 to 0.10 |
| `HOLIDAY_MAX_DAYS` | 10 | `constants.ts` | the longest holiday the button offers |
| `SECOND_SHIFT_MINUTES` | 480 | `constants.ts` | |
| `NIGHT_RATE` | 1.25 | `constants.ts` | |
| `NIGHT_QUALITY_TIER_DROP`, `NIGHT_ERROR_FACTOR` | 1, 2 | `constants.ts` | |

### 3.10 Floor

| Number | Value | Where | Note |
|---|---|---|---|
| `M2_PER_PERSON` | 24 | `constants.ts` | the 200 m2 hall with the day 1 kit has 153 m2 free, which is owner plus five; every joiner's bench and cabinets take about 7 m2, so the crew that actually fits is owner plus four (`tests/engine/staff.test.ts`) |

### 3.11 to 3.13 Gates, classes, the spindle moulder

| Number | Value | Where | Note |
|---|---|---|---|
| `CLASS_BADGE` colours | grey, slate, the game's green, amber, mauve | `constants.ts` | one per class, the same across families |
| thicknesser prices | 900 / 2,500 / 5,500 / 11,000 / 22,000 | `THICKNESSER_VARIANTS` | |
| solid wood tools prices | 800 / 2,200 / 4,500 / 9,000 / 16,000 | `SOLID_WOOD_TOOLS_VARIANTS` | |
| CNC prices | 18,000 / 30,000 / 45,000 / 75,000 / 120,000 | `CNC_VARIANTS` | the three from before kept |
| spray booth prices | 6,000 / 11,000 / 18,000 / 32,000 / 55,000 | `SPRAY_BOOTH_VARIANTS` | the standard one kept at 18,000 |
| drill prices | 40 / 120 / 220 / 400 / 700 | `DRILL_VARIANTS` | the old drill is the budget one |
| spindle moulder prices | 1,500 / 4,000 / 9,000 / 16,000 / 28,000 | `SPINDLE_MOULDER_VARIANTS` | the brief's suggestion |
| spindle moulder footprint | 2 by 1, zone 3 by 3 | `SPINDLE_MOULDER_VARIANTS` | the brief's suggestion |
| extraction demand, new rows | thicknesser 1,200 to 1,800; tools 1,100 to 1,500; CNC used 1,400, budget 1,500; spindle moulder 900 / 1,000 / 1,300 / 1,600 / 2,200 | `EXTRACTION_DEMAND` | the brief's spindle figures; the rest extend the table |
| delivery days, new ladders | CNC 5 / 20 / 45 / 45 / 60; booth 5 to 30; thicknesser and tools 1 to 12; spindle 1 to 20; drill 1 | `DELIVERY_DAYS_BY_CLASS` | |
| `MACHINE_ENDURANCE_HOURS.spindleMoulder` | 3,500 | `constants.ts` | |
| `handlelessKitchen` | price 9,000, four stages, needs the spindle moulder | `PRODUCT_TEMPLATES` | the brief's suggestion |
| `GATE_PRICE`, `GATE_OUTPUT_BONUS` | 1,000, 0.02 | `constants.ts` | PIOTR |

### 3.14 Finance

| Number | Value | Where | Note |
|---|---|---|---|
| `LOAN_MAX` | 50,000 | `constants.ts` | the brief's suggestion |
| `LOAN_EARLY_REPAYMENT_PENALTY` | 0 | `constants.ts` | |
| `LEDGER_MAX_ENTRIES` | 2,000 | `constants.ts` | was 200, which a busy month outran; the month end and the house tier read thirty days of dated lines. The Ledger tab still shows the last 200 (`LEDGER_VISIBLE_ENTRIES`) |

### 3.15 Insurance

| Number | Value | Where | Note |
|---|---|---|---|
| `LIABILITY_BASE_YEARLY`, `LIABILITY_PER_EMPLOYEE_YEARLY` | 600, 180 | `constants.ts` | the brief's suggestions |
| `UNINSURED_CLAIM_MIN` / `MAX` | 8,000 / 25,000 | `constants.ts` | the brief's band |
| `BURGLARY_PAYOUT_DAYS` | 10 | `constants.ts` | |

### 3.16 Contracts

| Number | Value | Where | Note |
|---|---|---|---|
| `CONTRACT_PIECES.cutSheetPack` | cutting only, 45 min, 38 a piece, 30 of material | `constants.ts` | the brief's suggestion |
| `CONTRACT_MIN_TIER` | 1 | `constants.ts` | the second tier, reputation 0 and up |
| `CONTRACT_OFFER_DAYS` | 5 | `constants.ts` | |
| `CONTRACT_QUANTITY_PER_WEEK_MIN` / `MAX` | 40 / 80 | `constants.ts` | |
| `CONTRACT_SHORT_WEEK_REPUTATION` | 1 | `constants.ts` | |
| `CONTRACT_RENEW_FULL_WEEK`, `CONTRACT_RENEW_SHORT_WEEK` | +1%, -2% | `constants.ts` | the brief's suggestions |

### 3.17 Security

| Number | Value | Where | Note |
|---|---|---|---|
| risks a month, levels 0 to 4 | 0.04 / 0.02 / 0.012 / 0.006 / 0.002 | `SECURITY_LEVELS` | the brief's suggestions; level 5 is 0, PIOTR |
| prices | bars 1,500 once; dogs 2,500 once plus 150 a month; firm 250 and 600 a month scaled | `SECURITY_LEVELS` | the brief's suggestions |
| `SECURITY_SCALE_AREA_M2`, `SECURITY_SCALE_VALUE` | 200, 100,000 | `constants.ts` | the brief's formula |
| `BURGLARY_MACHINES_MIN` / `MAX` | 1 / 2 | `constants.ts` | |

### 3.18 The house

| Number | Value | Where | Note |
|---|---|---|---|
| `OWNER_DRAW_TIERS` upper three | 5,000 / 7,500 / 10,000 | `constants.ts` | interpolation to PIOTR's "about 10,000" |
| `HOUSE_TIER_NAMES` | eight lines, a bedsit over a shop to a villa | `constants.ts` | wording |
| `HOUSE_CARD_SECONDS` | 3 | `constants.ts` | the brief's suggestion |

### 3.19 Pipes

| Number | Value | Where | Note |
|---|---|---|---|
| `PIPE_PRICE_PER_METRE` | 45 | `constants.ts` | the brief's suggestion; the Turn 4 flat 800 (`DUCTING_RECONNECT_COST`) is gone |

### 3.21 Deliveries

| Number | Value | Where | Note |
|---|---|---|---|
| `UNLOAD_MINUTES_BY_HANDLING` | none 45, pallet truck 30, forklift 15, better forklift 10 | `constants.ts` | PIOTR's three figures; the better forklift chosen |
| `SHEETS_PER_TRIP` | 2 | `constants.ts` | the brief's suggestion |
| `PALLET_TRUCK_PRICE` | 450 | `constants.ts` | the brief's suggestion |

### 3.22 Tips

| Number | Value | Where | Note |
|---|---|---|---|
| `TIPS` | twelve one sentence bubbles | `constants.ts` | wording |

---

### Added by the phase B groups

| Number | Value | Where | Note |
|---|---|---|---|
| `CONTRACT_OFFER_CHANCE_PER_DAY` | 0.15 | `constants.ts` (B1, moved in C1) | with no offer on the board and the standing for one, the chance each working day that a shop rings: about one offer a fortnight |
| `CONTRACT_QUANTITY_STEP` | 5 | `constants.ts` (B1, moved in C1) | the quantity a week is drawn in fives |
| `CONTRACT_CLIENTS` | six shop names | `constants.ts` (B1, moved in C1) | wording |
| first premium on taking a cover | the twelfth pro rata by the days left in the month | `firstPremiumFor` (B1) | a rule, not a figure: a cover switched on for a day cannot be free |
| renegotiated price | whole pounds | `renegotiatedPriceFor` (B1) | the one money formatter has no pence |
| labour at cost on the closing report | the joiners' average weekly wage as a minute cost | `closingReport` (B1) | the job card's own figure |
| `HOLIDAY_OPTIONS_DAYS` | 1, 3, 5, 10 | `constants.ts` (B2, moved in C1) | the lengths the Holiday buttons offer |
| `TAKE_OFF_BUTTON_LABEL` | "Create material list" | `constants.ts` (B2, moved in C1) | PIOTR's wording |
| the night premium | `(NIGHT_RATE - 1)` of the hourly wage for the shift's hours, a night | `nightPremiumFor` (B2) | a reading of "1.25 of salary for those hours": the weekly wage already pays the man's forty hours whichever shift they are on, so the quarter on top is the night's line; section 9 has the alternative |
| the night accident and breakdown chances | the day's chance times `NIGHT_ERROR_FACTOR` | `rollNightAccident`, `rollNightBreakdowns` (B2) | "the error chance is doubled" |
| working days in the house window | 21 | `workingDaysInHouseWindow` (B2) | thirty calendar days of a draw charged on working days |
| `STOCK_LINE_NAME` | "MFC 18 mm, white", "Oak, 27 mm" | `constants.ts` (B3, moved in C1) | wording |
| `STOCK_LINE_KINDS` | sheets only | `constants.ts` (B3, moved in C1) | solid wood and bespoke material are ordered per job and never held |
| Restock room cap | the rack's free spaces less what is on the road | `restockSheets` (B3) | a Restock never orders past the rack |
| `ANSWER_SKEW_NEUTRAL_TIER` | 1 | `constants.ts` (B3, moved in C1) | the tier the client's answer is uniform at; under it the skew goes negative, which the brief's literal formula never does although it asks for a skew in [-1, +1] |
| the website's weekly spread | a plus on the first days of the week, a minus on the last | `websiteEnquiriesOn` (B3) | one whole enquiry a day either way |
| `GATE_COLLAR_SCALE` | 0.5 | `hall.ts` (B4) | how much smaller than a cell the collar is drawn |
| the load rule while the fan is off | nothing counts | `extractionLoad` (B4) | read literally, two connected saws would make a hall short at 08:00 with nobody at either |

### Tuned by phase C

| Number | Value | Was | Why |
|---|---|---|---|
| `CONTRACT_QUANTITY_PER_WEEK_MIN` / `MAX` | 20 / 40 | 40 / 80 | a poor joiner on a 45 minute piece makes about 32 a week when the saw is his, so the old band was short every week of every contract and cost a point of reputation a week; the new band sits around a joiner's week, short at the top and full at the bottom |
| `ESTIMATOR_REPUTATION` | 0 | 5 | the brief's playthrough hires him on day 31, when the standing is 0 |
| `LEDGER_MAX_ENTRIES` | 2,000 | 200 | phase A, so the month end and the house tier can read thirty days of dated lines |

---

## 3. Frozen file changes

What phase C applied to the six frozen files from the phase B notes, one commit per file, and why.

- **`src/engine/constants.ts`** (`e0d4916`): the eight figures the groups had defined in their own
  modules with the `T13-C1: move to constants.ts` marker (`TAKE_OFF_BUTTON_LABEL`,
  `CONTRACT_OFFER_CHANCE_PER_DAY`, `CONTRACT_QUANTITY_STEP`, `CONTRACT_CLIENTS`, `STOCK_LINE_NAME`,
  `STOCK_LINE_KINDS`, `ANSWER_SKEW_NEUTRAL_TIER`, `HOLIDAY_OPTIONS_DAYS`) moved in with their
  comments and tags, and the modules and tests import them from there. Later in phase C the two
  tunes of section 2.
- **`src/engine/index.ts`** (`021ddab`): every function and type the five groups added exported
  through the one public surface (finance, insurance, contracts, website, efficiency, materials,
  board, reputation, staff, owner, tasks, production, economy, machines, media, pipes, stations,
  security, and the moved constants), and the twelve UI files that imported by module path with
  the `T13-C1: export from index.ts` marker put back on `../engine/index`. `serviceDueIn` in
  `catalogue.ts` keeps its module path import, as it had before Turn 13.
- **`src/engine/game.ts`** (`222b13e`): B1's 3.1 (the finance and insurance months no longer run
  from `startDay`, which skips a weekend 1st and runs before the day's totals are emptied; they
  run from `runMonthlyItems` in `economy.ts`, and the security month with them); B4's burglary
  (`runBurglary` rolls, `burgle` takes and `claimBurglary` books the payout); B2's 3.2 (one door
  for a hurt man, `hurtWorker`, by day and by night); B2's 3.1 (the night's finished jobs stand at
  the gate, its full bags are raised, its worn machines roll a breakdown); B2's 3.3 (a holiday
  with nobody in the hall goes straight to the summary, as a day off does); B1's 3.5 (the men on
  a contract keep their saw beside the jobs' men, their minutes count in the efficiency tally and
  the bags they fill are raised); B1's 3.7 (a contract man stands where the contract put him);
  B4's gate output (`outputFactorOf` in the production minute, so a gated saw is worked at +2%
  and not only projected at it); B4's `gateCheck` as the one set of refusals. B2's optional 3.4
  (the day's minute rewritten on `workMinute`) was not applied: `workMinute` is proved equal to
  the clock's minute by B2's parity test, so the two paths agree, and the rewrite is a refactor of
  the frozen file's core loop with no rule behind it. It stays in section 9 for Piotr.
- **`src/ui/app.ts`** (`46d740d`): B5's `READING_MODALS` gets `settings`, so the gear does not
  start the clock. B3's dead code (`Ui.stockSheets`, the `buyStock` handler) is left in place:
  the laptop's `renderMaterials` still takes the argument and the `BUY_STOCK` action stays for
  the scripted player; removing them is a tidy up with no rule behind it (section 10).
- **`src/ui/styles.css`** (`aad16df`): the empty Turn 13 rules replaced by the five groups' CSS
  blocks, verbatim, in group order; two rules added by C3 after the look (`.crew-day`,
  `.badge-held`, `.row.is-on-contract`).
- **The cross group notes** (`93d71c3`), in files a group could not reach: `production.ts`
  (`menAtJobs` keeps the contract men on their saw between actions, B1's 3.6), `reputation.ts`
  (the night's tier on the rating, B2's 3.6), `jobCard.ts` (the assign chips offer everybody on
  the books today, night men included, B2's 3.7), `laptop.ts` (the take off's button label, B2's
  3.5), and the home frame's fallback in `tests/render/frameFallbacks.test.ts` (B4 added the
  `home` key after B5 wrote the test that every animation the owner has a sheet for plays).

Not applied, and why: B3's optional `blockWhere: 'insurance'` (the tile compares the reason
string, which is the constant, and works); B3's three earned reputation gates outside its files
(the brief says the tier tables read the effective figure and says nothing of the hiring pool,
the catalogue's standing gates and the salesman's meeting; section 9); B4's note that the
`deliveryVan` constant is unread now (left for Piotr: the lorry may come back as a picture).

---

## 4. Art requested

`docs/art/REQUESTS-T13.md` carries the whole list: the eight pipe tiles and the inlet, the gate
collar, the eight house cards, the pallet and the pallet truck, the two character sheets, the
spindle moulder's five classes, the missing character frames per role (section 7 of the file,
replaced by phase C with the table B5 read off the manifests: the owner's five sheets are all
delivered, the joiner's four, and every other role is missing everything), and how the code
places each of them (sections 7a and 7b, from B4). The stock thumbnails are code side. Nothing
in `docs/art/SPRITES.md` was touched.

---

## 5. Deviations from the contract

1. **Branch name.** The environment names the branch `claude/nice-clarke-yk11fj`; the brief's
   `turn-13-the-workshop-grows-up` is the PR title's job.
2. **Phase A carries the rule changes, not only the stubs.** Section 2.1 says phase B agents may
   not touch the six frozen files, and section 2.2 gives `tests/scenarios/` to phase C only; but
   section 2.1 also says every phase B commit is `npm run check` green. Those three rules cannot
   all hold if a phase B group changes a rule that every scenario and half the engine tests
   exercise. So phase A built those rules through to a green suite (the client's answer, the
   reservation rule, the enquiry rate, the pipe connection rule, the crew limit, the unload table,
   the five class ladders), updated the shared helpers (`tests/helpers.ts`: `acceptNow`,
   `connectAll`, `placeEquipment`) and the scripted player, and re-measured the sixteen months.
   The months held under phase B without an edit (B3's deadline draw keeps the seeded stream bit
   for bit; B1's contract offers come off a stream of their own for the same reason).
3. **Files the ownership table does not name** were assigned so nobody waited: `src/engine/jobs.ts`
   to B3; `src/engine/media.ts` to B4 (the brief lists it under B3, but its readers tonight are the
   gates and the pipes); `src/engine/production.ts` to B2; `src/engine/efficiency.ts` and
   `src/engine/warnings.ts` to B5; `src/engine/website.ts` to B3; `src/ui/eventModal.ts` to B5;
   `src/render/sprites.ts`, `src/render/iso.ts` and `src/ui/spriteCheck.ts` to B4.
   `src/render/placeholder.ts` was phase A's shared helper and treated as frozen.
4. **The drill keeps its cell of floor.** Section 3.12 gives the drill five classes; a first draft
   gave them a zone of nothing, which the engine reads as a hand tool that lives in a cabinet, and
   the drill stands in the starting layout. The ladder keeps the 1 by 1 zone.
5. **Where the offer sits in the tests.** `acceptNow` sets the client's offer to the budget and
   books the job through `takeEnquiry` directly, so the two hundred tests that want a job on the
   books and are not about the answer keep their round prices.
6. **The phase C commits of T13-C1** were six commits checked as one series: each was `tsc` clean
   on its own and the full check ran green on the series' end state, because a constant moved in
   the first commit is exported by the second and read by the third, and running the three minute
   check six times over a chain that only compiles as a whole proves nothing the end state does
   not.
7. **Phase B's own readings**, each documented in its report's section 6 and none changed by
   phase C: B1 books a contract's material as money on the `contract` category and not as sheets
   off the rack (the shop's cut packs come from the shop's own boards); B1 takes the rest of the
   month's premium the day a cover is taken; B2 hires the estimator and the manager without an
   office admin (the playthrough needs it and the admin covers neither job); B2 counts the manager
   against the floor; B2's night premium is the quarter on top (section 9); B3 centres the answer's
   skew on a neutral tier (the literal formula never goes negative); B3 charges the full price of a
   website level and not the difference; B3 removed the Turn 11 free form "buy sheets" field
   (Restock is the one button); B4 reads "nearest extractor with spare air" as nearest by pipe
   length (the hall is one duct run and the fans add up, so no fan has spare air of its own); B4
   counts the open branches only while the fan runs at all; B4's machine card in the hall is the
   Owned tab of the catalogue (the hall draws a tooltip, not a card); B5's efficiency plate is a
   details element and not a click handler; B5 reads a day nobody could have worked as 100%; B5
   moved nothing into Settings from the autosave, which has no control.
8. **The playthrough's licence** is the subscription, not the one off: the brief does not say
   which, and a script that is 3,205 under at the end of month 1 with the subscription would be
   6,655 under with the licence bought outright. It changes none of the findings of section 0.
9. **Two `[TUNE]` figures changed in phase C** (section 2): the contract quantity band and the
   estimator's standing, both for the playthrough, both documented where they are read.

---

## 6. Cross check (section 10)

### 10.1 One model of dust

- **Every machine's dust output reads Turn 12's per family table; no class carries a dust figure.**
  Yes. `accumulateMachineMinute` reads `dustOutputOf(specId)`, which is `DUST_OUTPUT_M3_PER_HOUR`
  by family; no `EquipmentVariant` of any ladder carries a `dust` field (asserted in
  `tests/engine/variants.test.ts` by B4 and again in `tests/scenarios/turn13.test.ts` 10.1 for
  every spec and every variant). The class cards print the family's figure on every class.
- **The gates change air counting, never dust.** Yes. `hasGate` is read by `extractionLoad`
  (the air sum), `outputFactorOf` (the +2%) and `gateCheck`, and by nothing in the dust path;
  a gated thicknesser makes the family's dust (`turn13.test.ts` 10.1).
- **The pipes change nothing in the air or dust sums beyond connection.** Yes, both directions:
  the thicknesser with its run cut is in `unservedMachines` and the hall reads short with the same
  allowance; with the run back it is in the load and counted by its demand; the demand either way
  is the family's table (`turn13.test.ts` 10.1; B4's `tests/engine/extraction.test.ts` proves
  the same on a single saw). Which unit a run goes to changes nothing in the sum: the hall is one
  duct run and the fans add up.

### 10.2 One ledger

- **Every pound goes through `charge()`.** `grep -rn "cash +=\|cash -=" src` finds the four
  lines inside `charge`, `pay` and `receive` in `economy.ts` and nothing else; every group
  reported the same for its own files.
- **The month end lines sum to the cash delta for every scenario month, asserted.** Yes:
  `turn13.test.ts` 10.2 plays three months of three kinds (Easy careful over two months, Hard idle,
  Very easy with a joiner and a loan) and asserts it for every month of each; the playthrough
  asserts it for its three months on Easy; B1's `tests/ui/monthEnd.test.ts` for a played month.
  The lines are the cash that moved; a bill that went to the arrears moved no cash, is not in the
  lines, and is named under the net, which is what keeps the identity exact when the account is
  at the limit.
- **The daily "today" figure equals the sum of that day's ledger lines.** Yes, to the penny, for
  the lines whose `unpaid` is false (B5's `tests/ui/topbar.test.ts`); an arrears line is in the
  ledger and not in the totals, by design. B1's 3.1, applied in C1, moved the 1st's loan and
  premium lines after the day's totals are emptied, so the figure holds on the 1st too.

### 10.3 One set of rules about people

- **The crew limit, the second shift, the manager's cover, the estimator's capacity and the
  contracts' people only assignment read the same worker list and the same minute booking.** Yes:
  `crewCount`, `nightCrew` and `hands(state, { shift })`, `managerOnDuty` and
  `staffOutputFactor`, `canTakeOn` and `contractHands` all read `state.workers` through
  `isWorkingToday(state, worker, shift)` or `onTheBooksToday`. A joiner on the second shift is not
  on the day shift: not a hand, not a seat, not in the hall by day, in `hands(state, { shift:
  'night' })` at night (B2's `staffSecondShift.test.ts`). One thing to note for Piotr: B1's
  `contractHands` reads the day shift through the same predicate, so a night man put on a
  contract makes nothing until he is moved back to days; contract men on the night shift are not
  built (B1's 3.8).
- **The owner's day meter, the manager's day meter and the efficiency number agree.** Yes, with
  one identity: `efficiency.worked + lost.ownerAway = the owner's workshop minutes + the joiners'
  production minutes`, exact on three played days, and `worked = meters` whenever the owner is in
  (B5's `tests/engine/efficiency.test.ts`); the assign minutes the manager takes are the minutes
  the owner's meter no longer shows (B2). C1 added the contract men's worked minutes, at the same
  absence factor a job hand's carry, to the tally. The night is outside the tally by design and is
  reported as `nightMinutes` on the day plate: B2 read 3.5 as the day's number, and the brief's
  definition (every hired person at a station, the owner counted while in the workshop) is a day
  shift definition. Section 9 asks Piotr.

### 10.4 The playthrough

Section 7, and the finding of section 0.

### 10.5 The look

Every modal, card and tab opened once in the Chromium build (`docs/report-t13/`, thirty six
pictures, JPEG at 1440 by 900): the start screen, the side menu, the hall with three pipe runs
over the saws and the thicknesser to the one unit and the red outline while the fan is short, the
office, the order board on both tabs with an offer and the standing contract, the work plan with
the contract's bar and the green material line, the catalogue on its Owned tab and on the saw,
spindle moulder, thicknesser, extractor and pallet truck folders, the shopping list, the binder's
four tabs with the loan, the company board, the laptop's seven tabs with the stock page in the
style of Joinery Core, the team's four tabs with the draw chips and the shift chips, the settings
plate, the efficiency plate, the house card, the day end and the month end. Every signed figure
is coloured, every metre carries its unit, the paper modals wear the folder skin and the boards
the board skin, and it reads as one game. What the look turned up and C3 fixed: the crew row
printed the engine's role key (`productionManager`) instead of "production manager"; the
manager's day line reused the top bar's `.day-meter` class and came out black on black; the Held
badge of the website and security ladders was dark on dark in the folder; a man on a contract was
marked with the running task's dark row. What it turned up and left, for Piotr: the efficiency
plate, once clicked open, stays open across a save load (the details element keeps its state on
purpose, so it survives the game minute); the office characters and the manager stand in the
hall as the blue capsule until their sheets land (section 4); the pipe tiles are the placeholder
helper's green boxes until GPT paints the eight tiles, and read as pipes only because they run
over the machines in a line; the hall's tooltip for a machine does not show under a headless
hover, so no picture of it.

---

## 7. Playthrough (section 10.4)

`tests/scenarios/playthrough.test.ts`, seed 20260911, the script of 10.4 as section 0 lists it,
played on Easy as the brief says and again on Very easy as the control. The first contract
offered on Easy is "Cut sheet packs for Brightwater Displays", 20 a week for 26 weeks at 38 a
piece, taken on day 7 with the poor joiner on it: every one of its weeks is full (17 of 16, then
28 to 32 of 20), and when the term ends on day 189 the client offers more. The reputation log of
month 3 on Easy reads: bookcase 4 days late (day 64), garage shelves 7 and 8 days late (days 73
and 75), one on time, 8 days late again (day 81), 4 days late (day 87): the jobs on the books
when the owner went away on day 64 waited for him.

### Easy, as the brief scripts it

| Month | Cash at open | Cash at close | Reputation at close | Jobs delivered | Mean daily efficiency | House tier |
|---|---|---|---|---|---|---|
| 1 | 17,301 | -3,784 | 0 | 7 | 56% | 1 |
| 2 | -3,784 | -9,989 | 15 | 9 | 64% | 1 |
| 3 | -9,989 | -9,726 | -17 | 7 | 69% | 1 |

**Month 1 end report** (cash at open 20,000, at close -3,205, net -23,205, bills that went to the arrears 0)

| Line | In | Out | Net |
|---|---|---|---|
| Revenue from jobs | 4,512 | 0 | 4,512 |
| Material | 0 | -2,800 | -2,800 |
| Transport and trips | 0 | -840 | -840 |
| Wages and salaries, day | 0 | -1,920 | -1,920 |
| Wages, night shift | 0 | 0 | 0 |
| Owner's draw | 0 | -4,400 | -4,400 |
| Rent and rates | 0 | -5,250 | -5,250 |
| Power | 0 | -432 | -432 |
| Insurance, premiums and payouts | 0 | 0 | 0 |
| Security | 0 | 0 | 0 |
| Loan, drawn and repaid | 0 | 0 | 0 |
| Loan and overdraft interest | 0 | 0 | 0 |
| Contract work, revenue and material | 4,560 | -3,600 | 960 |
| Waste collection | 0 | 0 | 0 |
| Equipment, pipes and repairs | 0 | -13,035 | -13,035 |
| Software and website | 0 | 0 | 0 |
| Everything else | 0 | 0 | 0 |
| **Total** | 9,072 | -32,277 | **-23,205** |

**Month 2 end report** (cash at open -3,205, at close -9,855, net -6,650, bills that went to the arrears 4,875)

| Line | In | Out | Net |
|---|---|---|---|
| Revenue from jobs | 8,035 | 0 | 8,035 |
| Material | 0 | -4,520 | -4,520 |
| Transport and trips | 0 | -840 | -840 |
| Wages and salaries, day | 0 | -1,440 | -1,440 |
| Wages, night shift | 0 | 0 | 0 |
| Owner's draw | 0 | -5,000 | -5,000 |
| Rent and rates | 0 | -2,375 | -2,375 |
| Power | 0 | -400 | -400 |
| Insurance, premiums and payouts | 0 | -86 | -86 |
| Security | 0 | -500 | -500 |
| Loan, drawn and repaid | 0 | 0 | 0 |
| Loan and overdraft interest | 0 | -18 | -18 |
| Contract work, revenue and material | 4,864 | -3,840 | 1,024 |
| Waste collection | 0 | 0 | 0 |
| Equipment, pipes and repairs | 0 | -280 | -280 |
| Software and website | 0 | -150 | -150 |
| Everything else | 0 | -100 | -100 |
| **Total** | 12,899 | -19,549 | **-6,650** |

**Month 3 end report** (cash at open -9,855, at close -9,954, net -98, bills that went to the arrears 16,334)

| Line | In | Out | Net |
|---|---|---|---|
| Revenue from jobs | 3,102 | 0 | 3,102 |
| Material | 0 | -2,060 | -2,060 |
| Transport and trips | 0 | 0 | 0 |
| Wages and salaries, day | 0 | 0 | 0 |
| Wages, night shift | 0 | 0 | 0 |
| Owner's draw | 0 | 0 | 0 |
| Rent and rates | 0 | -1,545 | -1,545 |
| Power | 0 | -336 | -336 |
| Insurance, premiums and payouts | 0 | -102 | -102 |
| Security | 0 | 0 | 0 |
| Loan, drawn and repaid | 0 | 0 | 0 |
| Loan and overdraft interest | 0 | 0 | 0 |
| Contract work, revenue and material | 4,864 | -3,720 | 1,144 |
| Waste collection | 0 | 0 | 0 |
| Equipment, pipes and repairs | 0 | -301 | -301 |
| Software and website | 0 | 0 | 0 |
| Everything else | 0 | 0 | 0 |
| **Total** | 7,966 | -8,064 | **-98** |

### Very easy, the control

| Month | Cash at open | Cash at close | Reputation at close | Jobs delivered | Mean daily efficiency | House tier |
|---|---|---|---|---|---|---|
| 1 | 47,301 | 26,234 | 0 | 7 | 56% | 1 |
| 2 | 26,234 | 11,244 | 15 | 9 | 64% | 2 |
| 3 | 11,244 | -8,345 | -5 | 7 | 68% | 2 |

**Month 1 end report** (cash at open 50,000, at close 26,795, net -23,205, bills that went to the arrears 0)

| Line | In | Out | Net |
|---|---|---|---|
| Revenue from jobs | 4,512 | 0 | 4,512 |
| Material | 0 | -2,800 | -2,800 |
| Transport and trips | 0 | -840 | -840 |
| Wages and salaries, day | 0 | -1,920 | -1,920 |
| Wages, night shift | 0 | 0 | 0 |
| Owner's draw | 0 | -4,400 | -4,400 |
| Rent and rates | 0 | -5,250 | -5,250 |
| Power | 0 | -432 | -432 |
| Insurance, premiums and payouts | 0 | 0 | 0 |
| Security | 0 | 0 | 0 |
| Loan, drawn and repaid | 0 | 0 | 0 |
| Loan and overdraft interest | 0 | 0 | 0 |
| Contract work, revenue and material | 4,560 | -3,600 | 960 |
| Waste collection | 0 | 0 | 0 |
| Equipment, pipes and repairs | 0 | -13,035 | -13,035 |
| Software and website | 0 | 0 | 0 |
| Everything else | 0 | 0 | 0 |
| **Total** | 9,072 | -32,277 | **-23,205** |

**Month 2 end report** (cash at open 26,795, at close 15,288, net -11,507, bills that went to the arrears 0)

| Line | In | Out | Net |
|---|---|---|---|
| Revenue from jobs | 8,035 | 0 | 8,035 |
| Material | 0 | -4,520 | -4,520 |
| Transport and trips | 0 | -1,080 | -1,080 |
| Wages and salaries, day | 0 | -1,920 | -1,920 |
| Wages, night shift | 0 | 0 | 0 |
| Owner's draw | 0 | -8,600 | -8,600 |
| Rent and rates | 0 | -2,850 | -2,850 |
| Power | 0 | -480 | -480 |
| Insurance, premiums and payouts | 0 | -86 | -86 |
| Security | 0 | -500 | -500 |
| Loan, drawn and repaid | 0 | 0 | 0 |
| Loan and overdraft interest | 0 | 0 | 0 |
| Contract work, revenue and material | 4,864 | -3,840 | 1,024 |
| Waste collection | 0 | 0 | 0 |
| Equipment, pipes and repairs | 0 | -280 | -280 |
| Software and website | 0 | -150 | -150 |
| Everything else | 0 | -100 | -100 |
| **Total** | 12,899 | -24,406 | **-11,507** |

**Month 3 end report** (cash at open 15,288, at close -1,155, net -16,443, bills that went to the arrears 0)

| Line | In | Out | Net |
|---|---|---|---|
| Revenue from jobs | 2,650 | 0 | 2,650 |
| Material | 0 | -1,800 | -1,800 |
| Transport and trips | 0 | -840 | -840 |
| Wages and salaries, day | 0 | -5,000 | -5,000 |
| Wages, night shift | 0 | 0 | 0 |
| Owner's draw | 0 | -8,400 | -8,400 |
| Rent and rates | 0 | -2,850 | -2,850 |
| Power | 0 | -480 | -480 |
| Insurance, premiums and payouts | 0 | -102 | -102 |
| Security | 0 | 0 | 0 |
| Loan, drawn and repaid | 0 | 0 | 0 |
| Loan and overdraft interest | 0 | 0 | 0 |
| Contract work, revenue and material | 4,826 | -3,810 | 1,016 |
| Waste collection | 0 | 0 | 0 |
| Equipment, pipes and repairs | 0 | -286 | -286 |
| Software and website | 0 | -150 | -150 |
| Everything else | 0 | -200 | -200 |
| **Total** | 7,476 | -23,918 | **-16,443** |


---

## 8. Tests

1,421 tests green and three todo in 139 files, up from 1,098 and one todo in 103 files at the end
of Turn 12. Phase A: 1,102. Phase B, in the worktrees: 1,173 (B1), 1,150 (B2), 1,150 (B3), 1,155
(B4), 1,167 (B5); merged, 1,334; after T13-C1, 1,387; after T13-C2, 1,418; after T13-C3, 1,421.
The three todo entries are Turn 12's thicknesser month and the two expectations of 10.4 that the
economy does not give (section 0). One test file was deleted (`tests/engine/fromStock.test.ts`,
whose rule is gone) and thirty six were added. `npm run check` is lint, the sprite manifest, `tsc`
and the build, then the suite; it ran green on its own exit code before every commit of phase A
and B and before the T13-C2, T13-C3 and T13-C5 commits of phase C (section 5.6 for the T13-C1
series).

Run it: `npm run check`. The playthrough alone: `npx vitest run tests/scenarios/playthrough.test.ts`
(it prints its log on one line beginning `PLAYTHROUGH`). The pictures were taken with
`playwright-core` against `npm run build` served from `dist/`, the script is not in the
repository.

---

## 9. Open questions for Piotr

1. **The economy of 10.4** (section 0). The three month script on Easy is 3,205 under after month
   1 and at the limit in month 2; the levers are the draw tiers (400 a day is 8,800 a month against
   a one man shop's 5,000 to 8,000 of revenue), the standard saw at 7,000 in a 20,000 game, and the
   desk salaries (2,600 and 3,400 a month) against the same revenue. The brief's section 8 keeps
   the starting capital at 50,000 or 40,000; on 50,000 the script reaches house tier 2 in month 2
   and ends month 3 near zero.
2. **The night premium.** B2 books the quarter on top of the hourly wage for the shift's hours
   (the weekly wage already pays the man's forty hours); if "1.25 of salary for those hours" means
   the whole 1.25 on the night line and the day wage off, it is two lines (`weeklyWageBill` and
   `nightPremiumFor`).
3. **The night in the efficiency number.** Tonight the number is the day's; the night is its own
   line on the day plate. If the night's seats and minutes should be in the number, `nightCrew`
   and `NightReport.minutes` are ready.
4. **The owner's office minutes** count his seat as possible and lost to "no people" (the brief
   counts him "while he is in the workshop"); if "in the workshop" means "in the hall", one line
   in `possibleSeats`.
5. **The manager counts against the floor.** He runs the floor and stands on it; one entry in
   `FLOOR_ROLES` takes him off.
6. **The effective reputation** (earned plus the website's bonus) is read by the board, the tier
   tables and the company totals; the hiring pool, the catalogue's standing gates and the
   salesman's meeting still read the earned figure. One word each if one figure everywhere is
   wanted.
7. **The contract's material** is money on the contract line and never sheets off the rack. If a
   cut pack should eat the rack, it is a reservation like a job's.
8. **A website level charges its full price**, not the difference from the level held.
9. **Contract men on the night shift** are not built; a night man on a contract makes nothing
   until he is moved back to days.
10. **The lorry** (`deliveryVan`) is no longer drawn since the material arrives as a pallet; its
    constant is unread. Keep it for a picture, or remove it.
11. **B2's `workMinute` refactor** of the production minute in `game.ts` is proved equal to the
    clock's minute and not applied; one code path would say apply it next turn.

---

## 10. Parked, carried forward

Everything in the brief's section 8, untouched: the branch choice, the timber families, the unit
of `powerPerDay`, the starting capital, hiding `/sprites`, the class ladders' `[TUNE]` beyond
prices, the name check. Added tonight: the dead `stockSheets` field and `buyStock` handler in
`app.ts` and `laptop.ts` (B3's stock page prints neither; the `BUY_STOCK` action stays for the
scripted player); the Turn 12 thicknesser todo.
