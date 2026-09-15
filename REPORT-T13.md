# Report: Turn 13

The workshop grows up: everything designed on 15.09, in one session, on the one model of dust
Turn 12 laid down.

Branch `claude/nice-clarke-yk11fj` (the cloud environment names the branch; the brief's task queue
would have called it `turn-13-the-workshop-grows-up`). Base: `317f344` on `main`, the Turn 12 merge,
with `APP_VERSION` `v19` and no `bagIntervalFactor` anywhere, which is the brief's precondition.

This file is written in three passes, one per phase (CLAUDE.md T13 section 2). Phase A writes the
contracts section and the numbers it chose; each phase B group writes its own `REPORT-T13-B<n>.md`
from its worktree; phase C consolidates every group's lines into this file, applies the notes for
the frozen files, and adds the cross check, the playthrough and the pictures.

---

## 0. Blockers

None so far. Phase A found nothing in the brief it could not build.

---

## 1. Done

### Phase A: the contracts (one agent, serial)

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-A1 Housekeeping and v20 | `8cd0c82` | `docs/turn-12-brief.md` out of git history, byte for byte the `CLAUDE.md` of `08ef09b`; `docs/art/REQUESTS-T13.md` with the section 9 list; the README's brief and report lines; `APP_VERSION = 'v20'`. | `tests/ui/version.test.ts` |
| T13-A2 Contracts and stubs | this commit | Section 4 in `types.ts` and `STATE_VERSION` 14 with `liftToVersion14` in `migrate.ts`; every constant of section 3 in `constants.ts` with its tag; the roles `estimator` and `productionManager`; the laptop's Admin group (`website`, `insurance`, `security`), the binder's `finance` tab, the Orders page's `contracts` tab, the `settings` modal; twenty one new action types routed in `game.ts`; `charge()` in `economy.ts` writing dated ledger lines; the shared placeholder helper `src/render/placeholder.ts`; the new engine modules `finance`, `insurance`, `website`, `security`, `pipes`, `contracts`, `efficiency`, `warnings` and the new UI modules `finance`, `contracts`, `monthEnd`, `website`, `security`, `insurance`, `house`, `tips`, `settings`, all stubbed and compiling. Phase A also carries every rule change with a wide blast radius, so that no phase B agent has to touch a test outside its group to stay green (section 5 says which). | `tests/engine/turn13Contracts.test.ts`: every action the union declares is routed, and the v19 fixture `tests/fixtures/save-v19.woodwork.json` loads with every section 4 default |

### Phase B (five groups, parallel, in worktrees)

Filled in by phase C from `REPORT-T13-B1.md` to `REPORT-T13-B5.md`.

### Phase C (one agent, serial)

Filled in by phase C.

---

## 2. Numbers chosen

Every `[TUNE]` this turn added, grouped by the section of the brief, with what went in. Piotr's
own figures are marked as his and are not in this list unless a figure next to them was chosen.
Phase B groups append their own; phase C merges.

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

## 3. Frozen file changes

What phase C applied to the six frozen files from the phase B notes, and why. Filled in by
phase C.

---

## 4. Art requested

A copy of `docs/art/REQUESTS-T13.md`, with anything phase B and C added. Filled in by phase C.

---

## 5. Deviations from the contract

1. **Branch name.** The environment names the branch `claude/nice-clarke-yk11fj`; the brief's
   `turn-13-the-workshop-grows-up` is the PR title's job.
2. **Phase A carries the rule changes, not only the stubs.** Section 2.1 says phase B agents may
   not touch the six frozen files, and section 2.2 gives `tests/scenarios/` to phase C only; but
   section 2.1 also says every phase B commit is `npm run check` green. Those three rules cannot
   all hold if a phase B group changes a rule that every scenario and half the engine tests
   exercise (the client's answer, the reservation rule, the enquiry rate, the pipe connection
   rule, the crew limit, the unload table, the five class ladders). So phase A built those rules
   through to a green suite, updated the shared helpers (`tests/helpers.ts`: `acceptNow`,
   `connectAll`, `placeEquipment`) and the scripted player (`tests/scenarios/autopilot.ts`:
   orders the shortfall for a job, buys the standard class of extra kit, connects every machine),
   and re-measured the sixteen months for them. Phase B builds the UI, the remaining engine
   pieces and the tests of its own group on top of that; phase C revisits the months once more
   for what phase B adds (T13-C2).
3. **Files the ownership table does not name** are assigned as follows, so nobody waits:
   `src/engine/jobs.ts` to B3 (orders and stock); `src/engine/media.ts` to B4 (the brief lists it
   under B3, but its readers tonight are the gates and the pipes); `src/engine/production.ts` to
   B2 (the second shift runs through it); `src/engine/efficiency.ts` and `src/engine/warnings.ts`
   to B5; `src/engine/website.ts` to B3; `src/ui/eventModal.ts` to B5; `src/render/sprites.ts`,
   `src/render/iso.ts` and `src/ui/spriteCheck.ts` to B4. `src/render/placeholder.ts` is phase
   A's shared helper and is treated as frozen.
4. **The drill keeps its cell of floor.** Section 3.12 gives the drill five classes; a first draft
   gave them a zone of nothing, which the engine reads as a hand tool that lives in a cabinet
   (T7 3.6), and the drill stands in the starting layout. The ladder keeps the 1 by 1 zone.
5. **Where the offer sits in the tests.** `acceptNow` in `tests/helpers.ts` sets the client's
   offer to the budget and books the job through `takeEnquiry` directly, so the two hundred
   tests that want a job on the books and are not about the answer keep their round prices.
   The tests that are about the answer dispatch `ACCEPT_ENQUIRY` themselves.

---

## 6. Cross check (section 10)

Filled in by phase C.

---

## 7. Playthrough (section 10.4)

Filled in by phase C.

---

## 8. Tests

Phase A: the suite at `8cd0c82` was 1,098 tests and one todo in 103 files. After T13-A2 it is
1,102 tests and one todo in 103 files (one file deleted, `tests/engine/fromStock.test.ts`, whose
rule is gone; one added, `tests/engine/turn13Contracts.test.ts`).

---

## 9. Open questions for Piotr

Filled in by phase C.
