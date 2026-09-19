// The Turn 22 scenarios of CLAUDE.md T22 5, T22-C2: (jj) thirty days under the overdraft limit
// with the wages paid through it, and (kk) a fifty thousand pound job dropped with seven thousand
// in the bank, closed at the next morning's check.
//
// Both are the money of CLAUDE.md T22 2.1 and 2.2 played out: a cost the player did not choose is
// paid whatever the balance, the account goes under the overdraft limit for it, and the bank closes
// the company for being too deep (one and a half times the limit) or too long (the thirtieth
// calendar day in a row under it). Turn 21 had both rules on the books and only the first could
// fire, because every bill stopped at the limit and the remainder went to arrears, so the account
// parked on the limit and the count of days never started (REPORT-T21.md section 0, item 23).
// (jj) is the answer to that item: a company that trades under the limit for thirty days and is
// closed on the thirtieth morning, with a month of wages paid out of an account already under it.
//
// The shape is the one Turns 13, 17, 19, 20 and 21 used: the hall is stood up by playing the
// opening days through the scripted player of autopilot.ts and never by writing the state out by
// hand. Where a scenario writes one figure onto the state it says which figure it is, whose figure
// it is and why the played route cannot reach it. Every figure in a comment was measured on this
// build.
//
// The unit tests of the same two rules are tests/engine/bankruptcy.test.ts and
// tests/ui/dropCard.test.ts, which drive the rules off a position written into them. The two halls
// of tests/scenarios/turn21.test.ts sit beside these: (ii) is the company that stands still and is
// closed on the amount before the days can get there, and (hh) is this same drop read for the
// arithmetic of the click. (jj) and (kk) are the played halls those two are not: a company that
// keeps earning under the limit, and a day of trading between the click and the close.

import { describe, expect, it } from 'vitest';
import { CAREFUL, type Policy, playDay, playUntilDay } from './autopilot';
import { acceptNow, act, newGame, placeEnquiry } from '../helpers';
import {
  BANKRUPTCY_DAYS_BELOW_LIMIT,
  BANKRUPTCY_LIMIT_FACTOR,
  MINUTES_PER_WORKING_DAY,
} from '../../src/engine/constants';
import { formatMoney, formatTime, joiners, warnings } from '../../src/engine/index';
import { bankruptcyFloor } from '../../src/engine/economy';
import { renderBankruptcyCard } from '../../src/ui/eventModal';
import { accountAfterDrop, depositCanBePaid, renderDropCard } from '../../src/ui/dropCard';
import type { Contract, DaySummary, GameEvent, GameState, Job } from '../../src/engine/index';

const SEED = 20260911;

function jobOn(state: GameState, jobId: string): Job {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (job === undefined) throw new Error(`the job ${jobId} has gone off the books`);
  return job;
}

/** The one line the top bar's warning strip carries while the account is under the limit
 *  (`pastTheLimitWarning`), or nothing at all when it is not. */
function limitLine(state: GameState): string {
  return warnings(state).find((warning) => warning.key === 'pastTheLimit')?.text ?? '';
}

// ---------------------------------------------------------------------------
// (jj) Thirty days under the overdraft limit, with the wages paid through it
//      (PIOTR, 18.09: "thirty days below the limit"; CLAUDE.md T22 2.1, 2.2, 5)
// ---------------------------------------------------------------------------

/** A company that keeps earning while it is under the limit. One joiner with no experience, the
 *  day 1 kit, sixty sheets bought onto the rack on day 1 and the first standing contract the board
 *  offers, with the joiner put on it: from then on the money in is the contract's own pieces, made
 *  off sheets that were paid for before the account went under, and the money out is the standing
 *  costs and one month of wages. Nothing is taken off the enquiry board, so there is no deposit and
 *  no client balance in the way of the reading.
 *
 *  This is the company rule two is written for. One that stands still cannot reach the thirtieth
 *  day on any difficulty: its bills come out of the account at 307 a working day and 107 a weekend
 *  one, so the room between the limit and the one and a half times it the bank allows is gone
 *  around the twenty first day and rule one closes it first, which is what (ii) of
 *  tests/scenarios/turn21.test.ts plays. Trading at or near break even is what makes the thirty
 *  days reachable. */
const TRADING_UNDER: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  hireJoiner: true,
  joiners: 1,
  stockSheets: 60,
  takeContracts: true,
};

/** How far under the overdraft limit the account is put, and it is the one figure this scenario
 *  writes: a thousand pounds [TUNE].
 *
 *  The hall around it is played. The kit was bought, the joiner taken on, the sheets bought onto
 *  the rack, the contract offered, accepted and worked for two weeks before the figure is written,
 *  and the money in and out from that morning on is the engine's own. What cannot be played is the
 *  position itself: on Very easy the company still has 25,279 in the account on the morning of
 *  day 16, and playing that down to just under a 10,000 overdraft means buying thirty six thousand
 *  pounds of things nobody asked for, after which the scenario would be measuring the shopping and
 *  not the rule. The two margins the thousand leaves are measured and both are the point of it: the
 *  first morning under the limit reads 957 below it, so no day of the run lifts the account back
 *  above the limit and the count is never put back to nought; and the thirtieth morning reads 350
 *  inside what the bank allows, so it is the run of days that closes the company and not the
 *  amount. */
const UNDER_BY = 1000;

interface ThirtyDays {
  /** The played hall on the morning of day 16, with the account written a thousand under. */
  under: GameState;
  /** Every morning's reading from there on, for the log. */
  readings: string[];
  /** The bank's count of days below the limit at each of those mornings. */
  counts: number[];
  /** The morning the count of days below the limit reached twenty nine. */
  twentyNine: GameState;
  /** The morning it reached thirty, which is the morning the bank closed the company. */
  thirty: GameState;
  card: string;
}

function thirtyDaysUnderTheLimit(): ThirtyDays {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 16, TRADING_UNDER, seen);
  state.cash = state.finance.overdraftLimit - UNDER_BY;
  const under = state;
  const readings: string[] = [];
  const counts: number[] = [];
  let twentyNine: GameState | null = null;
  let guard = 0;
  while (state.gameOver === null && guard < 45) {
    state = playDay(state, TRADING_UNDER, seen);
    guard += 1;
    readings.push(
      `day ${state.clock.day}: cash ${Math.round(state.cash)}, days below the limit ` +
        `${state.finance.daysBelowOverdraft}`,
    );
    counts.push(state.finance.daysBelowOverdraft);
    if (state.finance.daysBelowOverdraft === BANKRUPTCY_DAYS_BELOW_LIMIT - 1) twentyNine = state;
  }
  if (twentyNine === null) throw new Error('the twenty ninth day under the limit was never reached');
  const event = state.activeEvent;
  return {
    under,
    readings,
    counts,
    twentyNine,
    thirty: state,
    card: event === null ? '' : renderBankruptcyCard(state, event),
  };
}

const JJ = thirtyDaysUnderTheLimit();

/** The standing contract the board offered this run, which is the company's whole trade. */
function contractOf(state: GameState): Contract {
  const contract = state.contracts.find((entry) => entry.status === 'active');
  if (contract === undefined) throw new Error('no contract is running');
  return contract;
}

describe('(jj) a company trading under the overdraft limit, on Very easy', () => {
  it('stands the trading company up by playing it: one man, one contract and a fed rack', () => {
    // One joiner with no experience, at the monthly wage the tier pays, and nobody else: the wage
    // bill of the month is his 1,950 and it is what 2.1 is read on further down.
    expect(joiners(JJ.under)).toHaveLength(1);
    expect(JJ.under.workers.map((worker) => [worker.role, worker.tier, worker.monthlyWage])).toEqual([
      ['joiner', 'novice', 1950],
    ]);
    // The trade: one standing contract, taken off the board on day 3 by the scripted player and
    // worked ever since, twenty cut sheet packs a week at 50 a piece. Fifty three pieces were made
    // and paid for before the money was written, so the run's income is proven before the rule is.
    const contract = contractOf(JJ.under);
    expect(contract.name).toBe('Cut sheet packs for Northgate Interiors');
    expect(contract.pieceId).toBe('cutSheetPack');
    expect(contract.quantityPerWeek).toBe(20);
    expect(contract.pricePerPiece).toBe(50);
    expect(contract.startDay).toBe(3);
    expect(contract.piecesMade).toBe(53);
    // Sixty sheets bought on day 1, fifty two of them still on the rack: the contract's material
    // comes off the rack and never off the account, so nothing the company does from here is a
    // purchase (CLAUDE.md T17 2.22). Buying is refused under the limit and it never needs to buy.
    expect(JJ.under.stock.sheets).toBe(52);
    expect(JJ.under.jobs).toHaveLength(0);
    // The one written figure, and where it puts the company: a thousand under a 10,000 limit, which
    // is four thousand inside the -15,000 the bank allows.
    expect(JJ.under.finance.overdraftLimit).toBe(-10000);
    expect(JJ.under.cash).toBe(-11000);
    expect(bankruptcyFloor(JJ.under)).toBe(-15000);
    expect(JJ.under.finance.daysBelowOverdraft).toBe(0);
    expect(JJ.under.clock.day).toBe(16);
  });

  it('keeps trading under the limit for twenty nine days, and the strip counts them', () => {
    // Twenty nine calendar days in a row closed under the limit, played one at a time: the account
    // stands at -14,643 on the twenty ninth morning, which is day 45 of the calendar, and the
    // company is still trading. The account is a little over four thousand under the limit after
    // twenty nine days of it and still 357 inside the -15,000 the bank allows, because the contract
    // pays for nearly every pound the days take out (CLAUDE.md T22 2.1, 2.2).
    expect(JJ.twentyNine.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT - 1);
    expect(JJ.twentyNine.finance.daysBelowOverdraft).toBe(29);
    expect(JJ.twentyNine.clock.day).toBe(45);
    expect(JJ.twentyNine.gameOver).toBeNull();
    expect(Math.round(JJ.twentyNine.cash)).toBe(-14643);
    expect(JJ.twentyNine.cash).toBeLessThan(JJ.twentyNine.finance.overdraftLimit);
    expect(JJ.twentyNine.cash).toBeGreaterThan(bankruptcyFloor(JJ.twentyNine));
    // And the player was told, every one of those days, in the one line the warning strip carries
    // under the top bar (CLAUDE.md T22 2.2).
    expect(limitLine(JJ.twentyNine)).toBe(
      "Account -£14,643 is below the bank's -£10,000 limit: day 29 of 30.",
    );
    expect(limitLine(JJ.under)).toBe(
      "Account -£11,000 is below the bank's -£10,000 limit: day 1 of 30.",
    );
    // And the count was never put back to nought on the way: every morning of the run reads higher
    // than the one before it, 1 on the first and 30 on the last, and the steps of three are the
    // weekends, whose two days the clock rolls through in one go with their own bills and their own
    // count. No day of the thirty closed at or above the limit, which is what the thousand the
    // scenario wrote is for: the nearest the account ever came back to the limit was the first
    // morning, 957 under it (CLAUDE.md T22 2.2).
    expect(JJ.counts[0]).toBe(1);
    expect(JJ.counts[JJ.counts.length - 1]).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(JJ.counts).toHaveLength(22);
    for (let index = 1; index < JJ.counts.length; index += 1) {
      expect(JJ.counts[index], JJ.readings[index]).toBeGreaterThan(JJ.counts[index - 1] ?? 0);
    }
  });

  it('is closed on the thirtieth morning, on the days and never on the amount', () => {
    // The morning of day 46: the thirtieth calendar day in a row with the account under the limit,
    // and the bank pulls it. The reason is the run of days, word for word, and not the amount
    // [PIOTR, 18.09: "thirty days below the limit"].
    expect(JJ.thirty.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(JJ.thirty.gameOver).not.toBeNull();
    expect(JJ.thirty.gameOver?.reason).toBe(
      '30 days in a row past the overdraft limit, and the bank has pulled it.',
    );
    expect(JJ.thirty.gameOver?.day).toBe(46);
    expect(JJ.thirty.clock.day).toBe(46);
    // The look is the day's first act, so the clock is at the top of the morning it closed on.
    expect(JJ.thirty.clock.minute).toBe(0);
    // The amount was never the reason: the account is -14,650 against the -15,000 the bank allows,
    // 350 the right side of the line it never reached. This is the whole of the rule: a company can
    // be closed while it can still pay.
    expect(Math.round(JJ.thirty.cash)).toBe(-14650);
    expect(JJ.thirty.cash).toBeGreaterThan(bankruptcyFloor(JJ.thirty));
    expect(Math.round(JJ.thirty.cash - bankruptcyFloor(JJ.thirty))).toBe(350);
    expect(bankruptcyFloor(JJ.thirty)).toBe(
      JJ.thirty.finance.overdraftLimit * BANKRUPTCY_LIMIT_FACTOR,
    );
    // The figures ride on the event, so the card prints what the bank read (CLAUDE.md T22 2.2).
    expect(JJ.thirty.activeEvent?.kind).toBe('bankruptcy');
    expect(JJ.thirty.activeEvent?.data).toEqual({
      day: 46,
      month: 2,
      cash: -14650,
      allowed: -15000,
      daysBelow: BANKRUPTCY_DAYS_BELOW_LIMIT,
      daysAllowed: BANKRUPTCY_DAYS_BELOW_LIMIT,
    });
    // And the card says the three figures of 2.2 and no fourth one: what was in the bank, what the
    // bank allowed, and how long the account stood under the limit.
    expect(JJ.card).toContain('The bank has closed you');
    for (const figure of ['-£14,650', '-£15,000', '30 of 30']) {
      expect(JJ.card, figure).toContain(figure);
    }
  });

  it('paid a month of wages out of an account that was already under the limit', () => {
    // 2.1 inside 2.2, and it is the clause the brief asks for: the monthly wages went out on the
    // last working day of the month, day 30, out of an account that was already 1,638 under the
    // limit, and the ledger line's own balance says where it left the account. Turn 21 would have
    // paid nothing at all: the whole 1,950 would have gone to arrears and the account would have
    // stayed parked on the limit.
    const wages = JJ.thirty.ledger.filter((entry) => entry.category === 'wages');
    expect(wages).toHaveLength(1);
    const line = wages[0];
    expect(line?.day).toBe(30);
    expect(line?.label).toBe('Monthly wages');
    expect(line?.amount).toBe(-1950);
    expect(line?.unpaid).toBe(false);
    expect(Math.round(line?.balance ?? 0)).toBe(-13588);
    expect(line?.balance).toBeLessThan(JJ.thirty.finance.overdraftLimit);
    // The account before the wages went out, which is the balance plus the bill: already under.
    expect(Math.round((line?.balance ?? 0) - (line?.amount ?? 0))).toBe(-11638);
    expect((line?.balance ?? 0) - (line?.amount ?? 0)).toBeLessThan(
      JJ.thirty.finance.overdraftLimit,
    );
    // Not one line of the whole run went unpaid: there is nowhere for a bill to go but the account
    // (CLAUDE.md T22 2.1).
    expect(JJ.thirty.ledger.some((entry) => entry.unpaid)).toBe(false);
  });

  it('was trading the whole way, off the rack and the contract s own pieces', () => {
    // What kept it alive: 129 more pieces made after the money was written, 182 in all, and a line
    // of contract revenue on every working day from that morning to the last one it traded. Twenty
    // two lines, 6,450 in all, 250 or 300 a day beside the 307 the day itself takes out, and 350 on
    // day 16, which had its morning before the figure was written. That is the company at break
    // even under the limit, and it is why the thirty days are reachable at all.
    const contract = contractOf(JJ.thirty);
    expect(contract.piecesMade).toBe(182);
    const pieces = JJ.thirty.ledger.filter(
      (entry) => entry.day >= 16 && entry.label === `${contract.name}: pieces`,
    );
    expect(pieces).toHaveLength(22);
    expect(pieces[0]?.day).toBe(16);
    expect(pieces[pieces.length - 1]?.day).toBe(45);
    for (const entry of pieces) expect(entry.amount).toBeGreaterThan(0);
    expect(pieces.reduce((total, entry) => total + entry.amount, 0)).toBe(6450);
    // The rack was never dry, so the contract never missed a day for want of a sheet: thirty two of
    // the sixty sheets are still on it when the bank closes the company.
    expect(JJ.thirty.stock.sheets).toBeGreaterThan(0);
    expect(Math.round(JJ.thirty.stock.sheets * 100) / 100).toBe(32);
    console.log(
      '(jj) THIRTY DAYS UNDER THE OVERDRAFT LIMIT, WITH THE WAGES PAID THROUGH IT\n' +
        `the hall on the morning of day ${JJ.under.clock.day}: one joiner, ` +
        `${JJ.under.stock.sheets} sheets on the rack, ${contractOf(JJ.under).name} running since ` +
        `day ${contractOf(JJ.under).startDay}\n` +
        `the account written to ${formatMoney(JJ.under.cash)}, ${formatMoney(UNDER_BY)} under the ` +
        `bank's ` +
        `${formatMoney(JJ.under.finance.overdraftLimit)} limit\n` +
        `${JJ.readings.slice(-4).join('\n')}\n` +
        `the strip on the twenty ninth day: ${limitLine(JJ.twentyNine)}\n` +
        `the wages of the month: ${formatMoney(-1950)} on day 30, leaving the account at ` +
        `${formatMoney(JJ.thirty.ledger.filter((entry) => entry.category === 'wages')[0]?.balance ?? 0)}\n` +
        `CLOSED on the morning of day ${JJ.thirty.gameOver?.day}: ` +
        `"${JJ.thirty.gameOver?.reason}" with ${formatMoney(JJ.thirty.cash)} in the account and ` +
        `${formatMoney(bankruptcyFloor(JJ.thirty))} allowed`,
    );
  });
});

// ---------------------------------------------------------------------------
// (kk) A fifty thousand pound job dropped with seven thousand in the bank, closed at the next
//      morning's check (PIOTR, 18.09, 19.09; CLAUDE.md T22 2.1, 2.2, 2.3, 5)
// ---------------------------------------------------------------------------

/** The hall of Piotr's evening of 18.09, with nothing taken off the board beside the one big job
 *  and the standing a job of that size wants. */
const DROP_MONTH: Policy = { ...CAREFUL, maxOpenJobs: 0, stockSheets: 0, reputation: 60 };

/** What Piotr had in the bank when he pressed Drop project [PIOTR, 18.09]. It is the one figure
 *  this scenario writes, and it is his. Everything else is played: the kit bought, the job taken,
 *  drawn and costed, its hundred sheets ordered, delivered and unloaded, and 39,974 of the deposit
 *  and the starting money still in the account on the morning of the drop. Playing that down to his
 *  7,000 would mean buying a month of things nobody asked for. */
const IN_THE_BANK = 7000;

interface DroppedJob {
  /** The hall on the morning of the drop, with his money in the account. */
  morning: GameState;
  /** What the click left behind, still trading. */
  clicked: GameState;
  /** Every reading of the rest of that day, half an hour at a time. */
  readings: string[];
  /** The next morning, which is the next look the bank takes. */
  closed: GameState;
  job: Job;
  dropDay: number;
  record: DaySummary;
  card: string;
}

function fiftyThousandDropped(): DroppedJob {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, DROP_MONTH, seen);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    name: 'Kitchen for the Hedges',
    price: 50000,
    basePrice: 50000,
    deadlineDays: 200,
  });
  state = acceptNow(state, enquiry.id, false);
  const opened = state.jobs[state.jobs.length - 1];
  if (opened === undefined) throw new Error('no job on the books');
  const jobId = opened.id;
  // Played on until the job's own lorry has come and gone: the drawing, the take off, the order, the
  // road and the unloading are the scripted player's own doing, so the material the card writes off
  // is material that was really bought for this job.
  let guard = 0;
  while (
    guard < 80 &&
    !state.deliveries.some((delivery) => delivery.jobId === jobId && delivery.unloaded)
  ) {
    state = playDay(state, DROP_MONTH, seen);
    guard += 1;
  }
  state.cash = IN_THE_BANK;
  const morning = state;
  const dropDay = morning.clock.day;
  const job = jobOn(morning, jobId);
  const clicked = act(morning, { type: 'DROP_JOB', jobId });
  // The rest of the day he dropped it on, read every half hour, and then the next morning.
  const readings: string[] = [];
  const closed = playDay(clicked, DROP_MONTH, seen, {
    step: 30,
    watch: (current) => {
      readings.push(
        `${current.clock.day} ${formatTime(current.clock.minute)} ` +
          `${Math.round(current.cash)} ${current.gameOver === null ? 'trading' : 'closed'}`,
      );
    },
  });
  const record = closed.days.find((entry) => entry.day === dropDay);
  if (record === undefined) throw new Error(`no record of day ${dropDay}`);
  const event = closed.activeEvent;
  return {
    morning,
    clicked,
    readings,
    closed,
    job,
    dropDay,
    record,
    card: event === null ? '' : renderBankruptcyCard(closed, event),
  };
}

const KK = fiftyThousandDropped();

function dangerBoxOf(html: string): string {
  return /<p class="warn drop-danger">(.*?)<\/p>/.exec(html)?.[1] ?? '';
}

describe('(kk) a fifty thousand pound job dropped with seven thousand in the bank', () => {
  it('promises in the red box that the drop closes the company at tomorrow s check', () => {
    // The card before the click, off the played hall. The deposit is 25,000 and it cannot be paid
    // out of 7,000 and a 10,000 overdraft, so the box is shown; from Turn 22 the deposit is paid
    // anyway, because a deposit handed back is not a cost the player chose, and the account goes to
    // -18,000 against the -15,000 the bank allows. The last sentence is the one the engine then
    // keeps, and the two of them are the promise and the deed (CLAUDE.md T22 2.1, 2.3).
    expect(KK.job.price).toBe(50000);
    expect(KK.job.depositPaid).toBe(25000);
    expect(KK.morning.cash).toBe(IN_THE_BANK);
    expect(KK.dropDay).toBe(11);
    expect(formatTime(KK.morning.clock.minute)).toBe('08:00');
    expect(depositCanBePaid(KK.morning, KK.job)).toBe(false);
    expect(accountAfterDrop(KK.morning, KK.job)).toEqual({ account: -18000, allowed: -15000 });
    expect(dangerBoxOf(renderDropCard(KK.morning, KK.job))).toBe(
      'You cannot pay the deposit back from the overdraft. The account goes to -£18,000 ' +
        "against the bank's -£15,000. Dropping this job closes the company at tomorrow's check.",
    );
  });

  it('trades the whole of the day it dropped the job on, and the bank looks at nothing', () => {
    // The click hands the deposit back out of the account and the company stands 18,000 under, with
    // the working day still in front of it. The bank looks once a calendar day, at the point the
    // day's money is settled (`runDayCosts`, off `startDay`), so nothing looks at the company again
    // until the morning: twenty readings of the rest of the day, 08:00 to 17:00, every one of them
    // trading, and the day's own record written at the end of it like any other day's.
    expect(KK.clicked.cash).toBe(-18000);
    expect(KK.clicked.cash).toBeLessThanOrEqual(bankruptcyFloor(KK.clicked));
    expect(KK.clicked.gameOver).toBeNull();
    expect(KK.readings).toHaveLength(20);
    expect(KK.readings[0]).toBe('11 08:00 -18000 trading');
    expect(KK.readings[KK.readings.length - 1]).toBe('11 17:00 -18000 trading');
    for (const reading of KK.readings) {
      expect(reading, reading).toContain('11 ');
      expect(reading, reading).toContain('trading');
    }
    // The day was lived through: the owner put his hour in on his own list, and with the job off
    // the books there was nothing at a bench, so the whole 480 of the day's seats are nobody at a
    // station and not a man standing about.
    expect(KK.record.day).toBe(KK.dropDay);
    expect(KK.record.efficiency.possible).toBe(MINUTES_PER_WORKING_DAY);
    expect(KK.record.efficiency.worked).toBe(0);
    expect(KK.record.efficiency.lost.noPeople).toBe(MINUTES_PER_WORKING_DAY);
    expect(KK.record.minutesWorked).toBe(60);
    // What the click itself did to the books: the deposit really left the account, and the material
    // is a loss with no cash behind it, because it was paid for when it was ordered (`noteLoss`).
    const lines = KK.clicked.ledger.filter((entry) => entry.day === KK.dropDay);
    const deposit = lines.find(
      (entry) => entry.label === 'Deposit returned: Kitchen for the Hedges',
    );
    expect(deposit?.amount).toBe(-25000);
    expect(deposit?.unpaid).toBe(false);
    expect(Math.round(deposit?.balance ?? 0)).toBe(-18000);
    const written = lines.find(
      (entry) => entry.label === 'Material written off: Kitchen for the Hedges',
    );
    expect(written?.amount).toBe(-20000);
    expect(written?.unpaid).toBe(true);
  });

  it('is closed at the next morning s check, with that morning s own bills paid first', () => {
    // The morning of day 12. The day's rent, rates, power and owner's draw come out of an account
    // that is already 18,000 under: 307 of them, paid in full because the player did not choose any
    // of them, each line's own balance below the limit and not one of them left unpaid. Then the
    // bank looks, and the company is closed on what it sees, -18,307 against -15,000
    // (CLAUDE.md T22 2.1, 2.2, 2.3).
    expect(KK.closed.clock.day).toBe(KK.dropDay + 1);
    expect(KK.closed.clock.minute).toBe(0);
    const morning = KK.closed.ledger.filter((entry) => entry.day === KK.closed.clock.day);
    expect(
      morning.map((entry) => [entry.label, Math.round(entry.amount), Math.round(entry.balance)]),
    ).toEqual([
      ['Rent', -80, -18080],
      ['Business rates', -15, -18095],
      ['Power', -12, -18107],
      ["Owner's draw", -200, -18307],
    ]);
    for (const entry of morning) {
      expect(entry.unpaid, entry.label).toBe(false);
      expect(entry.balance, entry.label).toBeLessThan(KK.closed.finance.overdraftLimit);
    }
    expect(Math.round(KK.closed.cash)).toBe(-18307);
    expect(KK.closed.gameOver?.day).toBe(12);
    expect(KK.closed.gameOver?.reason).toBe(
      'You cannot pay what you owe and the bank has pulled the overdraft.',
    );
    // It is the amount that closed this one, on the first day the account was ever under the limit:
    // the other rule's count reads one of thirty on the card (CLAUDE.md T22 2.2).
    expect(KK.closed.activeEvent?.data).toEqual({
      day: 12,
      month: 1,
      cash: -18307,
      allowed: -15000,
      daysBelow: 1,
      daysAllowed: BANKRUPTCY_DAYS_BELOW_LIMIT,
    });
    expect(KK.card).toContain('The bank has closed you');
    for (const figure of ['-£18,307', '-£15,000', '1 of 30']) {
      expect(KK.card, figure).toContain(figure);
    }
    // Nothing of the day after was ever played: the day of the drop is the last day on the record.
    expect(KK.closed.days.some((entry) => entry.day > KK.dropDay)).toBe(false);
    console.log(
      '(kk) A FIFTY THOUSAND POUND JOB DROPPED WITH SEVEN THOUSAND IN THE BANK\n' +
        `the red box on day ${KK.dropDay}: ${dangerBoxOf(renderDropCard(KK.morning, KK.job))}\n` +
        `the click at 08:00: the account ${formatMoney(KK.clicked.cash)} against the bank's ` +
        `${formatMoney(bankruptcyFloor(KK.clicked))}, and still trading\n` +
        `the rest of the day: ${KK.readings.length} readings, ${KK.readings[0]} to ` +
        `${KK.readings[KK.readings.length - 1]}\n` +
        `the morning after: ${formatMoney(-307)} of rent, rates, power and the owner's draw out of ` +
        `an account already ${formatMoney(KK.clicked.cash)}, and the account at ` +
        `${formatMoney(KK.closed.cash)}\n` +
        `CLOSED at the check of day ${KK.closed.gameOver?.day}: "${KK.closed.gameOver?.reason}"`,
    );
  });
});
