# Notes from v95: the hall made wider

Built in chat on 12.10.2026 on v94 (STATE_VERSION 46). Piotr: "the extension of the hall I have
only along the length, and where is the width?"; then "3 ok" to chat's proposal: seven metres at a
time, the depth a production line takes with its metre behind, its engineers' metre and its lane;
£3,000 a square metre; 20 per cent more for every extension after, long and wide counted together.

## 1. The offer

- A fourth card on the Premises page, under the long one and offered from the same morning (the
  second extension open): `Extend the hall wider: 280 m² more`. Its words are the second's, which
  adds along the front the same way: `Adds 280 m² along the front of the hall: 40 × 27 m, ready the
  next morning. Room for 43 joiners and 32 benches, and 43 lockers in the enlarged canteen.` and
  every cost that goes up. While the builders are in it reads as the others do (`Being built`, the
  Paid badge). It can be bought again and again, one at a time. No limit.
- **The price** (`extensionPrice`): the square metres a long or a wide extension adds at
  `UNIT_EXTENSION_PRICE_PER_M2` (£3,000, the long one's 600,000 for 200 m²), times
  `UNIT_LONG_EXTENSION_GROWTH` (1.2) to the number of long and wide extensions already open,
  rounded to the pound. The first wide one of a 40 m hall is 280 m² and £840,000, the next
  £1,008,000. A long one after a wide one adds ten metres of a deeper hall: 270 m² at 40 × 27 m,
  £972,000. The long ones of a hall twenty deep cost what they did (600,000, 720,000, 864,000).
  With the landlord's deposit on the bigger rent, as every extension.
- **One builder at a time** [TUNE: chat]: while a long one is being built the wide card waits
  (`The builders are in`), and the other way. Each is priced and measured on the hall as it stands,
  so two built at once would have been priced on a hall that is not the one they open on.

## 2. The morning it opens

- The hall is seven metres deeper along its whole front, the next working morning (`openStage`):
  40 × 27 m, 1,080 m². Nothing moves: nothing stands past the front kerb, and the apron past the
  end of the hall is as long as the hall is deep, so it grows with it. One card: `The hall is seven
  metres wider`, saying the hall, its joiners and benches, the costs, and the lockers.
- Everything goes up with the floor, through the functions that already scale by the area: the
  rent, the rates and the benches (`unitWith`), the standing power, the joiners (`crewLimit`), the
  insurer's and a flat security level's factor (`unitCostFactor`, the area over 400) and a firm's
  month. The lockers of an enlarged canteen (`canteenLockers`) are eight for every 200 m² past 800
  as before, now counted to the square metre: 280 m² is not a whole 200, and the canteen keeps a
  locker for every joiner the hall takes all the same (43 of 43 at 1,080 m²). Every hall the game
  could have before v95 has the lockers it had.
- A line fits in the seven metres: with two lines in the 800 m² hall, a third is sited in front of
  the first (`lineSite`, y 21 of the 27 m hall), its lane along the new front.

## 3. The picture

- Nothing painted: `scripts/hall-wider.py` cuts six pieces out of `hallBackgroundDeep.png`, a band
  and a front of the hall, of a long piece and of the end (docs/art/SPRITES.md 9.10).
  `hallLayersOf` lays a row of bands for every seven metres after the hall twenty deep with its long
  pieces and its end, and the fronts at the last row; `hallFrameCanvas` grows the scene to the left
  and down. The ground of 9.9 is laid under a wider hall as under a longer one.
- Checked at x1 and at the closest zoom for 40 × 27, 40 × 34, 60 × 27 and 60 × 34 m: the joins on
  the left wall, on the floor where a long piece's row meets the hall's, at the end kerb and at both
  front corners. The first cut showed a dark patch a metre square at x 39 of every row, the kerb
  under the end of the 800 m² picture let through two feathers; the hall's own band and front now
  stop at x 39 and the end's are always laid, and it is gone.

## 4. State (STATE_VERSION 47)

- `unit.wideExtensions` (how many are open) and `unit.wideExtension` (`'none' | 'building'`); the
  lift to 47 gives every save 0 and `'none'`. `ExtensionStage` gains `'wide'`; the button's
  `data-stage="wide"`.
