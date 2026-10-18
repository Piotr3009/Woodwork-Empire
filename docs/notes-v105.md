# Notes from v105: five rows behind the hall, a store made twice the size, a machine replaced

Built in chat on 18.10.2026 on v104 (STATE_VERSION 49, unchanged). Piotr, 18.10: "add up to 5 rows
behind the hall, but also add the possibility of expanding the shelters, for the same again add
more shelves and twice the room in one shelter, the easiest, the colour just changes to red"; and
"add the possibility of replacing equipment, that is when it is already red give a button replace
the equipment, and then we wait as long as it takes, we pay what it costs, but the old one
disappears and the new one appears in exactly the same place".

## 1. Five rows behind the rear wall (`REAR_YARD_ROWS`, src/engine/constants.ts)

Five rows where there were three [PIOTR]. Nothing else of v101's rule moved: each row 3 m deep, a
metre between two rows and between two things in a row, the first row filled first, and a row
behind the first standing no nearer the gate end than it stands back from the wall, so nothing is
ever off the top of the picture. On a hall 100 m long the glass shelters go seven, six, five, five
and four to the rows; on the 800 m2 hall the fourth and fifth rows have no length left for one.

## 2. A store behind the wall made twice the size (src/engine/renewal.ts)

- **Which**: the timber shelter, the glass shelter and the large timber shelter
  (`EXPANDABLE_STORES`).
- **What it costs**: its class's price again [PIOTR: "for the same again"]: £18,000, £60,000 and
  £500,000, paid on the equipment line, `Timber shelter made bigger`.
- **What it buys**: twice its class's room (`STORE_EXPANSION_FACTOR`), from the minute it is paid
  [TUNE: chat: no wait and no men, the shelves are put up behind the wall]. Every reader of a
  store's room asks `capacityOf` of the item, so the room of each kind, the free places, the restock,
  the plate on the store and the card all read it. Once only [TUNE: chat].
- **What it cost**: its price is added to the store's `purchasePrice`, so its sale and its insured
  value carry the shelves too [TUNE: chat].
- **Red** [PIOTR: "the colour just changes to red"]: the store's picture is drawn through one SVG
  filter (`store-expanded`, in the hall's shell): its steel and its paint go to the game's red by how
  light each point is, and the timber on its shelves keeps its colour (the wood is what is warm in
  the picture, red well over blue) [TUNE: the matrix and the threshold, checked on both views of
  the timber shelter]. A store with no picture yet (the glass shelter, the large timber shelter) is
  drawn in the red itself, which the filter keeps. Its picture on its card is red too, through the
  same filter under the card's own id (`store-expanded-card`), written beside the picture.
- **Where**: a click on the store in the hall opens its card now, the card every machine has, with
  `Make it twice the size · £18,000`, greyed with the engine's reason while it would be refused
  (`Not enough cash`); once made bigger the card says `Made twice the size: holds 800 boards` and
  the button is gone. The same card is the store's tile on the catalogue's Owned tab.

## 3. A machine replaced (src/engine/renewal.ts)

- **When**: while its life bar on the Machines page is red, less than a tenth of its life left or
  past it (`lifeIsLow`, moved into the engine from the page, the page reading it from there).
- **Which**: the machines and the extraction kit, which are what the Machines page lists; never a
  module of a line, which has no life.
- **What it costs**: its class's price, as buying it [PIOTR: "we pay what it costs"], paid at the
  click on the equipment line (`Used table saw, a new one for the old`). Nothing is paid for the
  old one [TUNE: chat].
- **The wait**: the class's own delivery days, as buying it would be (`dueDayFor`) [PIOTR: "we
  wait as long as it takes"]. The old one works until that morning.
- **The morning it comes**, at 08:00 (`arriveReplacements`, beside the kit's lorries): the new one
  stands where the old one stood [PIOTR]. It is the old record made new: the same id, place, turn,
  pipe, gate and air; its whole life, no services, six months to its first, not broken, not out,
  what it cost. A repair or a service the old one was waiting for goes with it, and nobody is left
  at one (`forgetOpenTasksOf`, the one path `takeAway` uses for a machine sold too). The card
  `New table saw in`: "The new one stands where the old one stood, with its whole life in it. The
  old one went back on the lorry this morning." [TUNE: chat: no unloading, the fitters swap them].
- **Where**: `Replace · £1,800` (the used table saw) on its row of the Machines page, beside
  Service, and on its own card, greyed with the reason while it would be refused; its title says
  the class's price and the day it would come. Once ordered, the row and the card say `New one on
  order, due Tue 4 Mar`, and no Service is offered for it, on the page, on the card or by the six
  months' reminder [TUNE: chat].

## 4. The save

Nothing lifted: `Equipment.expanded` and `Equipment.replacementDay` are left out until they are
written, and every save that loads today loads.

## 5. Tests

- `tests/engine/v105Renewal.test.ts`: the five rows filled on a hall 100 m long, and none past
  them; a store made bigger for its price, twice the room where it stands, once, its cost on its
  price, the three stores and nothing else, refused without the cash; a machine offered a new one
  only while its bar is red, paid at the class's price, coming when buying one would, the second
  click refused; the new one on the morning it comes in the old one's place and turn, made new, the
  old one's repair gone, the card raised; a module of a line, a rack and a sold machine never.
- `tests/ui/v105Renewal.test.ts`: the Replace button on the red row with its price, not on a row
  with life left, greyed without the cash; the day it comes on the row and on the card once
  ordered; ordered from the machine's own card; the store's card with its button, and the line of
  what it holds once made bigger, its picture red on the card; made bigger by the click on its card
  in the hall; the hall's filter in the shell, the store made bigger drawn through it and the
  plate's room doubled.
- Seen in Chromium on Piotr's save of day 4,300: a timber shelter and a large one made bigger from
  their cards (£18,000 and £500,000), the first red over the rear wall with its plate at 800, the
  second a red box; the worn cross cut saw's card with `Replace · £60,000`, and after the click
  `New one on order, due ...`.
- `tests/cloud/migrate.test.ts`: the v43 shelter left on the apron fills all five rows first now
  (one line of reason).
- Pins: APP_VERSION 'v105' (version, saveCheck).

## 6. What chat decided and Piotr has not confirmed

1. A store is made bigger at once, with no wait and no men, and only once.
2. The shelves' price goes on what the store cost: its sale and its insurance carry them.
3. Nothing is paid for the old machine when a new one replaces it.
4. The new machine comes at 08:00 of its delivery day and stands at once, with no unloading.
5. A machine waiting for its new one is not serviced and nobody is reminded to.
6. The words: `Make it twice the size · £18,000`, `Made twice the size: holds 800 boards`,
   `Replace · £1,800`, `New one on order, due ...`, `New table saw in`.
