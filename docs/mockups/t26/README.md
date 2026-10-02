# Mockups for Turn 26

Drawn by Claude Code on 02.10.2026, before the code that makes them true (CLAUDE.md T26 section
9). The hall pictures are the game's own renderer (`renderHall`) on the day 53 hall
(`day53Hall` in `tests/helpers.ts`: Piotr's hall of 01.10 stood up from his words, because the
tree has no day 53 save), shot in headless Chromium; the two HTML pages are the game's own markup
in the game's own classes, linked to `src/ui/styles.css`, with the change written into it.

1. `hall-before.png` and `hall-after.png`: the day 53 hall at 13:01, before and after 2.1 and
   2.2. Before, the pro CNC has one place, so one man is at the machine that keeps eight busy and
   the rest stand at the benches and the booth; after, the places are `MACHINE_CAPACITY`, the
   three whose round is at the CNC this half hour are at it, and each stands on a cell of his own
   round its footprint (the worked side, the ends, the far side, one ring out at a time). The
   after picture was drawn with the capacity table put in for the places and a prototype of
   `standingCellsFor` in the renderer's place of `placeCellsAt`; the depth order in it is still
   v62's, which is mockup 2's business.
2. `moulder-before.png` and `moulder-after.png`: Frank, the labourer, on the row behind the
   spindle moulder, before and after 2.4. Before, his key (18.2) is past the moulder's (18, the
   corner of its zone) and he is painted over it, standing on its table; after, his feet are
   behind its footprint, so he is put before it in the draw order and it hides him.
3. `pace-sheet-head.html` (and its picture `pace-sheet-head.png`): the Pace sheet of the Company
   board, v62 on the left and 2.14 on the right. The head is the workshop's average today, the
   number the top bar carries, with `every worked minute today was worth`; the hall's own total
   is the sum under `What moves it` and is not printed at the top again; Nathan, on a standing
   contract cut on the CNC, reads his piece's pace as `machines` and not as `hall`.
4. `agency-card.html` (and `agency-card.png`): the Website page of the laptop's Office group with
   the advertising agency's card under the ladder, in the classes of the management software's
   card (`card`, `card-main`, `figures`, `card-action`), off on the left and on on the right. No
   new style: the card is the software card's.
