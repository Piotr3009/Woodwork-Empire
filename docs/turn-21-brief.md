# Turn 21: debt you can see, people who do not wait for you

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud, agent
teams expected). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 19.09.2026, from
Piotr playing v28 and v29 on 18.09 and 19.09 (Petros: software/woodwork-empire, STAN T21-01 to
T21-10 and the corrections of 19.09).

Read this whole file (first line must say "Turn 21"; if the root CLAUDE.md does not, stop and
report), then REPORT-T20.md in full (section 0's eleven items and "What was not done tonight"),
then docs/mockups/t21/README.md and open debt.html and bubbles.html in a browser, then
docs/ui-style.md (written in Turn 20; if it is missing, phase A writes it first), then the
archived briefs in docs/. Where files disagree, this one wins. All standing rules apply (no em or
en dashes anywhere, scope 1:1, one code path, constants never in the UI, [TUNE] for every figure
you choose and [PIOTR] for his, kill background processes, PR without merge, end the session, no
PR watching, npm run check gated on its own exit code, every click single, one APP_VERSION bump).

Precondition. main carries Turn 20 merged: APP_VERSION 'v29', STATE_VERSION 17, the Contracts tab
in `src/ui/workPlan.ts`, `docs/ui-style.md`. If APP_VERSION is not 'v29', stop and report.

The four rules of 18.09 bind every agent: **one game, one look** (read the repo first, build with
what is there, `docs/ui-style.md` is the guide, phase C compares every changed screen with its
nearest existing one); **nothing visual without a mockup** (the two in docs/mockups/t21 are the
only pictures this turn builds from; every other section states its change line by line);
**no sound without a recorded file** (there are none; the hall stays silent); **every modal,
popover and list has the cross, Escape and click outside**, and Turn 20's popover test keeps
proving it.

## 0. What this turn is for (Piotr, 18.09 and 19.09)

Piotr dropped a £50,000 job with £7,000 in the bank. The deposit he owed went to arrears, the top
bar kept saying -£7,259, and the game played on. His words: "you cannot pay your debts, you are
bankrupt, and the game should end." That is the first half of this turn: **debt you can see**, a
drop that shows its price before the click, and a bank that closes a company that cannot pay.

The second half is the people. Office staff wait for the owner to have time before they lift a
finger; men queue four deep at a saw while the rest of the hall stands; the day meter looks as if
time runs slower than the clock; and two of Turn 20's people rules came out as Claude wrote them
and not as Piotr said them: the tiers and the pay. Both are put right here, in Piotr's words.

## 1. Rules restated (short)

Everything from Turns 1 to 20. Tonight in addition:

- APP_VERSION = 'v30'. STATE_VERSION bumps to 18 in phase A, once, for section 4's fields; every
  v29 save loads.
- **Pay is by the month, everybody** [PIOTR, 19.09: "I wanted everyone monthly"]. Turn 20's week
  is reversed: `monthlyWage` is the one field, paid on the last working day of the month; the
  week appears nowhere.
- **The tiers are Piotr's four** [PIOTR, 19.09]: no experience 0.6, experienced 0.8, very
  experienced 1.0, excellent 1.2 (excellent from reputation 60). Turn 20's 0.8 / 1.0 / 1.2 / 1.4
  and its words go.
- A drop is the one action in the game that takes two clicks [PIOTR, 18.09], because for a big
  job it ends the company. Everything else stays one click.
- Nobody stands and waits while there is work he could do. The scheduler of 2.7 is the rule, and
  the bubbles of 2.6 say why when he must.

## 2. Changes to the design (the contract)

### The money

**2.1 Debt on the top bar [PIOTR; docs/mockups/t21/debt.html, part 1].** While
`state.arrears > 0`, a red tile sits between the cash tile and the speed chips: `owes £25,740` on
the first line and `arrears, 1 month · bailiff in 2` on the second (months of arrears from the
existing counter, months to the bailiff from `ARREARS_BAILIFF_MONTHS`), pulsing as drawn; a click
opens Accounting on its Summary tab. The tile is gone the day the arrears are cleared. Under the
bar the warning strip gains a line, above everything but the bags: `Account below zero and
£25,740 in arrears: together -£32,999, past the -£15,000 the bank allows. Pay the arrears or the
bank closes you.` The figures are `cash + arrears` and `BANKRUPTCY_LIMIT_FACTOR * overdraftLimit`
(2.2). Done: the topbar test (tile only while arrears exist, the two lines, the click), the
warnings test (the line and its place).

**2.2 The bank closes a company that cannot pay [PIOTR; debt.html, part 3].** `checkBankruptcy`
reads the net position, not the cash alone:

1. `cash + arrears <= BANKRUPTCY_LIMIT_FACTOR * overdraftLimit`, with the factor **1.5** [PIOTR]
   (today: cash alone at 2x): -£15,000 on easy and very easy, -£7,500 on normal. Arrears are
   negative in that sum.
2. Or the **thirtieth calendar day** in a row with cash below the overdraft limit, whatever the
   amount [PIOTR: "thirty days below the limit"]. A day above the limit resets the count.
3. Checked at the day's close, as today. The event is the existing bankruptcy event with the card
   of the drawing: `The bank has closed you`, the date and the month, the four figures (in the
   bank, arrears, together, the bank allowed), the working days kept, the orders taken and built;
   `Start again` and `Load a save`. The 2x rule and its constant go.

Done: the engine tests (net over the line ends the game the same day; cash alone under the old
2x but net above 1.5x does not; thirty days below the limit ends it at day thirty and not
twenty nine; a day above the limit resets), the card's render test.

**2.3 Drop project, with its price on the card [PIOTR; debt.html, part 2].** `Drop project` no
longer drops: it opens the card of the drawing, in the folder skin with the cross: the deposit to
return, the material bought for it and written off, the reputation cost (2.4), and `You have
-£7,259 of -£10,000 overdraft`. When the deposit cannot be paid from cash plus the remaining
overdraft, the red box: `You cannot pay the deposit back. It goes to arrears: -£33,000 against the
bank's -£15,000 limit. Dropping this job closes the company today.` (2.2's figures, and `today`
only when 2.2 would fire at the close; otherwise `puts you N days from the bank closing you` is
not written: keep the sentence to what is certain.) The red button `Drop it anyway` drops (the
existing `DROP_JOB`); `Keep the job` and the cross close the card. A small job shows the same
card with green figures and no box. Done: the app test (the card, the two ends, the box only when
it cannot be paid), the popover test finds the card.

**2.4 The reputation cost of a drop follows the price [PIOTR].** `DROP_PROJECT_REPUTATION` 10
becomes the floor of a scale: **10, plus 1 for every £1,000 of the job's price over £5,000,
capped at 50** [PIOTR, 19.09: "up to 50 max"]; a commercial job's cost is 1.5 times that, still
capped at 50. A £3,000 job costs 10, £10,000 costs 15, £20,000 costs 25, £50,000 and anything
above costs 50. One function, `dropReputationCost(job)`, read by the drop and by the card of 2.3.
Done: the test at those five prices and the commercial cap.

### The people

**2.5 The office works without you [PIOTR: "they wait until I have time; stupid"].** Three
things that today wait for the owner to enter the office happen on their own:

1. **The site measure goes to the estimator** the morning an enquiry needs measuring, if one is
   on the books and free: the task is created for him and he goes (Turn 20's 2.3.2 lets him; this
   makes it automatic and first, before the owner). The salesman second. The owner only when
   neither is on the books.
2. **Material is ordered the moment the drawings are done**: when a job's material take off is
   complete and its shortfall is above zero, the purchasing clerk (or, without one, the estimator;
   without either, the office admin) places the Order for this job himself, at the ad hoc price,
   if the cash after it stays above the overdraft limit; the ledger line says who ordered. Without
   any of the three the job's card asks the owner as today.
3. **Emails and calls are the admin's the minute they arrive**, not at the day's assignment
   pass: `runAutoAssign` is called when a task is created, not only at 8:00, so a call that comes
   in at 11:00 is taken by the admin at 11:00.

The owner's day meter shows none of these minutes. Done: the engine tests (each of the three with
the person on the books and without).

**2.6 The men say why they stand [PIOTR; docs/mockups/t21/bubbles.html].** A bubble over a
figure's head, as drawn: paper, hand font, one line, anchored 6 px over the head, depth sorted
with the figure and moved by the walker; red border for a state the player can fix (waiting for
a taken machine, no cut parts yet, no sheets for the job, nothing to do), green for a helper's
chore (sweeping, emptying the bags, unloading), paper for the first three seconds of a new
production stage (`cutting Small kitchen`, `assembling`, `spraying`, `12 of 40 drawer boxes`),
dashed grey for a man who is off the hall, drawn at the door he went through (`off to measure,
back at 14:00`, `in the office`, `at lunch`). Words from one table `BUBBLES` in constants; at x10
and x30 only red, green and grey are drawn. The hover line of Turn 11 stays. Done: a render test
of each colour and of the three second rule with a fake clock.

**2.7 Nobody waits while there is work [PIOTR].** When a man's next stage needs a machine that
is taken, the scheduler looks for other work before he waits, in this order: another stage of
the same job that needs no machine or a free one; the same on another job he is assigned to;
his contract's pieces if he is on one. Only when nothing is his to do does he stand at the
waiting cell with the red bubble. **Assembly never starts before the cutting stage of its job is
complete** [PIOTR]: a man sent to assemble with no cut parts is not assembling, he is waiting
with `no cut parts yet`, and the scheduler treats that stage as not available to him. The work
plan's bar and the job card say `waiting for the saw` where they say the stage today. Done: the
engine tests (four men, one saw, two jobs: nobody waits while the second job has bench work; a
job whose cutting is half done gives its assembler nothing), the scenario (gg).

**2.8 The day meter shows the idle [PIOTR: "my time runs two to three times slower than the
clock"].** The meter counts minutes worked (`owner.minutesWorked`) and so it stalls while the
owner stands: the bar gains a **grey segment for the minutes he stood** between the worked green
and the empty rest, the label reads `203 worked · 91 idle · 540`, and hovering the grey lists the
reasons with their minutes (waiting for a machine, no material, nothing assigned, in the office
with nothing to do), from the same causes Efficiency counts. Done: the topbar test.

**2.9 The four tiers, in Piotr's words and numbers [PIOTR, 19.09].** `WorkerTier` ids stay
`novice | experienced | senior | master`; the words become **no experience, experienced, very
experienced, excellent** (`TIER_WORDS`), and the rates **0.6 / 0.8 / 1.0 / 1.2** for every role
with a rate. Excellent from reputation 60; the other three thresholds of Turn 20 stay [TUNE].
Pay per tier for a joiner, a month: 1,950 / 2,600 / 3,500 / 4,330 [PIOTR: the top at about 1,000 a
week; the rest scaled from the experienced 2,600; TUNE]. Migration: rates are recomputed from the
tier on load. Done: the tests, and `grep -rn "1\.4\|super experienced\|extremely" src`: nothing.

**2.10 Pay by the month, everybody [PIOTR, 19.09].** `weeklyWage` goes; `monthlyWage` is the
one field on `Worker` and on the hire cards; the payroll runs on the **last working day of every
month** for everyone (the Friday payroll of Turn 8 and Turn 20 goes), the ledger line `Monthly
wages`; the hire card and Our team print `£2,600 a month`; the hiring gate of T17 2.11 reads the
monthly figure directly; the Company board's per man rate and the insurance's per employee
premium read it. `WEEKS_PER_MONTH` conversions go. Migration: `monthlyWage` from `weeklyWage *
4.33` where the monthly is zero. Done: the tests (one payroll a month, the month end's salary line
equals it, the gate at 2,600).

### The hall

**2.11 The crew go through the doors and are not drawn inside [PIOTR, 19.09: "office staff
invisible"].** Turn 20's `figureGoesThroughDoors` predicate is true for everybody: an estimator
at a take off, an admin at the emails, a clerk at his orders, a draftsman at his drawings go
through the office door and are off the hall until they come out; the office view keeps drawing
only the owner at his desk. Their bubble of 2.6 sits at the door. Done: the render test (no
figure for a man whose station is the office) and the office view test (only the owner).

**2.12 Lunch in the canteen [PIOTR, 19.09].** At the break every man on the floor, the owner
included, walks to the canteen door, goes through and is off the hall; when the break ends he
comes out and walks back to his station. A man who works through the break (the owner's
`breakSkipped`) does not go. The canteen's door counts as a door for `figureGoesThroughDoors`.
Their bubble: `at lunch`. Done: the app test with the clock through the break.

**2.13 The tool cabinet stands two metres wide [PIOTR's art, 19.09; TUNE until he rules].** The
cabinet the art side painted is two cells wide; the spec is 1 by 1 by 1. The spec becomes
`width 2, depth 1, height 1` with a `zone 3 by 2` [TUNE], placement and the station table read it
as they read any 2 by 1; a saved hall with a cabinet that no longer fits is handled by the
migration as Turn 17 handled the welfare kit (moved to the first free 2 by 1, or into the yard
with a note). If Piotr answers "keep 1 by 1" before the session, this section is not built and
the picture stays small. Done: the placement test and the migration test.

## 3. How to run this session (agents)

- **Phase A (one agent, serial):** section 4's fields, STATE_VERSION 18, the migrations (monthly
  wages, tier rates, the cabinet); `TIER_WORDS`, the rates, `BANKRUPTCY_LIMIT_FACTOR`,
  `dropReputationCost`, `BUBBLES`; the drop action routed to the card; `docs/ui-style.md` read and,
  if missing, written. The six frozen files of Turn 13 are frozen for phase B after this.
- **Phase B (three agents):** B1 the money: 2.1, 2.2, 2.3, 2.4 (economy.ts, warnings.ts,
  topbar.ts, the drop card ui, the bankruptcy card). B2 the people: 2.5, 2.7, 2.8, 2.9, 2.10
  (tasks.ts, staff.ts, production.ts, plan.ts, team.ts, hire cards, economy.ts payroll, the day
  meter). B3 the hall: 2.6, 2.11, 2.12, 2.13 (hall.ts, walkers.ts, doors.ts, office.ts,
  characters.ts, layout.ts, constants for the cabinet through a note).
- **Phase C (one agent, serial):** the notes, the scenarios (the sixteen months with monthly pay
  and the new tiers; plus (gg) four men, one saw, two jobs; (hh) a drop of a £50,000 job that
  closes the company; (ii) a month in arrears that ends on day thirty), the cross check of
  section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 18. `worker.monthlyWage` back, `weeklyWage` gone; `worker.rate` recomputed from
the tier; `state.daysBelowOverdraft: number`; the drop card and the bubbles need no field; the
cabinet's footprint is in constants. Every v29 save loads.

## 5. Task queue, in order

Branch turn-21-debt-you-can-see from main. One commit per task, npm run check green on its own
exit code before each, two report lines per task in REPORT-T21.md.

T21-A1 Housekeeping and v30: docs/turn-20-brief.md byte for byte from the Turn 20 merge commit's
CLAUDE.md, the README's lines, APP_VERSION 'v30', docs/art/REQUESTS-T21.md (section 9).
T21-A2 Phase A as section 3 says.
T21-B1a 2.4. T21-B1b 2.2. T21-B1c 2.1. T21-B1d 2.3.
T21-B2a 2.9 and 2.10. T21-B2b 2.5. T21-B2c 2.7. T21-B2d 2.8.
T21-B3a 2.6. T21-B3b 2.11 and 2.12. T21-B3c 2.13.
T21-C1 notes. T21-C2 scenarios. T21-C3 cross check. T21-C4 look and shoot: ten pictures into
docs/report-t21/ (the top bar with the owes tile and the warning line, the drop card green and
red, the bankruptcy card, four bubbles of four colours on the hall, the day meter with the grey
segment, a hire card with the four tiers and a monthly wage, Our team with monthly pay, the
canteen door at lunch with nobody on the floor, the cabinet at two cells). T21-C5 report and PR
titled `Turn 21: debt you can see, people who do not wait for you`, do not merge, end the session.

## 6. Do not (tonight)

- No change to Output, Efficiency, the rate, the contract prices, the design time.
- No sound; no new mockup built from words.
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the sprite
  files, the character sheets or the font file.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- A £50,000 drop with £7,000 in the bank closes the company at that day's close, asserted.
- `grep -rn "weeklyWage\|WEEKS_PER_MONTH" src`: nothing but the migration.
- `grep -rn "1\.4\|super experienced\|extremely experienced" src`: nothing.
- Four men, one saw, two jobs: nobody stands while bench work exists, asserted.
- No figure on the hall for a man in the office or at lunch; the owner alone in the office view.
- Every changed screen beside its nearest existing one in the report, with the differences
  listed and none outside this brief; `git diff main --stat -- src/ui/styles.css` with no new
  token.
- The ten pictures.

## 8. Parked

- Contracts worked at every stage (spray booth, edgebander): later [PIOTR].
- The owner at a contract: no [PIOTR].
- Sound files: Piotr's recordings.
- The walk (new sheets or blending): the animated mockup first.
- The website retainer, the second click on Sell, greying the catalogue.

## 9. Art requested (docs/art/REQUESTS-T21.md)

- The sprayer's four sheets; the helper's bench sheet.
- Nothing for the bubbles: they are vector.

End of brief.
