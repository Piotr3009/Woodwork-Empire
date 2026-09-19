# Notes from agent C2, Turn 22: the scenarios (T22-C2)

For the lead, to fold into REPORT-T22.md. Four things were asked for in section 5 of the brief: the
sixteen months with the costs through the limit, (gg) rewritten to nobody moved, (jj) thirty days
under the limit with the wages paid through it, and (kk) the fifty thousand pound drop closed at the
next morning's check. Two lines a scenario of what it proves, then every figure measured on this
tree, then what could not be made true.

Branch `t22-c2`, off the whole of phases A and B (b938039). Nothing in `src` was touched.

---

## 1. The sixteen months (`tests/scenarios/thirtyDays.test.ts`)

**What they prove.** Sixteen months are played in the file, beside the day one list, the replay and
one day with a dinner hour in it: nineteen describe blocks, sixteen of them a month. With the arrears
gone and every forced cost going through the overdraft limit (2.1), exactly one of the sixteen goes
under the limit at all, and every other one trades its thirty days with the account above it and not
one line of its ledger unpaid.

**What was added.** Four places, all measured on this tree:

- The file header now says the count, the one money track, and which month goes under.
- `30 days on Easy, working the board`: every one of the month's ledger lines was written with the
  account above the bank's limit, the lowest running balance of the month is its own last line at
  **2,789 on day 31**, and `daysBelowOverdraft` closes the month at **0**.
- `a month short handed, with a joiner and one small rack`: the month that goes furthest into the
  overdraft of the fifteen that stay inside it, and it still never reaches the limit. Lowest running
  balance **-466 on day 31**, `daysBelowOverdraft` **0**, nothing unpaid.
- `30 days on Hard, doing nothing`: B1's bounds made exact. The close is **day 22 at -7,778** against
  the -7,500 the bank allows, with the count of days below the limit at **12 of 30**; the first
  morning the account closes under the 5,000 limit is **day 11 at -5,289, count 1**, and day 15 reads
  **-6,085, count 5**. That is the whole of the answer to item 23 of REPORT-T21.md: the count leaves
  nought now, and for a company standing still the amount still gets there first.

**The survey behind those figures** (thirteen runs of thirty days, one a policy, measured and then
thrown away):

| policy | difficulty | day 31 cash | lowest cash | first day under the limit | max count | unpaid |
| --- | --- | --- | --- | --- | --- | --- |
| CAREFUL | easy | 2,789 | 2,789 | never | 0 | 0 |
| IDLE | hard | closed day 22, -7,778 | -7,778 | day 11 | 12 | 0 |
| BIG_SAW | veryEasy | 7,573 | 7,573 | never | 0 | 0 |
| SHORT_HANDED | easy | 451 (day 32) | 301 | never | 0 | 0 |
| CAREFUL | veryEasy | 32,789 | 32,789 | never | 0 | 0 |
| SIX_JOINERS_TWO_SAWS | veryEasy | 22,847 | 22,162 | never | 0 | 0 |
| SIX_JOINERS_ONE_SAW | veryEasy | 23,824 | 23,824 | never | 0 | 0 |
| TWO_MEN_ONE_FAN | veryEasy | 7,556 | 7,556 | never | 0 | 0 |
| TWO_MEN_BIG_FAN | veryEasy | 6,758 | 6,758 | never | 0 | 0 |
| WITH_HELPER | veryEasy | 32,237 | 32,237 | never | 0 | 0 |
| LACQUER_NO_DRYER | veryEasy | 11,964 | 11,964 | never | 0 | 0 |
| THICKNESSER_ONE_BAG | veryEasy | 20,290 | 20,290 | never | 0 | 0 |
| IDLE | veryEasy | 39,831 | 39,831 | never | 0 | 0 |

The five months the survey does not cover are the ones with a hall or a policy of their own (the two
machines shifted on day 3, the dinner hour month, the 25,000 job, the CNC ordered and called off, the
saw sold on day 5, the job dropped on day 15); all of them play on Easy or Very easy with money in
the bank, all of them are green, and none of them writes an unpaid line, which the file's own
assertions already read where they matter.

## 2. (gg) four men, one saw and two jobs (`tests/scenarios/turn21.test.ts`)

**What it proves.** Nobody is moved between jobs (2.6): the second man of the cutting job stands at
the saw's waiting cell all day on the job he was put on, and the day pays for it in minutes.

**B2's figures are right, every one of them, measured again here by running the file:**
`npx vitest run tests/scenarios/turn21.test.ts` gives **17 passed**. The figures it asserts and that
therefore hold on this tree: possible 2,400, worked **1,440**, `lost.noMachine` **480**,
`lost.noPeople` 480, `lost.noMaterial` 0, minutesWorked 480; the man on the saw and the two at the
other job's bench 480 minutes each and the fourth man **0**; job minutes **480** and **960**; **481**
readings of a man at a waiting cell, 2 of them the man who holds the saw (08:00 and 13:00) and 479
the man behind him, every one of them `tableSaw`; the marks over the two men at the saw read
`waiting for the saw` and `['no cut parts yet', 'waiting for the saw']`, and the two men at the bench
carry nothing. The control run (both jobs at cutting) is unchanged from Turn 21: 480 worked, 1,440
lost, 962 readings, three men standing. Nothing in (gg) needed fixing.

**What was changed in that file:** two stale comment headers only, no assertion. The file's own head
said (ii) was "a month in arrears", and the section header over (ii) said the same; there are no
arrears in the game tonight, so both now say what (ii) is (a company under the limit that the amount
closes first) and point at (jj) and (kk) for the played halls of the new money.

## 3. (jj) thirty days under the overdraft limit (`tests/scenarios/turn22.test.ts`, new)

**What it proves.** A company that keeps trading under the limit reaches the thirtieth day and the
bank closes it there, on the days and not on the amount, with a month of wages paid out of an account
that was already under the limit. This is the played answer to item 23 of REPORT-T21.md, and it is
the rule Turn 21 could not reach by playing at all.

**The hall, played.** Very easy, seed 20260911, the scripted player of `autopilot.ts` with the day 1
kit, one joiner with no experience (monthly wage **1,950**), sixty sheets bought onto the rack on
day 1 and the first standing contract the board offers, taken on **day 3** with the joiner put on it:
`Cut sheet packs for Northgate Interiors`, 20 packs a week at **£50** a piece, a 17 week term ending
on day 121. Nothing is taken off the enquiry board, so the money in is the contract's own pieces and
nothing else, and the contract's material comes off the rack and never off the account. On the
morning of day 16 the contract has made **53** pieces and **52** of the sixty sheets are still on the
rack.

**The one written figure: the account a thousand pounds under the limit** on the morning of day 16
(`UNDER_BY = 1000`, **[TUNE]**, mine). The played route cannot get there: the company still has
**25,279** in the account that morning, and playing it down to just under a 10,000 overdraft means
buying thirty six thousand pounds of things nobody asked for, after which the scenario would be
measuring the shopping. The thousand is chosen for its two margins, both measured and each of them
asserted through what it is for: the first morning under reads **957** below the limit, and the run's
count of days is asserted to climb on every morning and never go back to nought, which is what that
957 buys; the thirtieth morning is **350** inside what the bank allows, asserted as a figure, which
is what makes the run of days and not the amount the thing that closed the company.

**Measured, and all of it asserted:**

- 22 played days from day 16 to day 46, the weekends rolled through inside them. The count of days
  below the limit climbs on every morning and never resets: 1 on day 17 to **30 on day 46**.
- The twenty ninth day below the limit is **calendar day 45**, cash **-14,643**, still trading, 357
  inside the -15,000 the bank allows. The warning strip on that morning reads, word for word:
  `Account -£14,643 is below the bank's -£10,000 limit: day 29 of 30.` On the first morning it reads
  `day 1 of 30`.
- The thirtieth is **calendar day 46**: closed at `clock.minute` 0 with
  `30 days in a row past the overdraft limit, and the bank has pulled it.`, cash **-14,650** against
  the floor **-15,000**, so the amount was never the reason. The event carries
  `{day: 46, month: 2, cash: -14650, allowed: -15000, daysBelow: 30, daysAllowed: 30}` and the card
  prints `-£14,650`, `-£15,000` and `30 of 30`.
- The wages: one line, **day 30, -1,950, unpaid false, balance -13,588**, which is 3,588 under the
  limit; the account before the bill went out was **-11,638**, already under it. Turn 21 would have
  paid none of it. Not one line of the whole run is unpaid.
- What kept it alive: **129** more pieces after the figure was written, **182** in all, and a line of
  contract revenue on every working day from day 16 to day 45: **22 lines, £6,450**, 250 or 300 a day
  (350 on day 16, whose morning came before the figure) beside the **307** a working day and **107** a
  weekend day the company pays out. **32** of the sixty sheets are still on the rack at the close, so
  the contract never missed a day for want of one.

**How thin it is.** The close leaves **350** of the 5,000 between the limit and the floor, which is
0.7 of one day's own bills either side of it: any figure in the game that moves this hall's money by
more than about 50 a day moves the ending. That is the nature of the rule (thirty days is a long time
to trade at break even) and not of the scenario, and the two margins are written into the file's own
comment so the next turn can re-tune the thousand rather than guess at it.

## 4. (kk) the fifty thousand pound drop (`tests/scenarios/turn22.test.ts`, new)

**What it proves.** The red box's promise and the engine's deed are the same thing: the drop pays the
deposit through the limit, the company trades the whole of the day it dropped the job on, and the
**next morning's** check closes it once that morning's own bills have gone out of an account already
18,000 under.

**The hall, played.** Very easy, seed 20260911, the same construction (hh) uses: the kit bought, a
50,000 job taken on day 4 at a standing of 60, drawn, costed, its **100** sheets ordered at
**£20,000**, delivered and unloaded, and **39,974** still in the account on the morning of day 11.
The one written figure is Piotr's **7,000** [PIOTR, 18.09].

**Measured, and all of it asserted:**

- The card before the click: `depositCanBePaid` false, `accountAfterDrop` `{account: -18000,
  allowed: -15000}`, and the red box word for word: `You cannot pay the deposit back from the
  overdraft. The account goes to -£18,000 against the bank's -£15,000. Dropping this job closes the
  company at tomorrow's check.`
- The click at 08:00 leaves the account at **-18,000**, past the floor, and still trading. The
  deposit line is **-25,000 with `unpaid` false** and a balance of -18,000: the money really left.
  The material is **-20,000 with `unpaid` true**: a loss with no cash behind it, because it was paid
  for when it was ordered (`noteLoss`), and it is the only unpaid line either scenario writes.
- The rest of that day, read every half hour: **20 readings, 11 08:00 to 11 17:00, every one
  trading**. The day's own record is written like any other day's: possible 480, worked 0,
  `lost.noPeople` 480, minutesWorked 60 (the owner's own hour on his own list, with the job off the
  books and nothing at a bench).
- The next morning, day 12 at minute 0: Rent **-80** (balance -18,080), Business rates **-15**
  (-18,095), Power **-12** (-18,107), Owner's draw **-200** (-18,307), every one of them paid in full
  and none of them unpaid, each balance below the limit. Then the bank looks: closed on day 12 with
  `You cannot pay what you owe and the bank has pulled the overdraft.`, the event
  `{day: 12, month: 1, cash: -18307, allowed: -15000, daysBelow: 1, daysAllowed: 30}`, and the card
  printing `-£18,307`, `-£15,000` and `1 of 30`. No day after the drop is ever played.

(hh) of `turn21.test.ts` is the same hall read for the arithmetic of the click and B1 brought it up
to tonight's truth; (kk) is the same hall read for the timing, which is the one thing 2.3's new last
sentence promises. Both are kept, and each file's header says which is which.

## 5. The three month playthrough (`tests/scenarios/playthrough.test.ts`)

**The claim phase A split, and what I did with it.** Phase A left the contract's claim split because
the Turn 21 arrears rule closed the company on day 120 and the term ends on day 121, so the client's
answer was never reached. **The answer is still out of reach, by one day, and for a different reason
and a different sum.** Measured on this tree:

- The account lives in the overdraft through month 4 and never stands under the overdraft limit for
  more than a day at a time: the count of days below the limit reads **1** on days 109, 114 and 120
  and nought on every other morning, so the thirty day rule is nowhere near this run.
- What closes it is the amount, on the morning of **day 120**, which is the last working day of
  month 4: the month's wages of **-7,300** for the three men of 10.4 go out of an account standing at
  **-8,381** and take it to **-15,681** against the **-15,000** the bank allows. The wage line's own
  balance says so. The check is the morning's first act, and the term ends on day 121.
- Not one line of the whole four months is unpaid, which is 2.1 read over the longest run the suite
  has.

So the claim stays split where phase A left it, with its figures brought up to tonight, and the
comment now says all of the above instead of the arrears. What was added to the assertion: the
reason, the cash at the close (-15,681), the floor it passed, the count at 1, the day 120 wage line
(day, -7,300, balance -15,681), and no unpaid line in the run. The three month reports close at
**23,195**, **11,891** and **-4,279** on Easy and the control on Very easy still ends month 3 at
**2,181**, unchanged by tonight.

Two other comments in that file were named after the arrears and now say what they mean: the file
header (what the fitting out did to the account on Easy, and that from tonight every bill goes
through it) and the raised draw of month 2 (it was never paid because it stopped at the limit, not
because of a pot beside the cash).

## 6. Every figure I chose

- **[TUNE] `UNDER_BY = 1000`** in (jj), the one written figure of that scenario, with the two margins
  it leaves measured above (957 below the limit on the first morning, 350 inside the floor on the
  last). Section 3 above is its whole justification.
- **[TUNE] sixty sheets on the rack** in (jj)'s policy, so the contract can be fed for forty six days
  without a purchase (32 of them are left at the close, and a purchase would be refused under the
  limit anyway). It is headroom and not a measured minimum: the run eats about twenty sheets over the
  thirty days, so forty would have carried it too, and sixty leaves the rack a long way from dry
  whichever day the ending lands on.
- **[TUNE] one joiner with no experience** in (jj), which is a wage bill of 1,950 a month: the
  smallest crew that has a wage bill at all, because 2.2's clause wants a month of wages paid through
  the limit and nothing more.
- Nothing else. Piotr's figures used as his: the 7,000 and the 50,000 of (kk), the 1.5 factor, the
  thirty days, the 20 packs a week and the 50 a piece the board itself offered.

## 7. What could not be made true

- **A company standing still cannot reach the thirtieth day, on any difficulty**, and (jj) therefore
  had to be a trading company. The arithmetic: the room below the limit is half the limit again
  (5,000 on Very easy and Easy, 2,500 on Hard), the standing costs of an empty hall are 307 a working
  day and 107 a weekend one, so the room is gone on about the twenty first day. Measured: the idle
  company of (ii) is closed on day 28 with its count at 21 of 30, and the empty Hard hall on day 22
  with its count at 12 of 30.
- **The three month playthrough cannot reach the client's answer**, one day short, as section 5 sets
  out. I did not touch the script to buy it that day: the run's claims are T13 10.4's and tuning them
  to reach an assertion would be measuring the tuning.

## 8. The audit of `src` I did, and what it found

Nothing to report as a defect. Two things I checked on purpose, because a scenario would have hidden
either of them:

- **Every purchase is still gated.** `pay` no longer reads the floor itself (it goes through `charge`
  with `unavoidable`), so the gate is `canAfford` at the caller. I read every caller of `pay` in
  `src`: the material for a job, the sheets for stock, the equipment bought and ordered, the software,
  the automatic gate and the service are each behind a `canAfford` check of their own, and the two
  that are not (a repair, and temporary storage for sheets that would not fit) are on the brief's own
  list of costs the player did not choose. So 2.1 took the floor off nothing it should not have.
- **Nothing writes an unpaid ledger line but `noteLoss`.** Over every run in this file set the only
  unpaid line anywhere is (kk)'s `Material written off`, which is a loss with no cash behind it.
