# Turn 4: the office as a room, calls that interrupt, and moves that cost

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 12.09.2026, from Piotr's third play
and the approved office artwork (see `docs/art/SPRITES.md` section 8).

Read this whole file, then `docs/art/SPRITES.md` (all of it, section 8 is the office contract), then
`docs/turn-1-brief.md`, `docs/turn-2-brief.md` and the Turn 3 brief (the root `CLAUDE.md` on `main`
before this one; recover it from git history as `docs/turn-3-brief.md` in T4-01). Where files
disagree, this one wins. All standing rules apply (no em or en dashes, scope 1:1, one code path,
constants never in the UI, new feature = visible entry, kill background processes, PR without merge,
end the session, no PR watching).

---

## 0. What Piotr said after playing Turn 3

1. "Design does not work." The design task cannot be run to completion from where it now lives.
   Find out why and fix it (3.2).
2. "Moving machines: time should run 4x on its own, and connecting the ducting between machines and
   the extractor costs money every time, 800. Unless you buy the flexi system for 50 k, then moving
   never costs a connection again." (3.5)
3. "A bench: without a bench there is no way to start production." (3.4)
4. "I already asked that calls do not block the start of production. Calls happen during production:
   a window pops up, the client is calling, you answer or not. First time nothing happens, second
   time the client's opinion drops by the percentages we agreed." (3.3)
5. "End of day summary pops up; I want to be able to click it away and choose: do not show daily,
   show weekly or monthly." (3.6)
6. The office is now a room from three photoreal layers, with the boards as decoration that open
   modals. (3.1)

---

## 1. State of the repo

`main` after PR #4 (Turn 3) and the earlier PR #3 (hall and office scenes scaled to the viewport,
a change made outside the turn ritual: keep its behaviour for the hall; the office is replaced
tonight). 454 tests green. `public/sprites/` may already contain `officeBackground.png`,
`officeDesk.png` and `officeLaptop.png` on `main` or on a branch `art/sprites`; if they are not on
`main`, the office must still work with placeholder layers (3.1, last bullet).

---

## 2. Rules restated (short)

Everything from Turns 1 to 3. Tonight in addition:

- **A player preference is not an engine constant.** The summary cadence (3.6) is stored in the
  state as a preference and offered in the UI. That is allowed; engine numbers still are not.
- **Removing the seven desk items is a deletion, not a hide.** Their render code, hooks and tests go.
  The modals they opened stay and are reached from the places section 3.1 names. Count the paths in
  the report.

---

## 3. Changes to the design (the contract)

### 3.1 The office as a room (`docs/art/SPRITES.md` section 8 is the contract; this adds the code side)

- The office view is a stack of three `<img>` layers (or one `<div>` per layer with a background
  image) in a container that scales uniformly to fit the available viewport below the top bar,
  keeps 1672:941, and is centred (letterboxed on the page background). One scale value for the
  stack, the regions and the live text.
- Click regions from section 8.2, rendered as transparent absolutely positioned elements with
  `data-do` hooks; hover: a faint light overlay and the region name as a tooltip. No visible frames.
- Live text from section 8.3: the clock (`HH:MM`, seven-segment style with a monospace fallback,
  amber) and the company name; both positioned in canvas coordinates and scaled with the stack.
- Region actions: Work Plan opens the **Work Plan modal** (new name of the "Jobs on the books" list:
  every job with its five-step row and Start production; nothing else changes about that list).
  Orders opens the board modal. Door switches to the hall. Laptop opens the laptop modal, which now
  has four tabs: **Tasks** (office tasks today, workshop jobs of work, at the gate), **Materials**
  (the Turn 2 materials modal content), **Team** (the hiring modal content), **Drawings** (the Turn 3
  drawings modal content). Catalogue opens the equipment catalogue. Binder opens Accounting.
- The seven Turn 3 desk items (`desk`, `laptop`, `ledgerFolder`, `materialsBinder`, `catalogue`,
  `teamBoard`, `phone`, `drawings`) are removed from the office renderer and constants as office
  objects. `render/office.ts` no longer draws SVG. The hall's `roomOffice` block still opens the
  office.
- Menu keeps Board and Hall/Office toggle as before (two ways to the same modal and view are
  entries, not paths).
- **Placeholder layers:** if a layer file is missing from the manifest, the stack shows a flat
  coloured rectangle per layer with the layer name, so the office is usable and testable without the
  art. Regions and live text do not depend on the art being present.
- Tests (jsdom): the stack scales to a 1280 × 800 viewport with the right factor; each of the seven
  regions dispatches its action; the clock text equals the game time; the company name renders; the
  laptop modal has four tabs and the old modals are reachable from them; the office SVG snapshot
  test is deleted with the SVG.

### 3.2 Design task: diagnose and fix

Reproduce first: on `main`, accept an enquiry, open Drawings, start the design, run the clock, and
record where it stops (does the Start button do nothing, does the task not consume minutes, does the
Drawings list not refresh, does Continue not appear). Fix the cause, one path. Likely suspects: the
Turn 3 move of the queue out of the laptop broke the `startTask` hook for design tasks, or the modal
shell change of T3-02 stopped the Drawings body from re-rendering. Do not guess: prove it with a
failing test first, then make it pass. Report the cause in one sentence.

### 3.3 Client calls become interrupting events `[PIOTR]`

- Calls are no longer prerequisites. Remove "2 calls to make" from the Start production reasons and
  from the material order gate. Design stays the prerequisite for the material order.
- From acceptance until delivery, each job schedules its calls (same count curve as before: 2 up to
  1,000, 3 up to 3,000, 4 above) at random working minutes across the job's expected span (seeded
  RNG). When one comes due: **event** "Client calling: <job>" with Answer / Ignore. The clock pauses.
- Answer: 15 minutes of owner time (or the salesman's, if hired: he answers automatically, no event),
  the owner's current task or production pauses for those minutes and resumes.
- Ignore: the first ignored call of a job costs nothing visible except a note on the job card
  ("1 missed call"). The second and every further ignored call on the same job: client satisfaction
  minus 10% `[PIOTR, Turn 1]`, which reduces the rating gain at delivery by that share, and rating
  minus 1 on the new scale per missed call from the second on `[TUNE]`.
- A missed call is re-scheduled once, one working day later (the client tries again `[PIOTR, Turn 1]`);
  the second attempt, if ignored, counts as the second miss.
- The job card shows calls as "Calls: 1 of 3 taken, 1 missed".
- Tests: no call blocks production; an ignored first call changes nothing but the note; the second
  miss applies both penalties; the salesman clears calls without events; the schedule is
  deterministic per seed.

### 3.4 Bench required `[PIOTR]`

Production (owner or joiner) cannot start without a free workbench in the hall. Start production
reason "no bench" sits after "no extraction" in the precedence list. Work here in the hall says the
same. A joiner without a bench stands idle at the canteen door with the status "no bench". Test:
a hall with a saw and no bench cannot start; buying a bench unblocks it.

### 3.5 Moving machines costs time and ducting `[PIOTR]`

- Leaving setup mode with at least one machine moved: the move is a hall job of work. Owner time:
  60 minutes per moved machine `[TUNE]`, done by the owner or a joiner or the helper. While that job
  runs, the clock runs at **4x automatically** and shows "Moving machines" in the top bar; the player
  cannot change the speed until it is done; every other production waits.
- Every moved machine that uses extraction (all machine families except the compressor and the
  hand tools) needs its ducting reconnected: **800 per machine** `[PIOTR]`, charged when the move
  job completes, ledger line "Ducting reconnection: table saw". The setup mode shows the running
  total ("Ducting to reconnect: 2 machines, 1,600") before Done.
- **Flexi extraction system: 50,000** `[PIOTR]`, a new class in the extraction family beside the
  central dust system: with it, reconnection is free forever. It also has everything the central
  system has (no bags, waste 400 per month). The pelletiser works with either.
- Moving benches, racks, lockers and seats costs the 60 minutes but no ducting.
- Tests: a move of two machines charges 1,600 and takes 120 minutes at forced 4x; with the flexi
  system the charge is zero; a bench move charges nothing.

### 3.6 End of day summary cadence `[PIOTR]`

- The end of day summary gets a control "Show this: every day / every week / every month" stored in
  the state as `summaryCadence`. Weekly shows on Friday's end of day with the week's totals; monthly
  on the last working day of the month with the month's totals. Daily is the default.
- The same control lives in the Menu. Whatever the cadence, the day still ends the same way; only
  the modal is skipped.
- Tests: with weekly cadence the summary appears once in five working days and carries five days of
  totals.

---

## 4. Task queue, in order

Branch `turn-4-office-room` from `main` (the cloud environment may impose its own name; say so in the
report). One commit per task, `npm run check` green before each, two report lines per task.

**T4-01 Housekeeping.** `docs/turn-3-brief.md` from git history (the root CLAUDE.md as of the PR #4
merge). Done: file exists, no edits.

**T4-02 Design task fix.** Section 3.2. Done: failing test then passing test, cause in the report.

**T4-03 Calls as events.** Section 3.3. Done: the five tests.

**T4-04 Bench required.** Section 3.4. Done: the test.

**T4-05 Moving machines.** Section 3.5 including the flexi system class. Done: the three tests.

**T4-06 Summary cadence.** Section 3.6. Done: the test.

**T4-07 Office room.** Section 3.1 render side: layers, scaling, regions, live text, placeholders.
Done: the scaling and region tests.

**T4-08 Laptop tabs and Work Plan modal.** Section 3.1 modal side, removal of the seven desk items,
path count. Done: the tab and reachability tests, the deleted snapshot test, zero references to the
removed items (grep in a test).

**T4-09 Sprite check page.** Add the three office keys to the page as full-width previews (scaled
to fit), so the art PR can be checked there. Done: the page lists them.

**T4-10 Scenarios.** Update the five scripted months for calls-as-events and the bench rule; add
(f) a month that moves two machines on day 3 and asserts the 1,600 and the forced 4x span.

**T4-11 Report and PR.** `REPORT-T4.md` in the usual structure plus a "Paths" section answering, per
removed desk item, where its modal is now reached from and that no second route remains. Kill
background processes, push, PR titled `Turn 4: the office as a room, calls that interrupt, and moves
that cost`, do not merge, end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, or the archived briefs.
2. No office art drawn in code; placeholders are flat rectangles with a label.
3. No change to the hall renderer beyond the "no bench" status and the moving job.
4. No new machine classes beyond the flexi system.
5. No persistence changes other than bumping `STATE_VERSION` if the state shape changes (it will:
   `summaryCadence`, calls schedule, moving job). Keep the loader dark without env.
6. No watch loops, nothing left running.

---

## 6. Parked

1. Larger offices as the company grows (new layer sets).
2. Everything parked in Turns 1 to 3.

End of brief.
