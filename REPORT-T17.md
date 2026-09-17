# Report: Turn 17

The workshop earns by the hour. Built in Claude Code, cloud, on branch
`claude/wonderful-rubin-31i1no`, 17.09.2026.

Base: `36ca109` on that branch, which carries `APP_VERSION` `v24` and `STATE_VERSION` 14, the
brief's precondition. The report is written as the turn is built: one entry per task, in the order
the task queue of section 5 names them.

---

## Phase A

- **T17-A1 Housekeeping and v25.** `docs/turn-16-brief.md` is the root `CLAUDE.md` of the v24
  commit (`cda3749`), byte for byte; the README's briefs line names it and its reports line reaches
  `REPORT-T17.md`; `APP_VERSION` is `'v25'`; `docs/art/REQUESTS-T17.md` asks for the helper sheet,
  the welfare kit inside the canteen and the pipe tiles that still stand from Turn 13.
  Done: the two version assertions read `v25`.

---

## Phase B1: the hall

- **T17-B1a The helper is drawn, the labourer works, a machine off the lorry (2.1, 2.3, 2.4).**
  The placeholder figure is sized off the projection instead of being a 12 by 26 rounded rect: a
  1.8 m man at `TILE_RISE` pixels to the metre, with a head, a trunk, two legs and two feet, so a
  role with no character sheet reads as a person beside a joiner who has one. The helper books
  minutes now (`booksTaskMinutes` in staff.ts): he takes the task on, spends it minute by minute,
  is given a station and is walked to it, and his own day meter carries the minutes; the branch
  that cleared a job of work on the spot for nothing is gone, so there is one path for everybody.
  He sweeps the hall the moment it goes past clean, without being asked, and the lorry at the gate
  is never put to the owner while the unloading is his. A machine off the lorry is a second
  flavour of the v24 loop: gate to the floor held for it and back, empty handed both ways.
  Done: `tests/render/capsule.test.ts` (a visible body for the helper and for every role with no
  sheet), the three new helper tests in `tests/engine/helper.test.ts` (a delivery unloaded by him
  minute by minute, a dirty hall swept by him, no `fixing` minutes on the owner's day) and the
  machine loop test in `tests/render/walkers.test.ts`.
- **T17-B1b The welfare kit lives in the canteen (2.2).** A seat and a locker are off the hall
  floor for good: `hallItems` leaves them out, so nothing bumps into them, they eat none of the
  free floor the crew is limited by and `anchorFor` never sends one looking for a free cell; a
  move to a hall cell is refused with "It stands in the canteen", and the hall draws them on the
  canteen block with no `data-kit` on them, so setup mode has nothing to pick them up by. A man at
  one stands in the canteen doorway facing in, and what they are worth is untouched: a seat a man
  and a locker a man, which is what hiring a joiner still asks for.
  Done: `tests/render/canteenKit.test.ts`, six tests, with phase A's migration test still green.
- **T17-B1c The strip under the hall, variant C (2.5).** The four lines and the grey buttons are
  gone: `hallProblems` in hall.ts is the one list of what the hall wants doing, and the page draws
  one dark chip in the hand over the floor for each of them, bottom left, with the button that puts
  it right on the chip itself (Clean up on the dirty hall, Empty bags on the full store, Service it
  on the machine that is due one, Fix it on the one that has stopped). The stack's order is what it
  costs the workshop: moving machines first (nothing runs at all), then Work here, then what has
  stopped a machine, then what is slowing the hall, then the service, then Set up hall last. The
  rack warning and "No job has its material in the hall yet" are gone, the wheel sentence is a tip
  said once, and the camera is three small chips bottom right.
  Done: `tests/ui/hallChips.test.ts`, with the old strip's assertions moved onto `hallProblems` in
  the views, machines, extraction and air tests.
- **T17-B1d A click on a machine opens its own card (2.6).** The card is the Owned tab's card and
  one function draws both, so Connect to extraction cannot be on one and missing from the other:
  its picture and class, what it does, its hours and its life, its service, what it is doing, the
  metres of pipe or that there is none, the gate line, and the buttons Repair or Service, Empty
  bags, Connect to extraction, Automatic gate, Move and Sell. The extractor opens its own card too,
  with the hall's bag store and its bar on it, and the store note under the hall is gone with the
  old strip. Move is one click: it takes the player into setup mode, where nothing stands open over
  the hall and he drags the machine himself, and it is offered only on what the engine would let
  him drag.
  Done: `tests/ui/machineCard.test.ts` (the card is that machine's, Connect works from it, Move
  puts him on the floor, the Owned tab draws the same card) and `tests/ui/bagStore.test.ts` moved
  onto the card.
- **T17-B1e Pipes that look like pipes, and the number on the rack (2.7, 2.8).** Every length of
  pipe is three strokes of the one shape now: a wider bar, the shade along its underside and the
  lighter edge along its top. An elbow is a quarter arc with no disc over a joint it has not got, a
  straight run has no joint in the middle of it, a tee keeps its four arms and the body they meet
  in, the drop lands on the machine's own top face as a short collar over its port instead of
  going through it to the floor, and the inlet is a flange of two rings at the unit. The nine kinds
  and their `data-pipe-tile` keys are untouched, so a delivered file still wins tile for tile. The
  rack carries its own number over its front face, big, in the hand, on the class's colour, drawn
  off the stock every render: it used to be glued into the object's name, which the sprite branch
  throws away, so in the real game it was invisible.
  Done: the three new pipe tests in `tests/render/pipesOnTheHall.test.ts` and the rack number test
  in `tests/render/views.test.ts`, with Turn 16's own pipe tests still green.

### Numbers chosen (B1, the hall)

- **2.1** The placeholder man is `CAPSULE_HEIGHT_M` 1.8 m at `TILE_RISE` (24 px to the metre), so
  43 px tall where the old capsule was 26. His proportions, in fractions of his own height
  [TUNE in src/render/hall.ts]: head radius 0.1 at 0.88 up, shoulders 0.34 wide, trunk 0.78 down
  to 0.42, legs 0.11 wide with a 0.04 gap, feet 0.16 long and 0.05 high.
- **2.3** The helper's day is the clock's and not a meter of his own [TUNE in src/engine/staff.ts,
  `booksTaskMinutes`]: he is on the floor, takes his dinner with the workshop and stays for the
  owner's overtime like a joiner, so only the office has the 480 of `hasWorkingDay`.
  `HELPER_CLEAN_DUST_BAND` is `'messy'` [TUNE in constants.ts]: he picks up a brush the moment the
  hall stops being clean, which is the moment the dust starts costing output.
- **2.2** The welfare kit is drawn on the canteen roof at `CANTEEN_KIT_HEIGHT` 0.3 m with a
  `CANTEEN_KIT_INSET` of 0.15 of a cell [TUNE in src/render/hall.ts]: a plan of what is in there,
  not kit standing on the roof.
- **2.7** `PIPE_BAR_WIDEN` 1.5, so the bar is 7 px where it was 5; the shade and the edge are a
  third of that off the middle; the shade is `rgba(0,0,0,0.35)`; the collar on a port stands
  `COLLAR_DEPTH` 0.18 m proud of the machine's top face [TUNE in src/render/pipes.ts].
- **2.8** The number on the rack sits `RACK_COUNT.up` 0.55 of the way up the front face on a plate
  26 px high, 15 px a digit and 9 px of padding each side [TUNE in src/render/hall.ts].

## Phase B2: the people and the desk

- **T17-B2a Our team, the hiring gate, the evening and the day meter (2.9, 2.11, 2.12, 2.13).**
  Our team is a fifth tab on the Team page and the first of them: one row a person, the owner at
  the top of it, with the day he started and how long ago, what he costs a month, the hours he has
  worked this month, his days off and what he is on this minute. The month's hours and days off
  are counted where the minutes and the absences already are, and start again on the first working
  day of a month. A hire is refused with "Not enough in the bank: needs £2,057" when the account is
  under a month of the man's pay, last in the one blockReason chain. The men go home at five now,
  always: the evening is the owner's, and he takes a man's job on by a click on the work plan row,
  which leaves the job assigned to the man and gives it back to him in the morning. The day meter
  runs 540 to 660 with the evening, and the evening's minutes are painted in their own colour.
  Done: `tests/ui/ourTeam.test.ts`, `tests/engine/hiringGate.test.ts`, the rewritten
  `tests/engine/staffOvertime.test.ts` and the day meter tests in `tests/ui/topbar.test.ts`.
- **T17-B2b Two men on one job (2.10).** A job carries a second man now: a click on the work plan
  row puts him on it and Alone takes him off, and nobody holds two jobs at once. Both men book
  their minutes into the same job, each at his own rate, so the bar is drawn at the two of them
  added up and the job takes about half the days. At a machine stage one of them has the machine
  and the other stands at its waiting cell until his turn; at the bench they share the first man's
  bench, the second in the bench's second place of Turn 16, and he takes no bench of his own.
  Done: `tests/engine/secondMan.test.ts` (the rate doubles, the labour in an hour, the waiting
  cell, both names on the row and the chips that put him on and take him off).
- **T17-B2c The desk stops nagging (2.14 to 2.19).** A job of work somebody started stays his: the
  minutes and the man both carry over, so the drawing he was on at five is in his hands at eight
  and a man of the office is never passed round by rank for what he already started. Calls and
  emails die at dusk instead, done or not, and the emails that are dropped are counted onto the
  job as they go, so the client's penalty at delivery is exactly what it was. The Tasks page has a
  tick on every row the owner could start and one Do these over the list: they are queued in the
  order they were ticked and each one starts the next as it finishes. The laptop writes the day
  down as the boot starts, so an interrupted boot can neither suppress tomorrow's nor be paid for
  twice, and an unfinished one is dropped with the daily chores. The Finished drawings list is
  gone, and a new day comes home to x1.
  Done: `tests/engine/theDesk.test.ts`, `tests/ui/doThese.test.ts` and the rewritten drawings
  tests.
