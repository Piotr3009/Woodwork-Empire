# Notes from Turn 24

One agent, serial, no worktrees. This file is what did not fit in `REPORT-T24.md`'s two lines a
task: the measurements behind the figures, the readings of the brief that were not the only
possible one, and the one thing a later turn will want to know before it touches the same code.

---

## 1. The rings in the engine's imports

`machines.ts` now imports `catalog.ts`, `jobs.ts`, `production.ts` and `stages.ts`, all four of
which import `machines.ts` back. The brief asks for `workshopBreakdownToday` in machines.ts and
for it to read the words the rest of the game already has, so the rings are what that costs.

They are safe here and they are not new: `media.ts` and `machines.ts` have been a ring since Turn
10. Nothing in any of the five modules calls an imported function while a module is being
evaluated; every top level statement in all of them is a literal or a function declaration, so the
live bindings are all filled in by the time anything runs. The whole suite is the proof.

If a later turn adds a top level `const` to any of these five that CALLS into another of them, it
will break at load, and the first symptom will be `undefined is not a function` in an unrelated
test. Put such a thing behind a function.

## 2. The by hand rule and the bench: what the block found on its first night

2.1 is a sheet that prints what the engine did. The first thing it printed was a disagreement
inside the engine, and it is written up as item 1 of REPORT-T24 section 0.

Short form: `stagePlanFor` gives every stage of a by hand job the 0.67 penalty, and
`runProductionMinute` then replaces the stage's speed with `outputFactorOf(machine)` for any man
who is holding a machine. The lead of a job holds his own bench at a bench stage, so the lead of a
by hand job runs at the bench's class and not at 0.67; the men behind him, who hold nothing, run
at 0.67. On the day 149 fixture that is Eddie at 1.10 and Pete and Callum at 0.67, on the same job,
in the same minute.

Section 6 forbids touching what a minute is worth and section 8 parks the question, so nothing was
changed. What the row says is what the minute actually was, because a row whose two figures did not
multiply out to the one beside them would be the very defect 2.1 exists to cure. The brief's
`<why>` order (by hand first) was read as: by hand when he stands at no machine, and the machine's
class when he does.

## 3. The pixels of the canteen plates

`public/sprites/canteenLockers.png` was decoded in the session (a pure Python PNG reader, no
libraries in the repository) and the painted label strip under each plate was measured by walking
the light cream run at each column of the plate and averaging the top and the bottom.

| plate | strip centre y | plate rect centre y |
|---|---|---|
| near bank, top left | 265.1 | 266.5 |
| near bank, top right | 269.1 | 270.0 |
| near bank, bottom left | 477.7 | 478.0 |
| near bank, bottom right | 461.9 | 462.0 |
| far bank, top left | 272.4 | 273.5 |
| far bank, top right | 275.0 | 275.0 |
| far bank, bottom left | 449.0 | 449.0 |
| far bank, bottom right | 443.6 | 444.0 |

REPORT-T23 0.13 said the far bank's plates sit "a few pixels high of the painted label strips".
They do not: the worst of the eight is 1.4 px and it is in the near bank. The far bank's top left
plate was moved from y 260 to 259, which is the one pixel that centres it, and nothing else moved.
The reading order is the change that matters.

## 4. The two things the brief named that the tree does not have

- **The day 141 fixture.** Section 4 names the two fixtures in `tests/fixtures` as day128 and
  day149, and there is no day141. Every test the brief hangs on "the day 141 fixture" is hung on
  day149, which is the hall the mockup was drawn from: four men, the oak table by hand, the owner
  at a saw. The sum is the hall's own and not the mockup's illustrative 0.75.
- **`dusty`.** The hall row's words come off the dust band's own label, and the bands are
  `clean`, `messy`, `dirty` and `dangerous` (`DUST_BANDS`). There is no `dusty` band; the brief's
  example is Piotr's shorthand for whichever of the four the hall is in.

## 5. The scripted player and the hiring gate

2.2 made the autopilot's day one hall one place short for every scenario that hires. The scripted
player now buys the class of bench the crew it means to take on will fit on
(`benchClassFor` in `tests/scenarios/autopilot.ts`), because a unit owns no more benches than its
bench slots and a bench already standing cannot be swapped for a better one. With that, every
scenario figure of Turns 13 to 23 is unchanged; what moved is 2.8's doing and is restated in the
tests with its reason.

## 6. What a later turn should pick up

- Section 8's question about rule 9.5 is now visible on the Output sheet, which is the best
  possible moment to rule on it (section 2 above).
- The `stockOverflow` event and `writeOffSheetsLeftOutside` are gone with 2.8. Turn 2's 8.9,
  "leave them out and lose them", no longer exists as a choice. It had no door in the game from
  v38, when the restock cap made it unreachable; if Piotr wants it back it belongs on the Restock
  click, where the player is already being quoted the storage.
- `tests/ui/laptopPages.test.ts` starts its game through the start screen with no seed, so its
  draw differs run to run. It failed once in this session's checks and passed on the next run and
  on every run after; nothing in this turn touches it. It is a flake waiting to be seeded.
