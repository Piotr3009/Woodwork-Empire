# Phase B1 notes: the money (CLAUDE.md T21 2.1, 2.2, 2.3, 2.4)

Branch `claude/determined-tesla-e90ze6`, on top of phase A (89fe38f). Four commits, T21-B1a to
T21-B1d. Everything below is what the lead has to know: the frozen file changes to apply, the
numbers chosen, the names the brief calls one thing and the code another, and two lines a task.

## Frozen file changes for the lead to apply

(Filled in as each task needs one. Nothing here has been applied by this agent.)

## Numbers chosen

(One line per figure this agent chose itself, with its [TUNE] reason.)

## Names: the brief against the code

The lead's list, confirmed against the code as it stands:

- `state.arrears` is `state.finance.arrearsAmount`.
- the months counter is `state.finance.arrearsMonths`.
- `ARREARS_BAILIFF_MONTHS` is `ARREARS_MONTHS_BAILIFF`.
- the brief's "normal" difficulty is the code's `hard`.

## The mockup against the brief

`docs/mockups/t21/debt.html` part 2 has a note under the card that reads "Reputation scales with
the price: -10 up to 5,000, then -1 per 2,000 to -30", and draws -30 on a commercial job of about
51,000. CLAUDE.md 2.4 says a point per 1,000 over 5,000, capped at 50, commercial 1.5 times, and
CLAUDE.md wins where the files disagree (its own first rule). So the card built here shows -50 on
that job and not -30. Worth one line to Piotr: the drawing's note is Turn 20's arithmetic and the
brief's is his own of 19.09.

## T21-B1a: 2.4, the reputation cost of a drop follows the price

- Built: `tests/engine/dropReputation.test.ts`, a new file rather than an extension of
  `tests/engine/dropJob.test.ts`, because the scale is a fact about one pure function and the drop
  test is about the whole action: the five prices of the brief, the cap above 50,000, the
  commercial 1.5 (3,000 -> 15, 10,000 -> 23, 20,000 -> 38, 50,000 -> 50), and the points the drop
  really takes off through `act(state, { type: 'DROP_JOB' })` with the reputation log line carrying
  the same number.
- Left: nothing in the engine. `dropReputationCost` as phase A wrote it is right at every price the
  brief names, and `dropJob` charges it. Two tests were rewritten to the new truth and neither was
  weakened: `tests/engine/dropJob.test.ts` now reads its figure through `dropReputationCost(job)`
  and asserts the ten is the floor of the scale for a job under 5,000 (it was asserting a flat
  `DROP_PROJECT_REPUTATION`), and `tests/scenarios/thirtyDays.test.ts` does the same for whatever
  job its careful script has on the books, with `toBeGreaterThanOrEqual(DROP_PROJECT_REPUTATION)`
  keeping the floor honest.
