# Notes from Turn 26

One agent, serial, no worktrees. This file is what did not fit in `REPORT-T26.md`'s two lines a
task: the readings of the brief that were not the only possible one, what the changes found in the
engine, and what a later turn will want to know before it touches the same code.

---

## 1. The day 53 fixture is a stand-in

The brief names "the day 53 fixture" three times (sections 5, 7 and 9). The tree has `day128-v25`
and `day149-v25` and no day 53 save, so `day53Hall` in `tests/helpers.ts` stands Piotr's hall of
01.10 up from his words: six joiners (Jack T, Jack B, Pete, Eddie, Callum, Ben) on six jobs of sheet
work, two of them lacquered, a pro CNC, a pro saw, two standard edgebanders, a standard moulder, a
standard booth, three industrial benches, a pro rack, the labourer Frank, Sam in the office, Dan
the draftsman, and Nathan on a standing contract of cut sheet packs, at 13:01. The layout is mine
("no two zones meet"), and it has one corner the C3 walk can only reach through an overhang (5
below). A save of Piotr's replaces it in one line and every test that reads it stays as written.

## 2. The crew limit, the bench slots and the lockers

2.10 makes the crew limit eight joiners. Two older gates stand in front of it and the brief leaves
both alone:

- The unit's `benchSlots` (6 on very easy, 4 on easy and hard) refuse a seventh joiner on very easy
  and a fifth on the others at the hire card, before the crew line is reached. Piotr played with
  six joiners on very easy, which is the slots' limit, so eight joiners cannot be hired through the
  card on any difficulty. The cross check of section 7 puts the eight on the books by hand for that
  reason. Raising `benchSlots` is a one line change and Piotr's to make.
- The canteen's eight lockers. "The lockers and the canteen count the men on the floor, joiners and
  the labourer" (2.10): so the eight lockers hold the joiners and the labourers between them, and a
  shop with eight joiners has no locker for a labourer. The office and the manager keep none and
  pass eight on the books, which makes T23's "nine men under a novice" reachable through the hire
  card; its scenario (nn) is flipped to say so.

## 3. The draftsman's tab and his order of work

The Our team tabs are by trade, and the draftsman's trade was `office` beside the estimator. With
the estimator and the clerk gone the office tab would have shown him beside the admin and the
salesman, and the Technical tab (the manager's) would have hired nobody new; he is on Technical, the
drawings being technical work. A draftsman who has the survey and the drawing of one job on his list
took the drawing first (it was created first) and the survey waited for him; the survey is now
created before the drawing and the drawing waits for the meeting and the survey, which is the order
the work goes in.

## 4. The agency and its big jobs

- The switch is locked below a standing of 50: its jobs come from 50 (2.13), and 5,000 a month for a
  board that cannot show one is a trap. Mine [TUNE], in the mockup of section 9.
- A free joiner is one with no job and no contract, literally: a man off sick or under notice who is
  on nothing counts.
- "Taken, the four are put on it by the Take it click": the board's button is Accept, and the job is
  made when the client's figure is accepted, a click later. The free joiners are counted at both
  clicks and put on the job at the second. A job is only assigned while it is ready or in
  production, so the crew of a big job are written on it directly and stand by it through its
  meeting, its survey, its drawings and its sheets (`crewStandsBy`); the minute it is ready it goes
  into production with them on it (`refreshJob`). Every other job is untouched.
- The deadline is "the ordinary rule on its labour". That rule caps at 30 working days plus a tenth
  to a seventh of slack, and a big job's labour is 0.4 of its value like any job's. Measured on the
  hall of section 1 (experienced men, the hall's own points left out): at 100,000 four men need 27.5
  working days of the 34 the client gives, at 250,000 eight need 34.4, and at 1,000,000 eight need
  137. So from about a quarter of a million up a big job cannot be made on time by any crew the unit
  holds. Piotr's range stands; the cap is the lever if the top of it is to be makeable.
- The big job is drawn on a side stream of the day, as the contract offer is, so a game with the
  agency off draws the very same board it always did.

## 5. The overhang, measured

"The overhang per family, read off the sprite manifest's canvas against the footprint." Every
delivered front picture of a floor class was measured on 02.10: 62 files, every one of them the
canvas docs/art/SPRITES.md 2 gives its class's footprint, six of them a pixel off. So no picture is
bigger than its footprint, and the whole of the overhang is that a footprint stands centred in its
working zone: a 2 by 1 saw in a 3 by 3 zone starts half a cell in, `footprintCells` counts it on two
cells, and the drawn table reaches half into a third. `pictureCovers` counts a cell a machine's
drawn footprint covers half of or more [TUNE]; with every zone and footprint in whole metres every
overhang cell is covered exactly half, so the threshold is the whole question, and at more than
half there would be no overhang at all.

Only machines (the `machine` category): a bench's top reaches half into its front row too, and its
front row is where its men stand (T24 2.5); a rack and a fan are gone round by their free sides. On
the day 53 stand-in the moulder's corner is sealed by the saw's and the booth's half cells, and the
walks to it go through them (`walkRoute` kind `overhang`, 20 of 110 pairs); nothing on the three
halls takes the straight line.

## 6. The depth keys and the depth order

2.4 says the keys do not change and only the order is honoured. The keys alone cannot hide a man
behind a machine: a machine's key is the back corner of its zone, so a man on the row behind its
table (18.2 against the moulder's 18 on the day 53 hall) sorts after it whatever the re-sort does.
`figureSlot` keeps the keys for everything without a footprint (other men, the floor's own marks)
and places a man against a thing with a footprint by whether his feet are short of its front on
both axes, which is what the key stands for in a thing bigger than a cell. Where the two cannot both
hold (a man behind one thing and in front of another that the scene sorted the other way) the thing
he is behind wins and he is hidden. A full insertion moves a walker against drawables that never
meet him on the screen too, so a walk can move him on more frames than it crosses machines; nothing
is moved on a frame his slot does not change.

## 7. One machine hour a clock hour, and the dust

2.1 books one hour for every clock hour at least one man is at a machine, however many are, and the
wear on the same minutes. `accumulateMachineMinute` books the dust off the same minutes it books the
hours, so the dust is now a machine's figure an hour it runs and not an hour a man stands at it: a
saw two men share makes the dust of one saw. I read "eight men at a CNC is one CNC running" as the
rule for both [TUNE]; it moved no scenario figure. A contract's men and a job's men at one machine
book its minute once. A contract's wear in its closing report is charged on its own
`machineMinutes`, lifted from its man minutes for a save.

## 8. Reputation booked and rating said

A gain is booked at half (2.11); the client's rating on the delivery card is still what the client
said (`The client rates the job +3`), and the Reputation sheet's line is the 1.5 booked.

## 9. Left for Piotr

- `public/sprites/palletTruck.standard.png` and `.r.png` are still on disk (renamed in v54, listed in
  v61's DELETED.txt); deleting them was refused by this session's permissions. Deleting them and
  putting 66 back in `tests/engine/rotate.test.ts` and `tests/render/spriteClasses.test.ts` closes it.
- `benchSlots` (2 above), the deadline cap for big jobs (4 above), and the agency's lock below 50.
