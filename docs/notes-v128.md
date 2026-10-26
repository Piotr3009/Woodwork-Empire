# Notes from v128: the purchase manager

Built in chat on 26.10.2026 on v127 (STATE_VERSION 53, unchanged), from Piotr's words of the same
day: "we have a problem again with how much goods are ordered: could we, at this level, now that we
have the yacht line, make a new post of somebody who orders the goods every day? a purchase manager,
for example, because I always forget and I have a problem, and this way he would order every day at
noon and it would be off my head". His answers: "all the materials, for the standing work and for
the door, window, yacht and house lines"; "all of them, daily"; "set to 2 days, a week, to full:
best set on him by the player"; the wage "ok"; the yacht line's reorder "fix it"; "code it, please".

## 0. What was found first

On Piotr's save of day 9,671 the office admin's restock of the lines, which fills the stores' free
places less what is on its way, bought 163,944 boards in one load on day 9,675. Its unloading takes
5,468 minutes, eleven working days, and none of it is on the racks until the last of it is unloaded.
The lines stood 9,240 to 9,779 minutes a day for want of timber while it was unloaded.

## 1. What he does (`src/engine/purchasing.ts`)

- **The post.** Role `purchaseManager`, one grade, £5,500 a month (`PURCHASE_MANAGER_MONTHLY_WAGE`)
  [PIOTR], reputation 5 as the admin's [TUNE: chat], hired on the Office tab behind the office admin
  (`BEHIND_THE_ADMIN`), at a desk of the office and never drawn on the hall (`NEVER_ON_THE_HALL`);
  the sprite check page lists him with the office's own, as a capsule.
- **The noon order.** At twelve o'clock (`PURCHASE_ORDER_MINUTE`, the dinner hour's first minute) of
  every working day he is at work, he buys each of the three kinds once: what the lines on their
  contracts take of the boards and the glass, and what the active standing contracts take of the
  sheets, in the working days his card is set to (`purchaseNeed`), less what the company has of it
  for them: on its kit and not held by a job, and on its way for stock (`purchaseOrderFor`). Set to
  full stores, he buys the free places less what is on its way, for every kind something takes. Never
  more than the free places less what is on its way, which is what Restock with nothing typed buys,
  so nothing of his goes to the paid store. One load a kind, in at the next working day's open, with
  his name on its line of the books: `22 boards for stock, ordered by Dave`. A kind the restock check
  refuses (no rack, not enough cash) is not bought that day.
- **His card.** `Orders at noon for:` and three chips, `two days`, `a week`, `full stores`, in the
  markup of the day's summary's `Show this:` chips; one click sets it (`SET_PURCHASE_COVER`,
  `settings.purchaseCover`, two days when it is not written, which every older save is).
- **The jobs' material.** `MATERIAL_ORDER_ROLES` is `purchaseManager` then `officeAdmin`: the moment a
  job's drawings are done he orders what it is short of, his name on its lines, and the admin while
  he is not at work.
- **The daily ordering chore** is his first, the admin behind him.
- **The admin steps aside.** While he is at work the admin buys nothing for the lines
  (`officeOrdersLineMaterial`); on a day he is not, she restocks them as she did.
- **Our team.** His trade's tile and his row read what he buys for and how far ahead: `Buys at noon
  for 66 lines, two days ahead.`, the bar empty and never red; with nobody hired, `Nobody. The office
  admin orders the jobs' material and the lines' stock, and the rest is yours.` [TUNE: chat].
- `heldByJobs` is the jobs' part of `reservedFor`, taken out of it so both read one loop.

## 2. The yacht line's reorder (`src/engine/lineContract.ts`)

`lineReorderWindows` is never below one: a yacht that takes more than a working day made nought of
them a day, and the office never bought a board for a yacht line short of its third upgrade [PIOTR,
26.10: "fix it"].

## 3. Measured on Piotr's save of day 9,671

Twenty days played from it, every line together: the lines' net profit, and the line days stood for
want of timber or glass (one is a line standing a whole working day). The second column is a scratch
version in which a load goes onto the racks a hundred at a time as it is unloaded; it is not in this
build.

| Who buys | As built | Stock in as it is unloaded (not built) |
|---|---|---|
| The office admin alone | £15.8M, 577 | £55.8M, 76 |
| Purchase manager, two days | £33.4M, 292 | £35.0M, 278 |
| Purchase manager, a week | £59.8M, 37 | £61.4M, 21 |
| Purchase manager, full stores | £52.3M, 107 | £62.2M, 14 |

- **Full stores**: his first order on that save is 159,720 boards in one load, 5,328 minutes of
  unloading. The small loads he buys each day after it come in and feed the lines meanwhile.
- **Two days** is short in both: every line holds its whole week, line 1 first (`reserveLineMaterial`),
  so two days of material are taken by the first lines and the last ones stand; held for two days
  only (scratch), £50.2M and 129.
- **Why a yacht shows 250k a day.** At full pace, in a month of 22 working days, a yacht line nets
  £431,788 a working day and a house line £214,939 (his books, months 313 to 321). A yacht line that
  stands for material shows less: ten days of his save with the admin alone, line 62 shows £240,853
  on the Production line tab.

## 4. Tests

- `tests/engine/v128Purchasing.test.ts` (11): two days less what is in hand, his name on each line;
  placed as the clock strikes twelve and not before; a week, and full stores never past the free
  places; a standing contract's sheets; nothing on a day off or while he is off work; the admin leaves
  the lines to him and restocks them while he is away; a job's material in his name ahead of the
  admin; the daily ordering chore his first; his words on Our team; hired behind the admin at 5,500;
  a yacht line short of its third upgrade bought for.
- `tests/ui/v128PurchaseCard.test.ts` (2): the three chips on his card, the one set lit, on nobody
  else's card; set by one click through the page from his row on Our team.
- Flipped: `APP_VERSION` v128 (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`); the role
  lists that gain him: `tests/engine/boothJoiner.test.ts`, `tests/engine/officeWithoutYou.test.ts`,
  `tests/render/capsule.test.ts` (and its hall check asks him too), `tests/ui/spriteCheck.test.ts`,
  `tests/ui/team.test.ts`.
- Run: the type check, the lint, and the files above among the 26 test files the new role and the
  version touch. The whole suite was not run (Piotr runs it at the end of a stage).

## 5. Open, asked of Piotr on 26.10

1. Stock onto the racks a hundred at a time as a load is unloaded.
2. Full stores as his first setting in place of two days.
3. Buying what the cash allows when it does not allow the whole order (today: nothing that day).
4. Two days: kept, taken out, or kept with the lines holding two days while it is set.
5. The yacht line's return on its price, the same as the house factory's today.
6. The browser's own save once a week, Friday after work, in place of every morning.
7. The saves after a purchase, a hire, a job taken and a window shut: kept or not.
8. The card and the Our team tile as built.
