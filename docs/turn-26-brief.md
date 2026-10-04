# Turn 26: a workshop that looks like one, and a company with fewer kinds of people in it

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one agent, serial, effort high).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 02.10.2026 from Piotr's
words of that morning, against main at v62.

Read this whole file (first line must say "Turn 26"; if the root CLAUDE.md does not, stop and
report), then REPORT-T25.md section 0 and its "what was not done", then docs/ui-style.md, then
docs/art/SPRITES.md sections 8 to 10 (the sheets, the walk, the depth), then the archived briefs
in docs/ (docs/turn-25-brief.md is the last). Where files disagree, this one wins. All standing
rules apply (no em or en dashes anywhere, scope 1:1, one code path, constants never in the UI,
[TUNE] for every figure you choose and [PIOTR] for his, kill background processes, PR without
merge, end the session, no PR watching, npm run check gated on its own exit code, every click
single, one APP_VERSION bump, delete the old track and never write a parallel one, flip a test and
never keep it beside a new one). One rule is relaxed from tonight [PIOTR, 01.10: "too much time
and tokens go on tests"]: a scenario figure that moves is restated with ONE line of reason, not
the ledger by category; a test that pins an exact pound of a played month may be loosened to a
range when the exact figure says nothing about the rule under test, and the comment says so.

Precondition. main carries Turn 25 merged (PR #25) and the chat fixes v53 to v62: APP_VERSION
'v62', STATE_VERSION 33. If APP_VERSION is not 'v62', stop and report. The chat fixes v60 to v62
(the pace as the grade times the hall's points, the one Pace number on the bar, the speeds 1 4 10
30 100, the desk staff behind the office door, the board locked until the lorry, the CNC standing
in for the saw, the biggest compressor by default, the assign lists of free men only) were pushed
without the full test suite being run, on purpose: task A0 below runs it and settles it before
anything else is touched.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside. The mockups this turn needs are in section 9: the two hall pictures the agent draws with
the game's own renderer, and the two HTML mockups of the Pace sheet's head and the agency's card,
all into docs/mockups/t26/ before the code that makes them true.

## 0. What this turn is for (PIOTR, 02.10)

Piotr played v62 for an evening with six joiners, a CNC, a pro saw, two edgebanders, a moulder and
a booth, and said what he saw. Two halves.

**The hall.** "Ninety per cent of the time they stand at the benches; they hardly go near the
machines" (true, and it is the drawing: `MACHINE_PLACES` draws one man at a CNC that
`MACHINE_CAPACITY` says keeps eight busy, so five of six men whose sheets go through the CNC are
drawn at benches). "Three of them stand in one cell" (`placeCellsAt` repeats a cell when the row
and the side run out). "They walk over the machines, and when a man goes behind a machine the
machine does not hide him" (the working zones are free cells, a picture is wider than its
footprint, and the one-swap re-sort of Turn 20 never gets a crossing figure behind the machine in
time). "They should walk between the machines, a bit faster."

**The company.** "Just leave one kind of man on the floor, the joiner, and he does everything
physical, with the labourer to help; there is no sense in lots of kinds of people." So the sprayer,
the estimator and the purchasing clerk go, the draftsman comes in three grades and takes the
drawings, the site survey and the client meeting, the office admin takes everything else of the
office with the material list, the salesman stays for now. The crew limit of eight counts joiners
and nobody else. Reputation is earned too fast ("we reached 100 far too quickly"). The Pace
sheet's head says 1.00 over a hall that is making 2.20, and a man on a contract reads
`+1.20 hall` where it is his CNC. And an advertising agency at a monthly fee brings big one off
jobs, a hundred thousand to a million, that want four free joiners and a tight calendar: the
pressure of time and organisation at the top of era 1, where a standing contract is the steady
floor under it.

Nothing about the money of a job, the pace arithmetic of v61, the stages, the dust, the air, the
extraction, the machines' tables or the loan changes tonight, except where a section below says
so by name.

## 1. Rules restated (short)

Everything from Turns 1 to 25 and the chat fixes to v62. Tonight in addition:

- APP_VERSION = 'v63'. STATE_VERSION 34 in phase A, once; every v25 to v33 save loads, the
  fixtures in tests/fixtures among them (section 4).
- **A machine draws as many men as it keeps busy** [PIOTR, 02.10]. One table.
- **No two figures on one cell, ever** [PIOTR].
- **A man walks the free floor between the machines and is hidden by what he walks behind**
  [PIOTR].
- **On the floor there are joiners and the labourer, and nobody else** [PIOTR].
- **The crew limit is joiners** [PIOTR]: eight joiners, however many others.

## 2. Changes to the design (the contract)

### A. The hall

**2.1 One table: places are the capacity [PIOTR, 02.10].** `MACHINE_PLACES` is deleted and
`placesOf(state, item)` reads `MACHINE_CAPACITY` (the table of 24.09 Piotr put back in v58, which
is his): a pro CNC has eight places, a budget saw two, a used saw one. The bench keeps its own row
(`WORKBENCH_PLACES` folded into the one table as it stands). `hallPlaces`, `machineForPlace`, the
day plan of T25 2.3, the card's `Places: 2 of 2 in use, Pete and Eddie` and the Owned tile's short
form all read the one table and change nothing else. The `Too few saws: capacity 2, 4 men` line of
the Pace sheet keeps its arithmetic exactly.

What the hours do with it [TUNE, say so in the report]: a machine booked an hour for every hour a
man stood at one of its places (T25 section 6). With six men at a CNC that would be six hours an
hour. From tonight a machine books **one hour for every clock hour at least one man is at one of
its places**, however many are; `machineWearPerMinute` and a contract's wear (T24 2.4) are charged
on the same minutes.

**2.2 A cell of his own for every man [PIOTR].** `placeCellsAt(state, item, count)` never repeats
a cell: after the operator's cell, the second place and the side the item is worked from, it
takes the free cells round the item's footprint one ring out, in a fixed order (the worked side
first, then the two ends, then the far side, then the next ring), skipping any cell another figure
stands on this minute. The canteen door's queue of v54, the men at the gate and the home cells of
T22 go through the same rule: one function, `standingCellsFor(state, anchorCells, count, taken)`,
and `doorQueueCell` reads it rather than its own spread. Two figures on one cell is a failing test.

**2.3 Walking between the machines [PIOTR].** The free floor for walking is the floor with no
footprint and no **picture** on it: the cells a machine's drawn picture covers beyond its footprint
(the overhang per family, read off the sprite manifest's canvas against the footprint, as
docs/art/SPRITES.md gives it) are not walked over, so a man never crosses the saw's table on
screen. The working zones stay walkable. A path that finds no way round goes the long way;
`straightLine` is kept only for a target with no free neighbour at all, and the report counts how
often the fixtures hit it (the aim is never).

**2.4 Hidden by what he walks behind [PIOTR].** The one-swap re-sort of Turn 20 (`resortFigures`)
is replaced: every frame, every walking figure is placed in the scene's draw order by its depth
key against the machines and the standing figures, a full insertion into the sorted siblings, so a
man behind a moulder is painted before the moulder for every frame he is behind it. The keys do
not change (`depthKey` for a machine, the feet plus `FIGURE_DEPTH_OFFSET` for a man); only the
order is honoured.

**2.5 A shade quicker [PIOTR: "a bit faster"].** `WALK_CELLS_PER_SECOND` 1.25 to 1.5 and
`WALK_CELLS_PER_SECOND_FAST` 1.5 to 1.8 [PIOTR, 02.10; TUNE the second]. The stride arithmetic of
T19 2.1 keeps the feet planted.

### B. The company

**2.6 One kind of man on the floor [PIOTR, 02.10].** The sprayer, the estimator and the purchasing
clerk are deleted: out of `HIRING_SPECS`, the hire cards, the Our team tabs, the tasks' role
tables, the Output sheet's roles, the catalogue's duty lines, and out of the `WorkerRole` type,
which from tonight is `joiner | helper | productionManager | officeAdmin | draftsman | salesman`.
The joiner does everything physical: at the booth he sprays at his own rate (`JOINER_SPRAY_RATE`,
`SPRAYER_SPRAY_RATE`, `SPRAYER_BENCH_RATE` and `tradeFactor` go; a stage is worth the man's grade
times the hall's points and nothing about his trade), the cutting, the edging, the moulding and
the assembly as today. The labourer helps as the helper did and nothing of his rule changes.

**2.7 The labourer's name [PIOTR: "change the name from helper to labourer"].** Every word the
player reads says `labourer` and `Labourer` where it said helper: `ROLE_WORDS`, the hire card and
its duties, the crew column, the person card, the Pace sheet, the tips, the hall's hover lines and
the bubbles. The role's id `helper` and the sheets `character.helper.*` stay what they are, with
one comment on the id saying why (the art side's files carry the name, and a save carries the
id); nothing else keeps the old word. `grep -rn "elper" src --include=*.ts` after the turn finds
the id, the sheet names and nothing a player sees.

**2.8 The draftsman in three grades [PIOTR].** The draftsman is a tiered role like the joiner,
three grades on `TIER_MIN_REPUTATION`'s own gate: `experienced` from 15, `senior` from 50,
`master` from 90 [PIOTR, 02.10] (the joiner's own rungs stay 15, 35, 60; the draftsman has his
own table, `DRAFTSMAN_MIN_REPUTATION`, and no novice). What the grade is: his speed at the
three jobs of work that are his, the drawings (`DRAFTSMAN_RATE` 0.8 becomes the ladder 0.8 / 1.0
/ 1.2 [TUNE] against the owner's own 1.0), the site survey (the measure's minutes at the same
ladder, the travel as it is) and the client meeting (its minutes at the same ladder). Wages
[TUNE]: 2400 / 2900 / 3400 a month, on `tieredSpecs` like the joiner's. The site survey is the
draftsman's first and the owner's when there is none (the salesman and the estimator come off
`siteMeasure`); the client meeting is the draftsman's first and the salesman's behind him, the
owner's when there is neither; the drawings are the draftsman's and the owner's as today.

**2.9 The office admin does the rest [PIOTR].** `dailyOrdering` and `materialTakeOff` are the
office admin's and the owner's, nobody else's, at the owner's own speed (v60's take off rule,
with the estimator gone). `clientCall` stays the salesman's first and the admin's at half speed.
The admin's duty line on the hire card says it all in one sentence.

**2.10 The crew limit is joiners [PIOTR, 02.10].** `crewCount` counts joiners and `crewLimit` is
what it was (the unit's 200 / 24 = 8); the owner, the labourer, the manager and the office are
outside it. The lockers and the canteen count the men on the floor, joiners and the labourer,
and nobody else [PIOTR: "the same as the crew"]. The hiring gate's bench place for every joiner
and one for the owner (T24 2.2) stays.

**2.11 Reputation is earned slower [PIOTR: "we reached 100 far too quickly"].** Every gain of
reputation is multiplied by `REPUTATION_GAIN_FACTOR` 0.5 [TUNE] before it is booked, in
`changeReputation` and nowhere else; losses are what they were; the cap stays 100. The log line
says the points actually booked.

**2.12 At most three standing contracts [PIOTR].** `CONTRACTS_MAX` 3: the weekly offer of v51 is
not drawn while three are active, and the offer card says so in one line when a fourth is
answered with. Nothing else about contracts changes tonight; the big work of 2.13 is not a
contract.

**2.13 The advertising agency and the big jobs [PIOTR, 02.10].** A monthly subscription like the
software's, on and off at any time from the Office beside the website, `AGENCY_MONTHLY_FEE` 5000
[PIOTR], charged on the first of the month it is on. While it is on, the board draws, beside the
ordinary enquiries, **big one off jobs**: residential or commercial as the templates allow, their
value `AGENCY_JOB_VALUE_MIN` 100,000 to `AGENCY_JOB_VALUE_MAX` 1,000,000 [PIOTR], one on the board
at a time, from reputation `AGENCY_JOB_REPUTATION` 50 [TUNE]. A big job is a job like any other
(the one `Job` record, the one card, the one deadline rule, the deposit and the balance as today)
with two things of its own: it **wants free joiners** before it can be taken, `bigJobJoinersFor
(value)`, 4 at a hundred thousand rising to 8 at a million [PIOTR: "at least four free joiners";
TUNE the slope], where a free joiner is one on no job and no contract at the minute the player
presses Take it, and the enquiry card says `Wants 4 joiners free: you have 2` in red until he has
them; and its deadline is the ordinary rule on its labour, which is what makes it a month of
pressure. Taken, the four are put on it by the Take it click, so the player sees the crew go.
The ledger category `agency`, the month report line, the loan's turnover: as the software's. A
save with no agency opens with it off.

**2.14 The Pace sheet says the real number [PIOTR, 02.10].** The head of the sheet is the
workshop's average today, `workshopOutputToday`, the number the bar carries (2.20 in Piotr's
picture), with its words `every worked minute today was worth`; the hall's own total of the lines
(1.00 there) is the sum line under `What moves it` and is not printed at the top a second time.
The row of a man on a standing contract takes its `machines` points from his piece's own pace
(`contractPieceSpeed` and the CNC's assembly share), so Nathan reads `1.00 × (1.00 + 1.20
machines)` and not `+ 1.20 hall`; a job man's row is what v61 made it. Mockup first (section 9).

## 3. How to run this session

One agent, serial, in the order of section 5. No worktrees, no agent teams. A0 first and alone:
the full suite on main as it stands, every test that v60 to v62 moved re-pinned with one line of
reason each, `npm run check` green, one commit. Then the mockups of section 9, then phase A (the
roles of 2.6 to 2.9 and the state of section 4), then B (2.10 to 2.14), then C (the hall, 2.1 to
2.5), then the scenarios, the cross check of section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 34. The migration, once: every worker whose role was `sprayer` becomes a `joiner`
of his tier at the joiner's wage for that tier; every `estimator` and every `purchasingClerk`
becomes an `officeAdmin` at the admin's wage; a task of a kind that only they took is reassigned
by the day's own pass. The draftsman on the books gets `tier: 'experienced'` and the ladder's
wage for it. `state.agency` is added (`{ on: boolean; sinceMonth: number | null }`), off. A job
gains `joinersWanted: number` (0 for every job that is not big). Every v25 to v33 save loads, the
fixtures among them.

## 5. Task queue, in order

Branch turn-26-one-kind-of-man from main. One commit per task, npm run check green on its own
exit code before each, two report lines per task in REPORT-T26.md.

T26-A0 The suite settled: every test v60 to v62 moved, re-pinned with one line of reason; nothing
of the engine touched. T26-A1 Housekeeping and v63: docs/turn-25-brief.md is already in docs/
(this ZIP put it there), this file as CLAUDE.md, the README's lines, APP_VERSION 'v63',
docs/art/REQUESTS-T26.md (section 9). T26-A2 The four mockups into docs/mockups/t26/ with a
README. T26-A3 2.6, 2.7, 2.8, 2.9 and the state of section 4.
T26-B1 2.10. T26-B2 2.11. T26-B3 2.12. T26-B4 2.13. T26-B5 2.14.
T26-C1 2.1. T26-C2 2.2. T26-C3 2.3. T26-C4 2.4. T26-C5 2.5.
T26-D1 notes (docs/notes-t26.md). T26-D2 scenarios, one line a moved figure; the three month
playthrough with the agency on from month 2 as a new scenario (tt): one big job taken and made,
or the report says why not. T26-D3 cross check. T26-D4 look and shoot: ten pictures into
docs/report-t26/ (the day 53 fixture after one minute with the men round the CNC and the saws,
nobody sharing a cell; the same at the tenth minute with a man on his way between two machines,
hidden behind one; a canteen door queue of four, four cells; the card with `Places: 3 of 8 in
use`; the hire cards with three draftsmen and no sprayer, estimator or clerk; the labourer's
card; the Pace sheet's head at 2.20; a contract man's row with `machines`; the agency's card on
and off; a big job's enquiry card wanting four joiners, red and then green). T26-D5 report
(REPORT-T26.md) and PR titled `Turn 26: one kind of man on the floor, and a hall that looks like
a workshop`, do not merge, end the session.

## 6. Do not (tonight)

- No change to the pace arithmetic of v61 (`manPace`, `pacePoints`, the floor), the stages and
  their shares, the dust, the air, the extraction, the machines' capacities and paces, the loan,
  the contract prices, the job templates' prices.
- The hiring gate's bench places (T24 2.2) and the restock rule: untouched.
- The hall's size: 200 square metres, as it is; the second 200 are era 2 (section 8).
- No sound; no new screen beyond the agency's card in the Office; no picture drawn by an agent
  for the game; no sprite touched.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `grep -rn "MACHINE_PLACES\|sprayer\|estimator\|purchasingClerk\|tradeFactor\|SPRAY_RATE" src tests`:
  nothing but the migration of section 4 and the sheet names the art side owes.
- `grep -rn "elper" src --include=*.ts`: the role id, the sheet names, nothing a player reads.
- The day 53 fixture after one minute: no two figures on one cell, every working man at a machine
  of his family or at a bench, the count at the CNC equal to the men whose stage is the CNC's up
  to its capacity, asserted. The day 128 and day 149 fixtures: the same.
- A walk from the bench row to the saw in the day 53 hall crosses no footprint and no overhang
  cell, asserted on the path; the frames a figure spends behind the moulder put it before the
  moulder in document order, asserted on a stepped walker.
- A machine with three men at it books one hour an hour, asserted.
- Eight joiners on the books and a labourer, a manager and three office staff beside them: the
  crew is full for a ninth joiner and for nobody else, asserted.
- A draftsman of each grade draws, measures and meets at his ladder's speed, asserted; the site
  survey goes to the draftsman and not the salesman, asserted.
- A month of ratings books half the points it did, and the losses what they were, asserted.
- A fourth contract is not offered while three run, asserted.
- The agency on: a big job on the board wanting four free joiners, refused with two, taken with
  four and the four on it, the fee on the first of the month, asserted.
- The Pace sheet's head is `workshopOutputToday`, and a contract man's row says `machines`,
  asserted.
- Every scenario green; a moved figure restated with one line.
- Every changed screen beside its nearest existing one in the report; `git diff main --stat --
  src/ui/styles.css` with no new token beyond the agency card's reuse of the software card's.
- The ten pictures.

## 8. Parked

- The second 200 square metres of hall: era 2 [PIOTR, 02.10].
- Standing contracts bigger than today's, for the big factory: era 2 [PIOTR].
- Pathfinding round other men (two men may cross).
- The owner's holidays, the weekly summary card, the tips under a monthly report, the backs of the
  sprites, the sound files, the three Turn 20 leftovers.

## 9. Mockups and art (docs/mockups/t26/, docs/art/REQUESTS-T26.md)

Mockups, before the code: (1) the day 53 hall before and after 2.1 and 2.2, drawn with the
renderer; (2) a man behind the moulder, before and after 2.4; (3) the Pace sheet's head of 2.14,
HTML in the sheet's own classes; (4) the agency's card beside the website's, HTML in the
software card's classes. A README names which is which.

Art: the sprayer's sheets are no longer wanted (2.6); the labourer's bench sheet, the backs
(`.rr`, `.rrr`) of every floor family and the seven recordings are still owed.

End of brief.
