# Notes from v130: a security firm's month added up, and the houses and yachts twice as profitable

Built in chat on 26.10.2026 on v129 (STATE_VERSION 53, unchanged). Piotr: "security at 25 million a
month is far too much: at least half, or even 25 per cent of what it is"; "and raise the income of
the yachts times two, because I cannot catch up the cash for the hall's growth, and the same with
the houses times two". Offered the firm's month at a half, at a quarter, or with the area and the
value added in place of multiplied, and the houses and yachts at twice the price or twice the clear
profit, he answered "yes, code it" to the area plus the value and to the clear profit twice over.

## 0. What it was, on his save of day 10,011

- **Security.** A firm's month was its base times the hall's area over 200 m² times one plus the
  insured value over £100,000. Both grow with the company and they were multiplied, so the month
  grew as the square of it: his hall of 45,760 m² (228.8) and £97.9M insured (980.5 with the one)
  made the basic firm £28.0M a month and the good one £67.3M. Last month it was £27.5M, 14 per cent
  of the contracts' £200M and the dearest thing after the material. The bases were halved in v112
  and a week later it was too dear again.
- **A house** sold at £100,000 (£76,000 after its material), a factory at three a day netting about
  £218,000 a working day. **A yacht** at £600,000 (v129, £504,000 after its material), a line at a
  yacht and a half a day netting about £738,000.

## 1. What changed

- **Security** (`src/engine/security.ts`): the month of a firm is its base times the area over
  200 m² plus the insured value over £100,000. A 200 m² unit pays what it paid; past it the month
  grows with the company, no longer with its square. On his save: the basic firm £151,037 a month,
  the good one £362,488. `SubscriptionParts.valueFactor` (one plus the value) is `valuePart` (the
  value alone). The flat levels and the bars and dogs are as they were.
- **The security tab** says it so (`formulaLine`): `The firm charges £125 a month for every 200 m² of
  the hall (45,760 m², so 228.8) and every £100,000 insured (£97,949,420 insured, the production line
  is not in it, so 979.49), the two together 1,208.29: £151,037 a month.`
- **A house** is £172,000 (`HOUSE_PRICE`): £148,000 after its material, a factory at three a day
  about £434,000 a working day, twice what it was. **A yacht** is £1,088,000 (`YACHT_PRICE`): £992,000
  after its material, a line at a yacht and a half a day about £1,470,000, twice what it was. The
  material stays £24,000 and £96,000. The offer cards and the books read the one constant each, and a
  contract already running is paid the new price from its next house or yacht.

## 2. Tests

- Flipped: `tests/engine/security.test.ts` (375 and 900 at 400 m² with £100,000 insured, where it was
  500 and 1,200; `valuePart`), `tests/ui/security.test.ts` (the formula's words),
  `tests/engine/t31Hall.test.ts` and `tests/engine/v95Wider.test.ts` (a bigger hall adds the base
  once for every 200 m², where it multiplied the month), `tests/engine/v114House.test.ts` (£172,000,
  £148,000 after its material, the offer card, the house's line of the books),
  `tests/engine/v123Yacht.test.ts` (£1,088,000), `APP_VERSION` v130 (`tests/ui/version.test.ts`,
  `tests/ui/saveCheck.test.ts`).
- Run: the type check, the lint, and the 94 test files that mention a house, a yacht, the security
  or a firm. The whole suite was not run (Piotr runs it at the end of a stage).
