# Turn 18: easy and friendly

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 17.09.2026, from Piotr playing v25 on
the morning of 17.09 and Claude's read of the code (Petros: software/woodwork-empire, STAN T18).

Read this whole file (first line must say "Turn 18"; if the root CLAUDE.md does not, stop and
report), then REPORT-T17.md in full, then the archived briefs in docs/. Where files disagree, this
one wins. All standing rules apply (no em or en dashes anywhere, scope 1:1, one code path,
constants never in the UI, [TUNE] for every figure you choose and [PIOTR] for his, kill background
processes, PR without merge, end the session, no PR watching, npm run check gated on its own exit
code, every click single, one APP_VERSION bump).

Precondition. main carries Turn 17 merged (PR #17): APP_VERSION 'v25', STATE_VERSION 15,
src/engine/rate.ts exists. If APP_VERSION is not 'v25', stop and report.

One agent, serial. Nine small pieces; none of them is worth a team.

## 0. What this turn is for (Piotr, 17.09)

Nothing new. Piotr: "I have no more ideas; what would you fix so the game is easy and fun." Nine
fixes, six his and three Claude's that he accepted. The ones that matter most: the game tells the
player when the money is running out (today it is silent until the month end), the date reads
like a date, and everything closes with the same big friendly cross.

## 1. Rules restated (short)

Everything from Turns 1 to 17. Tonight in addition:

- APP_VERSION = 'v26'. STATE_VERSION does not bump.
- Nothing in the engine's economy changes. The warnings of 2.6 read the ledger; they do not touch
  it.
- Art is not this session's. The helper's own character sheet is Piotr's job with GPT and is
  not requested again; when `character.helper.*` lands the loader picks it, as it does for every
  role, with no code.

## 2. Changes to the design (the contract)

**2.1 A man walks slower at x1 [PIOTR].** `WALK_CELLS_PER_SECOND` 1.6 to 1.0. Nothing else about the
walker changes; the walker tests that read the constant still pass by reading it.

**2.2 The date reads like a date [PIOTR].** The calendar is already thirty days to the month
(`monthOfDay`, `dayOfMonth`); only the words are wrong. Everywhere the game prints "day N" for the
player (the top bar's `formatDate`, the day end, the month end, the deliveries' "due day N", the
enquiries' deadlines, Our team's "started on day N", the house, the reports) it prints the day of
the month and the month's name instead: `Mon 12 March`. Months are named from a start month
`START_MONTH` [TUNE: March], twelve names cycling, no year. The weekday stays. `state.clock.day`
and every engine figure stay as they are; this is one formatter, `formatCalendarDay(day)`, used
by every place, and `formatDate` calls it. Done: a test that no rendered screen contains the
words `day ` followed by a number for the current day (the sprite check page is not a screen).

**2.3 The rack's number, a third of the size [PIOTR].** The figure on the rack (T17 2.8) is drawn
at a third of its present height and stroke, in the same place. Done: the render test's size.

**2.4 Chips over tips [PIOTR].** Under the hall the first use tip is the last thing, at the very
bottom, and the chips of T17 2.5 sit above it and never over it: the two are laid out in one
column, chips first, tip last, so nothing overlaps whatever the tip's length. Done: a layout test
on the DOM order and a screenshot.

**2.5 One cross to close everything [PIOTR].** The close control of every modal, page and card is
the cross the Company board has: same size, same place (top right, outside the paper), same
colours, same hit area. The catalogue's small dark cross in the corner goes. One `closeButton()`
helper, called by every modal skin. Done: a test that every `ModalId` renders exactly one
`.modal-close` and that it is the same markup for every one.

**2.6 The money speaks before the month end [CLAUDE, accepted by Piotr].** Two lines for the
warning strip under the top bar, from `warnings.ts`, in its order of urgency, above the crew line:

1. **Below zero.** While cash is under zero: `Account below zero: the overdraft costs £X a day`,
   X from `OVERDRAFT_RATE_YEARLY` on the balance, rounded to the pound (or the pence when under
   a pound), recomputed every day.
2. **Spending over earning.** When the last five closed days' wages, draw and fixed charges
   (rent, rates, power, insurance, security, loan and overdraft interest, software) exceed the
   labour earned in the same five days (the rate's numerator, `rate.ts`): `You spend more than you
   earn: £X out, £Y in this week`. Shown from the sixth day the game has closed, never before.

Both read the ledger and `dayStats`; neither changes a figure. Done: the warnings tests (under
zero shows and clears; a week of wages with no work shows; a week that earns more than it spends
does not).

**2.7 The first days say what to do [CLAUDE, accepted].** On days 1 to 3, in place of the warning
strip when it has nothing more urgent, one line that walks a new player in: `Set up the hall`
until the hall has been set up once, then `Accept an enquiry on the board` until a job exists,
then `Press Start production on the work plan` until production has started. After the third
step, or from day 4, the line is gone for good. It is a warning strip line (`warnings.ts`, key
`firstSteps`), not a new system, and the tips setting turns it off with the tips. Done: its
test.

**2.8 The keyboard [PIOTR].** `P` pauses and unpauses; `1` to `5` set x1, x2, x4, x10, x30 (the
five running speeds of `SPEEDS` in order); `Escape` closes as it does. Space stays what it is
(held, it drags the hall). Keys do nothing while an input has focus. Done: the app test.

**2.9 The margin on the client's answer [CLAUDE, accepted].** When the client answers with a
number (T13 3.24), the accept dialogue shows, next to the offer, the margin that price leaves:
`The client offers £9,400: margin 18%`, the same margin figure the job card would show, from the
same function, in the game's green over 20% and the game's red under 10% [TUNE the two lines],
body colour between. Done: the board test.

## 3. State

No change. STATE_VERSION stays 15.

## 4. Task queue, in order

Branch turn-18-easy-and-friendly from main. One commit per task, npm run check green on its own
exit code before each, two report lines per task in REPORT-T18.md.

T18-01 Housekeeping and v26: docs/turn-17-brief.md byte for byte from the Turn 17 merge commit's
CLAUDE.md, the README's briefs and reports lines, APP_VERSION 'v26'.
T18-02 2.1 and 2.3.
T18-03 2.2, the calendar formatter everywhere.
T18-04 2.5, one cross.
T18-05 2.4, chips over tips.
T18-06 2.6 and 2.7, the warning strip.
T18-07 2.8, the keyboard.
T18-08 2.9, the margin on the answer.
T18-09 Look and shoot: six pictures into docs/report-t18/ (the top bar with the date, the strip
with both money lines, the first steps line on day 1, a modal with the cross beside the Company
board's, the chips over a tip, the answer dialogue with a margin). npm run check green.
T18-10 Report and PR: REPORT-T18.md in the usual structure plus "Numbers chosen" and "Where day N
was still printed and what it became" (every call site of 2.2). Kill background processes, push,
PR titled `Turn 18: easy and friendly`, do not merge, end the session.

## 5. Do not (tonight)

- No change to the engine's economy, the rate, Output or Efficiency.
- No change to the hall labels (they go when the art comes; hover bubbles then).
- No confirmation step on Sell, no catalogue greying, no shorter day end (Piotr said no).
- No pipe colour change (the pipes are GPT's next).
- No touching docs/art/SPRITES.md, CLAUDE.md, the archived briefs, the mockup files, the sprite
  files, the character sheets or the font file.
- No storage access outside src/cloud/store.ts; no PixiJS, sound, mobile, Steam, Electron.
- No watch loops, nothing left running.

## 6. Parked

- The helper's character sheet: Piotr with GPT (the owner's model in a yellow shirt).
- Hall labels only as hover bubbles, once the art lands.
- The pipe tiles and their colour: GPT.
- A second click on Sell; greying the catalogue by cash; a shorter day end; the Easy start
  (the report's playthrough shows the loan is the lever, not the prices).

## 7. The cross check (before the PR)

- `grep -rn "day \${" src/ui src/render`: every hit is either the formatter or the sprite check.
- `grep -rn "modal-close" src/ui`: one helper, every skin calls it, no other cross markup.
- The warning strip's order: bags, nobody assigned, overdue, no insurance, below zero, spending
  over earning, crew full, first steps; the test asserts it.
- The keyboard test: `1` to `5` map to `SPEEDS[1..5]`, `P` toggles pause, nothing with an input
  focused.
- The six pictures.

End of brief.
