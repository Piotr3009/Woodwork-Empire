# Turn 13: the workshop grows up (one pass for everything designed on 15.09)

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud,
agent teams allowed and expected). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat),
15.09.2026, from three voice sessions with Piotr on 15.09 (Petros: software/woodwork-empire,
STAN entries T12-A to T12-L, T13-A to T13-N, T14-1 to T14-11, S-1 to S-6, T15-1 to T15-30,
S-STRAT-1 to S-STRAT-6).

Read this whole file (first line must say "Turn 13"; if the root `CLAUDE.md` does not, stop and
report), then `REPORT-T12.md`, then `docs/art/SPRITES.md` in full, then the archived briefs in
`docs/`. Where files disagree, this one wins. All standing rules apply (no em or en dashes, scope
1:1, one code path, constants never in the UI, retag `[TUNE]` to `[PIOTR]`, kill background
processes, PR without merge, end the session, no PR watching, `npm run check` gated on its own
exit code, every click single, one `APP_VERSION` bump).

**Precondition.** `main` carries Turn 12 merged (dust in cubic metres, bags only on the
extractor, `APP_VERSION` `v19`). If `src/engine/constants.ts` still has `bagIntervalFactor`, stop
and report: this brief is written against the Turn 12 model and must not be built on the old one.

---

## 0. What this turn is for (Piotr, 15.09)

Piotr decided to stop being the bottleneck. Instead of four turns with an audit and a merge
between each, everything designed on 15.09 lands in **one session**, on the one model of dust
Turn 12 laid down, so that the result is one consistent game and one consistent look, nsot four
sessions each with a slightly different idea. His words: "when we do it in several turns, every
time the graphics and the idea are a bit different and it all comes apart."

He is paying for this with a long session and a large budget, on purpose. Take the time. The
session is long because the work is wide, not because any one piece is deep.

What this turn adds, in one sentence each:

1. The catalogue and the modals become readable: colours on every plus and minus, effects above
   costs above description, a stock page that looks like Joinery Core, red and green materials.
2. The stock question goes away: what is in stock is used, what is missing is one button.
3. The top bar shows workshop efficiency as one live number with a breakdown.
4. Enquiries arrive one or two a day, not three, and grow with reputation and the website.
5. Tips, in two layers, switchable.
6. The company website in five levels.
7. Every enquiry comes with a budget and the client answers with a number, not a yes.
8. The estimator does the material list; the admin does the restock; the owner does neither for
   long.
9. The production manager, and with him the second shift and the day the owner can take a holiday.
10. Floor space limits the crew.
11. Automatic blast gates on the extraction.
12. Every machine family has exactly five classes; the spindle moulder joins as a shared family.
13. Deliveries arrive at the gate as what they are, and unloading is a walk that a pallet truck
    and a forklift shorten.
14. A loan and an overdraft that cost what they cost.
15. Insurance, in its own tab, that gates the commercial work.
16. Standing contracts, with their own bar in the work plan.
17. Security in five levels, up to a firm that takes the risk to zero, so the player feels fixed
    costs.
18. The owner's house, in eight tiers, paid for by what he pays himself.
19. Extraction pipes the game routes for the player.
20. A monthly report.

---

## 1. Rules restated (short)

Everything from Turns 1 to 12. Tonight in addition:

- **`APP_VERSION = 'v20'`.** One bump for the whole session, in the housekeeping task.
- **Five is the number.** Every ladder in this game has five steps: machine classes, extraction
  classes, the website, security. The only exception is the house, which has eight, because
  Piotr said eight. Class 5 is always the industrial one.
- **Colour by sign.** Every plus is the game's green, every minus the game's red, on every card,
  modal and tooltip, through the one helper Turn 12 introduced. No exceptions.
- **One unit, one formatter.** Metres with the unit ("4 m by 3 m"), cubic metres an hour for
  dust and air, pounds with the sign. Every place that prints one uses the same function.
- **Nothing is free.** Every convenience in this turn is bought with a salary, a subscription or
  a capital cost: the production manager, the security firm, the website, the gates, the truck.
  If a feature you build makes the game easier without costing the player something, stop and
  re-read the section.
- **`[PIOTR]` and `[TUNE]`.** Piotr's figures are marked in the text. Every figure you invent to
  close the arithmetic is `[TUNE]`, lives in `constants.ts` with the tag, and is listed in the
  report under "Numbers chosen". The report's `[TUNE]` list is what Piotr reads first.
- **Art.** Sprites and pictures are GPT's job on the `art/sprites` branch. This session does not
  paint. Where a new picture is needed (house tiers, pipe tiles, pallet, pallet truck, the
  production manager, the estimator), the code draws a flat placeholder in the game's palette
  from one `placeholder(kind, size)` helper, and the request goes into a **new** file
  `docs/art/REQUESTS-T13.md` (section 9 gives its contents). `docs/art/SPRITES.md` is not
  touched.

---

## 2. How to run this session (agents, ownership, order)

This is the only brief so far that expects agent teams. Read this section twice.

### 2.1 The three phases

**Phase A, the contracts (one agent, serial, first).** Types, constants, state, migration, the
new roles, the new tabs, the new action types, all stubbed but compiling, all tests green. Nothing
in phase B starts before phase A is committed. This is where the shared files are touched:
`src/engine/types.ts`, `src/engine/constants.ts`, `src/engine/index.ts`, `src/engine/game.ts`
(action routing only), `src/ui/app.ts` (modal and tab routing only), `src/ui/styles.css` (new
class names only, empty rules). After phase A these six files are **frozen for phase B**: a
phase B agent that needs a change in one of them writes it in its report line and the integrator
applies it in phase C. No exceptions, no "small fix".

**Phase B, the features (up to five agents, parallel).** Each agent owns whole files and only
those files. The groups and their files are in 2.2. An agent that finds it needs a file outside
its group stops that piece, notes it, and carries on with the rest of its group.

**Phase C, integration (one agent, serial, last).** Applies the phase B notes to the frozen
files, runs the whole suite, runs the playthrough of section 10, fixes what the cross check
finds, writes the report, opens the PR. Phase C is where the game becomes one game again: it is
allowed to touch anything, and it is expected to spend real time on section 10.

### 2.2 File ownership for phase B

| Group | Owns | Sections |
|---|---|---|
| B1 Money and paper | `src/engine/economy.ts`, new `src/engine/finance.ts`, new `src/engine/insurance.ts`, new `src/engine/contracts.ts`, `src/ui/accounting.ts`, new `src/ui/finance.ts`, new `src/ui/contracts.ts`, new `src/ui/monthEnd.ts` | 3.14, 3.15, 3.16, 3.20 |
| B2 People and shifts | `src/engine/staff.ts`, `src/engine/owner.ts`, `src/engine/plan.ts`, `src/engine/tasks.ts`, `src/ui/team.ts`, `src/ui/workPlan.ts`, `src/ui/ownerOut.ts`, new `src/ui/house.ts` | 3.8, 3.9, 3.10, 3.18 |
| B3 Orders and stock | `src/engine/orders.ts`, `src/engine/board.ts`, `src/engine/materials.ts`, `src/engine/reputation.ts`, `src/engine/media.ts`, `src/ui/board.ts`, `src/ui/materials.ts`, `src/ui/shopping.ts`, `src/ui/jobCard.ts`, new `src/ui/website.ts` | 3.2, 3.4, 3.6, 3.7 |
| B4 Machines and the hall | `src/engine/machines.ts`, `src/engine/layout.ts`, `src/engine/stations.ts`, `src/engine/catalog.ts`, new `src/engine/pipes.ts`, new `src/engine/security.ts`, `src/ui/catalogue.ts`, `src/ui/machine.ts`, new `src/ui/security.ts`, `src/render/hall.ts`, `src/render/characters.ts` | 3.1 (cards), 3.11, 3.12, 3.13, 3.17, 3.19 |
| B5 Chrome and guidance | `src/ui/topbar.ts`, `src/ui/dayEnd.ts`, `src/ui/modal.ts`, `src/ui/laptop.ts`, new `src/ui/tips.ts`, new `src/ui/settings.ts`, `src/ui/patch.ts` | 3.1 (side menu, tips), 3.3, 3.5 |

Tests: each group owns the test files that match its source files by name, plus any new test
file it creates. `tests/scenarios/` belongs to phase C only.

### 2.3 Order inside phase B

Within a group, build engine before UI, and build the thing that other groups read before the
thing only you read. B2's production manager and B4's pipes both need B1's finance to charge
salaries and pipe metres; that is why phase A stubs `charge(kind, amount)` in `economy.ts` with a
working ledger before B starts, so nobody waits.

### 2.4 What every agent writes

Two report lines per task, as always, into `REPORT-T13.md` under its group heading, plus a
third line whenever it left a note for phase C ("needs `types.ts`: add `pipeMetres` to
`Equipment`"). Phase C consolidates.

---

## 3. Changes to the design (the contract)

The numbering below is the section numbering the task queue refers to.

### 3.1 Readability and the side menu `[PIOTR]`

- **The side menu (save and load, right hand side) does not close.** Fix it. One test: open,
  click outside, closed; open, press the close control, closed.
- **Colour by sign everywhere.** Audit every modal, card and tooltip for a signed figure printed
  in the body colour and route it through the Turn 12 helper. A test walks every rendered card
  in the catalogue and asserts no `+` or `-` figure is printed without the sign class.
- **Machine card order.** For every family with classes, the class card is, top to bottom:
  (1) **Effects**, one line each, signed and coloured: output, dust, air needed, life, any
  class specific effect (gates, quality, second shift); (2) a gap; (3) **Costs**: price, delivery
  days, power a day, and after 3.15 the insurance it adds a year; (4) a gap; (5) the description
  in the body font. One layout function for every family.
- **Materials modal.** Piotr's verdict on the current one: "a tragedy, redo it entirely." It is
  replaced by 3.2 and 3.6; do not restyle it, rebuild it.

### 3.2 Stock, in the style of Joinery Core `[PIOTR: a deliberate advert]`

The Materials tab of the laptop becomes a stock page that a Joinery Core user would recognise at
a glance, without any of Joinery Core's detail. What it has:

- A list of stock lines, each with a small thumbnail (a flat coloured board with the material's
  colour and a fake photo frame, one placeholder per material kind), the material name and a
  stock number (`MFC-18-WHT-001` style, generated once per material kind, stable across saves).
- Per line: **Free** and **Reserved** quantities in sheets, and a total. Reserved is what
  accepted jobs will consume; free is what can be sold to a new job. The company board's
  "material value" reads total sheets times `SHEET_VALUE`, as today.
- A **Low stock** badge on a line whose free count is under `LOW_STOCK_SHEETS` `[TUNE 4]`.
- One button at the top: **Restock**, which opens the shopping list pre filled with every low
  line brought back to `RESTOCK_TO_SHEETS` `[TUNE 12]`.

What it does **not** have: categories, sub categories, suppliers, weighted averages, invoices.
Piotr: "the player should recognise the software I sell, visually, and nothing more."

### 3.3 The per project question is gone `[PIOTR]`

"Per project or from stock" is deleted. The rule: a job that is accepted **reserves** its
sheets from free stock at once; if free stock is short, the shortfall is a red figure on the job
card and on the projects list (3.6), and the only way to clear it is Restock (3.2) or the job's
own **Order for this job** button, which buys the shortfall at the ad hoc price. Prices stay:
`SHEET_PRICE_AD_HOC` 200 `[PIOTR]`, `SHEET_PRICE_STOCK` 175 `[PIOTR: 170 to 180]`. Piotr:
"too much confusion, too little benefit."

The Turn 11 "materials" chore of 30 minutes a day is renamed **Consumables and materials**, is
the admin's when there is one, and is independent of the number of projects (3.8 says who does
the material list, which is a different job).

### 3.4 Enquiries arrive slowly and grow `[PIOTR]`

- The automatic third enquiry that refills the board after an acceptance is deleted.
- New enquiries a day: `ENQUIRIES_PER_DAY_BY_REPUTATION_TIER` `[PIOTR: 1 at the start, 2 at
  most]`, drawn at the day's open, plus the website's effect (3.7). At the very start, one a day.
- Enquiries the company cannot take (no machine, no capacity, reputation too low) stay visible
  and greyed as today; that part is good and stays.
- Everything Turn 10 said about the board's size and the express chance stays, but reads the
  new table.

### 3.5 Workshop efficiency on the top bar `[PIOTR]`

One number next to the clock: **Efficiency 73%**, live, the ratio of production minutes actually
worked this day to production minutes the workshop could have worked with every hired person at
a station (owner counted while he is in the workshop). Clicking it opens a small plate with the
breakdown of what is pulling it down, four lines, each a percentage of the lost minutes:
**no people**, **no machine free**, **no material**, **owner away**. Piotr: "without the
breakdown it is just a pretty number." One engine function computes both the number and the four
lines; the UI prints them.

### 3.6 Projects and their materials in red and green `[PIOTR]`

The projects list on the stock page (3.2) and every job card show the job's material line in
green when its sheets are reserved from stock, in red when there is a shortfall, with the
shortfall count. That is the whole rule.

### 3.7 The company website, five levels `[PIOTR]`

A new tab in the laptop, **Website**, under Admin (3.15 adds Insurance to the same group;
build the group once). Five levels:

| Level | Name | Cost | Effect on enquiries | Reputation |
|---|---|---|---|---|
| 1 | Do it yourself | 0 | fewer and worse `[TUNE -1 a week, quality -1 tier]` | none |
| 2 | Template site | 500 `[PIOTR]` | none | none |
| 3 | Agency site | `[TUNE 2,500]` | more `[TUNE +1 a week]` | none |
| 4 | Good agency | `[PIOTR 7,500 to 10,000]`, use 8,500 | more, better `[TUNE +2 a week, quality +1 tier]` | +2 `[PIOTR: 2 to 3]` |
| 5 | Top agency | 15,000 `[PIOTR]` | more, better `[TUNE +3 a week, quality +1 tier]` | +3 `[PIOTR: 2 to 3]` |

Rules Piotr set: levels 1 to 3 move **only** the number and the quality of enquiries; 4 and 5
add a **small** reputation bonus, small on purpose, so reputation cannot be bought instead of
earned. "People buy with their eyes: wow, they must be good." Upkeep: `WEBSITE_UPKEEP_MINUTES`
per week for the owner or the admin, 10 at level 2 up to 20 at level 5 `[PIOTR]`, a task in the
laptop like any other. The level is bought once and can be raised; the reputation bonus applies
while the level is held.

### 3.8 The estimator and the material list `[PIOTR]`

Two jobs that today are one are split:

1. **Material take off** (the task name; also "Create material list" on the button): reading the
   drawing and counting the sheets for one accepted job. At the start the **owner** does it. A
   new role **estimator** (tab label "Technical", because in this game the price arrives with the
   enquiry and this person only makes the list) takes it over when hired. Capacity:
   `ESTIMATOR_JOBS_PER_DAY` 5 `[PIOTR]`, 10 with **Joinery Core** bought in the laptop (a
   software line in Admin, `JOINERY_CORE_PRICE` `[TUNE 1,200 a year]`), plus 5 per **extension**
   (`JOINERY_CORE_EXTENSION_PRICE` `[TUNE 600 a year]`, at most two). The jump from 5 to 10 must
   be felt; the old 16 was too many.
2. **Consumables and materials** (3.3): the admin's short paperwork once a day, independent of
   project count.

Salary for the estimator `[TUNE 2,600 a month]`, three tiers like the joiners.

### 3.9 The production manager and the second shift `[PIOTR]`

A new role, **production manager**, the first management role in the game. Salary
`[TUNE 3,400 a month]`, one tier only. What he does:

1. **Runs the second shift.** Without him there is no second shift button. With him, the team
   page gets **Second shift** on and off, and joiners can be assigned to it. The second shift
   works `SECOND_SHIFT_MINUTES` 480 `[TUNE]` after the day shift, at `NIGHT_RATE` 1.25
   `[TUNE]` of salary for those hours, with the owner absent from the hall: quality drops one
   tier for work done at night `[TUNE]` and the error chance is doubled `[TUNE]`. Piotr: "a small
   firm runs a second shift out of necessity, not luxury, because it cannot make the deadline."
   Available in the workshop from the day he is hired, not later.
2. **Assigns people to tasks**, which takes those minutes off the owner's day (the owner's day
   meter loses the "assign" category when a manager is present; the manager's own day meter
   gains it).
3. **Covers the owner's absence.** This is the mechanic that matters: he adds **nothing** while
   the owner is in the hall. When the owner is out (site measure, holiday, the ownerOut modal),
   efficiency falls by `OWNER_AWAY_PENALTY` 0.30 without a manager and by
   `OWNER_AWAY_PENALTY_WITH_PM` `[PIOTR 0.05 to 0.10]`, use 0.08, with one. This is the day the
   player stops being the bottleneck; his salary is a pure cost, he makes nothing.
4. **Connects machines to the extraction** (3.19): with a manager, a newly placed machine is
   connected to the nearest extractor with spare air automatically and the player only confirms;
   without one, the player clicks it.

A **Holiday** button appears on the owner's card when a manager is hired: the owner is away for
N days, living costs continue, the penalty of point 3 applies. Without a manager the button is
greyed with the reason.

### 3.10 The floor limits the crew `[PIOTR]`

Machines already limit simultaneous work. Floor area now limits headcount:
`CREW_LIMIT = floor(freeFloorM2 / M2_PER_PERSON)` where free floor is the hall's area minus every
placed footprint and zone, and `M2_PER_PERSON` `[TUNE 24]` is set so that a 200 m² hall with a
normal set of machines and racks lands at **owner plus four, five at most** `[PIOTR]`. The team
page shows "Crew 4 / 5, floor limited" and hiring beyond it is refused with that reason. Piotr:
"without this the player buys ten people and pushes everything through two shifts."

### 3.11 Automatic blast gates `[PIOTR]`

A per machine purchase in the machine's own card: **Automatic gate**, `GATE_PRICE` 1,000
`[PIOTR: 800 the kit, 1,000 fitted]`, only for machines with an extraction demand above zero.
Two effects: (1) `+2%` output on that machine `[PIOTR]`; (2) the hall's extraction demand counts
**only the machines actually running this minute** among the gated ones; ungated machines count
whenever they are connected, because the duct is open through every ungated branch. The
under extraction rule reads this sum. The gate is drawn as a small collar on the pipe above the
machine (placeholder tonight).

### 3.12 Five classes for every machine family `[PIOTR]`

Every family that `isMachineFamily` returns true for gets exactly five classes, `used`,
`budget`, `standard`, `pro`, `industrial`, in that order, class 5 always the industrial one.
Tonight that means adding ladders for `thicknesser`, `cnc` (used and budget join its three),
`solidWoodTools`, `sprayBooth`, `drill` and the new `spindleMoulder` (3.13). Prices `[TUNE]`
unless the family already has Piotr's; output, endurance and power follow the saw's ladder
unless the family has its own; extraction demand from `EXTRACTION_DEMAND`, extending the table
where a class is missing `[TUNE]`; dust from Turn 12's per family table. Every class card uses
the same badge and frame colour for its class across families, so the player reads the class
at a glance: one `CLASS_BADGE` table, five entries.

### 3.13 The spindle moulder, a shared family `[PIOTR]`

A new family `spindleMoulder`, tab `sheetMachines` **and** `timberMachines` (it is shared:
handleless kitchens with a J profile and shaker fronts need it on the sheet side too). Five
classes, prices `[TUNE 1,500 / 4,000 / 9,000 / 16,000 / 28,000]`, dust `0.12` (Turn 12's
comment), extraction demand `[TUNE 900 / 1,000 / 1,300 / 1,600 / 2,200]`, footprint
`[TUNE 2 by 1, zone 3 by 3]`. Products: `lacqueredKitchen` and a new `handlelessKitchen`
`[TUNE price 9,000, four stages]` require it. Class 3 or above is written in the constants as
the future gate to timber production (`TIMBER_BRANCH_MIN_SPINDLE_CLASS = 'standard'`), but the
branch choice itself is parked (section 8); tonight the constant exists and nothing reads it.

### 3.14 The loan and the overdraft `[PIOTR]`

A new **Finance** tab in the accounting binder.

- **Loan**: up to `LOAN_MAX` `[TUNE 50,000]`, at `LOAN_RATE_YEARLY` 0.15 `[PIOTR]`, sixty
  monthly instalments `[PIOTR: 5 years]`, interest on the outstanding balance charged monthly
  with the instalment. One loan at a time; early repayment allowed at no penalty `[TUNE]`. The
  tab shows balance, next instalment, total interest paid, months left.
- **Overdraft**: the existing `overdraftLimit` per difficulty stays; while the account is below
  zero, `OVERDRAFT_RATE_YEARLY` 0.25 `[PIOTR]` accrues daily and is charged monthly, interest
  only, the balance stays negative until the player brings it up. The top bar's cash goes red
  below zero (it may already).
- Both appear as their own lines in the monthly report (3.20) and in the daily "today" figure.

### 3.15 Insurance, in its own tab, and the gate to commercial work `[PIOTR]`

A new **Insurance** tab in the laptop under Admin (next to Website, 3.7). Not in Equipment.

- **Property**: `PROPERTY_INSURANCE_RATE_YEARLY` 0.02 `[PIOTR]` of the value of every machine
  and the stock, recomputed on every purchase and every stock change; charged as a twelfth each
  month. The tab shows the insured value and the yearly premium live.
- **Public liability**: `LIABILITY_BASE_YEARLY` `[TUNE 600]` plus `LIABILITY_PER_EMPLOYEE_YEARLY`
  `[TUNE 180]` per hired person, yearly, charged monthly.
- **Uninsured** is allowed. The existing accident event, when it fires with no liability cover,
  adds a **claim** of `[TUNE 8,000 to 25,000]`, drawn once; a burglary (3.17) with no property
  cover loses the machines outright. Piotr: "you can go without, but an accident then
  massacres you." Insurance never raises reputation.
- **The gate**: enquiries of kind **commercial** (a new enquiry kind, larger, `[TUNE 2 to 3
  times the residential budget]`, requiring reputation above 20 `[PIOTR]` and at least one
  hired person `[PIOTR]`) require both covers to be **held**; without them they show on the
  board greyed with the reason "no insurance".
- The insurer may require an alarm: with security level 0 (3.17) the property cover pays out
  nothing on a burglary and the tab says so in red.

### 3.16 Standing contracts `[PIOTR]`

A new **Contracts** tab beside Orders (the same page, second tab). A contract is repeat work,
for example cut sheets for a shop: low margin, steady money.

- Contracts arrive like enquiries, from reputation tier 2 up `[TUNE]`, one on the board at a
  time. A contract has a **piece** (a product with one or two stages, `[TUNE cutSheetPack:
  cutting only, 45 min, sold at 38 with 30 of material]`), a **quantity a week**, a **term** of
  three to six months `[PIOTR]`, and a **price a piece**.
- Accepting a contract adds a **standing bar** to the work plan, separate from the jobs, with a
  piece counter "31 / 60 this week". Only **people** are assigned to it; the machines it uses
  stay in the general queue, so a better saw or a CNC shortens its cycle and raises its output
  without any click `[PIOTR]`.
- Missing a week's quantity is a reputation hit `[TUNE -1]` and is remembered. At the end of
  the term the client **renegotiates** from the delivery history: every week delivered in full
  raises the offered price `[TUNE +1%]`, every short week lowers it `[TUNE -2%]`, and the player
  renews or lets it go.
- At the end of the term a **closing report** modal shows pieces made, revenue, material,
  labour hours at cost, and the net margin.

### 3.17 Security, five levels `[PIOTR]`

A new **Security** tab in the laptop under Admin. Five levels, and this is the mechanic Piotr
wants to make fixed costs felt:

| Level | Name | Cost | Risk of burglary a month |
|---|---|---|---|
| 0 | Nothing | 0 | `BURGLARY_BASE` `[TUNE 0.04]` |
| 1 | Alarm | 500 once `[PIOTR]` | `[TUNE 0.02]` |
| 2 | Bars | `[TUNE 1,500 once]` | `[TUNE 0.012]` |
| 3 | Bars and dogs | `[TUNE 2,500 once plus 150 a month feed]` | `[TUNE 0.006]` |
| 4 | Security firm, basic | `[TUNE 250 a month]` scaled | `[TUNE 0.002]` |
| 5 | Security firm, good | `[TUNE 600 a month]` scaled | **0** `[PIOTR]` |

Levels 1 to 3 are one off, 4 and 5 are monthly subscriptions that **scale** with the hall's
area and the insured equipment value: `subscription = base * (areaM2 / 200) * (1 + insuredValue /
100,000)` `[TUNE]`. Level 5 takes the risk to **zero**, Piotr's decision against Claude's
proposal of a residual risk, because "this is not a gamble on a burglary, it is to show the real
weight of fixed costs." A burglary event takes one or two machines at random (the dearest
first) and the free stock; with property insurance and at least level 1 it is paid out over
`[TUNE 10 days]`, with level 0 it is not paid at all (3.15).

### 3.18 The owner's house, eight tiers `[PIOTR]`

- The owner's daily draw is the existing `LIVING_COST_PER_WORKING_DAY`, renamed
  `OWNER_DRAW_PER_DAY`, and it is now the player's choice among **eight thresholds**, not a
  slider: `OWNER_DRAW_TIERS = [200, 400, 800, 1500, 3000, 5000, 7500, 10000]` `[PIOTR: 200,
  400, 800, 1,500, 3,000, then up to about 10,000; the three upper steps are TUNE
  interpolation]`. It stays **daily** `[PIOTR: money must leak every day, no bump at month end]`.
- The **house tier** is the highest threshold whose 30 day sum the owner has actually paid
  himself over the last thirty calendar days, computed in one function from the ledger (so a
  player who raises the draw sees the new house only once the money has really gone). Tier 1
  is a run down flat "in the middle of nowhere", tier 8 a villa. Names `[TUNE]`, eight lines.
- **When the owner goes home at the end of the day**, the day end flow shows, for
  `HOUSE_CARD_SECONDS` `[TUNE 3]` or until a click, a full width card with the house picture
  (placeholder tonight, eight pictures requested in section 9) and the line "Resting at home
  now. See you at the workshop in the morning." No animation, a still picture. Piotr: "this is
  the only place the player sees the benefit of the hard work: the numbers on the account turn
  into something he feels."
- The draw is chosen on the owner's card on the team page; the house tier and the thirty day
  sum are shown there too. Raising the draw is a click; the conflict "machines or me" is the
  whole point, do not soften it with a suggestion.

### 3.19 Extraction pipes the game routes `[PIOTR]`

- A machine with an extraction demand above zero has **Connect to extraction** on its card
  (and, with a production manager, is connected automatically on placement, 3.9). The game
  routes the pipe **itself** on the grid from the machine to the extractor (or the nearest
  branch of an existing run) and charges `PIPE_PRICE_PER_METRE` `[TUNE 45]` times the length.
  The player never draws a pipe or places an elbow. Piotr: "the player decides where the
  machines stand, not how the pipes are drawn."
- The pipe is a **layer above the floor**: it runs over equipment across the hall and drops to
  the extractor. It occupies no 1 by 1 cell and blocks nothing under it; a pipe over a saw is
  normal. Routing: Manhattan on the grid, preferring straight runs, joining an existing run
  with a tee where cheaper, one algorithm in `pipes.ts` with tests on a small hall.
- Rendering: from a tile set of eight keys (`pipe.ns`, `pipe.ew`, four elbows, `pipe.tee`,
  `pipe.drop` for the vertical down to a machine, `pipe.inlet` at the unit). Until GPT paints
  them, the renderer draws each tile as a flat pipe in the game's dark green with a lighter top
  edge, in the hall's 2:1 dimetric, from the placeholder helper. The art request in section 9
  says, in bold, that the tiles must be drawn in the hall's 2:1 dimetric and never straight on.
- A connected machine that is not being pulled hard enough (the air rule) shows its pipe with a
  thin red outline.
- Moving a machine disconnects it and refunds nothing; reconnecting charges the new length.
- The `/sprites` page stays visible; hiding it in the Steam and demo builds is for the end,
  not now.

### 3.20 The monthly report `[PIOTR]`

On the first working day of the month, before the board, a **Month end** modal in the folder
skin: revenue, material, salaries (day and night separately), owner's draw, rent and rates,
power, insurance, security, loan and overdraft interest, contract revenue and margin,
waste collection, the net for the month, and the cash at open and close. Every line is a sum
from the ledger; the report is a view, it stores nothing. Piotr said explicitly: **no business
plan feature**; the daily summary and this monthly one are the two reports, nothing more.

### 3.21 Deliveries at the gate, and the walk `[PIOTR]`

- A delivered machine arrives on the apron **as that machine** (its own sprite, unplaced, with a
  "new" tag); a material delivery arrives as a **pallet of sheets** (placeholder tonight).
- Unloading is a real walk: the person carrying unloads the pallet sheet by sheet between the
  pallet at the gate and the racks, back and forth, along the path the character system already
  uses; the "walking in the corner" pretence is gone. The number of trips is the sheet count
  divided by `SHEETS_PER_TRIP` `[TUNE 2]`; the minutes still total `UNLOAD_BASE_MINUTES` 45
  `[PIOTR: he first wanted 30, then corrected himself to 45, because this is the room for the
  upgrade]`.
- A new handling item **Pallet truck** `[TUNE 450]` brings a material unload to about 30
  minutes `[PIOTR]`; the forklift brings it to about 15 `[PIOTR]`. The existing forklift
  factors are rewritten so those three figures come out; one table `UNLOAD_MINUTES_BY_HANDLING`.

### 3.22 Tips, two layers `[PIOTR]`

- **First use bubbles**: a short contextual bubble the first time each screen or modal is
  opened (catalogue, work plan, stock, board, finance, insurance, security, contracts, website,
  the house card), one sentence each, from one table `TIPS`, dismissed by a click, remembered in
  the save.
- **The warning strip**: a strip under the top bar when the game sees a problem: a started job
  with nobody assigned, a deadline at risk, bags full, no insurance for a commercial job on the
  board, the crew at the floor limit. One line, one problem at a time, the most urgent first,
  from one engine function that returns the list.
- A **Settings** modal (gear on the top bar) with **Tips on and off** and nothing else tonight;
  Turn 11's autosave settings move into it if they have a control.

### 3.23 Animations `[PIOTR: "weak, to be improved"]`

The owner's and the joiner's walk and work cycles are the art side's; the code side tonight only
makes sure every state the character system can be in has a frame key (idle, walk in four
directions, work at a station, carry, phone, home) and that a missing frame falls back to idle
rather than to nothing. List the missing frames in the art request.

---

## 4. State and migration (phase A)

- `STATE_VERSION` bumps once. New state: `finance` (loan, overdraft interest accrued),
  `insurance` (covers held, insured value), `security.level`, `website.level`, `contracts[]`
  with weekly history, `ownerDraw.tier` and the thirty day ledger window (derived, not stored, if
  the ledger already has dated lines), `pipes[]` (tile list per run), `gates` per equipment id,
  `settings.tips`, `tips.seen[]`, `shift.second` on and off, the manager's day log, the new
  roles' workers, `enquiry.kind` residential or commercial, `enquiry.budget`.
- Every v19 save loads: finance empty, no covers, security 0, website 1 (do it yourself), no
  contracts, draw tier 1 at 200 a day, no pipes, gates none, tips on, second shift off. A test
  loads the v19 fixture and asserts each default.

---

## 5. Task queue, in order

Branch `turn-13-the-workshop-grows-up` from `main`. One commit per task, `npm run check` green on
its own exit code before each, two report lines per task under the task's group heading in
`REPORT-T13.md`.

**Phase A (one agent, serial)**

**T13-A1 Housekeeping and v20.** `docs/turn-12-brief.md` from git history; `APP_VERSION = 'v20'`;
`docs/art/REQUESTS-T13.md` created with the section 9 list. Done.

**T13-A2 Contracts and stubs.** Section 4 in `types.ts`; every new constant of section 3 in
`constants.ts` with its tag; new roles `estimator` and `productionManager` in `WorkerRole`; new
laptop tabs `website`, `insurance`, `security` under an Admin group and the accounting `finance`
tab; the Orders page gets a `contracts` tab; new action types routed in `game.ts` to stub
handlers; `economy.ts` gets `charge(kind, amount, when)` writing dated ledger lines (the monthly
report reads these). Done: everything compiles, a test asserts every new action type has a
handler, the v19 fixture loads with section 4 defaults.

**Phase B (up to five agents, parallel, frozen files untouched)**

**T13-B1a Finance.** 3.14. Done: the tests (60 instalments sum to principal plus interest,
overdraft interest accrues daily below zero and not above, early repayment closes the loan).

**T13-B1b Insurance.** 3.15 except the board gate (B3 reads the cover flags). Done: the tests
(premium follows insured value on purchase, the uninsured accident claim, the level 0 payout).

**T13-B1c Contracts.** 3.16. Done: the tests (weekly counter, the short week, the renegotiation
arithmetic, the closing report figures).

**T13-B1d Month end.** 3.20. Done: a test that every ledger kind appears on exactly one line and
the lines sum to the cash delta.

**T13-B2a Estimator and the material list.** 3.8. Done: the tests (5 a day, 10 with Joinery
Core, plus 5 per extension, the owner does it with nobody hired).

**T13-B2b Production manager, second shift, holiday.** 3.9 points 1 to 3. Done: the tests (no
manager, no shift; night rate; the two absence penalties; assign minutes move off the owner).

**T13-B2c Crew limit.** 3.10. Done: the test (200 m² with the standard set lands at five).

**T13-B2d The owner's draw and the house.** 3.18 engine and the team page; the day end card is
B5's to show, B2 provides `houseTierFor(state)` and the card renderer in `house.ts`. Done: the
tests (tier follows the thirty day sum, not the setting; the sum is from the ledger).

**T13-B3a Stock page and the reservation rule.** 3.2, 3.3, 3.6. Done: the tests (reserve on
accept, red on shortfall, Restock fills the low lines, the two prices).

**T13-B3b Enquiry flow and the budget answer.** 3.4 and section 3.7's effect table read from
constants; the negotiation of 3.24 below. Done: the tests (one a day at the start, never three
after an acceptance, the answer inside the band, the shift of odds).

**T13-B3c Website.** 3.7 UI and the upkeep task. Done: the tests (levels 1 to 3 never touch
reputation, 4 and 5 add exactly the constant).

**T13-B3d Commercial enquiries and the insurance gate.** 3.15's gate. Done: the test.

**T13-B4a Five classes everywhere, the spindle moulder, the badges.** 3.12, 3.13, 3.1's card
layout. Done: a test that every machine family has exactly five variants in class order and a
badge, and that the card prints effects, then costs, then description.

**T13-B4b Gates.** 3.11. Done: the tests (+2%, running only counts, ungated counts always).

**T13-B4c Pipes.** 3.19 engine and render. Done: the routing tests (straight, one elbow, a tee
onto an existing run, length and price, no cell occupied), the render test (every tile key maps
to a placeholder draw).

**T13-B4d Security.** 3.17. Done: the tests (level 5 never burgles over 10,000 simulated months,
the subscription scales, the level 0 payout is zero).

**T13-B4e Deliveries at the gate and the walk.** 3.21. Done: the tests (trips count, 45 / 30 /
15, the pallet appears and disappears).

**T13-B5a Side menu, colour audit, settings.** 3.1 side menu, the sign audit test, 3.22's
settings modal. Done: the tests.

**T13-B5b Efficiency number and breakdown.** 3.5. Done: the tests (the four lines sum to the
lost minutes).

**T13-B5c Tips and the warning strip.** 3.22. Done: the tests (each bubble once, the strip's
order of urgency).

**T13-B5d The day end house card and frame fallbacks.** 3.18 day end flow, 3.23. Done: the
tests.

**Phase C (one agent, serial)**

**T13-C1 Apply the notes.** Every "needs frozen file" line from phase B, in one commit per
file. Done: the suite.

**T13-C2 Scenarios.** Update the sixteen months for the new enquiry rate, the reservation rule,
the owner's draw and the crew limit; add (t) a month with a loan and an overdraft; (u) a
burglary at level 0 uninsured and at level 1 insured; (v) a contract term with two short weeks
and a renegotiation; (w) a second shift month with a manager and a holiday; (x) a month of pipes
and gates with a thicknesser and two saws on one extractor. Done: green.

**T13-C3 The cross check of section 10.** Done: the checklist in the report, every line
answered.

**T13-C4 The playthrough of section 10.4.** Done: the log in the report.

**T13-C5 Report and PR.** `REPORT-T13.md` in the usual structure plus "Numbers chosen" (every
`[TUNE]`, grouped by section), "Frozen file changes" (what phase C applied and why), "Art
requested" (a copy of section 9 with anything added), "Cross check" (section 10) and
"Playthrough" (10.4). Kill background processes, push, PR titled `Turn 13: the workshop grows
up`, do not merge, end the session.

---

## 6. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, the sprite files or the
   font file. New art requests go in `docs/art/REQUESTS-T13.md` only.
2. No branch choice (sheet goods versus timber), no second hall, no second factory, no CEO, no
   managers beyond the production manager, no four sided planer, no sanders, no five axis CNC.
3. No business plan feature. Daily summary and month end are the two reports.
4. No slider for the owner's draw; eight thresholds and nothing in between.
5. No residual risk at security level 5. Zero means zero.
6. No pipe drawing tools for the player.
7. No storage access outside `src/cloud/store.ts`; no PixiJS, sound, mobile, Steam, Electron.
8. No watch loops, nothing left running.
9. No phase B agent touches a frozen file. Not once.

---

## 7. Section 3.24: the client's answer, the budget and the band `[PIOTR]`

(Numbered here so B3 can refer to it; it belongs with 3.4.)

Every enquiry arrives with a **budget** (the price the board shows today becomes "budget"). When
the player accepts, the client **answers with a number**: the budget times a factor drawn
uniformly in `[ANSWER_MIN, ANSWER_MAX]` = `[0.90, 1.15]` `[PIOTR: -10% to +15%]`, and the
player sees "The client offers 9,400. Accept?" with accept and decline. The draw is random on
purpose: the estimator, the salesman and reputation only **shift the odds**, they never
guarantee. Implementation: the band is fixed; the drawn factor is
`min + (max - min) * skew(u, k)` where `u` is uniform and `k` is a skew in `[TUNE -1 .. +1]`
built as `k = 0.25 * reputationTier + 0.25 * (estimator hired) + 0.25 * salesmanTier`, so a
poor offer with a poor team lands nearer 0.90 more often and a good team nearer 1.15 more
often, and neither ever leaves the band. Declining costs nothing but the enquiry. Piotr:
"sometimes you have to say no because the margin is too thin, and that is fine; with a good
team you can afford the no."

---

## 8. Parked

1. The branch choice (sheet goods or timber), the soft trigger, the second branch at factory
   level, the second factory with its manager and its risk band, vertical integration (W-1 to
   W-7 in Petros).
2. The timber families: four sided planer, planer, wide belt and brush sanders (their dust
   figures already sit in Turn 12's comment).
3. The unit of `powerPerDay`.
4. Starting capital 50 k or 40 k (stays 50 k).
5. Hiding `/sprites` in the Steam and demo builds.
6. Every `[TUNE]` on the class ladders except prices and the used saw's three effects.
7. The name check for "Woodwork Empire" on Steam and at the UK IPO.

---

## 9. Art requested (contents of `docs/art/REQUESTS-T13.md`)

For GPT, on `art/sprites`, PNG in `public/sprites/`. Every item in the hall's **2:1 dimetric**,
matching `docs/art/SPRITES.md` 9.1; anything drawn straight on will look crooked on our angle,
the way some of the furniture still does.

1. **Pipe tiles**, eight: run north south, run east west, four elbows, a tee, a vertical drop to a
   machine, an inlet into the unit. Dark green steel, a lighter top edge. Sized to one cell.
2. **Gate collar**, one, sits on the drop tile.
3. **House cards**, eight, landscape, the width of the day end card: from a run down flat to a
   villa, each with the owner's car outside growing with the tier, a garden from tier 4. Still
   pictures, no animation.
4. **Pallet of sheets** at the gate, and a **pallet truck**, both handling items.
5. **The production manager** and **the estimator**, character sheets in the Turn 11 character
   contract (SPRITES.md 10).
6. **Spindle moulder**, five classes, on the machine templates.
7. The **missing character frames** the code lists in the report (3.23).
8. Stock **thumbnail placeholders** are code side and need no art.

---

## 10. The cross check (phase C, before the PR)

This is the part of the session Piotr is paying for. Do not skim it.

### 10.1 One model of dust
- Every machine's dust output reads Turn 12's per family table; no class carries a dust figure.
- The gates change **air** counting, never dust.
- The pipes change **nothing** in the air or dust sums tonight beyond connection: an unconnected
  machine counts as not served (the air rule punishes it), a connected one counts as served.
  Confirm both directions with a scenario.

### 10.2 One ledger
- Every pound in or out goes through `charge()`; grep for direct `cash +=` and `cash -=` outside
  `economy.ts` and remove them.
- The month end lines sum to the cash delta for every scenario month, asserted.
- The daily "today" figure on the top bar equals the sum of that day's ledger lines.

### 10.3 One set of rules about people
- The crew limit, the second shift, the manager's absence cover, the estimator's capacity and the
  contracts' people only assignment all read the same worker list and the same minute booking.
  A joiner on the second shift is not also on the day shift.
- The owner's day meter, the manager's day meter and the efficiency number agree: the minutes
  the efficiency counts as worked are the minutes the meters show as workshop.

### 10.4 The playthrough
Run the headless three month playthrough (write it as a scenario if the harness has none): easy
difficulty, hire a joiner in week 1, buy a standard saw and a twin bag extractor, connect them,
accept every residential enquiry that has margin over 20% after the client's answer, take the
first contract offered, hire an estimator in month 2, a manager in month 3, take a five day
holiday in month 3, raise the draw to 400 in month 2, buy level 1 security and both insurances
in month 2. Assert: cash never hits the overdraft interest line without the loan; the house
tier reaches 2 in month 3; efficiency stays above 55% in month 3; the contract renegotiates up;
the month end report has every line. Put the three month end reports in `REPORT-T13.md`.

### 10.5 The look
Open every modal, card and tab once in the browser build and screenshot it into the report
folder: every signed figure coloured, every metre with its unit, the folder skin on the paper
modals and the board skin on the boards, the house card at day end, a pipe run over two
machines. If one of them looks like a different game, it is a bug.

End of brief.
