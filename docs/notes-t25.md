# Notes from Turn 25

One agent, serial, no worktrees. This file is what did not fit in `REPORT-T25.md`'s two lines a
task: the readings of the brief that were not the only possible one, what the places found in the
engine on their first night, and what a later turn will want to know before it touches the same
code.

---

## 1. "Once a day and not once a minute", and how the plan is actually run

2.3 asks for the plan at the start of each working day and again whenever the player assigns,
unassigns, buys, sells, moves or breaks something. The engine has no list of those events; it has
one `settle` that every action and every tick ends in. So `planPlaces` runs inside `settle` (in
`updateStations`) and once more at the top of every production minute, from the hands of that
minute.

That is the same answer, not a looser one. The plan is a pure function of who is on what, the
stage each job is at and the machines standing unbroken in the hall, and it gives the places out
in a fixed order (the owner, then the crew in the order they were hired). Between two of the
brief's events none of those inputs moves, so the plan written at minute 10 is the plan written at
minute 11. `tests/engine/dayPlan.test.ts` holds it to that over thirty minutes. What running it
often buys is that a stage moving family (a job finishing its cutting and going to the bench) is
picked up the minute it happens, which the brief also asks for (section 10, 2.3).

## 2. Why there is a `hallStopped` cause beside `noPlace`

2.3 says the `noPlace` line "means this and only this". On v51 the `noMachine` line also carried
the minutes of a job the hall had stopped: no extraction, no air, the bags full, the kit still on
the lorry. Those are not a missing place, and booking them to `noPlace` would make the line lie
about the one thing it is for. They go to a fifth cause, `hallStopped` (`Hall stopped` on the
plate), and a worker's idle meter has the same fifth reason. The migration moves a save's old
`noMachine` minutes to `noPlace`, because on v51 the queue was by far the larger part of them and a
closed month cannot be split after the fact; that is the one place the two are not told apart.

## 3. The owner never takes a place from a man

The plan's order puts the owner first (2.3). Read alone, that means the owner walking on to a job
takes the saw's one place from the joiner who had it. The brief's first rule of tonight is "a man is
never blocked by another man", and on the three month playthrough the owner's auto join (Turn 23
2.3: he takes the oldest open job himself) stood joiners at their home cells and left the three
months measurably worse off than with him kept to spare places.

So the owner's own choice of a job (`ownerTakesAJob`) only walks him on to a job whose current
stage has a place to spare or wants none (`placeToSpareFor`). When the player puts him on a job
himself the plan's order stands and the owner is first, which is what the order is for. The one
rule reads both ways: the owner never displaces a man by his own choice, and the player can always
put him first.

## 4. The pace ladder moves every figure that stood on a dearer machine

2.4's table is Piotr's and the old per class figures went with the old rule: an industrial saw
was 1.30 and is 1.12, a pro one 1.15 and is 1.08, the edgebander's top was 1.35. Every test and
scenario that bought a better machine and asserted what it bought moved with it; each is restated
in its own comment and in C2. The bench's own column of Turn 23 (1.03, 1.06, 1.10 at standard, pro
and industrial) folds into the one ladder (1.05, 1.08, 1.12), so a good bench is a little quicker
than it was.

The CNC's own head factor (2.0, or 2.1 with the tool changer) is a figure of Turn 7 and stays; the
class pace multiplies it like every family's. A used CNC is 1.90, which it never was before,
because on v51 the CNC stage read the head alone.

`PACED_FAMILIES` is the places table's seven and the solid wood tools. The tools have no places
(they come out of a cabinet, 2.3) but their class was a speed on v51 and their stage is a stage a
man works, so their class is a pace like the rest. Every other family's class is its capacity, its
air or its store and never a speed.

## 5. The by hand lead, which Turn 24 could only report

REPORT-T24 section 0 item 1: the lead of a by hand job held his own bench and ran at its class,
while the men behind him ran at 0.67. The stage's speed is now the one figure every man at a stage
works at, whatever machine his place is at, so the lead of a by hand job runs at 0.67 like the men
behind him. Nothing was changed for this: it fell out of there being one code path, and the day
149 fixture's rows now read the same arithmetic for every man on the oak table.

## 6. The fixtures the brief names and the tree does not have

Section 7 and C4 ask for "the four fixtures" and "the day 53 fixture after one minute, seven men
and two saws". The tree has three day fixtures (`day115`, `day128`, `day149`, all v25) and the three
old saves (`save-v18` to `save-v20`); there is no day 53 save anywhere in the history. The day 53
checks run on the three day fixtures instead, and the picture is the day 115 fixture, which is the
one with seven people on it. It is reported as a blocker in REPORT-T25 so Piotr can send the save
if he meant a different one.

## 7. The one line the section 7 grep still finds

`waitingForBoss: 'waiting for the boss'` is the Turn 23 mark over a man nobody has put on anything.
It matches `waiting for the` and is not about a machine. It stays; every other match outside the
migration and the dead field is gone, comments included.

## 8. The Work Plan's line is always drawn

2.8's line is drawn even when nobody is on anything (`0 men working`). The first version drew
nothing then, and `tests/ui/oneClick.test.ts` caught it: the line came and went between two frames
as the owner was put on and taken off a job, the board under the pointer shifted by a paragraph,
and every other click landed on nothing. A line that is always there keeps the board's shape.

## 9. The acceptance check of 2.7

2.7 names three places for the line: the offer card, the Contracts tab and the acceptance check.
The game has no acceptance dialog: the Accept button is on the Contracts board's offer tile and the
`Take it` button on the Contracts tab's offer card. The line is on both of those, so it is on the
card the click is made on and before it is made, and `acceptContract` in the engine is unchanged
(no new rule, as 2.7 says). The owner is left out of the figure because `contractManCheck` refuses
him a contract; the card still costs him for comparison, as it did.

## 10. What a later turn should pick up

- The day 53 save, if it exists somewhere (section 6 above).
- The `noMachine` minutes of a closed month are all `noPlace` after the lift (section 2).
- The canteen door (`STATION_DOOR`) still has v4's second use: a joiner not on any job, with no
  bench of his own, in a hall with a ready job, stands there. It is not a queue and says nothing
  about a machine, so it was left; it is the one rule about a bench that is not a place.
