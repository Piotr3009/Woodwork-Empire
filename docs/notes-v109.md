# Notes from v109: a contract's price rises at fifteen renewals at most

Built in chat on 18.10.2026 on v108 (STATE_VERSION 51, not changed). Piotr, 18.10: "block raising
the price of a contract for ever: I already have 10k a piece. Leave it, but no more than 15
negotiations of one contract, or it grows for ever", then "yes" to chat's reading: every standing
contract, the sheet pieces and the windows and doors made of the client's own timber, and the
closing card's sentence. A small fix, checked with the lint, the type check and the tests that touch
contracts only, at Piotr's word ("without a million tests").

## The rule

- At the end of a term the client offers a per cent more for every week delivered in full and two
  less for every short one (Turn 13), so a contract renewed term after term grew by 13 to 26 per cent
  a time with no end: in Piotr's save of day 4300 a contract for sash windows renewed 27 times stood
  at £6,240 a piece.
- **From v109** (`CONTRACT_PRICE_RISES_MAX`, 15 [PIOTR], `src/engine/constants.ts`): a standing
  contract renewed fifteen times is offered no rise again. `renegotiatedPriceFor` keeps the offer at
  most at the price a piece it had; short weeks and the market's cut (Turn 31) still lower it. Its
  first fifteen renewals rise as before.
- **The count** is read off the contract's id (`renewalsOf`, `src/engine/contracts.ts`): every
  renewal is its term before with `-r` added (`renewContract`, since Turn 13), so every save carries
  it and nothing is lifted. A renewal counts whether its offer rose or fell.
- **Every standing contract** on the Contracts tab, sheet or timber. The lines' contracts have their
  own fixed price and are never renewed, so the rule does not reach them.
- **The closing card** of a contract past its fifteenth renewal adds, after the offer: `The client
  has raised his price 15 times and will go no higher.` [PIOTR: "yes"]. The Contracts tab's ended
  block already prints the offer against the price (`+£0 on £6,240`).
- A price already high stays where it is and rises no more from its next term's end.

## Tests

- `tests/engine/v109RenewCap.test.ts` (3): the count off the id; the rise at the fifteenth renewal
  and none after, short weeks still lowering it, a sash window contract renewed 27 times and a
  French door contract held at their prices; the closing card's sentence after the fifteenth
  renewal and not before, and the next term at the same price, its sixteenth renewal.
- Pins flipped: APP_VERSION 'v109' (`version`, `saveCheck`).
- Run: the lint and the type check whole; `v109RenewCap`, `contracts`, `t31Contracts`, `v65` (engine
  and ui), `turn13Contracts`, `ui/contracts`, the scenarios `turn13`, `turn31` and `playthrough`,
  `version` and `saveCheck`: 12 files, 134 tests, green. The full suite was not run.
