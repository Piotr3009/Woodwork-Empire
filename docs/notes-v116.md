# Notes from v116: the hall's extensions grow 15 per cent a time, not 20

Built in chat on 19.10.2026 on v115 (STATE_VERSION 53, unchanged). Piotr, on his save of day 6109:
a 210 by 69 m hall with 39 lines, where a house factory (84 by 22 m with its lane) had no site and
the next seven metres along the front stood at 350,581,096: "the hall gets dearer and dearer, I have
been saving a year for the extension and it is not enough"; on 1.1 "it gets too easy again"; on
1.15 "I like it".

## 1. The one change

`UNIT_LONG_EXTENSION_GROWTH` 1.2 to **1.15** (`src/engine/constants.ts`). The n-th long or wide
extension, both counted together from nought, costs its square metres at 3,000 times 1.15 to the n,
as before with 1.2. The first two extensions keep their fixed prices.

What it does: the long ones of a hall twenty deep are 600,000, 690,000, 793,500, 912,525 (were
600,000, 720,000, 864,000, 1,036,800). After twenty four extensions the multiplier is 28.6 (was
79.5): on Piotr's hall the next seven metres cost about 126 million (were 351), the one after about
145 million (were 421), and ten metres more length about 59 million (were 165).

## 2. Pins flipped, each with its line

`tests/engine/t31Hall.test.ts` (the four prices and `1.15 ** 8`), `tests/ui/t31Hall.test.ts`
(the card's 690,000), `tests/engine/v95Wider.test.ts` (966,000, 931,500, 1,207,500, 690,000, `1.15
** 5`), `tests/ui/v95Wider.test.ts` (the card's 966,000), `tests/scenarios/turn31.test.ts` (kkk).
`APP_VERSION` v116. Run: the touched files and every scenario, 321 tests in 24 files green; the
whole check is Piotr's call ("quick, without a million tests").

## 3. Why the house factory had no site (the same evening, for the record)

The factory wants 84 by 22 m in one block (the metre behind, ten of line, the engineers' metre, the
ten metre lane) and its lane runs from the left wall. Piotr's lines stand in rows every seven
metres from y 7 to y 49; what is free is a strip 14 m deep along the front and 28 m at the right
end. The hall has to be 77 m deep for it: two wide extensions, and then it stands at x 74, y 57
with nothing moved. Six more window or door lines fit today in the front strip (rows y 56 and 63,
x 74, 110, 146).
