# Turn 17: the workshop earns by the hour

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud,
agent teams allowed). Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 17.09.2026,
from Piotr playing v23 and v24 on 16.09 and the evening's talk (Petros: software/woodwork-empire,
STAN T17-01 to T17-29).

Read this whole file (first line must say "Turn 17"; if the root CLAUDE.md does not, stop and
report), then REPORT-T16.md in full (section 13 says what v24 changed), then
docs/mockups/t17/README.md and open hall-strip-C.html in a browser, then the archived briefs in
docs/. Where files disagree, this one wins. All standing rules apply (no em or en dashes anywhere,
scope 1:1, one code path, constants never in the UI, [TUNE] for every figure you choose and
[PIOTR] for his, kill background processes, PR without merge, end the session, no PR watching,
npm run check gated on its own exit code, every click single, one APP_VERSION bump).

Precondition. main carries v24: APP_VERSION is 'v24', src/render/walkers.ts has the loop he never
stands on (data-loop), and src/render/pipes.ts exists. If APP_VERSION is not 'v24', stop and
report.

## 0. What this turn is for (Piotr, 16.09 and 17.09)

Piotr played two evenings and dictated twenty nine points. They fall into four groups, and the
one that gives the turn its name is the last:

1. The hall reads as a workshop: the helper is drawn, the welfare kit is in the canteen, the
   labourer does the labourer's work, a machine opens its own card, the strip under the hall is
   in the game's style, the pipes look like pipes.
2. The people are real: an Our team page, two men on one job, a hiring gate you can feel,
   overtime that is the owner's alone.
3. The desk stops nagging: tasks carry over, calls and emails die at dusk, several tasks at
   once, the laptop boots once, x30 comes home at x1, the stock is ordered by number.
4. **The workshop earns by the hour.** One gross figure at the top of the Company board and at
   the top of the month end: what the workshop earns for every hour it pays for. Piotr: "if the
   shop stands two days and the wages are paid, the rate drops by itself; if a joiner works four
   of the eight hours we pay him, it drops; a better saw, an express job, a clean hall all raise
   it. That is the measure." Beside it, on the board and in the report, the machines' own column,
   so the player sees an investment paying back in hours.

## 1. Rules restated (short)

Everything from Turns 1 to 16. Tonight in addition:

- APP_VERSION = 'v25'. STATE_VERSION bumps to 15 in phase A, once, for the fields section 4
  names; every v24 save loads.
- Output stays as it is [PIOTR, 17.09]: a machine speeds its own stage, a man's rate is his own,
  the hall's factor is the one multiplier. Efficiency stays on the top bar. Nothing in this turn
  sums the three into one number; the workshop rate (2.26) is the one figure that sees all of
  them, through the labour they actually earn.
- The rate is gross [PIOTR]: labour earned over hours paid, no costs on it, no cost line beside
  it.
- Nobody walks on the spot, ever. Anything this turn adds that puts a figure somewhere gives him
  a standing cell and a rest animation that is not a walk.
- Art is not this session's: placeholders through the one helper, requests in a new
  docs/art/REQUESTS-T17.md. docs/art/SPRITES.md is not touched.

## 2. Changes to the design (the contract)

### The hall

**2.1 The helper is drawn [PIOTR, bug].** A yellow shirted helper shows as a stroke, not a
figure. Find why (no character sheet for the role means the capsule; the capsule is a 12 by 26
rounded rect, so something is scaling or clipping the group, or the figure is drawn with a
height of nothing) and fix it at the source. Done: a render test that a hired helper on the
floor draws a visible body, capsule or sheet, and every role without a sheet does.

**2.2 The welfare kit lives in the canteen [PIOTR].** canteenSeat and locker stand inside the
canteen block, not on the hall floor: they are placed in the canteen (its cells, a fixed layout
by count, first seat by the door), take no hall cell, and the man at a seat or a locker stands
in the canteen doorway (roomDoorCell) facing in. Their effects (a seat per man, a locker per man)
stay as they are. Placement in setup mode does not offer them a hall cell. Migration moves any
seat or locker on the floor into the canteen.

**2.3 The labourer works [PIOTR].** The helper cleans the hall and unloads deliveries without
being asked: today `unload` and `cleaning` name him as autoRoles and he still does not. Find why
(the auto assignment does not fire, or the tasks are created for the owner first, or the helper
has no minutes) and fix it at the source: with a helper hired, a delivery is unloaded by him and
a dirty hall is cleaned by him, and the owner and the joiners are not asked. He walks the loop of
v24 for sheets and a plain walk (no sheet) for a machine off the lorry. Done: the helper tests.

**2.4 A machine off the lorry is a plain walk [PIOTR].** Unloading a machine is walking about the
hall empty handed, the walk animation, from the gate to where the floor was held for it and back,
as many times as the unload minutes allow, on the v24 loop. Nobody stands moving his legs.

**2.5 The strip under the hall, variant C [PIOTR; docs/mockups/t17].** The four lines of bare
text and the grey buttons under the hall are replaced by floating dark chips over the floor in the
hand font, bottom left, as drawn: one chip per thing that has to be done and nothing else: a dirty
hall (with the Clean up button on the chip), bags to change (with Empty bags), a machine due a
service (with its name). A clean hall with nothing to do shows no chip at all. The rack warning
and "no job has its material" go: the rack has its number (2.8) and the warning strip under the
top bar has the stock. The sentence about the mouse wheel becomes a tip shown once. Set up hall
stays as a chip when the hall is not in setup. The zoom is three small chips bottom right (Fit,
plus, minus). The black column on the left of the hall stays. Done: a render test of the chips
for a dirty hall, a full store, a service, and nothing.

**2.6 A click on a machine opens its own card [PIOTR].** Today a click on a machine writes a note
under the hall and the card is only in the catalogue's Owned tab, so the player never found
Connect to extraction. Tonight a click on a machine on the hall opens a modal for that one
machine (the folder skin): its picture and class, its effects, hours used and life, service due,
the bag store when it is the extractor, connected or not with metres of pipe, and the buttons
the Owned card has today: Connect to extraction, Service, Sell, Move. One card, the same
functions the Owned tab calls; the Owned tab keeps working. Done: the app test that a click opens
it with the right machine and that Connect works from it.

**2.7 Pipes that look like pipes [PIOTR].** Improve the vector helper, not the placeholder: a
wider bar with a darker underside and the lighter top edge, elbows drawn as a quarter arc and
not two bars with a disc, the drop landing on the machine's port as a short collar over the
footprint's top face rather than the cell's centre, the inlet a proper flange at the unit. Same
nine kinds, same data-pipe-tile keys, so every test of Turn 16 stays. Done: the look, section 7.

**2.8 The rack shows its sheets [PIOTR].** A large number on the rack itself (over its front
face, hand font, the class's colour behind it): the sheets in it. Updated live. Done: a render
test.

### The people

**2.9 Our team [PIOTR].** A new tab on the Team page of the laptop: every person, one row: name,
role, tier, started on day N (and how long ago), monthly pay, hours worked this month, days off,
what he is doing now. The owner is the first row. Done: its test.

**2.10 Two men on one job [PIOTR].** A job can have a second man assigned. Both book minutes into
it, each at his own rate, at the stage's station; the machine stage takes one of them at the
machine and the other at the waiting cell until his turn, the bench stage takes both at the bench
(the bench's second place of Turn 16). The work plan shows both names and assigning the second
is a click on the row. Done: the engine test (a job with two men finishes in about half the
days, minus the machine stage) and the work plan test.

**2.11 The hiring gate [PIOTR].** Hiring is refused when cash is below the candidate's monthly
pay: a 2,500 a month joiner needs 2,500 in the account. The hire card says "Not enough in the
bank: needs 2,500". Done: its test.

**2.12 Overtime is the owner's [PIOTR].** Workers go home at the end of the day, always; the owner
alone can stay. He may take over a worker's job for the overtime by a click on the row (never
automatically): the job's remaining hours fall by what he does, and the worker carries on with it
next morning. Done: the engine test (a worker's job does not move after 17:00 unless the owner
takes it; when he does, it moves and the worker resumes).

**2.13 The day meter grows with overtime [PIOTR, bug].** The bar ends at 540 today. It grows with
the minutes worked: 540 to 660 as the overtime runs, the overtime segment in its own colour.
Done: the topbar test.

### The desk

**2.14 A started task carries over [PIOTR].** A task somebody started (drawings, bookkeeping,
anything with minutes left) is continued next morning by the same person without being assigned
again. Calls and emails are the exception (2.15). Done: its test.

**2.15 Calls and emails die at dusk [PIOTR].** Every clientCall and emails task is dropped at the
end of the day, done or not; nothing carries over. The punishment is already in the client's
rating for the unanswered call and the unread email; nothing else is added. Done: its test.

**2.16 Several tasks at once [PIOTR].** On the laptop's Tasks page the player ticks several tasks
and presses Do these: they are queued for the owner and done one after another in the order
ticked. Done: its test.

**2.17 The laptop boots once a day [PIOTR].** laptopBootedOnDay exists; Piotr sees the boot on
every opening. Find why (the flag is not written, or is written on a different path than the
check reads, or the modal shows the boot without spending it) and fix it: the five minutes are
spent once, the first opening of the day, and never again that day. Done: the app test.

**2.18 Finished drawings go [PIOTR].** The Finished drawings list on the Drawings page is removed;
a drawing not done stays in the open list until it is. Done: the drawings test.

**2.19 x30 comes home [PIOTR].** At the start of every new day the speed is set to x1 whatever it
was. Done: its test.

**2.20 Restock by number [PIOTR].** The stock page's Restock takes a number the player types
(default: what fills the rack), capped at the free places in the rack; the delivery is next day
for standard sheets and two working days for bespoke ones (the lead time the deliveries already
have). RESTOCK_TO_SHEETS goes. Done: its test.

**2.21 Joinery Core is charged once [PIOTR, bug].** The first month is charged on purchase and
again at the month end. Keep the purchase charge and skip the first month end's line for it
(the subscription starts the month after). Done: its test.

### The money

**2.22 Standing contracts on stock [PIOTR].** A contract's material comes off the rack like a
job's (reserved sheets), never bought as money on the contract line. Its result is shown the
moment a man is assigned: price a piece minus material minus his labour at his rate, so a poor
joiner shows a thinner margin than a good one. Contracts come in different lengths of work: a
piece may be an hour at 8 profit or three days at 40, and the board offers both kinds so the
player chooses. The term is three to six months and the player may end it after the first month
with no penalty but the lost work. Done: the contract tests.

**2.23 The express deadline [PIOTR].** DEADLINE_EXPRESS_FACTOR goes from 0.6 to 0.8: an express
job is due 20% sooner, not 40%. Everything else about express is already as Piotr wants it (the
labour hours come from the base price, the uplift is pure profit); do not touch it.

**2.24 The Machines column on the Company board [PIOTR].** A third column, right of Output, headed
Machines: one row per machine standing in the hall: its class and its effect (+5%), the hours it
ran this week, and the minutes it saved (hours times its effect); a gate adds its +2% to the row;
a machine short of air or unconnected shows its minus. The total at the bottom: "Machines saved
us N hours this week". Informational: it multiplies nothing. Done: the company test.

**2.25 Total efficiency in the month end [PIOTR].** A section in the month end modal after the
money: machines (hours run times effect, the saved hours, the top three by name), people (rate
times minutes, the real work out of the paid hours), the hall (the average factor of the month:
dust, gate, extraction, absence), waiting (the minutes lost by cause, from Efficiency), and one
line: Total efficiency N% = real work over paid hours. Done: the month end test.

**2.26 The workshop rate [PIOTR, the turn's figure].** One gross figure:

    workshop rate = labour earned on jobs and contracts / hours paid

Labour earned is the labour value booked as work is done (the dayStats.labourValue the engine
already accumulates, plus contract pieces at their labour). Hours paid are eight for every
worker on the books and eight for the owner for every working day, worked or not, plus the
overtime the owner actually worked. No costs on it, nothing subtracted. The figure sits at the top
of the Company board, big, in the hand font: "Workshop earns £28 an hour", with "last week £26"
and "per man £9" small beside it (per man: the rate over the people on the books, the owner
included). The same figure is the first line of the month end, for the month. Reference: the
owner alone, at his work every minute, earns exactly OWNER_LABOUR_VALUE_PER_DAY / 8 = 40 an
hour; everything that slows him pulls the figure under 40, express and better machines push it
over. Done: the engine tests (the owner alone at full work for a week reads 40; two days idle
reads 24; a poor joiner half idle pulls it down; an express job pushes it up) and the board and
month end tests.

## 3. How to run this session (agents)

Three groups touch mostly different files, so agent teams are worth it; phase A first, serial.

- **Phase A (one agent):** section 4's fields and STATE_VERSION 15 with the migration; the
  constants (2.23, the rate's helpers' names); the hall click routing of 2.6 stubbed to the new
  modal id; the Tasks page action of 2.16 stubbed; every test green. The six frozen files of
  Turn 13 (types.ts, constants.ts, index.ts, game.ts routing, app.ts routing, styles.css class
  names) are frozen for phase B after this.
- **Phase B (three agents):** B1 the hall: 2.1 to 2.8 (render, hall.ts, walkers.ts, pipes.ts,
  machine card ui, catalogue.ts, stations.ts, staff.ts for the helper's auto work). B2 the people
  and the desk: 2.9 to 2.21 (staff.ts, production.ts, tasks.ts, laptop.ts and its pages, team.ts,
  topbar.ts, drawings.ts, materials.ts, economy.ts for 2.21). B3 the money: 2.22 to 2.26
  (contracts.ts and its ui, jobs.ts for the factor, company.ts, monthEnd.ts, a new
  src/engine/rate.ts for the workshop rate). A B agent that needs a frozen file writes a note for
  phase C and carries on.
- **Phase C (one agent):** apply the notes, the scenarios (the sixteen months with the new hiring
  gate, restock by number and overtime rule; plus (y) a month with two men on one job and a
  contract on stock; (z) a week that proves the rate: 40 alone, 24 with two idle days), the cross
  check of section 7, the screenshots, the report, the PR.

## 4. State

STATE_VERSION 15. New: job.secondAssignee (string or null), task carry over needs nothing new if
tasks already persist minutes, otherwise a `startedBy`; the laptop's queued task ids; the
canteen's welfare layout is derived from counts (no field); the rate needs `dayStats.paidHours`
per day and a rolling week, or is computed from the ledger's salary days: pick the one that
survives a save and say which. Migration: every v24 save loads; seats and lockers on the floor
move into the canteen; secondAssignee null.

## 5. Task queue, in order

Branch turn-17-the-workshop-earns-by-the-hour from main. One commit per task, npm run check green
on its own exit code before each, two report lines per task in REPORT-T17.md.

T17-A1 Housekeeping and v25: docs/turn-16-brief.md from the v24 commit's CLAUDE.md, the README's
briefs line, APP_VERSION 'v25', docs/art/REQUESTS-T17.md.
T17-A2 Phase A as section 3 says.
T17-B1a 2.1, 2.3, 2.4. T17-B1b 2.2. T17-B1c 2.5. T17-B1d 2.6. T17-B1e 2.7, 2.8.
T17-B2a 2.9, 2.11, 2.12, 2.13. T17-B2b 2.10. T17-B2c 2.14, 2.15, 2.16, 2.17, 2.18, 2.19.
T17-B2d 2.20, 2.21.
T17-B3a 2.26 (the engine first, rate.ts, its tests). T17-B3b 2.24, 2.25 and the rate on the board
and the month end. T17-B3c 2.22, 2.23.
T17-C1 notes, T17-C2 scenarios, T17-C3 cross check, T17-C4 look and shoot (ten pictures in
docs/report-t17: the strip with chips and without, a machine card, the canteen with seats, two
men on a bench, the Company board with three columns and the rate, the month end with Total
efficiency, Our team, the day meter in overtime, the pipes), T17-C5 report and PR titled
`Turn 17: the workshop earns by the hour`, do not merge, end the session.

## 6. Do not (tonight)

- No summing of Output, machines and people into one multiplier. Output's engine is untouched.
- No cost line beside the workshop rate. Gross, one figure.
- No change to express beyond the deadline factor.
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the sprite
  files, the character sheets or the font file.
- No storage access outside src/cloud/store.ts; no PixiJS, sound, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 7. The cross check (before the PR)

- The rate. The four engine tests of 2.26 read 40, 24, under 40, over 40 as written; the board
  and the month end print the same function's number.
- Nobody walks on the spot: grep render for a `carry` or `walk` set as a rest animation: none.
- The helper: with one hired, a delivery and a dirty hall are his in a scenario month, and the
  owner's day meter shows no fixing minutes for them.
- The gate: a hire with 2,499 in the bank is refused with the sentence.
- Dusk: after the day end no clientCall or emails task exists; a drawings task with minutes left
  does, with its person.
- The canteen: no seat or locker on a hall cell after the migration of a v24 save with them on
  the floor.
- The look: the ten pictures.

## 8. Art requested (docs/art/REQUESTS-T17.md)

- A helper character sheet (idle, walk, carry, bench), the capsule stands until then.
- Seats and lockers as they look inside the canteen (top view through the roof, or a symbol on
  the block face), the placeholder stands until then.
- The pipe tiles of Turn 13 stand as requested.

End of brief.
