# Turn 24: places at the machines, and no man ever queues again

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud, agent
teams expected, a day of it). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat),
21.09.2026, from Piotr's decision of the same evening (Petros: software/woodwork-empire, STAN).

Read this whole file (first line must say "Turn 24"; if the root CLAUDE.md does not, stop and
report), then REPORT-T23.md in full, then docs/mockups/t24/README.md and its picture, then
docs/ui-style.md, then the archived briefs in docs/. Where files disagree, this one wins. All
standing rules apply (no em or en dashes anywhere, scope 1:1, one code path, constants never in
the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill background processes, PR
without merge, end the session, no PR watching, npm run check gated on its own exit code, every
click single, one APP_VERSION bump).

Precondition. main carries Turn 23 merged and the chat fixes v37 and v38: APP_VERSION 'v38',
STATE_VERSION 22. If APP_VERSION is not 'v38', stop and report.

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

- APP_VERSION = 'v39'. STATE_VERSION bumps to 23 in phase A, once.
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
waiting stations (`waitingStation`, `stationWaitingFor`, the waiting row of `stationRow`),
`heldMachine`, `freeMachines` as a queue question, the "waiting for the saw" blocked line, the
`noMachine` idle reason as a per-minute event, and the bag of work of v37 (`stageFor`,
`stationFreeFor`, `stageMayStart`; `stageLabour` **stays**, because the stages are still where the
work goes and the Work Plan draws them). A man put on a job works his job's current stage at his
own rate, minute after minute, and the hall's places decide only **how many men can work at once**
(2.3). `Equipment.takenBy` is kept in the record for one turn as a dead field the migration
clears, so an old save loads.

**2.3 The hall's places decide who works, once a day and not once a minute [PIOTR].** At the start
of each working day, and again whenever the player assigns, unassigns, buys, sells, moves or
breaks something, the engine works out **who has a place** and writes it on the man
(`Worker.working: boolean` and `Worker.noPlaceFor: string`, the family he could not get into):

- Every man on a job needs one place of the family his job's current stage wants (`familyForStage`,
  unchanged). A stage whose family the hall does not own at all is worked by hand as it always was
  (CLAUDE.md T7 3.6) and needs no place.
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
**best class of F standing unbroken in the hall**, whatever machine of it the man is at [TUNE,
Piotr's figures]:

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
bench's places and pace of Turn 23 fold into these two tables and stop being their own rule.

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
the figure loop and the card of 2.5 both read.

### What it fixes beyond the queue

**2.7 A contract says what the hall can make [PIOTR: "we take a contract and we do not know
whether the hall can do it"].** The contract offer card, the Contracts tab and the acceptance
check gain one line, off the same numbers: `Your hall makes about 26 of these a week at full
crew; this term wants 20`, red when the wanted figure is above what the hall makes. The figure is
the arithmetic the engine already has: the piece's minutes at the hall's pace for its family
(2.4), the men who could have a place for it (2.3), and the working days of a week. No new rule,
one honest number. Done: the engine test (a one saw hall makes fewer than a three saw hall; the
line turns red when the term wants more than the hall makes), the card tests.

**2.8 The Work Plan says the same in one line.** Above the jobs: `4 men working · 1 with no place
at the saw`. Nothing else on that screen changes.

## 3. How to run this session (agents)

- **Phase A (one agent, serial):** the two tables of 2.1 and 2.4, `placesOf`, `hallPlaces`,
  `machineForPlace`, `Worker.working` and `Worker.noPlaceFor`, STATE_VERSION 23 and the migration
  of section 4, and the deletions of 2.2 in the engine. Frozen for phase B after this.
- **Phase B (three agents):** B1 the day plan of 2.3 and the pace of 2.4 (production.ts,
  staff.ts, efficiency.ts, jobs.ts); B2 the screens: the cards of 2.5, the Work Plan line of 2.8,
  the breakdown lines, the removal of every waiting word (catalogue.ts, machine.ts, jobCard.ts,
  workPlan.ts, personCard.ts, topbar.ts); B3 the figures of 2.6 and the contract line of 2.7
  (hall.ts, stations.ts, characters.ts, contracts.ts, contractsTab).
- **Phase C (one agent, serial):** the notes, the scenarios (every one that turned on a queue
  rewritten to places: (pp) four men and one used saw: one works, three say `no place at the saw`,
  and the month's output is one man's; (qq) the same four with an industrial saw: three work at
  1.12 and the fourth says the line; (rr) a contract the hall cannot keep up with is red on its
  card before it is signed), the cross check of section 7, the pictures, the report, the PR.

## 4. State

STATE_VERSION 23. `Worker.working` and `Worker.noPlaceFor` are added (the migration works them
out on the first day it runs, so an old save opens with the right men working);
`Equipment.takenBy` is cleared to null on every item and never written again; every job's
`blockedBy` that says `waiting for the ...` is cleared. Every v33 to v38 save loads.

## 5. Task queue, in order

Branch turn-24-places-at-the-machines from main. One commit per task, npm run check green on its
own exit code before each, two report lines per task in REPORT-T24.md.

T24-A1 Housekeeping and v39: docs/turn-23-brief.md archived byte for byte, the README's lines,
APP_VERSION 'v39', docs/art/REQUESTS-T24.md.
T24-A2 Phase A as section 3 says.
T24-B1a 2.3. T24-B1b 2.4. T24-B2a 2.5. T24-B2b 2.8 and the breakdown. T24-B2c the words: no screen
says "waiting for" a machine anywhere. T24-B3a 2.6. T24-B3b 2.7.
T24-C1 notes. T24-C2 scenarios. T24-C3 cross check. T24-C4 look and shoot: ten pictures into
docs/report-t24/ (four men and one used saw, three of them marked `no place at the saw`; the same
hall with an industrial saw; a two place saw with two men at it; two saws with men spread over
both; a machine card with `Places: 2 of 2 in use, Pete and Eddie`; the Owned tile's short form;
the efficiency breakdown with `Saw, industrial: +12%` and a `no place` line; the Work Plan's line;
a contract card with the green capacity line; one with the red). T24-C5 report and PR titled
`Turn 24: places at the machines, and no man ever queues again`, do not merge, end the session.

## 6. Do not (tonight)

- No change to the money, the job templates, the stages and their shares, the dust, the air, the
  extraction, the wages, the crew limit, the canteen, the loan.
- The machines' hours, their service and their breakdowns **stay exactly as they are** [PIOTR,
  21.09: keep the hours]: a machine books an hour for every hour a man works at one of its places.
- No sound; no new screen; no picture drawn by an agent; no sprite touched.
- No storage access outside src/cloud/store.ts; no PixiJS, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- `grep -rn "waiting for the\|waitingStation\|heldMachine\|takenBy" src`: nothing but the
  migration and the dead field's declaration.
- Four men, one used saw, a full day: one man's output, three idle minutes with `noPlace`,
  asserted; the same four with a standard saw: two work, asserted.
- A man taken off his job frees his place and the next man works the next minute, asserted.
- A hall with a used and an industrial saw cuts at 1.12, asserted.
- Two saws, four men: the figures stand at four different places over two machines, asserted.
- The contract line's figure falls when a saw is sold, asserted.
- Every scenario green; the thirty day and three month figures restated in the report, with the
  reason for every move over 5%.
- Every changed screen beside its nearest existing one in the report; `git diff main --stat --
  src/ui/styles.css` with no new token.
- The ten pictures.

## 8. Parked

- The tool cabinet's slots, the lockers, the bench places as a hiring gate: unchanged tonight.
- A bigger canteen, the owner's holidays, the weekly summary card, the tips under a monthly
  report, the Restock cap (Piotr has not ruled), the sprayer's sheets, the backs of the sprites,
  the sound files.
- The three Turn 20 leftovers Piotr has not ruled on.

## 9. Art requested (docs/art/REQUESTS-T24.md)

- Nothing new tonight. Still owed from earlier turns: the sprayer's four sheets, the helper's
  bench sheet, the backs (`.rr`, `.rrr`) of every floor family, the seven recordings.

End of brief.
