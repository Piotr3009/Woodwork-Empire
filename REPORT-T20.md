# Report, Turn 20: contracts that pay, people you can run

Woodwork Empire, Turn 20. Built against `CLAUDE.md` of 18.09.2026 (first line "Turn 20").
Branch `claude/woodwork-empire-t20-3a7zg6`, off the v28 tree (`d35e9b5`). `APP_VERSION` v28 to
v29, `STATE_VERSION` 16 to 17.

Two lines a task, in the order of section 5. Phase C folds `PHASE-A-NOTES.md` into this file and
writes the rest of the report around it.

## Phase A

**T20-A1 Housekeeping and v29.** The Turn 19 brief was archived byte for byte from the Turn 19
merge commit (`58987d1`) into `docs/turn-19-brief.md`, the README's lines were moved on,
`APP_VERSION` became `'v29'` (the one bump of the turn), `docs/art/REQUESTS-T20.md` was written
from section 9 and `docs/ui-style.md` was written out of the code as it stands: the three modal
skins, the tokens, the buttons, the chips, the one cross, the fonts and the two figure sizes,
each with its CSS class.
`npm run check` green on its own exit code.

**T20-A2 Phase A proper.** Section 4's state: `STATE_VERSION` 17, the four tier ids through the
types with every compile error fixed by the rename, `weeklyWage` as the one wage field with
`monthlyWage` gone, `leavesOnDay`, `serviceCount`, `inServiceUntilDay`, `contract.endedBy`, and
the version 16 to 17 lift behind them; `CONTRACT_PIECES` at the prices of 2.2; `sweep` in
`ANIMATIONS`; the Work Plan's two tabs and the Machines page routed but empty; `data-popover` on
the popovers that exist.
`npm run check` green on its own exit code. What was chosen and what phase B must know is in
`PHASE-A-NOTES.md`.

**T20-A3 Phase A reviewed.** Three adversarial readings of the phase A diff gave fourteen
findings; eleven stood and were put right, two were rejected because the decision behind them
belongs to a later phase or to Piotr, and one was the same finding twice. The
blocker was the lift: an interview the owner was sitting in when a v28 save was taken carried the
old tier id in its hire order, so the hour was spent and nobody was taken on. The rest were the
Company board's crew lines going empty at the new rates, the Accounting page still promising a
salary bill nothing charges, the offer card not redrawing when the player picked another man, the
why popover missed by the `data-popover` pass, the hiring gate reading a different reputation
figure from the board, and the lift with no test behind it.
`npm run check` green on its own exit code. Each finding, confirmed or rejected, is in
`PHASE-A-NOTES.md` under "Phase A review".
