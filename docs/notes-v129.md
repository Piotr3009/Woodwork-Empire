# Notes from v129: a yacht at £600,000

Built in chat on 26.10.2026 on v128 (STATE_VERSION 53, unchanged). Piotr: "the yacht has the same net
profit as the houses, makes no sense". Asked to choose between leaving it, a yacht at £600,000, the
yacht line at £70M, or another figure, he answered "b", and "code it".

## 0. What it was

A yacht sold at £400,000 from v123, by the house's rule of v115: five thirds of the window's price
times the line's factors. Its material is £96,000 (320 boards and 160 glass units), so a yacht kept
£304,000. At full pace, with its four upgrades, a yacht line makes one and a half yachts a working
day and netted £431,788 a working day in Piotr's books, a house line £214,939: twice as much on a
line that costs twice as much (£100M against £50M), so the two returned the same on each pound.

## 1. What changed (`src/engine/constants.ts`)

`YACHT_PRICE` is 600,000 [PIOTR]. The material stays £96,000, so a yacht keeps £504,000, and at full
pace a yacht line nets about £731,800 a working day, about 1.7 times the house factory's return on
each pound. Everything that reads the yacht's price reads the one constant: the line's offer card
(`at £600,000 a yacht`), the yacht's line of the books, the line's own books on the Accounting page.
A yacht line already on its contract is paid the new price from its next yacht.

## 2. Tests

- Flipped: `tests/engine/v123Yacht.test.ts` (the price, the offer card's sentence and the yacht's
  line of the books, at £600,000), `APP_VERSION` v129 (`tests/ui/version.test.ts`,
  `tests/ui/saveCheck.test.ts`).
- Run: the type check, the lint, and the 16 test files that read the yacht, the lines' prices or the
  version. The whole suite was not run (Piotr runs it at the end of a stage).
