# Notes from v111: the yard behind the hall laid out in its order

Built in chat on 18.10.2026 on v110 (STATE_VERSION 51 to 52). Piotr, 18.10, on the shelters drawn
behind the wall: "arrange those shelters somehow", then "koduj" to chat's order and its mockup on
his save of day 4,300 (the shelters bought over the years stood where each happened to land: kinds
mixed, gaps, rows staggered).

## The rule

- **One order** (`YARD_ORDER`, `src/engine/constants.ts`): everything behind the rear wall is laid
  out by the yard's own rule (`yardPlaceAmong`, `src/engine/layout.ts`: from the far end of the hall
  towards the gate, a metre between two, row after row, a row behind the first no nearer the gate
  than it stands back from the wall), one thing at a time in this order of kinds, each kind in the
  order it was bought: the central systems, the pelletiser, the timber shelters, the glass shelters
  and the large timber shelters. The tallest come last and so stand at the back.
- **Where that order does not fit the wall** (the rows behind the first are shorter, so a 40 m wall
  with two shelters of each small kind may have no row left for an 18 m one at the end): the large
  shelters first after the plant, then the glass shelters and the timber shelters, still each kind
  together (`YARD_ORDER_LARGE_FIRST`) [TUNE: chat]. Where neither fits, the yard stays as it stands
  [TUNE].
- **When** (`tidyYard`, `src/engine/premises.ts`): after a thing for the yard is bought
  (`buyEquipment`) or ordered (`placeEquipmentOrder`, its outline holding its place in the order),
  after one sold is collected (`takeAway`), after an order for one is called off (`cancelOrder`),
  and once when an older save opens. A longer wall moves nothing, as it never did (CLAUDE.md T31
  2.7): the next change lays the yard out from its new far end.
- **The plant moved** has its pipe runs laid again at no charge (`layRunsAgain`), as when the hall
  grows; the hall's ducts run along the rear wall whatever stands where. Nothing in the yard is
  dragged by the player ("It stands in the yard"), so no drag is lost.

## The save: STATE_VERSION 52

`liftToVersion52` changes nothing of the raw save; the whole state step lays the yard out once the
whole state is there, after every older move of the plant and the shelters. Seen on Piotr's save of
day 4,300: the five flexi systems and the pelletiser at the far end, thirteen timber shelters along
the first row, one glass shelter at its gate end, four glass shelters and three large timber
shelters in the second row and two large ones in the third.

## Tests

- `tests/engine/v111Yard.test.ts` (5): bought in any order, stood in the order on an 80 m wall, a
  metre apart; the large shelters first on a 40 m wall that the order does not fit; an order's
  outline in its place, and the yard closed up when it is called off; closed up when a shelter
  sold is collected; a v51 save's yard laid out when it opens. Every case also asks that laying the
  yard out again moves nothing.
- Pins flipped: STATE_VERSION 52 (`saveCheck`, `types`, `v67`, `v94Lanes`, `v93Lines`,
  `v106Canteen`, `v107Door`, and the lifted versions of `migrate`); APP_VERSION 'v111' (`version`,
  `saveCheck`).
- Run: the lint and the type check whole, and every test that touches the yard, the plant, the
  shelters, an extension or a version: 72 files, 900 tests, green. The full suite was not run.
