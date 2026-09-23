# Turn 25: places at the machines, and no man ever queues again

Woodwork Empire. Autonomous session brief for Claude Code (cloud, one agent, serial, effort high).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), written 21.09.2026 from Piotr's
decision of that evening and reissued 23.09.2026 against v51 (Petros: software/woodwork-empire,
STAN). Section 10 says what moved between the two dates and how this brief reads on today's tree.

Read this whole file (first line must say "Turn 25"; if the root CLAUDE.md does not, stop and
report), then REPORT-T24.md section 0 and its "what was not done", then docs/mockups/t24/README.md
and its picture (the heap at the saw, which is the picture this turn ends), then docs/ui-style.md,
then the archived briefs in docs/. Where files disagree, this one wins. All standing rules apply
(no em or en dashes anywhere, scope 1:1, one code path, constants never in the UI, [TUNE] for
every figure you choose and [PIOTR] for his, kill background processes, PR without merge, end the
session, no PR watching, npm run check gated on its own exit code, every click single, one
APP_VERSION bump, delete the old track and never write a parallel one, flip a test and never keep
it beside a new one, restate every scenario figure that moves with the reason in its comment).

Precondition. main carries Turn 24 ("the number says who made it") merged and the chat fixes v37
to v51: APP_VERSION 'v51', STATE_VERSION 27. If APP_VERSION is not 'v51', stop and report. The
root CLAUDE.md is this file; the Turn 24 brief is in git at the merge commit of PR #24
(`git show 885d3e3:CLAUDE.md`) and as CLAUDE-T24.md in the root, which A1 archives and deletes.

The four rules of 18.09 bind every agent: one game, one look; nothing visual without a mockup;
no sound without a recorded file; every modal, popover and list has the cross, Escape and click
outside.

## 0. What this turn is for (PIOTR, 21.09)

Piotr watched four men stand in a heap by the saw again and said the thing that decides this
turn: **"this queueing and waiting drives me mad; the whole logic is too complicated and it will
always break."** He is right, and the fault is not in the code: the game models a real shop's
station-by-station flow (a man takes a machine, the next man waits, the bag of work of v37 sends
him to another stage of his own job), and every turn adds another edge for it to break on. It is
faithful and it is miserable to play, and it makes a contract a gamble, because nobody can tell
from the hall whether the crew can keep up.

From tonight the shop works the way a tycoon reads: **a machine is not a thing one man takes, it
is a number of places to work.** A man is put on a job and he works. If the hall has no place for
him, the game says so plainly, once, in words, and the player buys a machine or takes a man off.
Nobody queues, nobody is sent to another stage to fill a gap, no station is held, and the class of
a machine stops being a token to be seized and becomes what it should have been: more places, a
faster hall, a longer life.

Nothing about the shop's money, jobs, stages, dust, air or extraction changes tonight. What is
deleted is the whole apparatus of taking, queueing and waiting for a station.

## 1. Rules restated (short)

Everything from Turns 1 to 23. Tonight in addition:

- APP_VERSION = 'v52'. STATE_VERSION bumps to 28 in phase A, once; every v25 to v27 save loads,
  the four fixtures in tests/fixtures (day53, day115, day128, day149) among them.
- **A man is never blocked by another man** [PIOTR, 21.09]. He works, or the hall has no place for
  him and the game says so.
- **A machine is places, a pace and a life** [PIOTR]. Nothing else.
- **The player can see, before he signs, what his hall makes in a week** [PIOTR].

## 2. Changes to the design (the contract)

### The heart of it

**2.1 A machine has places [PIOTR, 21.09].** Every floor family that men work at carries a table
of places by class, beside its prices, in `constants.ts`, the way `WORKBENCH_PLACES` already does
(CLAUDE.md T23 2.17) [TUNE, Piotr's own for the saw]:

| class | table saw | spindle moulder | edgebander | thicknesser | CNC | spray booth | workbench |
| --- | --- | --- | --- | --- | --- | --- | --- |
| used | 1 | 1 | 1 | 1 | n/a | n/a | 1 |
| budget | 1 | 1 | 1 | 1 | n/a | n/a | 1 |
| standard | 2 | 1 | 1 | 1 | 1 | 1 | 2 |
| pro | 2 | 2 | 2 | 1 | 1 | 1 | 2 |
| industrial | 3 | 2 | 2 | 2 | 2 | 2 | 3 |

One function, `placesOf(item)`, reads every table; `hallPlaces(state, family)` adds up the places
of every unbroken machine of a family standing in the hall. A broken machine has no places, which
is what a breakdown now costs, beside its repair.

**2.2 Nobody takes a machine, and nobody waits for one [PIOTR: "they never stand, they always
work"].** Deleted, from the engine and from every screen: `takenBy` as a claim on a machine, the
waiting stations (`waitingStation`, `stationWaitingFor`, the waiting row of `stationRow`, the
`place:` station at a machine, which stays for a bench), `heldMachine`, `claimMachine`,
`releaseMachines`, `releaseMachinesExcept`, `takeMachines`, `familiesWanted`, `menAtJobs` as a
list of who holds what, `freeMachines` as a queue question, `queueStationFor` if it is on main,
the "waiting for the saw" blocked line and `waitingWordsFor`, the `noMachine` idle reason as a
per-minute event, the v47 bench gate (`stageAtTheBench`, `standsForBench`, `NO_BENCH` and the
`noBench` bubble: a bench is a family with places like any other from tonight, 2.3), and the bag
of work of v37 and v43 (`stageFor`, `stationFreeFor`, `stageMayStart`; `stageLabour` **stays**,
because the stages are still where the work goes and the Work Plan draws them). A man put on a
job works his job's current stage at his own rate, minute after minute, and the hall's places
decide only **how many men can work at once** (2.3). `Equipment.takenBy` is kept in the record
for one turn as a dead field the migration clears, so an old save loads. The men on a standing
contract are men like the others: a contract's piece wants a place of its family (v45's
`contractMenAtWork` and the saw it kept between minutes go with the rest; what stays of it is the
one question `contractWantsToday`, who is on a contract today).

**2.3 The hall's places decide who works, once a day and not once a minute [PIOTR].** At the start
of each working day, and again whenever the player assigns, unassigns, buys, sells, moves or
breaks something, a machine comes back from its service or a job's current stage moves to another
family, the engine works out **who has a place** and writes it on the man (`Worker.working:
boolean` and `Worker.noPlaceFor: string`, the family he could not get into; the owner has the
same two fields):

- Every man on a job needs one place of the family his job's current stage wants
  (`familyForStage`, unchanged), and every man on a standing contract one place of his piece's
  family (`contractFamilyOf`). A stage whose family the hall does not own at all is worked by
  hand as it always was (CLAUDE.md T7 3.6) and needs no place; a tool out of a cabinet is shared
  as it always was and needs no place. A bench stage wants a bench place, which is the whole of
  v47's rule from tonight.
- Places are given out in the order the men were hired, the owner first, so the answer never
  flickers between two minutes.
- A man with no place **does not work that day**: his figure stands at his home cell with the red
  mark of Turn 22's 2.5 and the hover line `no place at the saw`, his card says the same, and his
  minutes are idle with the reason `noPlace`. The efficiency breakdown's `noMachine` line becomes
  `noPlace` and means this and only this.
- The moment a place frees (a man is taken off a job, a machine is repaired, another is bought),
  the next man in order takes it and works from that minute.

**2.4 The class of a machine is the hall's pace [PIOTR: "the machine's class should add to the
efficiency, that is easy to count"].** The `outputFactor` of a machine class stops applying to
whoever holds it and becomes the hall's, by family: for a stage of family F, the pace is the
**best class of F standing unbroken in the hall and not away for its service**, whatever machine
of it the man is at [TUNE, Piotr's figures]:

| class | pace |
| --- | --- |
| used | 0.95 |
| budget | 1.00 |
| standard | 1.05 |
| pro | 1.08 |
| industrial | 1.12 |

A hall with an industrial saw and a used one cuts at 1.12, because the shop cuts on the good saw
and the old one takes the overflow. The efficiency breakdown gains one line per family that is
above or below 1.00, so the player sees what his machines buy him: `Saw, industrial: +12%`. The
bench's places and pace of Turn 23 fold into these two tables and stop being their own rule. The
Output sheet's block of Turn 24 (`Who made it today`, CLAUDE.md T24 2.1) reads the same pace: the
`<why>` of a man's row says the family and its class (`saw, industrial`) in place of the machine
he stood at, and `by hand` and `at the bench` as it does today; `bookOutputMinute` is unchanged.
A contract's machine wear (T24 2.4) is charged on the minutes at a place of the family, which is
the same minutes it was.

**2.5 The card of a machine says who is at it [PIOTR, 21.09].** A machine's card and its hover
line say its places and who is in them this minute: `Places: 2 of 2 in use, Pete and Eddie` or
`Places: 1 of 2 in use, Eddie` or `Free`. The Owned tab's tile says the short form
(`2 of 2 in use`). This is read off the same day plan as 2.3, so it can never disagree with the
figures on the floor.

**2.6 The men spread over the machines they are drawn at [PIOTR: "with two saws let them go to the
second one"].** The figure loop places a working man at the machine of his family that holds him:
the machines of a family are filled in the order they were bought, each up to its places, so the
second man of a two place saw stands at its second place and the third man stands at the **second
saw**, not in a heap at the first. One function, `machineForPlace(state, family, index)`, is what
the figure loop and the card of 2.5 both read. The places of a machine are its cells the way a
bench's are since Turn 24 (`benchCellsAt`, the front row of its footprint, CLAUDE.md T24 2.5):
one list, `placeCellsAt(state, item, count)`, for every family, benches included, so a bench and a
saw cannot lay their men out two different ways. A man with no place stands at his home cell
(2.3); a contract man with no sheets stands at the canteen door as he does since Turn 24 (2.3
there).

### What it fixes beyond the queue

**2.7 A contract says what the hall can make [PIOTR: "we take a contract and we do not know
whether the hall can do it"].** The contract offer card, the Contracts tab and the acceptance
check gain one line, off the same numbers: `Your hall makes about 26 of these a week at full
crew; this term wants 20`, red when the wanted figure is above what the hall makes. The figure is
the arithmetic the engine already has: the piece's minutes at the hall's pace for its family
(2.4), the men who could have a place for it (2.3), and the working days of a week. No new rule,
one honest number. v51's line under it (`This contract is for 2 men at the least`, off
`contractMenNeeded`) stays where it is: one says the hall, the other says the men. Done: the
engine test (a one saw hall makes fewer than a three saw hall; the line turns red when the term
wants more than the hall makes), the card tests.

**2.8 The Work Plan says the same in one line.** Above the jobs: `4 men working · 1 with no place
at the saw`. Nothing else on that screen changes.

## 3. How to run this session

One agent, serial, in the order of section 5. No worktrees, no agent teams. Phase A first (the
two tables of 2.1 and 2.4, `placesOf`, `hallPlaces`, `machineForPlace`, `placeCellsAt`,
`Worker.working` and `Worker.noPlaceFor`, STATE_VERSION 28 and the migration of section 4, the
deletions of 2.2 in the engine), then the day plan of 2.3 and the pace of 2.4 (production.ts,
staff.ts, efficiency.ts, jobs.ts, contracts.ts, machines.ts, game.ts), then the screens (the
cards of 2.5, the Work Plan line of 2.8, the breakdown lines, the Output sheet's `<why>`, the
removal of every waiting word: catalogue.ts, machine.ts, jobCard.ts, workPlan.ts, personCard.ts,
topbar.ts, company.ts, bubbles.ts), then the figures of 2.6 and the contract line of 2.7
(hall.ts, stations.ts, characters.ts, contracts.ts, the Contracts tab), then the notes, the
scenarios (every one that turned on a queue rewritten to places: (qq) four men and one used saw:
one works, three say `no place at the saw`, and the month's output is one man's; (rr) the same
four with an industrial saw: three work at 1.12 and the fourth says the line; (ss) a contract the
hall cannot keep up with is red on its card before it is signed; the letters follow Turn 24's
(pp)), the cross check of section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 28. `Worker.working` and `Worker.noPlaceFor` are added, and the owner's two fields
with them (the migration works them out on the first day it runs, so an old save opens with the
right men working); `Equipment.takenBy` is cleared to null on every item and never written
again; every job's `blockedBy` that says `waiting for the ...` or `no bench` is cleared; every
station that is a waiting station or a `place:` at a machine becomes the man's home station.
Every v25, v26 and v27 save loads, the four fixtures among them.

## 5. Task queue, in order

Branch turn-25-places-at-the-machines from main. One commit per task, npm run check green on its
own exit code before each, two report lines per task in REPORT-T25.md.

T25-A1 Housekeeping and v52: docs/turn-24-brief.md byte for byte from `git show 885d3e3:CLAUDE.md`
(the Turn 24 merge), CLAUDE-T24.md deleted from the root, this file as CLAUDE.md, the README's
lines, APP_VERSION 'v52', docs/art/REQUESTS-T25.md (section 9).
T25-A2 Phase A as section 3 says.
T25-B1 2.3. T25-B2 2.4 and the Output sheet's `<why>`. T25-B3 2.5. T25-B4 2.8 and the breakdown.
T25-B5 the words: no screen says "waiting for" a machine or "no bench" anywhere. T25-B6 2.6.
T25-B7 2.7.
T25-C1 notes (docs/notes-t25.md). T25-C2 scenarios, the thirty day and three month figures
restated with the reason for every move. T25-C3 cross check. T25-C4 look and shoot: eleven
pictures into docs/report-t25/ (four men and one used saw, three of them marked `no place at the
saw`; the same hall with an industrial saw; a two place saw with two men at it; two saws with
men spread over both; the day 53 fixture after one minute, seven men and two saws, nobody in a
heap; a machine card with `Places: 2 of 2 in use, Pete and Eddie`; the Owned tile's short form;
the efficiency breakdown with `Saw, industrial: +12%` and a `no place` line; the Work Plan's
line; a contract card with the green capacity line; one with the red). T25-C5 report
(REPORT-T25.md) and PR titled `Turn 25: places at the machines, and no man ever queues again`,
do not merge, end the session.

## 6. Do not (tonight)

- No change to the money, the job templates, the stages and their shares, the dust, the air, the
  extraction, the wages, the crew limit, the canteen, the loan.
- The machines' hours, their service and their breakdowns **stay exactly as they are on v51**
  [PIOTR, 21.09: keep the hours; 22.09: the service every six months on the calendar]: a machine
  books an hour for every hour a man works at one of its places, against the life its class has,
  and the service is due six months from its purchase or its last one whatever it ran.
- No change to the weekly contract offer of v51, to the hiring gate (a bench place for every
  joiner and one for the owner, T24 2.2), to the canteen, to the restock rule of T24 2.8, to the
  contract prices.
- No sound; no new screen; no picture drawn by an agent; no sprite touched.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `grep -rn "waiting for the\|waitingStation\|heldMachine\|claimMachine\|releaseMachines\|takeMachines\|familiesWanted\|stageFor\|stationFreeFor\|standsForBench\|NO_BENCH\|noBench\|takenBy" src`:
  nothing but the migration and the dead field's declaration.
- The four fixtures open, and the day 53 fixture after one minute has nobody at a waiting cell
  and nobody on anybody's cell, asserted.
- Four men, one used saw, a full day: one man's output, three idle minutes with `noPlace`,
  asserted; the same four with a standard saw: two work, asserted.
- A man taken off his job frees his place and the next man works the next minute, asserted.
- A hall with a used and an industrial saw cuts at 1.12, asserted.
- Two saws, four men: the figures stand at four different places over two machines, asserted.
- The contract line's figure falls when a saw is sold, asserted.
- Every scenario green; the thirty day and three month figures restated in the report, with the
  reason for every move, off the ledger by category and never guessed.
- Every changed screen beside its nearest existing one in the report; `git diff main --stat --
  src/ui/styles.css` with no new token.
- The ten pictures.

## 8. Parked

- The tool cabinet's slots, the lockers, the bench places as a hiring gate: unchanged tonight.
- A bigger canteen, the owner's holidays, the weekly summary card, the tips under a monthly
  report, the sprayer's sheets, the backs of the sprites, the sound files. The restock cap was
  settled in Turn 24 (2.8 there).
- The three Turn 20 leftovers Piotr has not ruled on.

## 9. Art requested (docs/art/REQUESTS-T25.md)

- Nothing new tonight. Still owed from earlier turns: the sprayer's four sheets, the helper's
  bench sheet, the backs (`.rr`, `.rrr`) of every floor family, the seven recordings.

## 10. What moved between 21.09 and today, and how this brief reads on v51

The brief above was written on 21.09 against v38. Main has moved since: the chat fixes v40 to
v49 (the entry point prices, the contract's whole day, the bag of work in any order, the walk
speed, the bags at 80%, the bench only at bench stages, the house pictures, the thicknessers),
Turn 24 "the number says who made it" (v50: the Output sheet's block, the owner's bench place at
the gate, the contract man at the canteen door, wear on machine minutes, the bench front row,
the plates, the central systems' service, the restock whole), and v51 (the service every six
months on the calendar, the men needed hint, the weekly offer). Every one of those is on the
tree this turn starts from, and this brief was reissued to read on it:

- 2.2 names everything the queue grew between v38 and v51 and deletes it all: one track, places.
- 2.3 gives the contract men places like everybody, folds v47's bench gate into the places, and
  re plans when a job's stage moves family or a machine comes back from service.
- 2.4 keeps Turn 24's Output block and reads the hall's pace into its `<why>`.
- 2.6 lays a machine's places out the way Turn 24 laid a bench's, one list for both.
- 2.7 keeps v51's men needed line beside the new hall line.
- Section 6 keeps v51's calendar service and everything Turn 24 and v51 settled.
- The version numbers, the turn number, the report and notes files and the scenario letters
  follow Turn 24, which took v50, STATE_VERSION 26 and (pp).
- A chat ZIP named v52 (the queue dealt over the machines) was built on 23.09 and never pushed;
  this turn supersedes it, so nothing of it is on main and nothing of it is wanted.

End of brief.