import { describe, expect, it } from 'vitest';
import {
  LATE_ACCOUNTS_CHARGE,
  LEDGER_MAX_ENTRIES,
  DAYS_PER_MONTH,
  DUST_WASTE_MONTHLY,
  OWNER_DRAW_PER_DAY,
  OVERDRAFT_RATE_YEARLY,
  DAYS_PER_YEAR,
  PELLET_INCOME_MONTHLY_BASE,
  PELLET_INCOME_PER_1000_PRODUCTION_MINUTES,
  POWER_BASE_DAILY,
  POWER_PER_MACHINE_DAILY,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  SOFTWARE_ONE_OFF_PRICE,
  UNIT_RATES_MONTHLY,
  UNIT_RENT_MONTHLY,
  unitDepositFor,
} from '../../src/engine/constants';
import {
  bankruptcyFloor,
  booksBehind,
  canAfford,
  charge,
  dailyPower,
  monthReport,
  dailyRates,
  dailyRent,
  nextDueDays,
  pay,
  receive,
  refund,
  visibleTotals,
  monthlyWageBill,
} from '../../src/engine/economy';
import { applyAction, findVariant, tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import { isLastWorkingDayOfMonth, monthOfDay } from '../../src/engine/clock';
import { buyStartingKit } from '../helpers';
import {
  buyNow,
  clearEvents,
  doTask,
  eventsOfKind,
  newGame,
  nextDay,
  runDays,
  runToDay,
  softwareNow,
} from '../helpers';

function ledgerFor(state: GameState, category: string): number {
  return state.ledger
    .filter((entry) => entry.category === category && !entry.unpaid)
    .reduce((total, entry) => total + entry.amount, 0);
}

function joiner(id: string, monthlyWage: number): Worker {
  return {
    id,
    name: id,
    role: 'joiner',
    tier: 'novice',
    rate: 0.6,
    monthlyWage,
    leavesOnDay: null,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
    accidents: 0,
    anchorX: 0,
    anchorY: 4,
  };
}

describe('daily costs', () => {
  it('charges one month of rent as the deposit once, on day 1, and holds it', () => {
    const day1 = newGame();
    const deposit = unitDepositFor(UNIT_RENT_MONTHLY);
    // 200 m2 of painted hall at 12 a metre (docs/art/SPRITES.md 9.1).
    expect(deposit).toBe(2400);
    expect(ledgerFor(day1, 'unitDeposit')).toBe(-deposit);
    expect(day1.unit.depositHeld).toBe(deposit);
    const later = runToDay(day1, 4).state;
    expect(ledgerFor(later, 'unitDeposit')).toBe(-deposit);
    // Nothing comes back tonight: moving out is parked.
    expect(later.unit.depositHeld).toBe(deposit);
  });

  it('charges rent at 12 per m2 a month, a thirtieth every calendar day', () => {
    const state = newGame();
    expect(state.unit.rentMonthly).toBe(2400);
    // One painted hall, so very easy rents the same floor as everybody else.
    expect(newGame({ difficulty: 'veryEasy' }).unit.rentMonthly).toBe(2400);
    expect(dailyRent(state)).toBeCloseTo(UNIT_RENT_MONTHLY / DAYS_PER_MONTH, 8);
    expect(dailyRates(state)).toBeCloseTo(UNIT_RATES_MONTHLY / DAYS_PER_MONTH, 8);
    // Day 1 to the start of day 8 is eight charged calendar days, two of them the weekend.
    const week = runToDay(state, 8).state;
    expect(ledgerFor(week, 'rent')).toBeCloseTo(-8 * dailyRent(state), 6);
    expect(ledgerFor(week, 'rates')).toBeCloseTo(-8 * dailyRates(state), 6);
  });

  it('charges living costs on working days only', () => {
    // Days 1 to 5 and day 8: six working days, no charge on the Saturday or the Sunday.
    const week = runToDay(newGame(), 8).state;
    expect(ledgerFor(week, 'ownerDraw')).toBeCloseTo(-6 * OWNER_DRAW_PER_DAY, 6);
  });

  it('charges power per machine on top of the base', () => {
    const empty = newGame();
    expect(dailyPower(empty)).toBe(POWER_BASE_DAILY);
    const withSaw = buyNow(empty, 'tableSaw');
    expect(dailyPower(withSaw)).toBe(POWER_BASE_DAILY + POWER_PER_MACHINE_DAILY);
    // Every class of extractor says what it draws: the used one is 2 a day where the saw's
    // synthetic standard class is the family figure (CLAUDE.md T10 3.4).
    const withExtractor = buyNow(withSaw, 'extractor');
    const extractorPower = findVariant('extractor', 'used')?.powerPerDay ?? 0;
    expect(extractorPower).toBe(2);
    expect(dailyPower(withExtractor)).toBe(POWER_BASE_DAILY + POWER_PER_MACHINE_DAILY + extractorPower);
    // A drill is not a machine that draws power.
    const withDrill = buyNow(withExtractor, 'drill');
    expect(dailyPower(withDrill)).toBe(POWER_BASE_DAILY + POWER_PER_MACHINE_DAILY + extractorPower);
  });
});

/** The one pay day of the game's first month: its last working day, which the clock is asked for
 *  and the test never guesses at (CLAUDE.md T21 2.10). */
function lastWorkingDayOfMonthOne(): number {
  let day = DAYS_PER_MONTH;
  while (day > 1 && !isLastWorkingDayOfMonth(day)) day -= 1;
  return day;
}

const LAST_WORKING_DAY_OF_MONTH_ONE = lastWorkingDayOfMonthOne();

describe('the pay day and the month end: what the calendar charges for', () => {
  it('pays the wages on the last working day of the month and on no other day', () => {
    // Everybody is paid by the month, so Friday buys nothing and the one pay day of the month is
    // its last working one, which in the game's thirty day month is day 30 (PIOTR, 19.09: "I
    // wanted everyone monthly"; CLAUDE.md T21 2.10).
    const state = newGame();
    state.workers.push(joiner('w1', 1950), joiner('w2', 1800));
    expect(monthlyWageBill(state)).toBe(3750);
    const friday = runToDay(state, 5);
    expect(ledgerFor(friday.state, 'wages')).toBe(0);
    // A day's costs run on its own morning, so the pay day's line is there the minute the clock
    // turns to it.
    const payDay = runToDay(state, LAST_WORKING_DAY_OF_MONTH_ONE);
    expect(ledgerFor(payDay.state, 'wages')).toBe(-3750);
    expect(eventsOfKind(payDay.events, 'wagesPaid')).toHaveLength(1);
    // One month, one payment: the days after it add nothing.
    const next = runToDay(state, LAST_WORKING_DAY_OF_MONTH_ONE + 3);
    expect(ledgerFor(next.state, 'wages')).toBe(-3750);
  });

  it('pays the office in the one wage line with the floor, and nothing at the month end', () => {
    // One unit of pay in the game and it is the month: the office salary line of the 1st is gone
    // (PIOTR, 19.09; CLAUDE.md T21 2.10).
    const state = newGame();
    state.workers.push({ ...joiner('a1', 0), role: 'officeAdmin', monthlyWage: 1900, rate: 0 });
    expect(monthlyWageBill(state)).toBe(1900);
    const after = runToDay(state, 31).state;
    expect(ledgerFor(after, 'salaries')).toBe(0);
    expect(ledgerFor(after, 'wages')).toBeLessThan(0);
  });

  it('bills the software subscription monthly and the one off never again', () => {
    const subscription = buyNow(buyNow(newGame(), 'desk'), 'laptop');
    const subscribed = softwareNow(subscription, 'subscription');
    expect(subscribed.software.mode).toBe('subscription');
    const nextMonth = runToDay(subscribed, 31).state;
    expect(ledgerFor(nextMonth, 'software')).toBe(-SOFTWARE_SUBSCRIPTION_MONTHLY);
    const oneOff = softwareNow(subscription, 'oneOff');
    expect(oneOff.software.jobsRemaining).toBe(30);
    const oneOffNextMonth = runToDay(oneOff, 31).state;
    // The law of CLAUDE.md T2 3.4: 150 a month, and the one off is two years of it.
    expect(SOFTWARE_SUBSCRIPTION_MONTHLY).toBe(150);
    expect(SOFTWARE_ONE_OFF_PRICE).toBe(3600);
    expect(ledgerFor(oneOffNextMonth, 'software')).toBe(-SOFTWARE_ONE_OFF_PRICE);
  });

  it('charges dust waste collection only with the dust system', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const withSystem = buyNow(state, 'dustSystem');
    expect(withSystem.equipment).toHaveLength(1);
    const nextMonth = runToDay(withSystem, 31).state;
    expect(ledgerFor(nextMonth, 'waste')).toBe(-DUST_WASTE_MONTHLY);
    const plain = runToDay(state, 31).state;
    expect(ledgerFor(plain, 'waste')).toBe(0);
  });

  it('accrues overdraft interest day by day below zero and charges it on the 1st', () => {
    const state = newGame();
    // Deep enough in the red for the interest to bite, with room left before the floor.
    state.cash = -2000;
    const nextMonth = runToDay(state, 31);
    const interest = ledgerFor(nextMonth.state, 'overdraftInterest');
    expect(interest).toBeLessThan(0);
    // At least what the opening balance alone would have accrued over the days to the 1st, at
    // the yearly rate a day (CLAUDE.md T13 3.14), and reset once charged.
    expect(-interest).toBeGreaterThanOrEqual((2000 * OVERDRAFT_RATE_YEARLY * 29) / DAYS_PER_YEAR);
    expect(nextMonth.state.finance.overdraftInterestAccrued).toBeGreaterThanOrEqual(0);
    expect(eventsOfKind(nextMonth.events, 'monthlyBills').length).toBeGreaterThan(0);
  });

  it('names the next wage day and the next monthly bill day', () => {
    // The next wage day is the month's last working one, which is day 30 of the first month, and
    // no longer the Friday of the week (CLAUDE.md T21 2.10).
    const state = newGame();
    expect(nextDueDays(state)).toEqual({ wages: LAST_WORKING_DAY_OF_MONTH_ONE, monthly: 31 });
    expect(LAST_WORKING_DAY_OF_MONTH_ONE).toBe(30);
  });
});

describe('cash primitives', () => {
  it('writes every movement to the ledger with the balance after it', () => {
    const state = newGame();
    const before = state.cash;
    receive(state, 'jobDeposit', 'Deposit', 200);
    pay(state, 'material', 'Sheets', 50);
    const last = state.ledger[state.ledger.length - 1];
    expect(last?.amount).toBe(-50);
    expect(last?.balance).toBe(before + 200 - 50);
    expect(state.cash).toBe(before + 150);
    expect(state.finance.day.income).toBeGreaterThanOrEqual(200);
  });

  it('stops a purchase at the overdraft limit', () => {
    const state = newGame({ difficulty: 'hard' });
    expect(canAfford(state, 100)).toBe(true);
    expect(canAfford(state, 50000)).toBe(false);
    const tooDear = buyNow(state, 'cnc');
    expect(tooDear.equipment).toHaveLength(0);
  });

  it('keeps the ledger bounded', () => {
    const state = runToDay(newGame(), 60).state;
    expect(state.ledger.length).toBeLessThanOrEqual(LEDGER_MAX_ENTRIES);
  });
});

describe('a cost the player did not choose goes through the limit', () => {
  it('pays the monthly wages in full with 200 in the bank and a 10,000 limit', () => {
    // PIOTR, 19.09: the costs he does not choose go through the limit and drag the account under
    // it. Turn 21 stopped every such cost at the floor and put the rest of the bill in a second pot
    // beside the bank balance; there is no second pot now, so the wages come out of the account
    // whatever is in it (CLAUDE.md T22 2.1).
    const start = newGame();
    // Five men at the experienced joiner's 2,600, because the point is a bill the overdraft cannot
    // carry: 200 in the bank and a 10,000 limit leave 10,200 of room, and 13,000 of wages is more
    // than that. Turn 21 would have stopped this bill at the floor [TUNE on the crew: the brief's
    // own 200 and 10,000 are Piotr's].
    for (let index = 1; index <= 5; index += 1) start.workers.push(joiner(`w${index}`, 2600));
    expect(start.finance.overdraftLimit).toBe(-10000);
    expect(monthlyWageBill(start)).toBe(13000);
    // The eve of the pay day, with 200 left in the account.
    const eve = runToDay(start, LAST_WORKING_DAY_OF_MONTH_ONE - 1).state;
    eve.cash = 200;
    const payDay = nextDay(eve);
    const lines = payDay.ledger.filter((entry) => entry.day === LAST_WORKING_DAY_OF_MONTH_ONE);
    const moved = lines.reduce((total, entry) => total + entry.amount, 0);
    // Every pound of the day is on the ledger and out of the account: nothing was refused, nothing
    // was left standing somewhere else, and the account is its true figure.
    expect(payDay.cash).toBeCloseTo(200 + moved, 6);
    expect(lines.some((entry) => entry.unpaid)).toBe(false);
    expect(lines.find((entry) => entry.category === 'wages')?.amount).toBe(-13000);
    // And the figure is under the limit, which is the whole point of 2.1. It is still short of one
    // and a half times the limit, so the bank has not closed the company on it: that is 2.2's
    // business and it takes a deeper hole than this.
    expect(payDay.cash).toBeLessThan(payDay.finance.overdraftLimit);
    expect(payDay.cash).toBeGreaterThan(bankruptcyFloor(payDay));
    expect(payDay.gameOver).toBeNull();
  });

  it('takes a company sitting on the limit under it the same day', () => {
    // The cross check of section 7: a company at the limit that buys nothing and pays its standing
    // costs goes under the limit that day.
    const state = newGame({ difficulty: 'hard' });
    const settled = runToDay(state, 3).state;
    settled.cash = settled.finance.overdraftLimit;
    const after = nextDay(settled);
    expect(after.cash).toBeLessThan(after.finance.overdraftLimit);
    expect(after.ledger.some((entry) => entry.unpaid)).toBe(false);
  });

  it('still refuses a machine at the overdraft limit', () => {
    // The floor stands where it always stood for everything the player buys (CLAUDE.md T22 2.1).
    const state = newGame({ difficulty: 'hard' });
    state.cash = state.finance.overdraftLimit;
    expect(canAfford(state, 1)).toBe(false);
    const refused = buyNow(state, 'tableSaw');
    expect(refused.equipment).toHaveLength(0);
    expect(refused.onOrder).toHaveLength(0);
    expect(refused.cash).toBe(state.finance.overdraftLimit);
  });

  it('puts a refund back in the cash and nowhere else', () => {
    // A refund is cash again: there is nothing left for it to be set against (CLAUDE.md T22 2.1).
    const state = newGame();
    state.cash = state.finance.overdraftLimit - 5000;
    const before = state.cash;
    refund(state, 'material', 'Sheets that never came', 900);
    expect(state.cash).toBe(before + 900);
    const line = state.ledger[state.ledger.length - 1];
    expect(line?.amount).toBe(900);
    expect(line?.unpaid).toBe(false);
  });

  it('stops the clock once the game is over', () => {
    const run = runToDay(newGame({ difficulty: 'hard' }), 100);
    expect(run.state.gameOver).not.toBeNull();
    const frozen = tick(run.state, 100);
    expect(frozen.clock).toEqual(run.state.clock);
  });
});

describe('30 days on very easy', () => {
  it('survives with cash to spare and every bill paid', () => {
    const run = runDays(newGame({ difficulty: 'veryEasy' }), 30);
    expect(run.state.clock.day).toBe(31);
    expect(run.state.gameOver).toBeNull();
    expect(run.state.cash).toBeGreaterThan(0);
    expect(run.state.ledger.some((entry) => entry.unpaid)).toBe(false);
  });

  it('does not silently lose money: the ledger explains the cash', () => {
    const start = newGame({ difficulty: 'veryEasy' });
    const run = runDays(start, 10);
    const moved = run.state.ledger
      .filter((entry) => !entry.unpaid)
      .reduce((total, entry) => total + entry.amount, 0);
    expect(run.state.cash).toBeCloseTo(50000 + moved, 6);
  });
});

describe('speed and pausing', () => {
  it('keeps the speed the player chose', () => {
    const state = applyAction(newGame(), { type: 'SET_SPEED', speed: 4 });
    expect(state.speed).toBe(4);
    expect(clearEvents(state).speed).toBe(4);
  });
});

describe('the pelletiser', () => {
  it('pays the base and a bonus that rises with the month just gone', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const withSystem = buyNow(buyNow(state, 'dustSystem'), 'pelletiser');
    withSystem.productionMinutesMonth = 5000;
    const nextMonth = runToDay(withSystem, 31).state;
    const pellets = ledgerFor(nextMonth, 'pellets');
    expect(pellets).toBeCloseTo(
      PELLET_INCOME_MONTHLY_BASE + 5 * PELLET_INCOME_PER_1000_PRODUCTION_MINUTES,
      6,
    );
    // The counter starts again for the new month, and no waste is charged with a pelletiser.
    expect(nextMonth.productionMinutesMonth).toBe(0);
    expect(ledgerFor(nextMonth, 'waste')).toBe(0);
  });
});

describe('the Turn 2 balance', () => {
  it('gives Hard a 5000 overdraft and the other two 10000', () => {
    expect(newGame({ difficulty: 'hard' }).finance.overdraftLimit).toBe(-5000);
    expect(newGame().finance.overdraftLimit).toBe(-10000);
    expect(newGame({ difficulty: 'veryEasy' }).finance.overdraftLimit).toBe(-10000);
  });

  it('puts the bank\u0027s line at one and a half times the limit, whatever the difficulty set it to', () => {
    // Turn 13 read the line at twice the overdraft. Piotr dropped a 50,000 job with 7,000 in the
    // bank and the game played on: "you cannot pay your debts, you are bankrupt, and the game
    // should end". So the factor is 1.5 (PIOTR, 18.09; CLAUDE.md T21 2.2). Hard is the brief's
    // "normal": -5,000 of overdraft, so -7,500; very easy and easy have -10,000, so -15,000.
    const hard = newGame({ difficulty: 'hard' });
    expect(bankruptcyFloor(hard)).toBe(-7500);
    expect(bankruptcyFloor(newGame())).toBe(-15000);
  });

});

describe('the books', () => {
  it('fall behind the moment a working day ends without the bookkeeping', () => {
    const day1 = newGame();
    expect(booksBehind(day1)).toBe(false);
    expect(day1.booksUpToDay).toBe(0);
    const day2 = nextDay(day1);
    expect(booksBehind(day2)).toBe(true);
  });

  it('catch every day up at once when somebody writes them up', () => {
    let state = runToDay(newGame(), 4).state;
    expect(booksBehind(state)).toBe(true);
    state = doTask(state, 'bookkeeping');
    expect(booksBehind(state)).toBe(false);
    expect(state.booksUpToDay).toBe(4);
    // The figures the player sees come back to the live ones.
    expect(visibleTotals(state).month).toEqual(state.finance.month);
  });

  it('freezes what the player can see at the last day anybody wrote up', () => {
    let state = doTask(newGame(), 'bookkeeping');
    const booked = visibleTotals(state).month.costs;
    state = runToDay(state, 4).state;
    expect(booksBehind(state)).toBe(true);
    expect(visibleTotals(state).month.costs).toBe(booked);
    expect(state.finance.month.costs).toBeGreaterThan(booked);
  });

  it('charges 100 a month for late accounts, and more the longer it runs', () => {
    const run = runToDay(newGame(), 62);
    const charges = run.state.ledger.filter((entry) => entry.category === 'accounts');
    expect(charges.map((entry) => entry.amount)).toEqual([
      -LATE_ACCOUNTS_CHARGE,
      -LATE_ACCOUNTS_CHARGE * 2,
    ]);
    expect(run.state.lateAccountsMonths).toBe(2);
    expect(eventsOfKind(run.events, 'lateAccounts')).toHaveLength(2);
  });

  it('charges nothing on the 1st when the books are up to date', () => {
    let state = newGame();
    let guard = 0;
    while (state.clock.day < 32 && guard < 60) {
      guard += 1;
      state = clearEvents(state);
      if (state.tasks.some((task) => task.kind === 'bookkeeping' && !task.done)) {
        state = doTask(state, 'bookkeeping');
      }
      state = nextDay(state);
    }
    expect(state.clock.day).toBeGreaterThanOrEqual(31);
    expect(state.ledger.filter((entry) => entry.category === 'accounts')).toHaveLength(0);
    expect(state.lateAccountsMonths).toBe(0);
  });
});

describe('the month report', () => {
  it('reads a played month off the ledger: the lines sum to the cash delta', () => {
    const state = runToDay(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 32).state;
    const report = monthReport(state, 1);
    const net = report.lines.reduce((total, line) => total + line.net, 0);
    expect(net).toBeCloseTo(report.net, 6);
    expect(report.cashClose - report.cashOpen).toBeCloseTo(report.net, 2);
    // The report carries no figure beside the net for bills that went unpaid, because no bill goes
    // unpaid (CLAUDE.md T22 2.1, 2.4).
    expect(report).not.toHaveProperty('unpaid');
    // Every line carries its category's lines and nothing else: the rent line is the rent, the
    // rates and the deposit, to the penny.
    const rent = state.ledger
      .filter((entry) => monthOfDay(entry.day) === 1 && !entry.unpaid)
      .filter((entry) => ['rent', 'rates', 'unitDeposit'].includes(entry.category))
      .reduce((total, entry) => total - entry.amount, 0);
    expect(report.lines.find((line) => line.id === 'rentAndRates')?.costs).toBeCloseTo(rent, 2);
  });

  it('adds up a month that went under the overdraft limit: every bill is on a line', () => {
    // Turn 21 kept the bills a company could not pay off the lines and counted them apart. From
    // Turn 22 they are paid out of the account, so they are on the lines like every other pound and
    // the month still adds up to the cash it moved (CLAUDE.md T22 2.1, 2.4).
    const state = newGame({ difficulty: 'hard' });
    // Down to the overdraft floor through the ledger, the way every pound moves (T13 10.2).
    charge(state, 'equipment', 'A machine that took the lot', -(state.cash - state.finance.overdraftLimit));
    expect(state.cash).toBe(state.finance.overdraftLimit);
    const played = runToDay(state, 20).state;
    expect(played.cash).toBeLessThan(played.finance.overdraftLimit);
    const report = monthReport(played, 1);
    expect(report.cashClose - report.cashOpen).toBeCloseTo(report.net, 2);
    expect(played.ledger.some((entry) => entry.unpaid)).toBe(false);
  });
});

describe('charge with merge', () => {
  it('adds to the line of the day with the same category and words instead of writing another', () => {
    const state = newGame();
    const before = state.cash;
    const incomeBefore = state.finance.day.income;
    const costsBefore = state.finance.day.costs;
    expect(charge(state, 'contract', 'Packs: pieces', 38, { merge: true })).toBe(true);
    expect(charge(state, 'contract', 'Packs: pieces', 38, { merge: true })).toBe(true);
    expect(charge(state, 'contract', 'Packs: material', -30, { merge: true })).toBe(true);
    expect(charge(state, 'contract', 'Packs: material', -30, { merge: true })).toBe(true);
    const lines = state.ledger.filter((entry) => entry.category === 'contract');
    expect(lines.map((entry) => [entry.label, entry.amount])).toEqual([
      ['Packs: pieces', 76],
      ['Packs: material', -60],
    ]);
    expect(state.cash).toBe(before + 16);
    // The balance on a merged line is the bank after the last piece, and the totals count both.
    expect(lines[1]?.balance).toBe(state.cash);
    expect(state.finance.day.byCategory.contract).toBe(16);
    expect(state.finance.day.income - incomeBefore).toBe(76);
    expect(state.finance.day.costs - costsBefore).toBe(60);
  });

  it('starts a fresh line on a new day, and merges a cost paid through the limit', () => {
    const state = newGame();
    charge(state, 'contract', 'Packs: pieces', 38, { merge: true });
    state.clock.day += 1;
    charge(state, 'contract', 'Packs: pieces', 38, { merge: true });
    expect(state.ledger.filter((entry) => entry.category === 'contract')).toHaveLength(2);
    // A contract's material at the floor: from Turn 22 it is paid out of the account like any
    // other cost the player did not choose, so it merges into the day's line as it always did and
    // the account goes under the limit for it (CLAUDE.md T22 2.1).
    state.cash = state.finance.overdraftLimit;
    charge(state, 'contract', 'Packs: material', -30, { merge: true, unavoidable: true });
    charge(state, 'contract', 'Packs: material', -30, { merge: true, unavoidable: true });
    const material = state.ledger.filter((entry) => entry.label === 'Packs: material');
    expect(material).toHaveLength(1);
    expect(material[0]?.amount).toBe(-60);
    expect(material[0]?.unpaid).toBe(false);
    expect(state.cash).toBe(state.finance.overdraftLimit - 60);
  });
});
