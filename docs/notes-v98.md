# Notes from v98: the office's six levels, and the glass racks' pictures

Built in chat on 15.10.2026 on v97 (STATE_VERSION 48 to 49). Piotr, on the six office pictures the
art side delivered on 14.10: "we go with the office graphics?", then "I agree with you, code it, and
do not forget to add the graphics for the glazing rack".

## 1. The refits (`OFFICE_LEVELS`, `src/engine/premises.ts`)

- **Six levels**, one after the other, bought on the Premises page under a heading of their own,
  `Office`, one card as the canteen has one: `Refit the office: <name>` with the price, `level N of
  6, ready the next morning`, what the office is today, the level's sentence and `Refit`. Locked, in
  this order, with the reason beside the button: `The office is at its best`, `The fitters are in`,
  `Buy a desk and a laptop first`, `Not enough cash`. While one is being done the card says `Being
  refitted` with the `Paid` badge; at the top it says `The office: The empire`, `Refitted`.
- **Paid at the click** on a ledger line of its own, `Office refit: <name>`, in the premises'
  category (`unitExtension`), and **open the next morning** at the day's open beside the extensions
  (`openOfficeRefit` after `openExtension`): the level is written, a card `The office is refitted`
  says what the office is now and what the next refit costs, and the company gains the level's
  reputation (`changeReputation`, two points asked a level, booked at the gain factor as every gain
  is, on the board as `Office refit: <name>`) [TUNE: chat: the two points].
- **The prices** [TUNE: chat, Piotr: "I agree with you"]: 5,000, 15,000, 40,000, 100,000, 250,000,
  600,000. The names [TUNE: chat, from the art side's Polish file names]: A first office, A proper
  joinery office, A growing firm, A big works, A prestigious head office, The empire.
- **Why a desk and a laptop first.** The pictures are flat: the desk and the laptop are painted in.
  The day one office (the room, the desk when bought, the laptop when bought, the catalogue on the
  floor until the desk) stays as it was, and a refit is offered only once both stand, so no save sees
  a desk it has not bought. Chat's reading of Piotr's "I agree with you" on the two ways offered.

## 2. The room by its level (`src/render/office.ts`)

- `officeLayersOf`: at level 0 the three layers of the contract as before; from level 1 one layer,
  `officeLevelN`, the whole picture. The regions, the live text (the clock, the company name), the
  company board's own picture and the man at the desk are drawn over it exactly as before, because
  the art side kept the layout (SPRITES.md 18). The door's light spot stands in for a lit layer, as
  it already did (no `officeDoorLit` file has landed).
- Known and left: on level 6 the clock's screen is painted about fifty canvas pixels under the
  clock's box, so the time stands on the wall just above the screen.

## 3. The state: STATE_VERSION 49

- `unit.officeLevel` (0 to 6) and `unit.officeRefit` (`{ level }` while the fitters are in, else
  null). `liftToVersion49` gives a v48 save the day one office and no fitters in; every other field
  of the unit is as it was. Asserted on a raw save in `tests/engine/officeRefit.test.ts`.
- Version pins flipped 48 to 49: `tests/ui/saveCheck.test.ts`, `tests/engine/v67.test.ts`,
  `tests/engine/types.test.ts`, `tests/cloud/v94Lanes.test.ts`, `tests/engine/v93Lines.test.ts`, and
  in `tests/cloud/migrate.test.ts` `STATE_VERSION` and the twenty one lifted versions. `APP_VERSION`
  `v98`.

## 4. The glass racks (G1)

The four files of `docs/art/REQUESTS-T32.md` G1 landed on 14.10 and are in `public/sprites/` as
delivered, checked to the pixel first (SPRITES.md 17). The hall draws them from this build; the code
that stands the racks is untouched. G1 is closed on the request page.

## 5. Tests

`tests/engine/officeRefit.test.ts` (11): the six levels, the start, the refusals in order, the click,
the morning with its card and its reputation, the six taken to the top, the room's layers and regions
by level, the picture and its placeholder, the Premises card in its three states, a v48 save. The
full check: lint, build and every test green on its own exit code.
