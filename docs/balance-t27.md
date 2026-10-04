# Where a new company stands (Turn 27)

Measured by Claude Code on 04.10.2026 on v81, with the tax, the year, the extension at £250,000 and the
fourteen dearer machines in (CLAUDE.md T27 2.6). It is a report and nothing else: no rule of the game
was changed for it, and it recommends no number. The levers are Piotr's.

## How it was played, and what the script cannot do

Twelve runs: the three difficulties, four crews on each. Every run is the scripted player of
`tests/scenarios/autopilot.ts`, driven by `scripts/balance-t27.ts`, from Monday 1 March 2025 (day 1)
to the end of the game's February 2026 (day 360, its thirtieth; the game's months are thirty days),
so the first tax, on Saturday 30 December 2025 (day 300), is inside every year the bank lets run that
far. The seed is the suite's, 20260911, the same for every run; the board, the clients' answers and
the nights are its dice, so each run is also played with two more seeds (20260912 and 20260913), and
the last line under each table says how those two ended: the shape is the thing to read, not the
pound. The script is not part of `npm test`: `npx vite-node scripts/balance-t27.ts` plays the
thirty six years and writes the twelve tables below between the marks.

What the script is, and so what the tables are not:

- **It takes the work it is told to and never haggles.** Sheet work from the board, dearest first,
  from residential clients, whenever the client's own number pays for the job's material and its
  labour, a margin over nought [TUNE]. It never counters, never asks a client for more, never takes a
  commercial job, a contract or a big job from the agency, and never advertises. It keeps at most
  two jobs open alone, four with one joiner, six with two and ten with four, so a man who finishes
  has the next job waiting [TUNE]. The three month playthrough's rule, a margin over a fifth, turned
  down 48 of the 135 offers of the year of the owner and one joiner, and with it the joiner stood
  without a job at most noons of his first three months. A player picks the jobs that fit his
  crew and his week, haggles, and takes the contracts once his name is known, and does better.
- **The owner is careful and no more.** He does the office work at his desk as it comes, stands at a
  bench otherwise, cleans the hall above 55 of dust, takes his dinner, and goes home at five. He
  writes the books up once a month, first thing on its last working day, so the accountant's `Late
  accounts` never comes [TUNE]: the script the tables are played by leaves the bookkeeping to wait,
  and in a first run that came to 6,600 of fines in the year. No overtime, no holidays, no manager,
  no helper.
- **The kit is the cheapest that works.** The day one list at the script's own classes (the used saw,
  fan and compressor, the budget bench, rack and hand bander), every man's bench, locker, cabinet and
  hand tools at the day one classes, and nothing better. What a burglary takes is bought again the
  next morning at the same class [TUNE], so a year measures the trade and not one night.
- **The software is the subscription**, 150 a month [TUNE]. On the one off licence the script ran
  into its thirty jobs on about day 108 and never bought it again, and from then every drawing was
  refused with `No software licence` and the company earned nothing more: a player reads `0 jobs left`
  on the Drawings page, and the script reads no pages.
- **It borrows once, when it has to.** The bank's one loan, all it will lend (10,000 to a new
  company, a quarter of the last twelve months' sales once there are sales enough), the first
  morning the account would be under nought after the month's wages; on Hard, which opens with
  nothing in the account and a day one list dearer than its overdraft, at the open of day 1 [TUNE].
  It repays nothing early and never borrows a second time in the year.
- **The crew is taken on as soon as the account allows**: on day 1 where it holds the man's kit and a
  month of his pay, which is the card's own gate, and otherwise the first morning it does.
- **The four experienced men** are given a standing of 15 on day 1, because an experienced man
  answers the card from 15 and a new company has none, and the machines a careful player would buy
  them [TUNE]: a second saw, a better fan and compressor, a spindle moulder and a floor edgebander,
  all of the standard class, in that order, each only while a month of the crew's wages, and what is
  left of any loan, stays in the account after it. The men and their benches come before the day
  one list, because a hire wants a month of the man's pay in the account.

The columns: **money in** is the clients' money and nothing else (deposits, balances, contract
pieces, pellets); **material** with the storage; **couriers** with the taxis; **wages** with any
salary; the **draw**, the **rent**, the **rates** and the **power**, the fixed costs; **the rest** is
everything else, in and out (the software, the insurance, the accounts, the waste, repairs, the
alarm, the overdraft's interest, an insurer's payout); **kit** is machines and furniture bought, less
any sold, the pipes, the unit's deposit; **loan** is the loan drawn less its instalments and interest;
**tax** is the taxman's. Every column is the ledger's own entries added up, so the **net** is the
account's move and the row adds up to it. A month is "in the black" when its net, the loan left out,
is above nought: the trade put money in the account.

## The twelve tables

<!-- the twelve tables, written by scripts/balance-t27.ts -->

### Very easy, the owner alone

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £10,097 | -£5,060 | -£400 |  | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£10,370 |  |  | -£13,612 | £36,388 |
| April 2025 | £11,284 | -£6,060 | -£440 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£3,126 | £33,261 |
| May 2025 | £10,417 | -£5,330 | -£240 |  | -£4,200 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£2,863 | £30,398 |
| June 2025 | £10,947 | -£5,580 | -£360 |  | -£4,200 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£2,703 | £27,695 |
| July 2025 | £11,626 | -£6,870 | -£520 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£3,674 | £24,021 |
| August 2025 | £8,914 | -£4,700 | -£240 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£250 |  |  |  | -£4,036 | £19,985 |
| September 2025 | £5,431 | -£2,660 | -£280 |  | -£4,000 | -£2,400 | -£450 | -£510 | -£500 |  |  |  | -£5,369 | £14,615 |
| October 2025 | £9,499 | -£5,750 | -£480 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£405 |  |  |  | -£4,896 | £9,719 |
| November 2025 | £10,169 | -£5,010 | -£400 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£495 |  |  |  | -£3,496 | £6,223 |
| December 2025 | £11,536 | -£5,000 | -£360 |  | -£4,200 | -£2,400 | -£450 | -£510 | -£315 |  |  | -£1,159 | -£2,858 | £3,365 |
| January 2026 | £15,602 | -£7,610 | -£360 |  | -£4,200 | -£2,400 | -£450 | -£510 | -£300 |  |  |  | -£228 | £3,136 |
| February 2026 | £12,411 | -£5,000 | -£360 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£480 |  |  |  | -£1,189 | £1,947 |

First month in the black: none. The bank did not close it. Tax paid: £1,159. Joiners on the books at the end: none. Loan: none. With the other two seeds: not closed, £4,287 at the end, tax £1,959, in the black first in August 2025; not closed, £4,278 at the end, tax £3,181, in the black never. Burglaries: none.

### Very easy, one joiner with no experience from day 1

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £11,389 | -£7,240 | -£600 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£479 |  | -£11,190 |  |  | -£19,920 | £30,080 |
| April 2025 | £16,180 | -£6,860 | -£720 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£3,860 | £26,220 |
| May 2025 | £14,453 | -£9,320 | -£640 | -£4,550 | -£4,200 | -£2,400 | -£450 | -£495 | -£150 | -£3,960 |  |  | -£11,712 | £14,508 |
| June 2025 | £16,950 | -£8,750 | -£520 | -£4,550 | -£4,200 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£4,580 | £9,928 |
| July 2025 | £18,577 | -£8,960 | -£680 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£3,523 | £6,404 |
| August 2025 | £13,677 | -£7,422 | -£440 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£300 |  | £21,467 |  | £14,672 | £21,076 |
| September 2025 | £11,431 | -£6,220 | -£680 | -£4,550 | -£4,000 | -£2,400 | -£450 | -£510 | -£150 |  | -£626 |  | -£8,156 | £12,920 |
| October 2025 | £13,157 | -£6,920 | -£640 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£195 |  | -£622 |  | -£7,530 | £5,390 |
| November 2025 | £12,445 | -£6,260 | -£720 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  | -£617 |  | -£7,613 | -£2,223 |
| December 2025 | £16,664 | -£8,050 | -£600 | -£4,550 | -£4,200 | -£2,400 | -£450 | -£510 | -£392 |  | -£613 |  | -£5,101 | -£7,324 |
| January 2026 | £13,180 | -£6,600 | -£640 | -£4,550 | -£4,200 | -£2,400 | -£450 | -£510 | -£781 |  | -£608 |  | -£7,560 | -£14,884 |

First month in the black: none. The bank closed it on Mon 30 January 2026 (day 330): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: novice from Tue 2 March. Loan: £21,467 drawn on Mon 19 August 2025. With the other two seeds: closed on day 327, tax none, in the black never; closed on day 361, tax £325, in the black never. Burglaries: Thu 21 May 2025.

### Very easy, two joiners with no experience from day 1

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £12,513 | -£7,460 | -£720 | -£9,100 | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£12,010 |  |  | -£24,656 | £25,344 |
| April 2025 | £18,947 | -£12,050 | -£720 | -£9,100 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£10,833 | £14,511 |
| May 2025 | £11,890 | -£6,150 | -£640 | -£9,100 | -£4,200 | -£2,400 | -£450 | -£510 | -£250 |  | £10,837 |  | -£973 | £13,538 |
| June 2025 | £12,710 | -£6,030 | -£760 | -£9,100 | -£4,200 | -£2,400 | -£450 | -£510 | -£150 |  | -£316 |  | -£11,207 | £2,331 |
| July 2025 | £17,001 | -£9,650 | -£720 | -£9,100 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  | -£314 |  | -£10,693 | -£8,362 |
| August 2025 | £7,576 | -£2,980 | -£320 | -£9,100 | -£4,400 | -£2,400 | -£450 | -£426 | -£156 |  | -£312 |  | -£12,968 | -£21,331 |

First month in the black: none. The bank closed it on Fri 30 August 2025 (day 180): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: novice from Tue 2 March, novice from Wed 3 March. Loan: £10,837 drawn on Fri 29 May 2025. With the other two seeds: closed on day 180, tax none, in the black never; closed on day 208, tax none, in the black never. Burglaries: Fri 2 August 2025.

### Very easy, four experienced joiners from day 1, and their machines

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £18,442 | -£9,780 | -£720 | -£23,060 | -£4,400 | -£2,400 | -£450 | -£1,114 |  | -£28,645 | £10,000 |  | -£42,127 | £7,873 |
| April 2025 | £23,394 | -£14,100 | -£760 | -£23,060 | -£4,400 | -£2,400 | -£450 | -£1,260 | -£150 |  | -£292 |  | -£23,478 | -£15,605 |

First month in the black: none. The bank closed it on Thu 30 April 2025 (day 60): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: experienced from Tue 2 March, experienced from Wed 3 March, experienced from Thu 4 March, experienced from Fri 5 March. Loan: £10,000 drawn on Fri 5 March 2025. With the other two seeds: closed on day 60, tax none, in the black never; closed on day 60, tax none, in the black never. Burglaries: none.

### Easy, the owner alone

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £10,097 | -£5,060 | -£400 |  | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£10,370 |  |  | -£13,612 | £6,388 |
| April 2025 | £11,284 | -£6,060 | -£440 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  |  |  | -£3,126 | £3,261 |
| May 2025 | £10,417 | -£5,330 | -£240 |  | -£4,200 | -£2,400 | -£450 | -£510 | -£150 |  | £10,000 |  | £7,137 | £10,398 |
| June 2025 | £10,947 | -£5,580 | -£360 |  | -£4,200 | -£2,400 | -£450 | -£510 | -£150 |  | -£292 |  | -£2,995 | £7,403 |
| July 2025 | £11,626 | -£6,870 | -£520 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  | -£290 |  | -£3,964 | £3,440 |
| August 2025 | £8,914 | -£4,700 | -£240 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£250 |  | -£287 |  | -£4,324 | -£884 |
| September 2025 | £5,431 | -£2,660 | -£280 |  | -£4,000 | -£2,400 | -£450 | -£510 | -£501 |  | -£285 |  | -£5,656 | -£6,540 |
| October 2025 | £6,299 | -£2,950 | -£360 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£651 |  | -£283 |  | -£5,705 | -£12,246 |
| November 2025 |  |  |  |  | -£1,400 | -£720 | -£135 | -£153 | -£352 |  | -£281 |  | -£3,042 | -£15,288 |

First month in the black: none. The bank closed it on Thu 9 November 2025 (day 249): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: none. Loan: £10,000 drawn on Wed 20 May 2025. With the other two seeds: closed on day 292, tax none, in the black first in August 2025; closed on day 331, tax none, in the black never. Burglaries: none.

### Easy, one joiner with no experience from day 1

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £11,389 | -£7,240 | -£600 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£479 |  | -£11,190 | £10,000 |  | -£9,920 | £10,080 |
| April 2025 | £16,180 | -£6,860 | -£720 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  | -£292 |  | -£4,152 | £5,928 |
| May 2025 | £14,453 | -£9,320 | -£640 | -£4,550 | -£4,200 | -£2,400 | -£450 | -£495 | -£150 | -£3,960 | -£290 |  | -£12,002 | -£6,074 |
| June 2025 | £16,950 | -£8,750 | -£520 | -£4,550 | -£4,200 | -£2,400 | -£450 | -£510 | -£163 |  | -£287 |  | -£4,880 | -£10,954 |
| July 2025 | £18,577 | -£8,960 | -£680 | -£4,550 | -£4,400 | -£2,400 | -£450 | -£510 | -£267 |  | -£285 |  | -£3,926 | -£14,880 |
| August 2025 |  |  |  |  | -£200 | -£80 | -£15 | -£17 | -£359 |  | -£283 |  | -£954 | -£15,833 |

First month in the black: none. The bank closed it on Thu 1 August 2025 (day 151): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: novice from Tue 2 March. Loan: £10,000 drawn on Mon 29 March 2025. With the other two seeds: closed on day 151, tax none, in the black never; closed on day 192, tax none, in the black never. Burglaries: Thu 21 May 2025.

### Easy, two joiners with no experience from day 1

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £12,513 | -£7,460 | -£720 | -£9,100 | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£12,010 | £10,000 |  | -£14,656 | £5,344 |
| April 2025 | £18,947 | -£12,050 | -£720 | -£9,100 | -£4,400 | -£2,400 | -£450 | -£510 | -£150 |  | -£292 |  | -£11,125 | -£5,781 |
| May 2025 | £11,890 | -£6,150 | -£640 | -£9,100 | -£4,200 | -£2,320 | -£435 | -£493 | -£253 |  | -£290 |  | -£11,990 | -£17,771 |

First month in the black: none. The bank closed it on Fri 29 May 2025 (day 89): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: novice from Tue 2 March, novice from Wed 3 March. Loan: £10,000 drawn on Wed 3 March 2025. With the other two seeds: closed on day 89, tax none, in the black never; closed on day 118, tax none, in the black never. Burglaries: none.

### Easy, four experienced joiners from day 1, and their machines

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £14,407 | -£8,260 | -£720 | -£23,060 | -£4,400 | -£2,400 | -£450 | -£479 |  | -£13,750 | £10,000 |  | -£29,112 | -£9,112 |
| April 2025 | £31,100 | -£16,670 | -£960 | -£23,060 | -£4,400 | -£2,400 | -£450 | -£510 | -£156 |  | -£292 |  | -£17,798 | -£26,910 |

First month in the black: none. The bank closed it on Thu 30 April 2025 (day 60): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: experienced from Tue 2 March, experienced from Wed 3 March, experienced from Thu 4 March, experienced from Fri 5 March. Loan: £10,000 drawn on Wed 3 March 2025. With the other two seeds: closed on day 60, tax none, in the black never; closed on day 60, tax none, in the black never. Burglaries: none.

### Hard, the owner alone

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £10,097 | -£5,060 | -£400 |  | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£10,370 | £10,000 |  | -£3,612 | -£3,612 |
| April 2025 | £6,499 | -£2,800 | -£280 |  | -£3,800 | -£2,160 | -£405 | -£459 | -£200 |  | -£292 |  | -£3,897 | -£7,510 |

First month in the black: none. The bank closed it on Mon 27 April 2025 (day 57): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: none. Loan: £10,000 drawn on Mon 1 March 2025. With the other two seeds: closed on day 57, tax none, in the black never; closed on day 52, tax none, in the black never. Burglaries: none.

### Hard, one joiner with no experience from day 1

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £10,368 | -£6,610 | -£560 |  | -£4,400 | -£2,400 | -£450 | -£479 |  | -£10,370 | £10,000 |  | -£4,901 | -£4,901 |
| April 2025 | £8,860 | -£2,400 | -£440 |  | -£4,400 | -£2,400 | -£450 | -£510 | -£311 |  | -£292 |  | -£2,343 | -£7,244 |
| May 2025 |  |  |  |  | -£200 | -£80 | -£15 | -£17 | -£266 |  | -£290 |  | -£868 | -£8,112 |

First month in the black: none. The bank closed it on Fri 1 May 2025 (day 61): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: none. Loan: £10,000 drawn on Mon 1 March 2025. With the other two seeds: closed on day 59, tax none, in the black never; closed on day 49, tax none, in the black never. Burglaries: none.

### Hard, two joiners with no experience from day 1

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £9,181 | -£5,550 | -£600 |  | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£10,370 | £10,000 |  | -£5,218 | -£5,218 |
| April 2025 | £1,082 |  |  |  | -£1,800 | -£1,040 | -£195 | -£221 | -£221 |  | -£292 |  | -£2,687 | -£7,906 |

First month in the black: none. The bank closed it on Sun 12 April 2025 (day 42): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: none. Loan: £10,000 drawn on Mon 1 March 2025. With the other two seeds: closed on day 41, tax none, in the black never; closed on day 46, tax none, in the black never. Burglaries: none.

### Hard, four experienced joiners from day 1, and their machines

| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| March 2025 | £9,514 | -£5,090 | -£560 |  | -£4,400 | -£2,400 | -£450 | -£479 | -£150 | -£11,140 | £10,000 |  | -£5,155 | -£5,155 |
| April 2025 | £1,930 |  |  |  | -£2,200 | -£1,200 | -£225 | -£255 | -£231 |  | -£292 |  | -£2,473 | -£7,628 |

First month in the black: none. The bank closed it on Wed 15 April 2025 (day 45): You cannot pay what you owe and the bank has pulled the overdraft. Tax paid: none. Joiners on the books at the end: none. Loan: £10,000 drawn on Mon 1 March 2025. With the other two seeds: closed on day 45, tax none, in the black never; closed on day 43, tax none, in the black never. Burglaries: none.

<!-- end of the tables -->

## What the tables say

**One company in twelve lives the year: the owner alone on Very easy**, on all three seeds, and he ends
it with £1,947, £4,287 and £4,278 of the 50,000 he opened with. Every other company is closed by the
bank inside the year, on every seed but one: the one joiner on Very easy reaches the end of February
on the third seed and is closed at the open of the next day (day 361).

**No month of any run on the suite's seed is in the black.** The trade never put money in the account
in any month of the twelve; of the twenty four runs on the other two seeds, two had one month that did
(August 2025, the owner alone on Very easy and on Easy).

**The owner alone spends more than he takes.** On Very easy the clients paid £127,933 in the year,
£10,661 a month. The material took 51% of it and the couriers 3%, which leaves about £4,900 a month;
the fixed costs were £7,657 a month: the draw £4,200 to £4,400, the rent £2,400, the rates £450 and
the power about £510. After March, whose day one list was £10,370, the account fell by between £228
and £5,369 a month, £3,100 on average. The draw is the largest of the fixed costs: without it the
same year would have put about £1,250 a month into the account. Very easy's 50,000 carries that loss
through the year; Easy's 20,000 and the bank's 10,000 carry it to between 9 November 2025 and 1
February 2026 (days 249, 292 and 331).

**A joiner with no experience brings in less than he costs.** On Very easy one novice took the
clients' money from £10,661 a month to £14,373, about £3,700 more, of which the material took half;
his wage is £4,550 a month. That company was closed on day 330 (Monday 30 January 2026), and on days
327 and 361 on the other seeds. Two novices brought no more than one, £13,440 a month, for £9,100 of
wages, and were closed on day 180 (180 and 208). The work the board gives a new company is small
(garage shelves from under £400, bookcases from about £900 to £1,600, a TV unit under £2,000), and
the owner's one desk does every drawing, every order and every client's call, so another pair of
hands at a bench did not bring more of it in.

**Four experienced men and their machines are closed on day 60 on Very easy and on Easy, on all
three seeds.** Their wages are £23,060 a month; their kit, their machines and the day one list cost
£28,645 on Very easy; their first two months brought £18,442 and £23,394 while the first jobs went
through the drawings and the material, and the wages day of April is the end of the company.

**Hard is closed in its second month, every crew, every seed (days 41 to 61), and takes no man on.**
It opens with nothing. The bank's 10,000 buys the day one list (£10,370), and the first month's fixed
costs take the account to its overdraft limit of 5,000, below which the bank lets the company buy
nothing, material included; the jobs stop, and the floor of 7,500 comes in April or May. On the
suite's seed no card for a joiner ever had a month of his pay in the account behind it.

**The tax** was paid only by the companies alive with money in the account on 30 December: the owner
alone on Very easy, £1,159, £1,959 and £3,181 on the three seeds, and the one joiner on Very easy on
the third seed, £325. Every one of them had lost money in every month of the year it was taxed for but
one (August, on the second seed), so what the taxman took was a quarter of what was left of the 50,000
the company opened with. The most any of them held on the 30th was about £12,700 (the £3,181 is a
quarter of it), so the December of Piotr's words, invest or pay, did not come to any company in these tables.

**What decides it**, in the game's own terms and with no figure put to any of it: the owner's draw
against what his own hands bring in; the share of a job's price the material takes on the work the
board offers a new company (about half); a man's monthly wage against the work there is for him; and
the 50,000, 20,000 and nothing the three difficulties open with, with the bank's 10,000 and its
overdraft behind them. A player does better than the script, by haggling, by picking his jobs and by
taking the contracts once his name is known; how much better is not measured here.
