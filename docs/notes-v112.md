# Notes from v112: the security firms at half the price

Built in chat on 18.10.2026 on v111 (STATE_VERSION 52, not changed). Piotr, 18.10: "security is too
dear against the whole: cut it by at least half".

- **What changed**: the two firms' base month in `SECURITY_LEVELS` (`src/engine/constants.ts`),
  the basic firm 125 (was 250) and the good one 300 (was 600). The month of a firm is its base times
  the area over 200 times one plus the insured value (the lines' modules left out) over 100,000
  (`securitySubscriptionParts`, CLAUDE.md T13 3.17), so every firm's month is exactly half what it
  was, in every hall. The alarm, the bars and the dogs are as they were, and so is every risk.
- **On Piotr's save of day 4,300** (the basic firm, 6,240 m², £12.5M insured outside the lines): a
  month of £490,909 in place of £981,819.
- **The words** on the security card read the figures, so nothing of the page changed but the sums.
- **Tests**: `security` (the firm's month at 200 and 400 m² and with the reference value, its parts:
  flipped to the halved bases); APP_VERSION 'v112' (`version`, `saveCheck`). Run: the lint and the
  type check whole, and every scenario and every test that mentions the security: 40 files, 514
  tests, green. The full suite was not run.
