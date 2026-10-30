# Notes from v131: the cheat kasa

Built in chat on 28.10.2026 on v130 (STATE_VERSION 53, unchanged). Piotr: "code me please a code
that, when I type it, adds me a billion".

- Typed `kasa` anywhere in the game, outside a text field, the account gets £1,000,000,000
  (`CHEAT_CASH_AMOUNT`, `CHEAT_CASH_WORD`, `src/engine/constants.ts`), each time it is typed.
- Through the engine as an action (`CHEAT_CASH`, `src/engine/game.ts`), so the money is on one line
  of the books, `Cheat: kasa`, under Other, and in the month's income like any money in.
- The letters are read where P and 1 to 5 are read (`runKeyDown`, `src/ui/app.ts`); none of k, a
  and s is a key of the game, so nothing else moves.
- Tests: `tests/ui/v131Cheat.test.ts`; v131 in the two version pins.
- The full check: 3,304 tests green; one red, `tests/ui/v72.test.ts` (the trades' tiles count a role more since v128's purchase manager), red on v130 as it came, not touched here.
