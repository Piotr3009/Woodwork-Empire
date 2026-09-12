# Report: Turn 2

Playability, the balance from the owner, and the moving workshop.

Branch `claude/turn-2-playability-fblsuo`, one commit per task, `npm run check` green before every
commit. 387 tests, all passing. Nothing was pushed to `main`.

---

## 1. Done

**T2-01 Clock.** `REAL_SECONDS_PER_DAY_AT_1X = 480`, so one game minute is one real second at 1x
and a working day is 8 real minutes at 1x, 4 at 2x and 2 at 4x. The loop was audited: `tick` is now
a wrapper over `runMinutes`, which reports how many minutes actually went in, so the UI accumulator
gives back what an open event refused instead of losing it. A day off with nobody in the hall
closes at once and opens the end of day summary. Commit `e6ca322`.

**T2-02 Balance.** Every row of the table in section 3.4. Rent at 12 per m2 a month (720 for 60 m2,
1080 for 90), the deposit as one month of it held in `unit.depositHeld`, overdrafts of 5000 on Hard
and 10000 elsewhere with bankruptcy at twice whatever the limit is, `PAY_ARREARS` from the
Accounting modal with 1% a month interest once the arrears pass a month of fixed costs, the bailiff
taking the cheapest machine first, the software bundle at 150 a month and 3600 for two years, the
express uplift as pure profit with one express enquiry a week, reputation from minus 50 to 100 with
the weights times ten and every gate on the new scale, barely profitable work below minus 25, and
pro rata fatigue. Commit `8531933`.

**T2-03 Materials as sheets.** A sheet is a storage unit worth 200 of material value, so a 10,000
job is 20 sheets. The rack is shelving bought from the catalogue (50 sheets for 400, 75 for 900) and
nothing can be unloaded without it. Every delivery lands on the rack, per job orders included, and
production draws whole sheets pro rata to the labour done. An empty rack stops the job where it
stands, says so once a day, and the wages run anyway. Commit `c931573`.

**T2-04 Finished goods and transport.** A made piece goes to `awaitingTransport` and stands on the
apron beside the gate. Order transport from the job card, the new At the gate list in the laptop,
or the event: a courier is 120 and comes the next working day, the van costs 90 minutes and goes
today. The balance, the late penalty and the rating are all worked out on the day the client gets
it. A fourth piece at the gate runs the hall at 0.7. Commit `e8e44c7`.

**T2-05 Emails and bookkeeping.** Emails belong to the job now, on the same count curve as the
calls, ten minutes each, and they hold the material order up not at all. Unanswered ones at delivery
cost 1% of the price each up to 5%, and multiply the rating gain by 1 less 0.2 each. A working day
that ends without the bookkeeping leaves the books behind: the Accounting modal freezes at the last
day written up, the top bar prints "?", and the 1st brings a charge of 100 per consecutive month.
Commit `846c677`.

**T2-06 Office staff working day.** The office admin, the purchasing clerk and the salesman each
have 480 minutes and work their tasks off through the same runner the owner uses. The clerk stops at
16 orders, unfinished work waits for tomorrow with what was done left in place, and the owner can
take any of it on. The laptop says who is on what and how much of his day is left. Commit `0fb7765`.

**T2-07 Extractor and service.** A broken extractor runs the hall at 0.25 with the dust at 3x
instead of stopping it. With no extraction at all, no machine runs and every job that is not made by
hand waits with the status "no extraction". Machines are serviced every 30 days for half an hour and
2% of their price, take a 2% chance a working day of giving up when overdue, and a broken one stops
everything of its material until a 90 minute repair. Commit `99a77ba`.

**T2-08 Board as tiles.** The board is a full page modal of tiles, three columns at 1280 px and four
at 1600, each with the name, the price as the largest thing on it, the finish, the deadline, the
expiry, the sheets, the owner days, the tools it needs, the express badge and either an Accept
button or the reason it is locked. Commit `15c7faf`.

**T2-09 Start production and stations.** Every job card with material in the hall and nobody on it
carries a Start production button that puts the owner on the job and takes the player to the hall.
Every figure has a station the engine works out: the bench and machine cycle while producing, the
gate, the rack, the office door or idle. Commit `830d4e6`.

**T2-10 Moving figures.** Each figure is one SVG group carrying its position as a transform with a
0.8 s linear CSS transition, drawn at its station's anchor tile. The render puts a moved figure back
where it was and moves it on the next animation frame, which is what makes the transition run at
all. The tooltip names the machine a figure is standing at. Commit `93768b5`.

**T2-11 Hall setup.** A Set up hall button stops the clock and lets the machines, benches and
shelving be dragged on the tile grid. `canPlace` and `MOVE_ITEM` live in the engine and own the
rules; the ghost footprint goes green or red with the reason; Escape drops it and Done gives the
clock back its speed. The layout lives in the state, and a new purchase lands on the first free tile
when its own is taken. Commit `a7ca42f`.

**T2-12 Audit fixes.** The hall and office carry width and height equal to their view box, so one
unit is one screen pixel and no label is scaled; the tile came down to 48 by 24 to make the biggest
hall fit on a 1280 px page. The job name is printed once on every row. One plural helper, in the
engine, re-exported by the UI. Commit `cab2430`.

**T2-13 Why strings.** Twelve real life notes in `engine/constants.ts` as `WHY`, reached from an "i"
text link on the event modal and on the Accounting rows that have one, with a small popover. A
"Show real-life notes" checkbox on the start screen, on by default, and a line in the Menu.
Commit `d30e8b3`.

**T2-14 Scenario tests.** The three Turn 1 scenarios assert the Turn 2 clock and balance, and a
fourth scripted month hires a poor joiner, buys the shelving, works two jobs off one small rack,
runs dry, orders transport ten times and ends with the books behind and the accountant paid.
Commit `1118a7a`.

**T2-16 Persistence (optional).** A Supabase client behind `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, a magic link sign in, autosave into slot 1 at the end of every day, Save
now and Load in the Menu, Continue on the start screen, and `supabase/001_saves.sql` for you to run.
With no env the whole feature is dark and no network call is made. Commit `b60aaa1`.

**T2-15** is the audit pass of section 12, this report and the pull request. Commits `52a4aef` and
this one.

---

## 2. Not done or partial

1. **Nothing was skipped.** Every task T2-01 to T2-16 is built and tested.
2. **Design speed tiers of the software bundle** stay at factor 1.0, because section 3.4 says the
   tiers are still unanswered. Open question 3.
3. **The deposit is never returned.** `unit.depositHeld` is modelled and shown in the Accounting
   modal, and nothing gives it back, exactly as 3.4 asks. Moving unit is parked.
4. **Machine endurance in hours** is parked by 3.9, so a machine breaks down only from a service it
   never had, not from the hours it has run.
5. **The extractor and the central dust system are not serviced.** 3.9 says "each machine", and the
   extractor already has its own breakdown model from Turn 1 (dust driven), so servicing covers the
   `machine` category only. Open question 8.

---

## 3. Tests

387 tests in 24 files, about 7 seconds. `npm test`, or `npm run check` for the whole gate.

| File | Tests |
|---|---|
| tests/engine/jobs.test.ts | 37 |
| tests/engine/economy.test.ts | 36 |
| tests/engine/machines.test.ts | 33 |
| tests/ui/app.test.ts | 29 |
| tests/render/views.test.ts | 28 |
| tests/engine/materials.test.ts | 27 |
| tests/engine/game.test.ts | 23 |
| tests/engine/board.test.ts | 21 |
| tests/engine/staff.test.ts | 21 |
| tests/engine/tasks.test.ts | 17 |
| tests/scenarios/thirtyDays.test.ts | 16 |
| tests/engine/catalog.test.ts | 13 |
| tests/engine/owner.test.ts | 13 |
| tests/engine/rng.test.ts | 13 |
| tests/engine/clock.test.ts | 12 |
| tests/render/iso.test.ts | 11 |
| tests/engine/stations.test.ts | 8 |
| tests/engine/layout.test.ts | 7 |
| tests/engine/types.test.ts | 6 |
| tests/ui/cloud.test.ts | 6 |
| tests/render/sizing.test.ts | 4 |
| tests/engine/why.test.ts | 3 |
| tests/engine/text.test.ts | 2 |
| tests/engine/scaffold.test.ts | 1 |

Turn 1 ended on 279. Turn 2 adds 108 and rewrote a good number of the old ones onto the new numbers.
Seven of the additions come from the audit of section 12, one per defect that could be pinned down in
a test.

---

## 4. How to run

```
npm ci
npm run dev      # http://localhost:5173, desktop, 1280 px wide minimum
npm test
npm run check    # lint, type check, production build, tests
```

The first ten minutes are written out in `README.md` and driven by `tests/ui/app.test.ts`.

Saving needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the build, and
`supabase/001_saves.sql` run in the Supabase SQL editor first. Without the env the game is exactly
what it was, with no Sign in and no Save anywhere. The Vercel build has no env and still deploys.

---

## 5. Deviations from CLAUDE.md

1. **Branch name.** Section 4 asks for `turn-2-playability` from `main`. The session brief asked for
   `claude/turn-2-playability-fblsuo` and said never to push to a different branch, so that is the
   branch. Nothing was pushed to `main`.
2. **`docs/turn-1-brief.md` is `turn-1-brief.md`.** The Turn 2 brief points at `docs/`, but the file
   is in the repository root. It was read from where it is, and nothing in it was edited.
3. **Three new engine files.** `stations.ts` (where a figure is standing), `layout.ts` (what may
   stand where on the floor) and `text.ts` (the one plural). The Turn 1 tree in section 4 does not
   list them; each is one small pure module with one job, which is the shape that tree asks for.
4. **`src/cloud/` is new**, for T2-16. Section 3.14 asks for the feature and does not say where it
   lives; it is kept out of `engine`, `render` and `ui` because it is the only part of the game that
   touches the network.
5. **The day off rule is on the action, not on the clock.** 3.1 says a day off with nobody in the
   hall jumps to the next morning. `SKIP_DAY` does that. Going home early with `END_DAY` and an
   empty hall still runs the clock to 16:00, as it did in Turn 1. Open question 1.
6. **Reputation tier 2 starts at 20, not above 20.** 3.4 says "0 to 20" then "above 20"; the
   threshold list reads 20 as the start of the top band, so the middle band is 0 up to but not
   including 20. One boundary point, named here rather than guessed at silently.
7. **The low stock alarm fires in the morning, not the moment the rack drops.** 3.6 asks for a
   one-time event per week. Raising it mid-day stopped the clock in the middle of a job of work, so
   it is checked at the start of the day, and only when there is a job on the books. The persistent
   line under the hall carries the live figure, which is the part that is always true.
8. **The laughing event fires once a day, not once.** 3.6 says "a once-per-day event", and the
   scripted month of T2-14 gets it on 9 of its 23 working days. That is what two jobs off one small
   rack does, not a bug.
9. **`waitingForMaterial` became `blockedBy`.** 3.6 asks for the status "waiting for material" and
   3.9 asks for "no extraction". One string field on the job says why it is standing still, rather
   than a flag per reason.
10. **One repair path, not two.** Turn 1 had `repairExtractor`; 3.9 adds a repair for every other
    machine. There is one `repair` task kind and one `REPAIR_MACHINE` action. The extractor keeps
    its Turn 1 parts bill of 150 and every other machine is 5% of its price, which is the only place
    the cost branches.
11. **`extractorBroken` became `machineBroken`.** Same reason: one event kind for anything in the
    hall that stops.
12. **The Set up hall mode is UI state, not engine state.** The engine owns `canPlace` and
    `MOVE_ITEM`; whether the player is currently dragging is a view concern. Entering the mode sets
    the speed to 0 through the ordinary action and Done puts the old speed back.
13. **The board keeps its filter field.** 3.2 lists what a tile carries and does not mention the
    filter. Removing a working control that rule 3.10 of Turn 1 asked for would be a regression, so
    it stayed, with its clear cross.
14. **The job card carries the assign chips and the accent button together.** 3.3 says Start
    production is the single accent button of the card. The 9.4 override (put a named joiner on the
    job) is chips, not buttons, so both fit on the card without breaking the accent rule.
15. **Probabilistic tests run over four seeds.** Two Turn 1 tests (somebody gets hurt, the extractor
    gives up) passed on the luck of one seed and broke the moment the random stream moved. They now
    run four seeds and ask that it happened somewhere in them.

---

## 6. Duplicate paths

"How many code paths do the same job?" One. What tonight found and removed, or deliberately did not
create:

1. **The plural** existed twice by the end of T2-03: once in `ui/modal.ts` and once in the engine
   event copy. `engine/text.ts` has the only one, and `ui/modal.ts` re-exports it.
2. **Repairing a machine** was about to be two paths (the Turn 1 extractor repair and a new machine
   repair). It is one task kind, one action, one completion, and one cost function.
3. **Breaking a machine** likewise: `breakExtractor` for the dust roll and `breakMachine` for the
   overdue roll both end in `raiseMachineBroken`.
4. **Ordering transport** is reachable from the job card, the At the gate list and the event, and
   all three go through `orderTransport` in the engine. With a van they all raise the same question
   of whose 90 minutes it is, so there is one path from the finished piece to the man who drives it.
5. **Start production** is the same action as the hall's Work here: `WORK_HERE`.
6. **Paying arrears** is one function with one action; the typed amount and Pay all differ only in
   the argument.
7. **Consuming sheets** is one function, `drawSheetsFor`, called from the one place a minute of
   production is worked, for the owner and for every joiner.
8. **Why a job is standing still** is one field and one function, `hallBlock` plus `materialReady`
   inside `canWorkOn`, rather than a check scattered through the production loop.
9. **Staff clearing a task** stayed one function: `assignStaffTasks` decides who takes it, and the
   office roles then work it off through the same `advanceTask` the owner uses.
10. **The station of a figure** is derived once per settle in `updateStations`, not written from the
    six places that could change it.
11. **The catalogue anchor** and the setup drop both ask `canPlaceSpec`.
12. **Who can be sent at a job of work** is one function, `adHocChoices`. The bag change, the
    service, the repair and the van run all offer the same people, and only the people who are
    actually in the hall today.
13. **Leaving setup mode** starts the clock again in one place, `endSetup`, whether the player
    presses Done or walks off to the office.

One split is deliberate and named here: a helper still clears his workshop jobs on the spot, while
the three office roles work theirs off minute by minute. 3.8 gives the working day to the office
roles only, so that is what was built. Open question 6.

---

## 7. Line balance

| Task | Commit | Files | Added | Removed |
|---|---|---|---|---|
| T2-01 | `e6ca322` | 8 | 156 | 24 |
| T2-02 | `8531933` | 31 | 659 | 213 |
| T2-03 | `c931573` | 19 | 407 | 99 |
| T2-04 | `e8e44c7` | 15 | 381 | 38 |
| T2-05 | `846c677` | 19 | 371 | 38 |
| T2-06 | `0fb7765` | 13 | 265 | 20 |
| T2-07 | `99a77ba` | 18 | 480 | 91 |
| T2-08 | `15c7faf` | 8 | 213 | 34 |
| T2-09 | `830d4e6` | 16 | 334 | 1 |
| T2-10 | `93768b5` | 6 | 203 | 20 |
| T2-11 | `a7ca42f` | 10 | 480 | 8 |
| T2-12 | `cab2430` | 15 | 157 | 37 |
| T2-13 | `d30e8b3` | 16 | 309 | 18 |
| T2-14 | `1118a7a` | 3 | 128 | 10 |
| T2-16 | `b60aaa1` | 11 | 517 | 2 |
| T2-15 audit | `52a4aef` | 24 | 478 | 120 |

`src/` is about 8,700 lines, `tests/` about 6,050.

---

## 8. Open questions for Piotr

Numbered so you can answer with numbers.

1. Going home early with nobody else in the hall still runs the clock to 16:00. A day off jumps
   straight to the morning, as you asked. Should going home early, and a sick day with no staff, do
   the same jump?
2. The overdraft on Easy and Very easy is 10000 and on Hard it is 5000. Your answer was clear for
   Hard and not for the other two. Is 10000 right for both, or should Very easy be higher?
3. The software is the bundle now: 150 a month, or 3600 once for two years with the 30 job limit
   from Turn 1. The one off is worth it only if you take more than 24 months to use 30 jobs, which
   nobody will, so the subscription wins every time. Should the one off drop the 30 job limit, or
   should it be cheaper?
4. Arrears interest is 1% a month once the arrears pass one month of fixed costs, which on the
   standard unit is about 5,600. Is that the right line for "large arrears"?
5. The low reputation band is minus 25 and the price cut is 0.85. Both are guesses. Where does work
   start getting bad, and how bad?
6. A helper still clears a bag change, an unload or the Friday clean on the spot, for his wage. The
   office roles now have their own 480 minutes. Should a helper have a working day too?
7. A courier is 120 and the van costs 90 minutes of somebody. Are those about right for a piece of
   furniture going across a town?
8. A service is 2% of the machine price and 30 minutes, and an overdue machine has a 2% chance a
   working day of breaking. Does the extractor want servicing as well, and should the central dust
   system?
9. The rack is 50 sheets for 400 or 75 for 900. A 10,000 kitchen is 20 sheets, so 50 holds two and
   a half of them. Is a 50 sheet rack about right for a 60 m2 unit?
10. The scripted month of T2-14, run two jobs at a time off a 12 sheet rack, runs dry on 9 working
    days out of 23. That reads right to me for a workshop with no buffer. Is standing idle that
    often what you meant, or should material arrive faster?
11. Late accounts cost 100 per consecutive month behind, and the books can be caught up in one
    60 minute task however far behind they are. Should catching up 3 months cost 3 hours instead?
12. The production cycle is 15 minutes at the bench, 5 at the saw, 15 at the bench, 5 at the
    edgebander. It is a guess to make the square move. What does the real rhythm look like?
13. The gate holds 3 finished pieces before everything slows to 0.7. Is 3 the right number for a
    60 m2 unit?
14. Emails are 10 minutes each and there are 2 to 4 a job, so a 900 bookcase carries 20 minutes of
    email. Too little, about right, or too much?
15. The figures slide over 0.8 seconds. At 4x that is more than three game minutes of walking. Do
    you want it faster?
16. Reputation runs minus 50 to 100 and a clean job is plus 3, so a company reaches the top band of
    20 after about seven good jobs. Is that too quick?
17. The board tiles say "about 2.1 owner days". That is the owner alone, not the crew. Should it
    say what the crew you have would take instead?
18. The deposit shows in Accounting as money the landlord is holding. Nothing gives it back because
    moving unit is parked. Is a "move unit" decision something you want next?
19. Buying sheets in advance is 170 a sheet against 200 of value, and two jobs can both be told to
    draw from a rack that only holds enough for one. The second one stalls. Is that the behaviour
    you want, or should the sheets be reserved when the order is placed?

---

## 9. Known risks

1. **The balance has not been played.** Every number of section 3.4 is in, and the only evidence it
   plays well is the four scripted months. The Easy month now ends on about 10,500 in the bank and a
   reputation of 24, which is a much easier game than Turn 1.
2. **The express cap makes express rare.** One a week, and a chance that starts at 0.10, means a new
   company may go a month without seeing one. The mechanic is in and hardly exercised.
3. **The low stock alarm is noisy for a company that orders per job.** The rack is empty most of the
   time by design, so the weekly nag fires most weeks. Open question 10.
4. **The 0.8 s slide is the one place the UI is not purely a function of the state.** The whole view
   is rebuilt from the state, so each figure's walk is remembered outside the state, in a map keyed
   by the figure, and put back on the new node after every rebuild along with what is left of the
   0.8 s. It works at every speed and it is about 60 lines, but it is state the engine knows nothing
   about.
5. **Drag and drop is mouse only** and has no test that drives a real drag: the engine rules are
   tested hard, the pointer handling is not. There is no touch support and none is wanted yet.
6. **Saving is untested against a real Supabase.** The SQL has not been run and the client has never
   spoken to a server: the tests only prove that with no env the feature is dark and every call
   answers with a line. Run `supabase/001_saves.sql` before trusting the Save button.
7. **`npm audit` reports five vulnerabilities**, all in the Vite and Vitest dev dependency tree and
   all inherited from Turn 1. Fixing them means a major version bump of both, which is not a thing to
   do in the same night as a design turn.
8. **The service roll can stack.** Buy five machines on day 1 and they all fall due on day 31, so
   day 31 opens with five events. It is correct and it is a lot of clicking.
9. **`state_version` is still 1.** Turn 2 changed the shape of `GameState` in a dozen places, so any
   save written by a Turn 1 build would load and be wrong. Nothing has ever saved, so nothing is
   broken today, but the version wants bumping the first time a real save exists.

---

## 10. Constants retagged

Every `[TUNE]` that became `[PIOTR]` tonight, and the new `[PIOTR]` numbers that arrived with them.

| Constant | Was | Now |
|---|---|---|
| `REAL_SECONDS_PER_DAY_AT_1X` | 180, PIOTR "maybe 4 or 5" | 480, PIOTR |
| `RENT_PER_M2_MONTHLY` | did not exist, rent was 1200 [TUNE] | 12, PIOTR |
| `UNIT_RENT_MONTHLY` | 1200 [TUNE] | 720, derived from the PIOTR rate |
| `unitDepositFor` | `UNIT_DEPOSIT` 2400 [TUNE] | one month of rent, PIOTR |
| Hard `overdraftLimit` | minus 10000 [TUNE] | minus 5000, PIOTR |
| `ARREARS_MONTHLY_INTEREST` | did not exist | 0.01, PIOTR |
| `BAILIFF` target | dearest machine [TUNE reading] | cheapest machine, PIOTR |
| `SOFTWARE_SUBSCRIPTION_MONTHLY` | 60 [TUNE] | 150, PIOTR |
| `SOFTWARE_ONE_OFF_PRICE` | 900 [TUNE] | 3600, PIOTR (two years of the subscription) |
| `EXPRESS_MAX_PER_WEEK` | did not exist | 1, PIOTR |
| Express material and labour | from the uplifted price | from the base price, PIOTR |
| `REPUTATION_MIN` / `REPUTATION_MAX` | minus 5 to 5 [TUNE] | minus 50 to 100, PIOTR |
| `RATING_ON_TIME` | 0.3 [TUNE] | 3, PIOTR |
| `RATING_EXPRESS_ON_TIME` | 0.5 [TUNE] | 5, PIOTR |
| `RATING_PER_DAY_LATE` | minus 0.1 [TUNE] | minus 1, PIOTR |
| `REPUTATION_TIERS` | 0, 1, 2 [TUNE] | minus 50, 0, 20, PIOTR |
| Template `minReputation` | 0 to 1.5 [TUNE] | minus 50 to 20, PIOTR |
| Hiring `minReputation` | 0 to 2.5 [TUNE] | minus 50 to 40, PIOTR |
| `FATIGUE_PER_OVERTIME_HOUR` | whole hours only | pro rata, PIOTR |
| `SHEET_VALUE` | `SHEET_PRICE` 80 [TUNE] | 200, PIOTR |
| `LOW_STOCK_FRACTION` | did not exist | 0.1, PIOTR |
| `GATE_CROWD_LIMIT` / `GATE_CROWD_FACTOR` | did not exist | 3 and 0.7, PIOTR |
| `EXTRACTOR_BROKEN_OUTPUT_FACTOR` | hall stopped dead | 0.25, PIOTR |
| `SERVICE_INTERVAL_DAYS` / `SERVICE_MINUTES` | did not exist | 30 and 30, PIOTR |
| `EMAIL_PAYMENT_PENALTY` / `_MAX` | did not exist | 0.01 and 0.05, PIOTR |
| `EMAIL_RATING_PENALTY` | did not exist | 0.2, PIOTR |
| `LATE_ACCOUNTS_CHARGE` | did not exist | 100, PIOTR |

Still `[TUNE]`, and named so you can replace them: the rack prices (400 and 900), the courier (120)
and the van's 90 minutes, the email minutes (10), the service cost fraction (2%), the overdue
breakdown chance (2%), the repair minutes (90) and the machine repair fraction (5%), the arrears
interest threshold (one month of fixed costs), the low reputation band (minus 25) and its factor
(0.85), the express probability mapping, the gate lane depth (2 tiles), the production cycle
(15/5/15/5), the figure slide (0.8 s), business rates (450) and everything Turn 1 already tagged.

---

## 11. Parked, as section 6 asks

1. Second shift for staff.
2. Cleaner as a paid role, and hall cleanliness affecting the canteen and the WC.
3. Machine endurance hours, and service costs per machine value.
4. An empty board at low reputation.
5. Design speed tiers of the software bundle.
6. Changing unit, returning the deposit, and better locations at 15 to 20 per m2.
7. A rack above 75 sheets.
8. Dust from deliveries left in the yard.
9. Everything parked in the Turn 1 brief section 14 that is not in the list above as done tonight:
   unloading as its own view, the CEO, designers as staff, forced holidays, risky clients,
   interrupting client calls, van logistics to the client's site, veneer and lacquer, a real
   calendar, branching specialisations, and the monetisation model.

---

## 12. The audit pass, and what it fixed

Before the pull request the whole turn was reviewed against itself: six readers, each given one
dimension of CLAUDE.md and the diff, and every finding they raised handed to independent agents
whose job was to refute it. Fifty findings were raised. Twenty eight survived refutation and were
checked by hand against the code. Twenty one of those were distinct defects, and all twenty one are
fixed in commit `52a4aef`. The rest were duplicates of each other.

Nothing in the design changed. Everything below is the design of section 3 of CLAUDE.md doing what
it says it does.

**The engine**

1. **The owner's minute was spent twice.** On the minute a laptop task finished, `runMinute` spent
   the minute on the task and `runProductionMinute` then found him free and spent it again at the
   bench. A day was worth up to one extra minute per task. He is now known to be on a task for the
   whole of that minute.
2. **The bailiff could take the extraction.** He picked the cheapest of the powered machines, and the
   extractor is powered and cheap. Without extraction no machine runs at all, so a company three
   months in arrears lost its whole hall in one visit. He takes machines only.
3. **The bailiff left tasks pointing at nothing.** An open service or repair on the seized machine
   stayed on the list and could hold the owner on a task that could never finish. Those tasks go
   with the machine.
4. **A refused start still stole the task.** `startTask` released whoever was holding a task before
   it checked whether the owner could take it, so a refusal left the task with nobody on it.
5. **Servicing repaired a broken machine for free.** `serviceMachine` cleared `broken`, so the 30
   minute service did the 90 minute repair's job. It only resets the service clock now.
6. **The weekly express cap capped nothing.** `expressAllowed` compared against a literal rather
   than `EXPRESS_MAX_PER_WEEK`. Section 3.4 says at most one a week, and now it is one a week.
7. **End day twice burned a day.** A second click queued a second end of day summary, and answering
   both walked the clock two days on. One summary per day, however many times it is pressed.
8. **The van run could only be done by the owner.** The `deliver` task named a joiner and a helper as
   eligible, and nothing ever read that list: `ORDER_TRANSPORT` put the owner on it directly. It is a
   question now, with the same choices as a bag change, and a joiner can be sent.
9. **A man who is not in the hall was still offered.** Every "send a joiner" choice counted joiners
   on the books rather than joiners in today, so sending one who had not started yet, or who was off
   hurt, did nothing at all and left the machine stopped.

**The screen**

10. **The cross on a desk modal answered the question behind it.** Shutting the accounting while an
    event was waiting resolved the event and left the accounting open, which is the opposite of what
    was clicked. The cross resolves an event only when it is the event's own cross.
11. **A piece already in the van still offered Order transport.** Only the courier's booked day was
    checked, not the open van task.
12. **Yesterday's office tasks stayed on today's desk.** Finished job emails and calls piled up in
    "Office tasks today" for the life of the game.
13. **The ledger printed the engine's keys.** "unitDeposit", "jobBalance" and the rest were shown to
    the player. Rule 3 of CLAUDE.md says a constant is never printed at the player; neither is a key.
    There is a plain English name for all twenty two categories.
14. **A broken machine always offered the extraction note.** The real life note for a broken table
    saw is the service note, not the extraction one.
15. **Dragging the kit made it jump.** The item was moved so its corner landed under the mouse
    instead of keeping the grip it was picked up by, and a click that never moved still dispatched a
    move.
16. **Leaving setup mode started the clock from two places.** `endSetup` did half of it and the
    click handler the other half, so walking off to the office left the clock stopped.
17. **The real life popover was clamped to 1280 px** whatever the window was, so it could fall off a
    narrow one.
18. **The figures stopped sliding above 1x.** The view is rebuilt every time the engine runs, and the
    rebuild threw away the CSS transition part way through. At 4x a square jumped after a quarter of
    its walk. The walk is now remembered across rebuilds, with the remaining time set on the node,
    so the slide is 0.8 s at every speed. This is the one thing Piotr asked for by name and it was
    only working at 1x.
19. **Five places printed "1 sheets".** The delivery label in the hall, the unload task, tomorrow's
    deliveries in the day end, "off for 1 more days" on the team board and "about 1 owner days" on a
    board tile. They all go through the one plural helper now.

**The tests**

20. **A breakdown test passed on the wrong machine.** It counted any `machineBroken` event, including
    the extractor's own dust breakdown, so it would have passed with the overdue roll switched off.
21. **A software test proved nothing.** It asserted that the one off price equalled the subscription
    times twenty four, which is true of any pair of numbers in that ratio. It asserts 150 and 3600,
    which is what section 3.4 says.

What the audit raised and was refuted, and is therefore not in this list: findings about the clock
accumulator, the sheet draw, the reputation clamp and the rating curve were all checked and the code
was right. Two findings were about the brief rather than the code and are open questions 8 and 10.
