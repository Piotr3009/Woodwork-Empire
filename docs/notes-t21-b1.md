# Phase B1 notes: the money (CLAUDE.md T21 2.1, 2.2, 2.3, 2.4)

Branch `claude/determined-tesla-e90ze6`, on top of phase A (89fe38f). Four commits, T21-B1a to
T21-B1d. Everything below is what the lead has to know: the frozen file changes to apply, the
numbers chosen, the names the brief calls one thing and the code another, and two lines a task.

## Frozen file changes for the lead to apply

Nothing here has been applied by this agent.

### 1. `src/ui/styles.css`: the bankruptcy card (T21-B1b, CLAUDE.md 2.2)

The card the drawing shows is dark with a red border, and no class in the file does that. New classes
only, no new colour, font, radius or shadow value: the dark is the folder skin's own `--ink`, the
border is the palette's `--bad`, the paper is `--cream`, the head reads `--fs-display`.

**(a) Add `.bank-card h3` to the title hand's own selector list**, so the hand is still worn by one
list and no second `font-family` is typed (styles.css 2870 to 2878, the rule ending
`font-family: var(--font-title)`).

Exact old text:

```css
.board-week h4,
.painted-text,
.menu-pop h3 {
```

Exact new text:

```css
.board-week h4,
.bank-card h3,
.painted-text,
.menu-pop h3 {
```

**(b) Widen the one rule that hides a file picker**, because the card carries the same
`data-field="saveFile"` input the Menu carries and there must not be a second copy of the rule.

Exact old text:

```css
/* The file picker behind "Load from file" is the browser's; the input itself stays out of sight. */
.menu-pop input[type='file'] {
```

Exact new text:

```css
/* The file picker behind "Load from file" and behind the bankruptcy card's "Load a save" is the
   browser's; the input itself stays out of sight. */
.menu-pop input[type='file'],
.bank-card input[type='file'] {
```

**(c) Add this block to the Turn 21 section at the end of the file**, under phase A's drop card
block:

```css
/* 2.2 The end. The bankruptcy is the event it always was, so it is a folder with the one cross, and
   this is the drawing's dark card inside it (docs/mockups/t21/debt.html part 3). The dark is the
   folder skin's own ink, so the card is the same colour as the writing on the paper around it. */
.bank-card {
  background: var(--ink, var(--page));
  border: 6px solid var(--bad);
  border-radius: 6px;
  color: var(--cream);
  margin: 0 auto;
  max-width: 620px;
  padding: 24px 28px;
  text-align: center;
}

.bank-card h3 {
  color: var(--cream);
  font-size: var(--fs-display);
  margin: 0 0 6px;
}

/* The folder skin paints every paragraph in its body ink, which is this card's background. */
.modal-folder .bank-card p {
  color: var(--cream);
}

.bank-figs {
  display: grid;
  gap: 4px 16px;
  grid-template-columns: 1fr auto;
  margin: 14px auto;
  max-width: 360px;
  text-align: left;
}

.bank-figs b {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
```

Reason: the card is built and tested, and until this lands it renders with the folder's paper colours
and an unhidden file input. Nothing outside these three edits is wanted in styles.css for B1b.

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

## T21-B1b: 2.2, the bank closes a company that cannot pay

- Built: `netPosition(state)` (cash less the arrears, which are stored as an amount owed) and
  `checkBankruptcy` reading it against `bankruptcyFloor`, plus the second rule,
  `finance.daysBelowOverdraft >= BANKRUPTCY_DAYS_BELOW_LIMIT`; `countDayBelowOverdraft` keeps that
  counter at the close of the day's money inside `runDayCosts`, a day below the limit adding one and
  a day at or above it putting it back to nought. Two reasons, one a rule, through the one
  `declareBankruptcy`, which now also hangs the four figures (cash, arrears, net, allowed) and the
  month on the event. The card is `renderBankruptcyCard` in `src/ui/eventModal.ts`, routed from
  `renderEvent` for the bankruptcy kind, with the head, the day and the month and the rule, the four
  figures as the drawing's two column grid, the working days kept with the orders taken and built,
  and a footer of `Start again` (the Start screen's `restart`) and `Load a save` (the Menu's
  `loadFromFile`, with the same `data-field="saveFile"` input beside it so the browser's picker
  opens). Tests: `tests/engine/bankruptcy.test.ts` (8) and `tests/ui/bankruptcyCard.test.ts` (7).
- Left: `renderGameOver` in `src/ui/dayEnd.ts` is untouched, so the page behind the card still
  offers `Start again` alone; the brief asks for the two buttons on the card and says nothing about
  the page under it. The CSS of the card is a note above and not applied.

### The cadence, written down because the brief and the code disagree in words only

The brief says the check happens "at the day's close, as today". The code runs `runDayCosts` from
`startDay`, which is the morning. "As today" governs: the cadence is one look a calendar day, at the
point the day's money is settled, and nothing moved. Both the counter and the two rules are in that
one place.

### What this rule costs the rest of the game, for Piotr

Four tests asserted the old world and now assert the new one. None was weakened and none was
skipped, but two of them are findings and not bookkeeping:

1. **Doing nothing on Hard is now a dead company on day 22**, where it used to drift past the end of
   the month (`tests/scenarios/thirtyDays.test.ts`, "30 days on Hard, doing nothing"). The overdraft
   fills on day 11, the bills go unpaid from then, and on day 22 the net position, -7,778, passes the
   -7,500 the bank allows. This is exactly what Piotr asked for, so it is asserted rather than worked
   around.
2. **The three month arrears ladder is now almost unreachable by playing badly.** A company whose
   debt keeps growing passes one and a half times its overdraft inside a fortnight, so the final
   warning at two months and the bailiff at three can only be reached by a company that missed a
   bill and was then paid by a client, which is how the two ladder tests in
   `tests/engine/economy.test.ts` now build their company (the day 71 bankruptcy of three months of
   arrears is kept, on a company that got paid on day 12). The bailiff rung is worth a word to Piotr:
   it is still in the game, but only for a company that can pay its way and simply has not paid one
   old bill.
3. `tests/scenarios/turn13.test.ts` (t) and `tests/engine/finance.test.ts` both needed a wider
   overdraft to reach the 1st they are about at all, because three months of fixed costs with nothing
   coming in now closes a company. Both say so in a comment, and (t) asserts the day 22 closure
   beside its interest line.
