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
