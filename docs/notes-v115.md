# Notes from v115: a house at 100,000

Built in chat on 19.10.2026 on v114 (STATE_VERSION 53, not changed). Piotr, 19.10, after chat read
the two lines' months off the constants (a door line keeps about 811,000 a month with every upgrade,
the house factory about 2,027,000, each paying itself back in 2.4 years, the rule of v107 "one to
one as the windows"): "the factory will be a big outlay, the hall is dearer and dearer, and I have
been saving a year for an extension and it is still not enough: make the income from the houses
twice as big, the clear profit twice as big, let the saving pay off".

- **`HOUSE_PRICE` 100,000** [TUNE: chat: the round figure], the house kind's own `unitPrice` in
  `LINE_KINDS`, read by `lineUnitPriceOf` in place of the window's price times the factors (60,000).
- **The material is what it was**: `lineMaterialPerUnitOf` is written from the kind's base price
  (`lineBasePriceOf`, the window's times the factors), so a house still takes 80 boards and 40 glass
  units, 24,000, and the books count them as before. A house keeps 76,000 where it kept 36,000.
- **The factory's month** (engineers 150,000, power 54,000, cover 83,333 at one per cent and the hall's
  factor of two), from the constants: with every upgrade about 4,600,000 kept a month where it kept
  about 2,027,000 (2.3 times); with none about 1,340,000 where it kept about 484,000 (2.8 times).
  The 59 million of the factory and its upgrades come back in about a year and a month.
- Nothing else of the house factory, the door line or the window line moved: the pace, the stores,
  the lane, the pictures, the insurance, the tax.
- Tests: the pins of 60,000 in `tests/engine/v114House.test.ts` flipped with their line of reason;
  `APP_VERSION` v115 in its two pins.
