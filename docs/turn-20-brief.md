# Turn 20: contracts that pay, people you can run

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud, agent
teams expected). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 18.09.2026, from
Piotr playing v27 and v28 and two days of talk (Petros: software/woodwork-empire, STAN T20, the
rules of 18.09 and the v28 patch).

Read this whole file (first line must say "Turn 20"; if the root CLAUDE.md does not, stop and
report), then REPORT-T19.md in full (its last two sections are the v28 patch and the helper's
sheets), then docs/mockups/t20/README.md and open contracts-tab.html in a browser, then
docs/art/SPRITES.md sections 9 and 10, then the archived briefs in docs/. Where files disagree,
this one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one code path,
constants never in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill
background processes, PR without merge, end the session, no PR watching, npm run check gated on
its own exit code, every click single, one APP_VERSION bump).

Precondition. main carries v28 (the chat patch of 18.09): APP_VERSION 'v28', STATE_VERSION 16,
`src/ui/jobCard.ts` has `assignMove`, and `public/sprites/character.helper.walk.sheet.png`
exists. If APP_VERSION is not 'v28', stop and report.

## 0. What this turn is for (Piotr, 17.09 and 18.09)

Two days of playing v27 and v28 gave Piotr one conclusion about the money and one about the
people. The money: **every standing contract is a loss by definition** (a piece pays 8 to 11
pounds an hour against a joiner's 14, before anything else), so the Contracts tab he drew with
Claude shows the result before he takes one, for the man he would put on it, and the prices are
set so that a contract pays a little by hand and well with machines. The people: he cannot let a
man go, the tiers are called "poor", the estimator does five a day when the owner does sixteen,
pay is by the week for some and by the month for others, and the helper stands beside the dirt.

Three rules were set on 18.09 and they bind this brief: **nothing visual or moving is built
without a mockup** (the one in docs/mockups/t20 is the only one this turn has, so nothing else
here changes the look beyond what a section states line by line); **no sound plays without a
recorded file Piotr has heard** (there are none yet, so the synthesised stand ins of Turn 19 go
and the hall is silent until the files land); and **every modal, popover and list has the cross,
Escape and click outside**, checked by a test.

## 1. Rules restated (short)

Everything from Turns 1 to 19 and the v28 patch. Tonight in addition:

- APP_VERSION = 'v29'. STATE_VERSION bumps to 17 in phase A, once, for section 4's fields; every
  v28 save loads.
- The work of a job with several men on it stays a plain division: n men take 1/n of the time,
  the machine stage takes one man at the machine [PIOTR, 18.09: "leave it, we change nothing"].
  No crowding factor, no limit.
- Output, Efficiency and the workshop rate are untouched. Section 2.3 only takes a man off a
  list he should not be on.
- Nothing new is drawn. Where a section needs a picture it does not have (the sprayer, the helper
  at a bench), the fallback rule of Turn 19 stands and the request goes to
  docs/art/REQUESTS-T20.md.
- **One game, one look** [PIOTR, 18.09: "the whole look is not coherent"]. Before any agent
  builds or changes a screen it reads what the game already has and uses it, never a new
  version of it: the three modal skins and every helper in `src/ui/modal.ts` (`closeButton`,
  `button`, `primaryButton`, `lockedButton`, `money`, `minutes`), the tokens and classes of
  `src/ui/styles.css` (no new colour, font, radius or shadow; a new class only when no existing
  one does the job, and then named and placed beside its family), the chips of the top bar, the
  tabs of the laptop, the cards of the Company board, the rows of the Work Plan and Our team.
  Phase A writes `docs/ui-style.md` from the code as it is (the skins, the tokens, the buttons,
  the chips, the cross, the fonts, the two figure sizes, with the CSS class of each), every
  phase B agent reads it before its first UI commit, and phase C puts every new or changed
  screen's picture beside the closest existing screen in the report and says what differs; any
  difference that is not in this brief is a bug to fix before the PR.

## 2. Changes to the design (the contract)

### The money

**2.1 The Contracts tab [PIOTR; docs/mockups/t20/contracts-tab.html].** The Work Plan modal gets
two tabs, `Jobs` and `Contracts`, the folder's tabs as the laptop draws them; Jobs is what the
modal is today minus the contract bar (2.1.5). Contracts is the drawing, section by section:

1. **On offer.** Every contract on the board (`offeredContract`, and the Orders page keeps its
   copy) as a card: name, quantity a week, term in weeks, price a piece, minutes a piece by hand.
   A row of **who would do it**: the owner and every joiner on the books, each with his tier and
   his minutes a piece at his rate with the machines the hall has (`contractPiece` minutes over
   his rate, the stage's machine speed applied); one is selected (the first joiner, or the owner
   with none) and every figure on the card is computed for him: price a piece, material a piece
   (from stock, at the stock price), his labour a piece (his minutes at his wage a minute, the
   `workerMinuteCost` of the job card), margin a piece; pieces he makes in a day (his working
   minutes over his minutes a piece, whole, the lunch break out) against pieces needed a day;
   days of his week the contract takes; **the week's result: pieces × margin, less his wages for
   the days it takes** (the same wages the job card counts; the owner's days cost his draw); the
   term's result (weeks × week). His day as the drawing: a track 8:00 to 17:00, one block per
   piece, the lunch block, the free time at the end labelled "N min left at the end". A second
   track for the next best man "for comparison" when there are two or more. The tip under the
   figures names the one machine that would shorten the piece most among those the hall lacks
   (`the CNC: 20 min a piece, 24 a day, +£880 a week` computed, not typed). Buttons: `Take it,
   <name> on it` (accepts and assigns in one click) and `Decline`.
2. **Running.** Every active contract: the chips and the `Assign to this contract` button of v28
   (the same list, the same cross), the week live (`41 of 60, on course` in green, `short` in
   red when the week's pace will not reach the quantity), margin a piece with the men on it, the
   week so far, the term so far, weeks delivered in full, and the man's day track: his pieces
   first, then, in amber, the minutes that go to the job he is also on, labelled with its name.
   `End the contract` with its reason (`free after week 4` from `CONTRACT_FREE_END_DAYS`).
   **Assigned once, a man stays on it until he is taken off or leaves** (the engine already does
   this: `contract.assigned` persists; the tab must never ask again).
3. **Ended.** The closing report as `closingReport` gives it, greyed.
4. **The contract fills the day first** [PIOTR]: a man on a contract books his pieces from 8:00
   until the day's quantity is met (the week's quantity spread over the days left in the week),
   and only then goes to the job he is also on. The engine's minute loop orders his work that
   way; the tab's track and the hall agree.
5. **The contract bar of v28 leaves the Jobs tab.** Its chips and button moved into Running.
6. **The short week** [TUNE, Piotr's decision still open]: the first short week costs 1 point of
   reputation as today; a second short week in the same term and the client ends the contract
   himself with a closing report marked `ended by the client`. No third.

Done: the engine tests (the week's result for a poor, a normal and a super joiner on the cut
sheet pack differ as their rates do; the day fills contract first and job second; the client
ends on the second short week), the tab's render tests (a card per offer with the selected man's
figures, the track's block count equals pieces a day, Running shows the amber job minutes) and
the app test (Take it assigns; the list has the cross).

**2.2 Prices that pay [PIOTR: "a contract is worse than a job, better than the wage, and rewards
machines"].** `CONTRACT_PIECES` becomes:

| Piece | Stages | Minutes by hand | Material | Price | Margin a piece by hand | An hour, normal joiner |
|---|---|---|---|---|---|---|
| Cut sheet pack | cutting | 45 | 30 | 50 | 20 | 27 |
| Drawer box | cutting, assembly | 60 | 26 | 52 | 26 | 26 |
| Wardrobe front | cutting, finishing (lacquer) | 240 | 60 | 160 | 100 | 25 |

By hand, every piece lands near 25 pounds an hour of margin (between the joiner's wage of about
14 and a job's 40); with a CNC on the cutting stage and an edgebander or a spray booth on the
rest, the same pieces reach 40 to 60. The wardrobe front is four hours of work, not three days.
`sheets` per piece stays what it is. Done: a test that prints the three margins an hour by hand
and asserts each is between 22 and 30 [TUNE].

**2.3 The estimator [PIOTR].** Three things:

1. **He does as many as his minutes allow, not five.** `ESTIMATOR_JOBS_PER_DAY` goes. A material
   take off is `MATERIAL_TAKE_OFF_MINUTES` 30 [PIOTR: "when I did it, it took 30 minutes"] of his
   day at his rate (a no experience estimator takes 37, an excellent one 21), and Joinery Core
   halves the minutes (`JOINERY_CORE_TAKE_OFF_FACTOR` 0.5 [TUNE]) with each extension taking a
   further quarter off [TUNE], so a normal estimator does 16 a day bare and 32 with the software.
   The owner without an estimator does the same 30 minutes each, as today.
2. **He goes on site measures** when there is no owner free for it: `siteMeasure` gains
   `estimator` (and `salesman`) in `eligibleRoles` and the estimator in `autoRoles`, with the
   day's travel minutes charged to him instead of the owner.
3. **He is not in the Output list.** The Company board's "act where they are" rows list only men
   who produce (joiners, sprayers, the owner); an estimator, an admin, a draftsman, a clerk or a
   salesman is not a production rate and does not appear there.

Done: the tests (16 and 32 a day for a normal estimator; a no experience one fewer; the site
measure lands on him when the owner is at the bench; the board's rows).

### The people

**2.4 Let go [PIOTR: "how do I fire people?"].** Our team gets `Let go` on every worker's row
(never on the owner). One click: the man works out **one week's notice** [TUNE, Piotr's decision
open: a week's wage] and leaves at the end of it; he is paid for the week; the row reads `leaves
on <date>`; his jobs and contracts drop him the morning he goes and the plan shows them with
nobody on it. Letting go costs no reputation. The hiring gate (T17 2.11) and the crew limit
(T17 3.10) count him until he has gone. Done: the tests.

**2.5 Four tiers, and no "poor" [PIOTR].** `WorkerTier` becomes `'novice' | 'experienced' |
'senior' | 'master'`, and the words the game prints are **no experience, experienced, super
experienced, extremely experienced** (one `TIER_WORDS` table, used everywhere a tier is printed:
hire cards, Our team, the assign lists, the Company board, the reports). Rates 0.8 / 1.0 / 1.2 /
1.4 for every role that has a rate [PIOTR: 0.8 and the top at 120% over him, which is 1.2 of the
owner's 1.0; 1.4 is the extremely experienced man's step above that, TUNE]. Pay a week per tier
for a joiner: 450 / 600 / 800 / 1,000 [PIOTR: 1,000 for the top; the rest TUNE]; the other roles'
tiers scale the same way from their experienced pay. **Who applies depends on reputation**
[PIOTR]: the hire card offers only tiers the workshop's reputation earns: no experience always,
experienced from 15, super experienced from 35, extremely experienced from 60 [TUNE except the
60]; the card says what is missing (`extremely experienced joiners come from reputation 60`).
Migration: poor to novice, normal to experienced, super to senior; nobody is a master on a v28
save. Every test that read `poor`, `normal` or `super` reads the new ids. Done: the tests.

**2.6 Pay by the week, everybody [PIOTR: "one unit"; Claude: the week].** Every role is paid by
the week, on Friday, as joiners are today: the sprayer, the estimator, the admin, the clerk, the
draftsman, the salesman, the production manager. `monthlyWage` goes; `weeklyWage` is the one
field; `WEEKS_PER_MONTH` converts wherever a month is asked for (the month end's salary line, the
hiring gate of T17 2.11 which stays "a month's pay in the bank" computed as 4.33 weeks, the
Company board's per man rate, the insurance's per employee premium). The hire card and Our team
print `£600 a week (about £2,600 a month)`. Migration: every worker's `weeklyWage` from his
`monthlyWage / WEEKS_PER_MONTH` where the weekly is zero. Done: the tests (a sprayer's wage
appears in Friday's payroll; the month end's salary line equals the four or five Fridays).

**2.7 Our team, the week [PIOTR].** Every row of Our team gets a second line for this week and
last: hours worked, the split (jobs, contracts, unloading, cleaning, desk, site), pieces made on
contracts, jobs he was on, and his efficiency (his rate × his production minutes over his paid
minutes, one figure a week, `dayStats` already carries the minutes by category). The owner's row
too. Done: a test that the split adds up to his hours and the figure follows the minutes.

### The hall

**2.8 The helper, again [PIOTR: "Dave stands and does not sweep; I see the dirt"].** The engine
creates his cleaning task the moment the hall leaves clean (`runHelperClean`, T17) and he takes it
when it exists, and still Piotr sees him idle beside a dirty hall. This is a diagnosis first:
write into the report why (the likely causes, in order: the task is created but a delivery or
the bags take him first and the cleaning waits behind a task that never ends; `helperOnDuty` is
false because his day has not started or he is "off"; the dust band Piotr calls dirt is below
`HELPER_CLEAN_DUST_BAND`; the task is created for the owner's queue and not his), reproduce it in
a scenario (a helper on the books, a hall that dirties at 10:00 with a delivery in the yard) and
fix the cause, then two more things:

1. **The bags are his too**: `bagChange` gains him as an autoRole, so a full store is emptied by
   him without the chip asking the owner (the chip reads `Dave is emptying the bags`).
2. **He sweeps with a broom**: a new `sweep` animation in `ANIMATIONS`, played at the cleaning
   station (`animationForStation('cleaning')` returns `sweep`), with the fallback rule for a role
   without a sweep sheet (the joiner and the owner fall to `bench`). The helper's sweep sheet is
   delivered (v28).

Done: the scenario, green; the animation test.

**2.9 Machines: the inventory and the service [PIOTR].** A new laptop page **Machines** (under
the Equipment group): one row per machine or extractor standing in the hall: its picture (the
sprite's own cell, small), name and class, and a green bar of life: hours used against hours of
life, the number `2,140 of 3,600 h` under it, red when under a tenth is left; `Service` with its
price on the row; a `broken` or `in service` label when it is. The service rule replaces Turn 8's
30 minutes at 2%:

1. A service **extends the machine's life by half of its original life the first time**, and
   each next service by half of the previous extension (50%, 25%, 12.5% ... of the original
   life), `serviceCount` on the item; the bar's total grows with it.
2. It costs **a tenth of the machine's value** (`SERVICE_COST_FRACTION` 0.10) [PIOTR], paid when
   called.
3. The machine is **out for one working day** from the call [PIOTR]: `inServiceUntilDay`; nothing
   runs on it, its stage falls back the way a broken machine's does, and the chip under the hall
   says so. The first service is out for the day too [TUNE, Piotr's decision open].
4. At the end of its life a machine does not vanish: it keeps running with the breakdown chance
   of Turn 8 rising every week past the end [TUNE: doubling], and the row says `past its life`.
   The player sells it or lets it break [TUNE, Piotr's decision open: not scrap].

Done: the engine tests (three services extend by 50, 25 and 12.5 percent; the cost is a tenth;
the day off; the past life chance) and the page's test.

**2.10 The rack can be sold [PIOTR].** `isSellableFamily` accepts `storage`; the rack cannot be
sold while it holds sheets (the reason on the button: `Empty it first, 24 sheets on it`) or while
somebody is at it. Done: its test.

**2.11 A figure is painted where his feet are [REPORT-T19: not done].** The depth key of a
figure is computed from the walker's current cell every frame, not from the station he is
walking to, so a man walking past a saw is drawn in front of it when his feet are in front of it
and behind it when they are behind; the re-sort is the cheap one Turn 19's report proposed
(swap the figure's node among its siblings when its depth key crosses a neighbour's). Done: a
test with the fake clock that a figure walking from behind a machine to in front of it changes
its order once, and the sixty tick stability test.

**2.12 Doors as Airline Tycoon does them [PIOTR, 18.09].** The swing of Turn 19 goes. A door is
drawn **closed, always** (the closed frame of the three; the other two are deleted). When a
figure's leg ends at a door cell he **goes through**: the figure leaves the hall's drawing at the
door (not standing in it, not in the corner) and, when his station is the office, the office
view draws him at his desk (T19 2.2's office half stays); when he comes out he appears at the
door cell and walks on. The door plays its sound when a file exists (2.13) and is silent when
not. The owner in the office is therefore not on the hall at all; the hall's figure count test
of Turn 19 changes accordingly. Done: the render tests (closed door, no figure at the door while
in the office, the owner at the desk in the office view) and the app test of going in and out.

**2.13 Silence until the files [PIOTR, 18.09].** The synthesised stand ins of `src/ui/sound.ts`
are deleted: `play` and `loop` do nothing when the named file is not in `public/sounds/`; the
Settings controls stay; the tests of Turn 19 that expected a stand in expect silence. The door's
sound is fired through `hallOneShots` (the render layer reports the event, the ui layer plays it),
so `src/render` no longer imports `src/ui/sound.ts` (REPORT-T19's own note). Done: the tests.

**2.14 The Machines column says `0 h`, not `none` [PIOTR].** One word in `company.ts`.

**2.15 Every popover has the cross [PIOTR, 18.09].** A test walks every renderer that produces a
`.modal`, `.assign-list`, `.menu-pop` or any element with `data-popover` and asserts exactly one
`.modal-close` inside it; Escape shuts the topmost open one (the order: assign list, day summary,
modal, menu); a click outside shuts the assign list and the menu. `data-popover` is the attribute
every future popover must carry, and the test is the rule.

**2.16 Bespoke material ordered twice [PIOTR: "materials for a £50k job want ordering several
times at £7k"].** In `unloadIntoStock` a job's own delivery gives the job only what fitted on the
rack (`held = min(fitted, ...)`), so a bespoke load bigger than the rack's free space leaves the
job short and the card asks for another order. Fix: a job's own delivery is the job's whether it
fits or not: the overflow of a job delivery is reserved for that job in temporary storage (the
`moveOverflowToStorage` path, one charge) or held on the pallet until the rack has room, and
`shortfallOf(job)` counts it; `Order for this job` is greyed while a delivery for the job is on
the way or in the yard (the check exists; make sure the button reads it). Scenario: a £50,000
bespoke job with a rack of 50 free places, one order, one unload, no shortfall after. Done: that
scenario and the unit test.

## 3. How to run this session (agents)

- **Phase A (one agent, serial):** section 4's fields, STATE_VERSION 17, the migrations (tiers,
  weekly wages, service count, contract fields); the new tier ids through the types with every
  compile error fixed by the rename; `CONTRACT_PIECES` (2.2); `ANIMATIONS` gains `sweep`; the
  Work Plan tab routing and the Machines page routing stubbed; `data-popover` on the existing
  popovers. The six frozen files of Turn 13 are frozen for phase B after this; a B agent that
  needs one writes a note for phase C.
- **Phase B (three agents):** B1 the money: 2.1, 2.16 (contracts.ts, its ui, plan.ts, production
  for the contract-first day, materials.ts). B2 the people: 2.3, 2.4, 2.5, 2.6, 2.7 (staff.ts,
  tasks.ts, team.ts, hire cards, economy.ts payroll, company.ts rows). B3 the hall: 2.8, 2.9,
  2.10, 2.11, 2.12, 2.13, 2.14 (game.ts helper paths only through notes, machines.ts, a new
  src/ui/machinesPage.ts, walkers.ts, doors.ts, sound.ts, hall.ts, office.ts).
- **Phase C (one agent, serial):** the notes, 2.15's test, the scenarios (the sixteen months with
  weekly pay, four tiers and the new prices; plus (cc) a contract month with a normal joiner that
  ends in profit; (dd) the helper's dirty hall day; (ee) the bespoke job; (ff) three services on
  one saw), the cross check of section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 17. `WorkerTier` ids renamed (migration maps the three old ids); `weeklyWage` for
every worker and `monthlyWage` gone; `worker.leavesOnDay: number | null`; `equipment.serviceCount`
and `equipment.inServiceUntilDay`; `contract.endedBy: 'term' | 'player' | 'client'`; the day's
contract-first minutes need no field. Every v28 save loads.

## 5. Task queue, in order

Branch turn-20-contracts-that-pay from main. One commit per task, npm run check green on its own
exit code before each, two report lines per task in REPORT-T20.md.

T20-A1 Housekeeping and v29: docs/turn-19-brief.md byte for byte from the Turn 19 merge commit's
CLAUDE.md, the README's lines, APP_VERSION 'v29', docs/art/REQUESTS-T20.md (section 9),
docs/ui-style.md written from the code (section 1).
T20-A2 Phase A as section 3 says.
T20-B1a 2.2 (prices, the margin test). T20-B1b 2.1.4 (contract first day) and 2.1.6. T20-B1c the
Contracts tab, 2.1.1 to 2.1.3 and 2.1.5. T20-B1d 2.16.
T20-B2a 2.5 and 2.6. T20-B2b 2.3. T20-B2c 2.4. T20-B2d 2.7.
T20-B3a 2.8 (the diagnosis in the report first). T20-B3b 2.9. T20-B3c 2.10 and 2.14. T20-B3d 2.12
and 2.13. T20-B3e 2.11.
T20-C1 notes. T20-C2 2.15. T20-C3 scenarios. T20-C4 cross check. T20-C5 look and shoot: twelve
pictures into docs/report-t20/ (the Contracts tab's three sections, the Take it card with a man
selected, the Jobs tab without the bar, Our team with Let go and the week line, a hire card with
the tiers and a locked master, the Machines page with a bar and Service, a closed office door
with the owner in the office view at his desk, the helper sweeping, the chip "Dave is emptying
the bags", the Company board with 0 h). T20-C6 report and PR titled `Turn 20: contracts that
pay, people you can run`, do not merge, end the session.

## 6. Do not (tonight)

- No crowding factor, no limit on men per job.
- No change to Output, Efficiency, the rate, the design time, express.
- No synthesised sound of any kind; no sound file invented.
- No door animation; no new mockup built from words.
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the sprite
  files, the character sheets or the font file.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- The three margins an hour by hand are between 22 and 30, printed in the report.
- A contract month with a normal joiner ends in profit after his wages, asserted.
- `grep -rn "poor\|'normal'\|'super'" src`: nothing but the migration and the tier words table.
- `grep -rn "monthlyWage" src`: nothing but the migration.
- The helper's day scenario: a dirty hall at 10:00 with a delivery in the yard is clean by the
  end of the day, the bags emptied, the owner never asked, and the report's diagnosis names the
  cause that was found.
- The bespoke scenario: one order, one unload, no shortfall.
- `grep -rn "from '../ui/sound'" src/render`: nothing.
- The popover test passes and lists every popover it found.
- The twelve pictures, each beside its closest existing screen, with the differences listed and
  none of them outside this brief.
- `git diff main --stat -- src/ui/styles.css` shows no new colour token, font or shadow value;
  every new class sits beside its family.

## 8. Parked

- The walk itself (new sheets or frame blending): needs the animated mockup first.
- Sound files: Piotr's recordings; the door first.
- The sprayer's and the helper's bench sheets.
- The website retainer, the second click on Sell, greying the catalogue.
- Everything parked by Turns 13 to 19.

## 9. Art and sound requested (docs/art/REQUESTS-T20.md)

- Sound files, `public/sounds/`, mono, 44.1 kHz, `.ogg`: `door.ogg` (an internal door, open then
  close, two seconds), `tableSaw.ogg` (ten seconds of steady cut, loopable), `extractor.ogg` (ten
  seconds, loopable), `hammer.ogg` (three knocks), `drill.ogg` (one screw), `sander.ogg` (five
  seconds, loopable), `sprayBooth.ogg` (five seconds, loopable). Piotr records them in his own
  workshop; each is played to him on a sample page before the game uses it.
- `character.helper.bench` (the helper at a bench, the joiner's bench contract) and the sprayer's
  four sheets (the owner's model, a white shirt), on the character sheet contract of SPRITES.md
  10.

End of brief.
