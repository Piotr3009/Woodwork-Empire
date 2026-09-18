# Notes from B1, the money (Turn 20, phase B)

Sections 2.2, 2.1 (all six parts) and 2.16, on branch `t20-b1`. Four commits, `npm run check`
green on its own exit code before each of them.

Phase C: sections 1 and 3 are the work you have to apply. Sections 2, 4, 5 and 6 are what the
report needs, and section 7 holds the two decisions phase A left to me, with the one question for
Piotr.

---

## 1. NOTES FOR THE FROZEN FILES

Three changes, all in `src/ui/app.ts`, plus one constant to bring home.

### 1.1 `src/ui/app.ts`: the Work Plan has to hand the picked man to the tab (blocker for 2.1.1)

`ui.contractMan` is set by the `pickContractMan` route (phase A) and read by nobody: the renderer
is never given it, so the chips of the offer card's man picker redraw in the same place and the
card keeps the default man's figures. `renderWorkPlan` takes him as a fifth argument, defaulting
to null, so this is the one line that connects them.

File: `src/ui/app.ts`, in `modalBody`, the `case 'workPlan':`.

Exact old text (one occurrence):

```ts
    case 'workPlan':
      return renderWorkPlan(current, ui.workPlanTab, ui.dropConfirm, ui.assignOpen);
```

Exact new text:

```ts
    case 'workPlan':
      return renderWorkPlan(current, ui.workPlanTab, ui.dropConfirm, ui.assignOpen, ui.contractMan);
```

The test that proves it (jsdom, driven through the real DOM the way
`tests/ui/contractsTab.test.ts` drives its last describe): with two joiners on the books and an
offer on the board, open the Work Plan, click the Contracts tab, then click
`[data-do="pickContractMan"][data-worker="staff-2"]`, and the card's `Take it` button reads
`Take it, <the second man> on it` and carries `data-worker="staff-2"`. Before the change it still
reads the first joiner's name. `renderContractsTab(state, assignOpen, 'staff-2')` already renders
the second man, and `tests/ui/contractsTab.test.ts` asserts that much directly, so the gap is the
one line above.

### 1.2 `src/ui/app.ts`: `takeContract` must read the check it is given

`ACCEPT_CONTRACT` and `ASSIGN_CONTRACT` both hand back a `ContractCheck` and the reducer in
`game.ts` throws both away, so the route cannot read them. The tab therefore never draws
`Take it, <name> on it` for a man the engine would refuse (section 7.1), and the trap phase A
found cannot be reached today. It should still be shut in the route, so that a button written
later cannot reopen it.

File: `src/ui/app.ts`, in `onClick`'s switch.

Exact old text (one occurrence):

```ts
    case 'takeContract':
      // The one click of the Contracts tab: the offer is accepted and the man the card has
      // selected is put on it, in that order (PIOTR; CLAUDE.md T20 2.1.1).
      dispatch({ type: 'ACCEPT_CONTRACT', contractId: id });
      dispatch({
        type: 'ASSIGN_CONTRACT',
        contractId: id,
        workerId: element.dataset.worker ?? '',
        on: true,
      });
      return;
```

Exact new text:

```ts
    case 'takeContract': {
      // The one click of the Contracts tab: the offer is accepted and the man the card has
      // selected is put on it, in that order (PIOTR; CLAUDE.md T20 2.1.1). The man is asked about
      // first: a click that cannot put him on it would otherwise take the contract and leave it
      // with nobody on it, which is not what the button says.
      const onIt = element.dataset.worker ?? '';
      const check = contractManCheck(game(), onIt);
      if (!check.ok) {
        ui.toast = check.reason;
        requestRender();
        return;
      }
      dispatch({ type: 'ACCEPT_CONTRACT', contractId: id });
      dispatch({ type: 'ASSIGN_CONTRACT', contractId: id, workerId: onIt, on: true });
      return;
    }
```

and, with the other straight imports at the top of `src/ui/app.ts` (it has none off
`../engine/contracts` yet, so this is a new line beside `import { renderContracts } from
'./contracts';`):

```ts
// Straight off its own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { contractManCheck } from '../engine/contracts';
```

The test: `takeContract` with `data-worker="owner"` leaves the contract on offer and puts the
reason in the toast; with a joiner it accepts and assigns, which
`tests/ui/contractsTab.test.ts` already asserts.

### 1.3 `src/engine/constants.ts`: one constant to bring home

`CONTRACT_SHORT_WEEKS_ALLOWED` is declared in `src/engine/contracts.ts` (section 2 below) because
a B agent may not write to `constants.ts`. Move it to `constants.ts` beside
`CONTRACT_SHORT_WEEK_REPUTATION`, keeping its comment word for word, and import it in
`src/engine/contracts.ts` with the rest of the contract constants. Nothing else changes; the
tests read it by name from wherever it lives (`tests/engine/contractDay.test.ts` imports it from
`src/engine/contracts`, so re-export it there or move the import in that test with it).

### 1.5 `src/engine/constants.ts`: the wardrobe front's sheets, which only Piotr can settle

Put here as well as in section 6.2, because this is where phase C looks. **Do not apply it
without Piotr's word**: 2.2 says in as many words that `sheets` per piece stays what it is, so
this moves one of his own figures.

The piece is costed at `material: 60` on the card and in the closing report, and draws
`sheets: 1.1` off the rack, which is about 220 at `SHEET_VALUE`. The two readings of one piece of
material disagree by about three and a half times, and only for this piece: the cut sheet pack is
30 against 0.15 sheets and the drawer box 26 against 0.13, both at 200 a sheet.

File: `src/engine/constants.ts`, in `CONTRACT_PIECES`, the `wardrobeFront` entry.

Exact old text (one occurrence):

```ts
    material: 60,
    sheets: 1.1,
```

Exact new text:

```ts
    material: 60,
    sheets: 0.3,
```

The test that proves it: in `tests/engine/contractPrices.test.ts`, for every piece of
`CONTRACT_PIECES`, `piece.sheets * SHEET_VALUE` is within a pound of `piece.material`, so the two
readings of one piece can never part company again. The margin an hour band of 22 to 30 is
untouched by it, because the card was always costed at 60.

Piotr's other answer is to leave the sheets at 1.1 and raise the material and the price together,
and then the margin an hour leaves the band the same test asserts. That is why nothing is moved
tonight.

### 1.4 Nothing else in the six is wanted

`types.ts`, `index.ts`, `game.ts` and `styles.css` need no change from me. In particular
**`game.ts` is untouched and needs no reorder**: it calls the job loop before the contract loop
every minute, and 2.1.4 is done inside my own files by the marker the contract puts on its men
(section 4.2). `index.ts` re-exports `contractAssignCheck`, whose signature changed; a re-export
carries no signature, so it compiles as it stands.

---

## 2. NUMBERS CHOSEN

| Figure | Value | Where | Tag and why |
|---|---|---|---|
| `CONTRACT_SHORT_WEEKS_ALLOWED` | 2 | `src/engine/contracts.ts` | [TUNE] The brief's own rule (2.1.6): the first short week costs a point of reputation, the second ends the contract, no third. Piotr's decision on it is still open, so it is one named number and not a rule written twice. |
| `DAY_TRACK_TICK_MINUTES` | 120 | `src/ui/contracts.ts` | [TUNE] The clock under a day track is read every two hours from 8:00, which is what the drawing has; the last mark is left off when the end of the day is nearer than half of it, so 17:00 and 16:00 never sit on top of each other. Phase C: beside the working day's minutes in `constants.ts`. |
| `OWNER_RATE` | 1 | `src/engine/contracts.ts` | Not a tunable: the ladder of the tiers is measured against the owner, so he is 1 by definition (T20 2.5). It is named rather than typed into the arithmetic. |

Everything else on the Contracts tab reads a constant that already exists:
`MINUTES_PER_WORKING_DAY`, `BREAK_START_MINUTE`, `BREAK_MINUTES`, `DAY_END_MINUTE`,
`WORKING_DAYS_PER_WEEK`, `DAYS_PER_WEEK`, `CONTRACT_FREE_END_DAYS`, `CONTRACT_OFFER_DAYS`,
`WORKER_MINUTE_RATE_DIVISOR` (through `workerMinuteCost`), `OWNER_DRAW_TIERS` (through
`ownerDrawPerDay`) and the `CONTRACT_PIECES` table. No figure is typed into the UI.

---

## 3. CSS NEEDED

Seven rules, all built from tokens that already exist. **No new colour, font, radius or shadow
value**: `#1c1f24` is the ink `.btn-primary` already puts on the house amber, read out of
`src/ui/styles.css` line 480 or so, and nothing else is a literal.

Place them in `src/ui/styles.css` **immediately after `.contract-fill.is-full`** (about line
2970), which is where the `.contract-*` family lives, and before `.contract-active`.

```css
/* The man's day on a contract, 8:00 to 17:00, one block a piece, the lunch block where he puts
   his tools down and what is left of the day going to the job he is also on (PIOTR, the mockup
   of docs/mockups/t20/contracts-tab.html; CLAUDE.md T20 2.1.1, 2.1.2). The week's bar above is
   .contract-track; this is one day of it. */
.contract-day {
  margin: 6px 0 10px;
}

.contract-day-track {
  background: var(--card, var(--panel-2));
  border: 1px solid var(--card-line, var(--border));
  border-radius: 3px;
  height: 26px;
  overflow: hidden;
  position: relative;
}

.contract-day-block {
  align-items: center;
  background: var(--good);
  border-right: 1px solid var(--card, var(--panel-2));
  bottom: 2px;
  color: var(--cream);
  display: flex;
  font-size: var(--fs-tiny);
  justify-content: center;
  overflow: hidden;
  position: absolute;
  top: 2px;
  white-space: nowrap;
}

.contract-day-block.is-lunch {
  background: var(--border);
  color: var(--text-dim);
}

.contract-day-block.is-free {
  background: var(--panel-2);
  color: var(--text-dim);
}

/* The minutes that go to the job he is also on: the house accent, as the drawing has them. */
.contract-day-block.is-job {
  background: var(--accent);
  color: #1c1f24;
}

.contract-day-ticks {
  color: var(--text-dim);
  display: flex;
  font-size: var(--fs-tiny);
  justify-content: space-between;
  margin-top: 2px;
}
```

And one rule beside `.assign-row .assign-tier` (about line 4039), for the tier and the minutes
under a man's name in the offer card's picker, which is the same thing the Assign list draws:

```css
.contract-men .assign-tier {
  color: var(--card-ink-2, var(--text-dim));
  display: block;
  font-size: var(--fs-tiny);
}
```

`.contract-men`, `.contract-offer` and `.contract-tip` carry no rule of their own: they are hooks
for the tests and for anything a later turn wants to say. `.contract-men` sits on an
`.assign-line`, which already lays chips out and wraps them; `.contract-offer` sits on a `.card`;
`.contract-tip` sits on a `.hint`.

---

## 4. NAMES: where the brief's words are not the code's

1. **"the contract bar"** (2.1.5). `renderContractBar` in `src/ui/contracts.ts` is **gone**, not
   emptied: its chips, its `Assign to this contract` button, its assign list and its week bar are
   the Running section of the tab now, so there is one of them and not two. The Jobs tab is the
   plan and nothing else.
2. **`contractResultFor(contract, worker)` is now `contractResultFor(state, contract, worker)`**
   and returns the whole of the card: the minutes, the labour, the material, the margin, the
   pieces a day, the pieces a day the client wants, the days of his week, the free minutes, the
   pieces a week, the week's result and the term's. It applies the machine speed of the piece's
   stage, which 2.1.1 asks for, and `null` in the worker's place is the owner, costed at his
   draw. The Orders page reads the same function, so the two screens cannot disagree.
3. **`contractAssignCheck(contract, worker)` is now
   `contractAssignCheck(state, contract, who)`**, and the rule about the man is
   `contractManCheck(state, who)` underneath it. The offer card needs the rule about the man
   without the contract being active yet, which is why it is a function of its own.
4. **`contractWantsToday(state, workerId)`** is the predicate 2.1.4 asks for, and
   `piecesDueBy(contract, day)` is the line behind it. Both are exported from
   `src/engine/contracts.ts` and both are read by the engine and by the tab.
5. **"the week's result: pieces times margin, less his wages for the days it takes"** (2.1.1).
   The margin a piece already has his labour taken off it, two lines earlier in the same
   paragraph, so taking his wages off again would count them twice. The mockup settles it: its
   row reads `Week: 40 pieces x £9 - his 4 days' wages already counted` and its figure is
   40 x 9. The card says the same in the game's words: `The week: 40 pieces, 4 days of wages
   already counted`, and the figure is the pieces times the margin.
6. **"the owner's days cost his draw"** (2.1.1) is `contractMinuteCost`: a worker's minute is his
   weekly wage through `workerMinuteCost`, the job card's own divisor, and the owner's minute is
   `ownerDrawPerDay(state)` over `MINUTES_PER_WORKING_DAY`. At the first draw tier that is 0.42 an
   hour against an experienced joiner's 0.25, so the owner is the dearest man in the hall on a
   contract, which is what his draw says he is.
7. **The renew question** stays on the Orders page (`renderContracts`), where the closing event
   sends the player in as many words. The tab's Ended section is the closing report, greyed, as
   2.1.3 says and nothing more, so no control is drawn there that the Orders page does not
   already carry.
8. **"one charge" for the overflow** (2.16). The brief offers temporary storage or the pallet; I
   took the pallet, so nothing is charged at all for a job's own material. See section 6.

---

## 5. TESTS CHANGED, AND WHY

Behaviour this brief changes, so the test was moved to the new truth. Every one of them says so
in the test itself.

- `tests/engine/contracts.test.ts`, "takes him off his job when he goes on the contract": the
  contract no longer takes him off his job (2.1.4). It now asserts he is on both, that the job
  stays in production, and that taking him off the contract gives him back to the job.
- `tests/engine/contracts.test.ts`, "drops a man the player put on a job through the Work Plan":
  reversed by 2.1.2, assigned once he stays on it. It now asserts he keeps both and the contract
  takes its minute back.
- `tests/engine/contracts.test.ts`, "the result with a man on it": `contractResultFor` takes the
  state and applies the machine speed, so a man's minutes on the day 1 kit are at the used saw's
  0.95 and not at his bare rate. It asserts the saw's figure, the by hand figure in an empty
  hall, and the same ladder it always asserted.
- `tests/ui/contracts.test.ts`, the two describes about the standing bar: the bar has left the
  Jobs tab (2.1.5). They now assert the Jobs tab carries no contract and that Running carries the
  same chips, the same button, the same list and the same cross.
- `tests/scenarios/turn13.test.ts`, scenario (v): that month takes the joiner off the contract for
  two weeks running, which from tonight is the case the client ends it on (2.1.6). It now asserts
  three weeks on the history, one full and two short, `endedBy` the client, and the renegotiated
  price that follows from them (97, where it was 99 over five weeks). **This is the one file of
  phase C's I touched**, and only because it asserted the old rule.

New test files, all mine by the naming rule:

- `tests/engine/contractPrices.test.ts` (2.2): the three margins an hour by hand, printed for the
  report and asserted inside the 22 to 30 band; the wardrobe front four hours; and a cut sheet
  pack by tier, by hand and with the used saw.
- `tests/engine/contractDay.test.ts` (2.1.4, 2.1.6): the week's line, the predicate, the handover
  inside a day of the clock, the marker taken back the next morning, the client's end and the
  three ways a term is marked.
- `tests/ui/contractsTab.test.ts` (2.1): the offer card, the figures for the man who is picked,
  the day track's blocks, the comparison track and the machine tip, the owner's row, Running with
  the amber job minutes and the short week, Ended greyed, and the app test that takes the
  contract in one click and finds the one cross on the list.
- `tests/engine/bespokeOrder.test.ts` (2.16): the fifty thousand pound job on a fifty place rack,
  one order, one unload, no shortfall; the pallet kept overnight and landed as the cutting makes
  room; and a stock lorry's overflow still lost in the yard.

Two figures worth printing in the report, both out of `tests/engine/contractPrices.test.ts`:

```
MARGIN AN HOUR BY HAND
Cut sheet pack: 45 min by hand, £50 a piece, £30 of material, £20 of margin, £26.67 an hour
Drawer box: 60 min by hand, £52 a piece, £26 of material, £26 of margin, £26 an hour
Wardrobe front: 240 min by hand, £160 a piece, £60 of material, £100 of margin, £25 an hour

A CUT SHEET PACK BY TIER
novice: by hand 84 min a piece, margin £4.25; with the used saw 59 min, margin £8.94
experienced: by hand 68 min a piece, margin £3; with the used saw 47 min, margin £8.25
senior: by hand 56 min a piece, margin £1.33; with the used saw 39 min, margin £7
master: by hand 48 min a piece, margin £0; with the used saw 34 min, margin £5.83
```

The second table is worth Piotr's eye: at the new prices an extremely experienced joiner in a
hall with no machine at all makes exactly nothing on a cut sheet pack, because the wage ladder
(450, 600, 800, 1,000) is steeper than the speed ladder (0.8, 1.0, 1.2, 1.4). One used saw puts
all four above water. The brief's band is about the workshop's margin an hour and not the man's,
and that band is met; this is what it comes to per man.

---

## 6. THE TWO DECISIONS PHASE A LEFT TO ME

### 6.1 The owner on an offer (2.1.1)

**Decided: the owner is costed on the card and told on his own row that he cannot be put on a
contract.** He is in the `Who would do it?` picker, every figure of the card is worked out for
him when he is picked (his minutes at rate 1, his labour at his draw, his day drawn as blocks),
and the reason sits beside the button: `A contract is work for a joiner: you cannot be put on
one`. The button he gets is `Take it`, which accepts the offer and nothing else, so it does
exactly what it says; with a joiner picked it is `Take it, <name> on it` and does both.

Why not the other reading. Letting `contractAssignCheck` take the owner is one line, but nothing
behind it would hold: `assignContract` looks the man up in `state.workers`, where the owner is
not; `contractHands` returns `Worker[]`; `runContractMinute` reads `worker.rate`,
`worker.station`, `worker.jobId` and `worker.productionMinutes`; the owner's minutes are spent
through `spendOwnerMinute` and his day through `ownerIsAvailable`. Carrying him would be a rewrite
of the contract minute loop around a man who is not a `Worker`, which is a long way outside what
2.1 states line by line, and section 6 of the brief says scope 1:1. What 2.1.1 asks for in as
many words is that the owner is among the men the card costs, and he is.

The trap phase A found is shut either way: the tab never draws `takeContract` for a man the
engine would refuse, and note 1.2 shuts it in the route as well.

**For Piotr:** should the owner be able to stand at a contract himself? Tonight he cannot. If he
should, it is the contract minute loop that has to learn about him, and that is a turn's work of
its own.

### 6.2 The wardrobe front is costed at 60 and draws 220 off the rack (2.2)

**Not fixed, because it cannot be fixed without moving one of Piotr's own figures.** Written out
in full, since the report has to put it in front of him:

- 2.2 sets the wardrobe front at `material: 60` and says in as many words that `sheets` per piece
  stays what it is, which for the wardrobe front is **1.1 sheets**.
- The card costs the piece from `material`, which is what 2.2's table and its stated margin of
  100 a piece mean: 160 less 60 is the 100 in the brief's own column, and 25 an hour over its
  four hours, which is the band the brief asks for.
- The engine draws the sheets from the rack by `sheets`: `sheetsForPieces` takes 1.1 sheets a
  piece off the rack, and a sheet is `SHEET_VALUE` 200 at cost, `SHEET_PRICE_STOCK` 175 bought
  ahead. So the piece is **costed at 60 and draws about 220 of stock**, and the contract quietly
  empties the rack about three and a half times faster than its own margin says it should.
- The two small pieces do agree: the cut sheet pack is 30 of material and 0.15 of a sheet (30 at
  200), the drawer box 26 and 0.13 (26 at 200). The wardrobe front is the only one that parts
  company.
- **The one number that would settle it: the wardrobe front's `sheets` at 0.3** (60 over
  `SHEET_VALUE` 200), or 0.34 if it is to be read at the stock price. Piotr's other choice is to
  raise its `material` to about 220 and its price with it, which would move the margin an hour
  out of the 22 to 30 band, so 0.3 is the cheap end of the question.

`tests/engine/contracts.test.ts` asserts the disagreement as it stands, so nothing changes under
anybody until Piotr answers.

---

## 7. THE PALLET: WHICH HALF OF 2.16 I TOOK

2.16 offers two homes for the overflow of a job's own delivery: temporary storage through
`moveOverflowToStorage`, one charge, or "held on the pallet until the rack has room". **I took the
pallet**, and nothing is charged for a job's own material.

What that means in the code (`src/engine/materials.ts`):

- `unloadIntoStock` holds the whole load for the job, the part that went on the rack and the part
  that would not go on it, and returns **0** as the overflow that needs a decision. `game.ts`
  raises the `stockOverflow` event on that number, so a job's own lorry no longer asks the player
  a question he has no reason to be asked: the material is his and it is standing in his yard.
- `jobSheetsOnPallet(state, jobId)` is the pallet, read off the delivery's own
  `overflowSheets`, so no new field was wanted on `Job` and `types.ts` stayed shut.
- `reservedSheets` takes the pallet off each job's reservation, so **the rack's free count stays
  the rack's**: a job holding 115 sheets of which 65 are outside does not make 65 sheets of
  somebody else's rack disappear.
- `writeOffSheetsLeftOutside` skips a job's own pallet. A stock lorry's overflow is still the
  yard question of Turn 2, still offered storage, and still gone by morning.
- `landPalletSheets` puts the pallet on the rack as room appears, and `drawSheetsFor` calls it
  before it asks the rack for the next slice of work, so the pallet comes in behind the saw
  without a click and without a task.

`shortfallOf(job)` is unchanged in shape and counts the pallet because the pallet is inside
`job.sheetsReserved`. `Order for this job` reads `orderForJobCheck`, which already refuses while a
delivery for the job is on the road or in the yard, and the card draws the locked button with the
reason on it; after the unload there is nothing short, so no button is drawn at all. That is the
whole of Piotr's complaint answered: one order, one unload, one price.

---

## 8. WHAT I COULD NOT DO

1. **The man picker does not redraw until note 1.1 is applied.** The chips are drawn, the route
   exists and `ui.contractMan` is set, but the renderer is not given it, so the card keeps the
   default man's figures. Everything else on the card, the button included, is live.
2. **The route cannot show a refusal** until note 1.2 is applied: `applyAction` hands the checks
   back and the reducer in `game.ts` drops them, and both files are frozen. Nothing can reach the
   trap today, because the tab does not draw the button for a man who would be refused.
3. **The day's line is the week spread over the working days of the week, read forward.** 2.1.4
   says "the week's quantity spread over the days left in the week"; a man behind the line would
   want a day start count to spread the catch up over the days that are left, and there is no
   field for it on the contract and `types.ts` is frozen. `piecesDueBy` is the same line read
   forward: on schedule the two readings are identical, and behind it the contract asks for the
   catch up at once instead of over the days that are left. It is stateless, and it is one
   function both the engine and the tab read.
4. **A man on a contract with no job of work to go to keeps making pieces after the day's share
   is made**, as he did in v28, because the client pays for every piece. The day's line orders his
   day; it does not cap what a man with nothing else to do can make.
5. **Several men on one contract share one day's line.** Each man's track is drawn against what
   the contract still wants, so with two men on it both tracks can show the same remaining pieces.
   The engine is right (the line is the contract's, and the first man to make the pieces closes
   it); only the second man's drawing is optimistic.

---

## 9. ONE THING TO WATCH IN THE WORKTREES

`.gitignore` holds `node_modules/`, with the trailing slash, and a phase B worktree has
`node_modules` as a **symlink**, which git sees as a file and not as a directory. So
`git add -A` stages the symlink, and it points at an absolute path on this machine. It went into
my first commit and was stripped out of all four again with
`git rebase <base> --exec "git rm --cached --ignore-unmatch -q node_modules && git commit --amend --no-edit -q"`.
The four commits carry none of it now; check the other two branches before the merge, and if
anybody wants it shut for good, the line in `.gitignore` wants to be `node_modules` without the
slash.

---

## 10. REVIEW: the adversarial reading of the B1 diff

Six findings. Three stood and are put right in the commit `B1 reviewed: the findings that stood`;
one stood and is a line in a frozen file, so it stays note 1.1; one stood and cannot be put right
without moving one of Piotr's own figures, so it is now note 1.5 as well as section 6.2; one is a
true reading of the code whose fix is a turn's work of its own, so it is refused and said plainly
in the report instead.

**1. The wardrobe front's margin forgets three quarters of its material (blocker). CONFIRMED,
not fixed here.** The reading is right and section 6.2 had it: the card and the closing report
cost the piece at `material` 60 and the rack is drawn by `sheets` 1.1, about 220 at
`SHEET_VALUE`. The fix the reviewer asks for is one line of `src/engine/constants.ts`, which is
frozen for phase B, and 2.2 of the brief says in as many words that `sheets` per piece stays what
it is, so it is also one of Piotr's own figures. It is now note 1.5, exact old and new text and
the test with it, marked as wanting Piotr's word, and it is a line of the report. Nothing in my
own files can mend it: costing the card off `sheets` would put the wardrobe front's margin an
hour outside the band 2.2 asks for, and would be a second arithmetic beside the table.

**2. A contract short of sheets freezes the man off his job as well. CONFIRMED and FIXED.** The
failure was exactly as described: `contractWantsToday` stayed true all day while
`contractWaitingForMaterial`, so `hands()` in `production.ts` skipped the man and
`runContractMinute` stood him at his bench, and the job under him stood still with him.
`contractWantsToday` now answers the material question first: with the rack unable to cover the
next piece, the contract wants only the man who has nowhere else to go. The waiting branch of
`runContractMinute` is left alone, because a man with a job is no longer in `wanted` when it is
reached, and its comment says so. Two tests in `tests/engine/contractDay.test.ts`: the hour the
job gets while the rack is empty (red before the fix, on the line the reviewer named), and the
man with no job who still stands at his bench.

**3. The man picker chips change nothing in the running app. CONFIRMED, cannot be fixed here.**
`src/ui/app.ts` is one of the six frozen files and the change is note 1.1, which carries the
exact old and new text. The app level test the reviewer asks for is in note 1.1 as well: it
cannot be committed tonight because it would be red until the line is applied, and a B agent
commits nothing red. Phase C applies the line and the test together.

**4. The Orders page says "the term is over" when the client walked away. CONFIRMED and FIXED.**
`endedBlock` now prints `endedLine(contract)` the way `endedCard` does, so the engine's one word
for it reaches both screens. Test in `tests/ui/contracts.test.ts`: a contract with
`endedBy: 'client'` and two short weeks heads its Orders block "the client has ended it after 2
short weeks".

**5. Two clock positions typed into the day track's ticks. CONFIRMED and FIXED.** The array is
gone. `dayTicks()` reads every two hours from 8:00 off one named figure,
`DAY_TRACK_TICK_MINUTES` (section 2), and puts `DAY_END_MINUTE` on the end, leaving the last two
hour mark off when the end of the day is nearer to it than half of that. The labels are the
drawing's own, 08:00, 10:00, 12:00, 14:00 and 17:00, which the tick test in
`tests/ui/contractsTab.test.ts` already asserts, and they now follow the working day instead of
sitting under it.

**6. Only the piece's first stage ever has a machine. CONFIRMED as a reading, fix REFUSED.** The
reviewer is right about the code: `pieceStage` takes `piece.stages[0]`, so the wardrobe front is
worked, costed and tipped at its cutting stage, and a spray booth buys nothing on a contract. It
is the contract model of T13 and T17 and not tonight's work: weighting a piece's minutes across
its stages means the minute loop has to know how far through the piece it is, which machine he
stands at changes inside a piece, and the hall's drawing and the station follow it. That is a
turn of its own, and 2.1 and 2.2 do not state it line by line, so scope 1:1 says no. It is said
plainly in the report instead, in the words the reviewer's second option asks for, and the
engine and the card go on agreeing with each other.

### What this review changed

- `src/engine/contracts.ts`: `contractWantsToday` answers the material question first.
- `src/ui/contracts.ts`: `endedBlock` prints `endedLine`; `dayTicks()` and
  `DAY_TRACK_TICK_MINUTES` replace the typed clock positions.
- `tests/engine/contractDay.test.ts`: two tests for the empty rack.
- `tests/ui/contracts.test.ts`: one test for the closing line on the Orders page.
- `NOTES-B1.md`: note 1.5, the new figure in section 2, this section.
- `REPORT-T20.md`: the four B1 tasks in two lines each, and the two things Piotr has to answer.
