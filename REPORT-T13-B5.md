# Report: Turn 13, group B5, chrome and guidance

Branch `t13-b5` from `9dcfc9a` (phase A, T13-A2). Files owned: `src/ui/topbar.ts`,
`src/ui/dayEnd.ts`, `src/ui/modal.ts`, `src/ui/laptop.ts`, `src/ui/tips.ts`, `src/ui/settings.ts`,
`src/ui/patch.ts`, `src/ui/eventModal.ts`, `src/engine/efficiency.ts`, `src/engine/warnings.ts`,
and the tests that match them by name. Sections 3.1 (side menu, colour audit), 3.5, 3.22, 3.18
(the day end flow) and 3.23 of CLAUDE.md T13.

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B5a Side menu, colour audit, settings | `f5e9b46` | The side menu carries its own close control (`.menu-close`, `data-do="closeMenu"`) in `renderMenu`, over the click outside phase A wired; the gear (`.gear`, `data-do="openSettings"`) joins the push block of the top bar; the day end summary's In, Out and Net lines go through `signedFigure(signedMoney())`, which was the one unsigned figure the audit found in the files of this group; `renderSettings` is the one row of two chips and a hint, and nothing else. Where: `src/ui/topbar.ts`, `src/ui/dayEnd.ts`, `src/ui/settings.ts`. | `tests/ui/menu.test.ts` (open, click outside, closed; open, close control, closed; a click on the menu keeps it); `tests/ui/modal.test.ts` (the helper's three cases; the walk over every tab, every folder and every class card of the catalogue, the day end summary of a day that cost money, and the top bar's day figure in the red and in the black: no signed figure outside `.good` or `.bad`); `tests/ui/settings.test.ts` (the lit chip follows the setting; the gear opens the folder modal with its bubble; off switches `state.settings.tips` and every `renderTip` goes empty with nothing dismissed; on brings the undismissed bubbles back); `tests/ui/summary.test.ts` (the three signed rows) |
| T13-B5b Efficiency number and breakdown | this commit | One live number next to the clock, `Efficiency 73%`, as a `<details class="efficiency">` whose summary is the number and whose body is the plate (`.efficiency-plate`) of the four lines (`.efficiency-line`, `data-cause`), each a share of the lost minutes, with a header line of worked, possible and lost minutes: a details element needs no click handler and no `Ui` field. `patch.ts` leaves a details' `open` attribute alone, so the plate the player opened stays open through the game minute. The engine's `efficiencyOf` and `workshopEfficiency` were verified against 3.5 and kept; `topCause` joined `efficiency.ts` for the day end's line "73%, mostly no machine free", beside a Night shift row when the summary carries night minutes. The name plate's day figure goes through `signedMoney`. Where: `src/engine/efficiency.ts`, `src/ui/topbar.ts`, `src/ui/patch.ts`, `src/ui/dayEnd.ts`. | `tests/engine/efficiency.test.ts` (the number is worked over possible; 100 on a day nobody could have worked; the four lines sum to the lost minutes and the percentages to a hundred by the largest remainder, fractional minutes included; the top cause and its tie; three played days: two saws 100%, one saw books the waiting man as no machine free, the owner out drops his seat and books the absence factor as owner away); `tests/ui/patch.test.ts` (a details the player opened stays open, one he did not stays shut, markup that says open opens it, other attributes still follow the markup, a control keeps its node); `tests/ui/topbar.test.ts` (the number in the clock block, the plate's four labels and shares, the summary toggles with no handler, 100% before the first minute; the day figure equals the sum of that day's ledger lines, signed and coloured); `tests/ui/summary.test.ts` (the efficiency row, the night shift row) |

## 2. Numbers chosen

None so far. Every figure this group prints is the engine's.

## 3. Notes for phase C

### `src/ui/app.ts`

1. `READING_MODALS` (line 1039): add `'settings'`. Opening the settings on a stopped clock starts
   the clock at 1x tonight, because the list is `['workPlan', 'shopping', 'company']`; the
   settings act on nothing in the world and should not start time.

   ```ts
   const READING_MODALS: ModalId[] = ['workPlan', 'shopping', 'company', 'settings'];
   ```

### `src/engine/index.ts`

1. Export `topCause` from `./efficiency` beside `efficiencyOf`: `src/ui/dayEnd.ts` imports it
   from the module path with the `// T13-C1: export from index.ts` line above it.

   ```ts
   export { efficiencyOf, emptyEfficiency, topCause, workshopEfficiency } from './efficiency';
   ```

### `src/ui/styles.css`

```css
.menu-close {
  background: none;
  border: 0;
  color: #f5efe2;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  position: absolute;
  right: 6px;
  top: 6px;
}

.menu-pop {
  position: relative; /* if it is not already: the cross sits in its top right corner */
}

.gear {
  font-size: 18px;
  line-height: 1;
  min-width: 40px;
  padding: 0 8px;
}

.settings .hint {
  margin-top: 8px;
}

/* The efficiency number next to the clock, and the plate behind a click on it (T13 3.5). The
   details element has no marker; the number is the whole control. */
.efficiency {
  position: relative;
}

.efficiency > summary {
  color: #f5efe2;
  cursor: pointer;
  font-size: 12px;
  list-style: none;
  white-space: nowrap;
}

.efficiency > summary::-webkit-details-marker {
  display: none;
}

.efficiency-plate {
  background: linear-gradient(#f5efe2, #e3dcc9);
  border: 1px solid #5b5446;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
  color: #1d2a22;
  left: 0;
  min-width: 200px;
  padding: 6px 8px;
  position: absolute;
  top: 100%;
  z-index: 20;
}

.efficiency-plate .hint {
  font-size: 11px;
  margin: 0 0 4px;
}

.efficiency-line {
  align-items: center;
  display: flex;
  font-size: 12px;
  gap: 6px;
  justify-content: space-between;
}
```

## 4. Foreign test edits

None.

## 5. Art requested

Nothing drawn so far. The frame table of 3.23 follows in T13-B5d.

## 6. Not done

1. **Nothing moves into the settings from the autosave.** Turn 11's autosave (T11 3.2) has no
   control: the game is written down at every morning, every purchase, every hire, every accepted
   enquiry and every closed modal, never more than once a second, and the player was never asked.
   The summary cadence (`cadenceControl`, T4 3.6) is not an autosave setting; it is how often the
   evening summary is shown, and it stays where Piotr put it, on the summary and in the Menu.
   3.22 says "Tips on and off and nothing else tonight", and that is what the modal has.

## 7. Cross check notes

### 10.2 One ledger: the top bar's day figure

`netOf(state.finance.day)` equals the sum of that day's ledger lines whose `unpaid` is false, to
the penny, on a played day (`tests/ui/topbar.test.ts`, "equals the sum of that day's ledger
lines"). Two things phase C should know: `finance.day` is reset in `runDayCosts` at the day's
open, and an unpaid line (arrears past the overdraft) is written to the ledger with `unpaid: true`
but never into the totals, so on a day with arrears the plate's figure is the day's paid lines,
not every line. That is right for "what today came to", and the test filters the same way.

### 10.3 One set of rules about people: the efficiency and the day meters

`state.dayStats.efficiency.worked` against the owner's `workshop` band plus every joiner's
`productionMinutes`, on three played days (`tests/engine/efficiency.test.ts`):

- two men each at his own saw: worked 400, meters 400, equal;
- two men on one saw: worked 200, meters 200 (the waiting man's minutes are in neither), equal;
- the owner out, one joiner working: worked 70, meters 100. The joiner's hundred minutes are
  counted at the absence factor 0.7 and the other thirty are the owner away line. So the exact
  identity is `worked + lost.ownerAway = owner workshop minutes + joiners' production minutes`,
  asserted in the third case; `worked = meters` holds whenever the owner is in.

The tally in `game.ts` (`possibleSeats`, `tallyEfficiency`) was checked against 3.5 and needs no
change: the owner's seat counts while `ownerIsAvailable` (present and not gone home: a day off,
a sick day, a holiday and an early home all make him unavailable, and the staff factor reads the
same function); a joiner's seat counts while he is
in today, not at dinner, and in overtime only if he stays; helpers and office roles are not
seats; the causes are booked where the minute knows them (a man waiting for a machine or a job
that cannot run, `noMachine`; a job blocked "waiting for material", `noMaterial`; the absence
factor's share of every staff minute, `ownerAway`; every other empty seat, `noPeople`).

Three readings phase C may want to hear about, none changed tonight:

1. An idle joiner with nothing assigned is booked as "no people" (the seat was empty), which is
   the brief's line for it.
2. A minute the owner spends on office work while joiners are in counts his seat as possible and
   lost to "no people", because the brief counts him "while he is in the workshop" and the office
   is in the building. If Piotr reads "in the workshop" as "in the hall", `possibleSeats` would
   drop the owner while `ownerOnTask` is true; one line in `game.ts`.
3. A site measure is a task, not an absence: `ownerIsAvailable` stays true while he is out for
   the hours it takes, so his seat is possible and lost to "no people", and the staff work at
   factor 1 with nothing booked to "owner away". 3.9 point 3 lists the site measure among the
   absences the manager covers ("site measure, holiday, the ownerOut modal"). If that is meant,
   `staffOutputFactor` and `possibleSeats` should read "out on a trip" as well as "not present";
   the trip lives in `owner.ts` (B2's) and the seat rule in `game.ts` (frozen).
