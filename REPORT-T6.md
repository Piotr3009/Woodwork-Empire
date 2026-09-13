# Report: Turn 6

The rest of Turn 5, and a hall you can zoom into.

Branch `claude/turn-6-execution-4c7j9o` (the cloud environment names the branch; the turn ritual
would have called it `turn-6-rest-of-five`). Base: Piotr's commit `edf2ffa`, which put this brief
and `docs/turn-5-brief.md` into the repository. 637 tests green, `npm run check` clean on its own
exit code before every commit.

---

## 1. Done

| Task | Commit | What went in |
|---|---|---|
| T6-01 Housekeeping | `6b691a3` | `docs/turn-5-brief.md` arrived with Piotr's push; verified and listed in the README beside the other briefs. |
| T6-02 Office through the canteen | `64d05ed` | Room hit testing on the block silhouettes, nearest first, never on the layer images. |
| T6-03 Name on the wall, labels above the doors | `24cfccd` | The company name lettered into the rear wall plane; room names in the top third of each front face, clear of the door head. |
| T6-04 Zoom and pan | `4d77a07` | One camera transform on one scene group: wheel, drag, space, Fit, plus, minus, double click. |
| T6-05 Working day | `89c3e69` | 08:00 to 17:00 with an hour of dinner, the two questions the day puts, the overtime debt, and the old overtime model deleted. |
| T6-06 Tool cabinets | `f70a890` | `toolCabinet` at 350, one per worker and one for the owner; the hand edgebander holds no cell of the floor. |
| T6-07 Machine hours by capacity | `cb406f0` | Every family says how many men it serves; the hours, the bag and the service all count that one clock. |
| T6-08 Catalogue tabs and Owned | `0369490` | Eleven tabs in Piotr's order and an Owned tab with hours, service and state. |
| T6-09 Deadlines | `b68a8d0` | The deadline off the work in the job; the per template ranges deleted. |
| T6-10 Earned rate and Accounting by day | `faaeeb4` | `earnedRate(state, span)`, the Days tab, and one summary component for the evening and the past day alike. |
| T6-11 Leftovers | `c1f8734` | The Menu cadence driven through the page in a test; the office board name shrinks before it is cut. |
| T6-12 Scenarios | `8484d30` | The seven months answer to the new day, the cabinets and the deadlines, and month (h) follows the labour factor down and back. |
| T6-13 Report and PR | this commit | This file, then the PR. |

---

## 2. Not done or partial

1. **Staff overtime pay is still a paper rule.** 3.4 says "Staff overtime: 1.5x pay, up to 2 hours,
   within 17:00 to 19:00 (Turn 1 rule kept)", and kept is what it is: it was never implemented in
   Turns 1 to 5 and it is not implemented now. `runProductionMinute` excludes staff from every
   minute past 17:00, and wages are flat weekly and monthly. Implementing it tonight would have
   been new scope, not a kept rule. It is open question 4 below.
2. **The saw sprites of 3.11 are untouched**, as the brief says: no placeholder PNG, no loader
   change. The tool cabinet is a new key on the sprite check page and has no file yet, so it draws
   as a placeholder box.

---

## 3. The canteen that opened the office

Reproduced on the branch before anything was changed, and the cause is not the one the brief
guessed at. The office and canteen layers are registered correctly: measured against the delivered
PNGs, `hallOffice.png` has alpha exactly on the extruded block x 1..3, y 0..4, 2.7 m high, and
`hallCanteen.png` on x 3..5, y 0..4.

What was wrong is that the hit region was the room's **floor footprint**, and a block 2.7 m high
covers far more of the screen than the cells it stands on. The canteen block is painted over the
middle of the office's floor diamond, so a click aimed at the canteen landed on the office
footprint, which was drawn first and sat underneath. Sampling the delivered art says the same
thing: at the projected centre of the canteen's front face, `hallCanteen.png` is opaque and
`hallOffice.png` is not, and at the office's floor centre the canteen layer is opaque.

The fix is `blockSilhouette` in `render/iso.ts` and `roomAtScenePoint` in `render/hall.ts`: the
outline of the block the camera sees, tried nearest first, in the reverse of the order the rooms
are painted in. The layer images answer for nothing: they are one whole canvas each and would
answer for every pixel of the hall.

---

## 4. The day, from the front

- Clock 08:00 to 17:00. `DAY_END_MINUTE` is 540, which is the 480 minutes of work with the hour of
  dinner between them; `OVERTIME_END_MINUTE` is 660, which is 19:00, and the clock never passes it.
- At noon the day asks: take the hour, or work through it. Working through it puts 60 minutes into
  his pool today and 3% off tomorrow. Staff always take theirs, and the hall is empty of everyone
  but him while he works through it.
- At five the day asks again: home, or the hall until seven. Any day with any overtime in it adds
  0.10 to a debt, cumulative, floored at 0.5, wiped on Monday morning.
- Overtime is counted by the clock and not by the work: standing in the workshop past five is the
  overtime, whatever he fills it with. Otherwise a player could answer "stay" and idle the cost
  away.
- `ownerEfficiency` is now the labour factor and nothing else. An overtime minute is worth any
  other minute; what overtime costs is tomorrow.

---

## 5. Deviations from the contract

1. **The company name is not in the box 3.2 gives it.** The brief says "Box per SPRITES.md 9.5
   (canvas x 300..560, y 130..200)" and also that the name goes on the rear wall. Measured on the
   delivered `hallBackground.png`, that box is beside the **left** wall and above its roofline: at
   canvas x 300 the wall top is at y 270 and the box runs 130 to 200, so most of it is the dark sky
   over the building. This is REPORT-T5 open question 1, still unanswered. The box's **width** is
   what the name is fitted to, as the brief asks; its position could not be used. The name is
   lettered on the rear wall from x 9 m at 2 m up, which is the run of blockwork past the canteen
   block, tagged `[TUNE]`. Open question 1 below.
2. **The WC's front face centre opens the office, and that is correct.** 3.2 asks for a test that
   "a click at the projected centre of each room's front face opens the right thing". For the
   office and the canteen it does. For the WC it cannot: the office block is 2.7 m high and stands
   at x 1..3 right beside it, so along the camera's own ray the office roof is in front of the WC's
   front face. The painting agrees, `hallOffice.png` being opaque at that pixel. The WC answers on
   the part of it the camera can see, which is its roof, and the test says so.
3. **The deadline base is floored, not rounded.** 3.7 says `round(ownerDays x 0.9 + 3)`. For 500 of
   shelves that is `round(3.5625)` = 4, and with the 0 to 2 days of slack the total is 4 to 6, which
   breaks both the brief's own test ("500 shelves give 3 to 5 days") and Piotr's own words ("500
   pounds cannot have 12 days, max 5"). Flooring gives 3, and 3 to 5 with the slack. Nothing else in
   the range changes: for the 15,000 kitchen floor and round agree.
4. **"Needs Tool cabinet first", not "needs a tool cabinet".** 3.5 quotes the refusal as "needs a
   tool cabinet". The repository already has one path for a purchase that wants something else
   first, `spec.requires`, and it words every one of them "Needs X first". The edgebander and the
   hand tool set use that path rather than a second branch with a second wording.
5. **The service interval left the calendar.** 3.6 says the bag, the service and the endurance all
   count the machine's own hours. `SERVICE_INTERVAL_DAYS` is gone and `SERVICE_INTERVAL_HOURS` is
   80 `[TUNE]`: a table saw serves three men, so a one man shop puts 80 hours on it in the 30
   working days the Turn 1 monthly service already landed on, and a saw with three men on it is
   serviced three times as often. The brief gives no number for it. Open question 3 below.
6. **The camera resets to the fit when the hall is entered again.** 3.3 tags this
   `[TUNE: reset or remember; report it]`. It resets. Walking out of the hall is walking out of it,
   and coming back to a view pushed somewhere you cannot remember pushing it is the kind of thing
   that reads as a bug.

---

## 6. What the review of the whole diff turned up

REVIEW_SECTION

---

## 7. Paths: how many code paths do the same job?

| Behaviour | Paths | Note |
|---|---|---|
| Say which room a click landed on | 1 | `roomAtScenePoint`. The `<g data-room>` carries the tooltip and the hover shape, and no longer the answer. |
| Turn a click into a point of the scene | 1 | `scenePointUnder`, and `contentPointUnder` over it for the camera. The cell under the pointer and the room he clicked come off the same number. |
| Fit a name to a box | 1 | `fitName`, at the hall's sizes and at the office board's. The office stylesheet's own ellipsis is gone. |
| Letter text onto a painted plane | 1 | `paintedText` with `wallMatrix`. The company name and all three room names go through it. |
| Measure a day's work | 1 | `workedMinutesOfDay`, which now takes the skipped break as well. |
| Say when the working day is over | 1 | `isOvertime` on the clock, and `isDayExhausted` for seven o'clock. |
| Say what today's work is multiplied by | 1 | `labourFactorFor`, read through `ownerEfficiency`. |
| Wear a machine out | 1 | `accumulateBagMinutes` with the capacity share: the hours, the bag minutes and the service all come off it. |
| Say whether a service is due | 1 | `serviceIsDue` on the hours since the last one. The hall line, the Owned tab and the daily roll all ask it. |
| Say how long the client gives | 1 | `deadlineDaysFor`. The templates carry no ranges to disagree with it. |
| Say how many of his own days a job is | 1 | `ownerDaysFor`, machines and all. The board tile and the deadline read the same number. |
| Say what a machine costs in minutes | 1 | `speedFactorFor`; `jobSpeedFactor` is it, with a job's own material and by-hand. |
| Build the summary of a day | 1 | `daySummaryOf`. The evening's modal and the record the Days tab opens come out of it. |
| Draw the summary of a day | 1 | `renderDaySummary`. |
| Say what a day came to in money | 1 | `daysOfMonth`, which is the ledger added up, so a row cannot say what the ledger does not. |
| Decide whether a thing holds cells of the floor | 1 | `standsInTheHall`. Placement, collision, the hall painting, the ducting and the sprite page all ask it. |

---

## 8. Numbers I chose, and where they are

Every one is `[TUNE]` in the source, because the brief did not set it.

| Number | Value | Why that value |
|---|---|---|
| `LABOUR_FACTOR_FLOOR` | 0.5 | The brief names the floor and tags it `[TUNE]`. |
| `SERVICE_INTERVAL_HOURS` | 80 | The 30 working days a one man shop already got out of a saw that serves three. |
| `MACHINE_CAPACITY_DEFAULT` | 2 | The brief: "others 2 `[TUNE]`". |
| `ROOM_DOOR` | 0.9 m by 2.1 m | Measured off `hallOffice.png`: the painted door is 0.92 m wide with its head at 2.1 m. |
| `ROOM_LABEL_CLEARANCE` | 0.1 m | The smallest gap that keeps the lettering off the door head and inside the face. |
| `HALL_NAME_WALL` | x 9 m, z 2 m | The clear run of rear wall past the canteen block, at eye height. Deviation 1. |
| `OFFICE_NAME_SIZE_MIN` | 12 px | The Turn 5 brief's own floor for the office board. |
| `DAY_SUMMARIES_MAX` | 90 | Three months of working days of end of day records. |
| Camera reset | reset, not remembered | Deviation 6. |

Piotr's numbers, tagged `[PIOTR]` where they live: the hour at noon, 3% for skipping it, 0.10 of
debt a day, 17:00 and 19:00, 350 for a cabinet, 3 men to a table saw, 8 hours a day at full
capacity, the deadline formula and its slack, 0.6 for express, wheel steps of 1.2 and 4x fit.

---

## 9. Replaced session choices

Every value `REPORT-T5.md` section 8 said the Turn 5 session chose, and what the owner's brief
replaced it with tonight.

| REPORT-T5 section 8 | Turn 5 chose | Turn 6 | Where |
|---|---|---|---|
| `BREAK_START_MINUTE` | 240 `[TUNE]` | 240, and it is Piotr's: `[PIOTR]` | `constants.ts` |
| `BREAK_MINUTES` | 30 `[TUNE]` | 60 `[PIOTR: an hour]` | `constants.ts` |
| Hall name lettering | 18 px down to 11 px | unchanged, and now on a wall | `render/hall.ts` |
| Room face lettering | 11 px | unchanged, and now above the door | `render/hall.ts` |
| Room block height | 2.7 m | unchanged; it is `docs/art/SPRITES.md` 9.3 | `constants.ts` |
| Footprint rounding | halve, round up, never below 1 | unchanged, with one exception the owner asked for: the hand edgebander is 0 | `constants.ts` |
| `YARD_WIDTH_CELLS` | 3 | unchanged | `constants.ts` |
| The end of the day | 16:30, from the 30 minute break | 17:00 `[PIOTR]` | `constants.ts` |
| Overtime | hour bands 0.8, 0.6, 0.4, 0.4 and 0.05 of fatigue an hour, both Turn 1 | deleted: a tenth of a day's output per day with overtime in it, cumulative | `constants.ts`, `owner.ts` |
| The hard stop | twelve hours of work | 19:00 `[PIOTR]` | `clock.ts` |

Deleted with their tests: `OWNER_NORMAL_HOURS`, `OVERTIME_EFFICIENCY`, `MAX_HOURS_PER_DAY`,
`MAX_MINUTES_PER_DAY`, `FATIGUE_PER_OVERTIME_HOUR`, `MIN_OWNER_EFFICIENCY`,
`SERVICE_INTERVAL_DAYS`, `hourEfficiency`, `hourIndex`, `setTomorrowFatigue`, `owner.fatigue`, and
the `deadlineMinDays` and `deadlineMaxDays` of all six templates.

---

## 10. Open questions for Piotr

1. **Where does the company name go on the wall?** The box `docs/art/SPRITES.md` 9.5 gives is over
   the sky beside the left wall, measured on the delivered painting, and Turn 5 asked this already.
   Tonight it is lettered on the rear wall from 9 m along at 2 m up, which is clear blockwork past
   the canteen. Is that where you want it, or should the art paint a sign somewhere and the box
   move to it?
2. **The new deadlines cost the scripted month two thirds of its reputation.** The careful month
   used to end above 10 and ends at 3, with four of its six jobs late. Your rule is what makes it
   so: a bookcase is a day and a bit of your own time, so the client gives four to six days, and a
   one man shop that does the drawing, the calls, the material order and the transport takes about
   that. Do you want the deadlines this tight and the shop to have to work to them, or should the
   slack be wider for the small jobs?
3. **How long between services, in hours?** The service left the calendar tonight, as 3.6 asks.
   80 hours keeps the monthly service a one man shop already had. A busy hall now services three
   times as often. Is 80 the number?
4. **Staff overtime.** 1.5x pay for up to two hours between five and seven has been a paper rule
   since Turn 1 and is still one. Do you want it built, and does a joiner refuse the third hour or
   simply go home?
5. **Does the hall remember where you left the camera?** It does not: every visit starts on the
   whole hall. Say the word and it remembers.
6. **The WC is behind the office.** The office block hides all but the top of the WC's front face,
   so its name is lettered on a face the camera cannot see and its roof is the only part of it you
   can click. Does the WC want moving, or a sign on the office wall instead?

---

## 11. Known risks

1. **The scripted month is a different month again.** The deadline draw is one more call on the
   same seeded stream, so every draw after the first enquiry lands differently from Turn 5. A
   scenario asserts one path through the RNG, not a law of the game.
2. **The bag now fills three times slower for a one man shop.** That follows from the hours model:
   one man of three puts a third of the machine's hours on it. The interval itself is Piotr's 2,400
   minutes, but what a minute of it means has changed.
3. **`state.days` is new persisted state and grows to 90 rows.** A saved game carries it. The cap
   is `[TUNE]`; past it, the Days tab still shows the money, because that comes off the ledger, and
   only the summary button goes.
4. **The camera is UI state, so a save does not carry it.** That is the brief's own decision, and it
   means a loaded game always opens on the whole hall.
5. **The room silhouettes are convex outlines of a box.** They are exact for the three rooms, which
   are boxes. If a later turn lets a room be an L shape, the silhouette will have to follow it.

---

## 12. Line balance

| Task | Files | Added | Removed |
|---|---|---|---|
| T6-01 | 1 | 3 | 2 |
| T6-02 | 5 | 261 | 25 |
| T6-03 | 4 | 149 | 47 |
| T6-04 | 3 | 546 | 6 |
| T6-05 | 22 | 590 | 253 |
| T6-06 | 24 | 302 | 73 |
| T6-07 | 9 | 327 | 62 |
| T6-08 | 8 | 378 | 35 |
| T6-09 | 8 | 238 | 40 |
| T6-10 | 13 | 632 | 80 |
| T6-11 | 5 | 80 | 20 |
| T6-12 | 2 | 149 | 7 |
| Whole turn | 62 | 3,636 | 631 |

---

## 13. Tests

637 green, up from 562. New files:

- `tests/ui/hallRooms.test.ts`: a click at the projected centre of a room's front face opens the
  right thing, through the real app.
- `tests/ui/hallZoom.test.ts`: the wheel, the bounds, Fit, the pan, the double click, a click at a
  zoom, and a machine dropped on the right cell at 1.44x.
- `tests/engine/toolCabinet.test.ts`: the cabinet, what cannot be bought without one, and the
  hiring that wants a free one.
- `tests/engine/machineHours.test.ts`: one man on a saw that serves three needs three days for
  eight hours, two men a day and a half, three men a day.
- `tests/ui/catalogueTabs.test.ts`: the eleven tabs, every line on one of them, the empty ones, the
  filter scoped to the tab, and the Owned list.
- `tests/engine/deadlines.test.ts`: 500 of shelves in three to five days, a 15,000 kitchen in
  eighteen to twenty three, eleven to fourteen express, the same from the same seed.
- `tests/engine/earnedRate.test.ts`: 38.00 with the used saw, 42.00 with the standard one, 25.20
  for a poor joiner, and 30.80 for the two of them weighted by their hours.
- `tests/ui/accountingDays.test.ts`: the Days rows net what the ledger nets, and a past day's
  summary opens from its row.

Rewritten: the break, the day boundary, the service, the room labels and the office board name.

---

## 14. How to run

```
npm ci
npm run dev
```

`npm run check` is lint, type check, production build and the tests, and its own exit code is the
gate. Everything Turn 6 added is reachable from the game: the hall's Fit, plus and minus buttons
under it, the wheel and the drag on it, the two questions the day puts at noon and at five, the
Output figure on the top bar, the tool cabinet in the catalogue's Storage tab, the eleven tabs and
the Owned one, and the Days tab of the accounting binder with a button on every row.

---

## 15. Parked, carried forward

1. House 100 k and villa 500 k templates.
2. A 180 degree hall view.
3. Movable or larger rooms.
4. Business rates and power for 200 m2, still `[TUNE]` at 1,500 and 8.
5. Boss meeting for jobs above 20 k.
6. Office admin covering calls and per job orders at double time.
7. Staff overtime pay (section 2.1).
8. The table saw sprite cut-outs of 3.11, and a picture for the tool cabinet.
9. Everything parked before.
