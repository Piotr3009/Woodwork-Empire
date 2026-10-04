# Mockups for Turn 27

Drawn by Claude Code on 04.10.2026, before the code that makes them true (CLAUDE.md T27 section
9). Each page is the game's own markup in the game's own classes, made by the game's own functions
(`renderTopbar`, `renderEvent`, `renderEventFooter`, `renderMonthlyReport`, and the event modal's
shell through `syncModals`), linked to `src/ui/styles.css`, with the change of tonight written
into it, and shot in headless Chromium. The page around each shell is the mockup's own layout and
no game style. No art was asked for.

1. `top-bar.html` (and `top-bar.png`): the top bar at 1,280 wide, before (v80, `Wed 30 September ·
   11:17`) and after 2.1 (`Wed 30 September 2027 · 11:17`). The date is the title hand at
   `--fs-hand-small` over the speed knobs; the longest date the calendar can make, a nine letter
   month on the 30th with its four figures of year, measures 227 px against 185 px without the
   year, and the knobs' row under it is 268 px, so the clock block keeps its width and nothing
   else on the bar moves: the day meter stays 321 px and the gear ends 14 px inside the 1,280. The
   cash plate carries Piotr's day 806 figure, 1,470,000, the widest a played company has shown.
   The date string is the brief's; in the game's own calendar 30 September 2027 is a Thursday
   (day 900), and the Wednesday is 30 September 2026 (day 570), the same width either way.
2. `tax-cards.html` (and `tax-cards.png`): the two cards of the tax in the event modal's own
   classes, the small folder every one choice event wears, with the one cross. On the left 2.3,
   `Tax is coming`, raised on the first working day of December; on the right 2.2, `Tax for 2025`,
   the first time the player is at the page after the tax is booked on the open of 30 December.
   Under them, for size, the month end's middle folder with December's report on the first working
   day of January, its body scrolled to its own `Tax` line, which stands before `Everything else`;
   the figures are a played first month's with the Tax line written in and the cash rows moved
   with it. With the account at nought or under, the warning's figure reads `On 30 December the
   taxman takes 25% of whatever is in the account. Nothing as it stands today.`, the rest of the
   card as drawn.
3. `warning-strip.html` (and `warning-strip.png`): the bar on a December morning with 48,000 in
   the account, and the warning strip under it in its own class with the new line, `Tax on 30
   December: 25% of the account, £12,000 as it stands`. It is said from the warning card's day
   until the tax is booked, while there is cash to tax, and it stands under `spendingOverEarning`
   and above `crewFull`, so a more urgent line hides it as it hides every line below it.
