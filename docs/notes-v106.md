# Notes from v106: the canteen's six refits, and the tax over £20,000,000

Built in chat on 18.10.2026 on v105 (STATE_VERSION 49 to 50). Piotr, 18.10, on the art side's pack
of six canteen pictures: "add the canteens, with a purchase of course"; on the mockup (the Premises
card under `Enlarge the canteen`, the room at levels 1, 3 and 6, a man's name over his plate under
the pointer): "dearer, twice: yes". On the tax: "when you have cash over 20 million on the account,
give a tax of 50 per cent", and asked whether of the part over or of the whole: "of the whole".

## 1. The canteen's refits (`CANTEEN_LEVELS`, `src/engine/premises.ts`)

- **Six levels**, one after the other, bought on the Premises page under `Canteen`, a card of their
  own under the Enlarge card, in the office card's three states: offered (`Refit the canteen:
  <name>`, the price, `level N of 6, ready the next morning. Today: ...`, the level's sentence and
  `Refit`), being done (`Being refitted`, `Paid`), the top reached (`The canteen: The flagship
  canteen`, `Refitted`, `Done`). Locked, in this order, with the reason beside the button: `The
  canteen is at its best`, `The fitters are in`, `Enlarge the canteen first`, `Not enough cash`.
- **The prices** [PIOTR: twice the office's]: £10,000, £30,000, £80,000, £200,000, £500,000,
  £1,200,000. Paid at the click on a line of their own, `Canteen refit: <name>` (the premises'
  category, as the office's), and open the next morning at the day's open beside the office's
  (`openCanteenRefit`), with the card `The canteen is refitted` and the level's reputation, two
  points asked as the office's [TUNE: chat].
- **The names** [TUNE: chat, from the art side's Polish names]: A first workshop, A tidy small
  firm, A growing joinery, A big works, A premium employer, The flagship canteen.
- **The small room and the enlarged one.** Levels 1 and 2 are the canteen as it was built (eight
  doors), 3 to 6 the enlarged one (sixteen), read off the art side's `requiresCanteenWide`. A small
  canteen stops at level 2 until it is enlarged; an enlarged canteen's next refit is never one of
  the small room's, so its first is level 3 [TUNE: chat]. A canteen enlarged after a refit of the
  small room shows the enlarged room's own layers until its next refit (`canteenPictureLevel`).
- **The lockers are not touched**: how many a canteen holds is `canteenLockers` as before; a
  level is a picture, not room for more men.

## 2. The room by its level (`src/render/canteen.ts`)

- From a refit the room is one picture of its level, `canteenLevelN` in `public/sprites` (the art
  side's six files of 14.10 as delivered, 1672 by 941), with the level's regions and plates, every
  figure the art side's own (`regions.json` of each level) [PIOTR: the pack]. The day one and the
  enlarged room's layers, regions, plates and lit lockers are as they were at level 0.
- **The names** [PIOTR: the mockup]: a refit's plates are too small to letter, so each plate is a
  spot the pointer finds it by (`plateSpot`, within the narrowest gap of its row [TUNE: chat]) and
  the man's name comes up over it on the game's paper while the pointer is there, in CSS. A spot is
  the lockers' own click: it opens the team page as the lockers do.
- **The counter** (`Lockers 1 to 16 · 12 of 249 in use ›`, and the click that turns to the next
  sixteen) is kept as it was, on a label of the same paper, since a refit's picture leaves no blank
  strip of wall for it [TUNE: chat: where, `counter` of each level].
- Seen in Chromium on Piotr's save of day 4,300 with its canteen at levels 3 and 6: the picture,
  the counter label and `Jack T` over the second plate under the pointer.

## 3. The tax over £20,000,000 (`src/engine/tax.ts`)

- At the open of 30 December the taxman takes half of the whole account when it is over
  £20,000,000, and a quarter of it otherwise, as before (`TAX_HIGH_FROM`, `TAX_HIGH_RATE`,
  `taxRateOn`) [PIOTR]. £20,000,000 pays £5,000,000; £20,000,001 pays £10,000,001; £30,000,000 pays
  £15,000,000. Chat recommended the half of the part over the line only; Piotr chose "of the
  whole", which is built: a pound over the line doubles the bill.
- What the player reads, over the line only (under it every word is as it was): the December card
  `On 30 December the taxman takes 50% of the whole account, because it is over £20,000,000: £X as
  it stands today. At £20,000,000 or under, he takes 25%.`; the strip `Tax on 30 December: 50% of
  the account, over £20,000,000, £X as it stands`; the card after `The taxman took 50% of the £Y in
  the account, which was over £20,000,000: £X.`

## 4. The save: STATE_VERSION 50

`unit.canteenLevel` (0 to 6) and `unit.canteenRefit` (`{ level }` while the fitters are in, else
null). `liftToVersion50` gives a v49 save the canteen as it was and no fitters in; nothing else of
the unit is touched. Asserted on a raw save in `tests/engine/v106Canteen.test.ts`.

## 5. Tests

- `tests/engine/v106Canteen.test.ts` (12): the six levels at twice the office's prices, the small
  and the enlarged room's, their pictures, plates and sentences; the start in a small and an
  enlarged canteen; the click, the morning with its card and its reputation; the third level first
  in an enlarged canteen; the refusals in order; the room's layers and regions by level and the
  enlarged room for a small room's level; the spots with a man's name, the lockers' click, no
  lettering and the counter's label; the Premises card in its states and its place under the
  Enlarge card; a v49 save; the tax at and over the line, and its three texts.
- Pins flipped: STATE_VERSION 50 (`saveCheck`, `v67`, `types`, `v94Lanes`, `v93Lines`, and in
  `migrate` the version and its lifted versions); APP_VERSION 'v106' (`version`, `saveCheck`).
- `public/sprites/manifest.json` written again by `npm run sprites:manifest`: 331 sprites.

## 6. What chat decided and Piotr has not confirmed

1. Two points of reputation asked for each canteen level, as the office's.
2. An enlarged canteen's first refit is level 3; levels 1 and 2 are the small room's only.
3. The names of the six levels and their sentences.
4. Where the counter's label stands on each picture, and the size of the spot round a plate.
