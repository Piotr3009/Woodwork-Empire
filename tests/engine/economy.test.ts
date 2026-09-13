import { describe, expect, it } from 'vitest';
import {
  ARREARS_MONTHLY_INTEREST,
  BAILIFF_SEIZURE_FRACTION,
  LATE_ACCOUNTS_CHARGE,
  DAYS_PER_MONTH,
  DUST_WASTE_MONTHLY,
  LIVING_COST_PER_WORKING_DAY,
  OVERDRAFT_MONTHLY_INTEREST,
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
  arrearsCarryInterest,
  bankruptcyFloor,
  booksBehind,
  canAfford,
  dailyPower,
  dailyRates,
  dailyRent,
  monthlyFixedCosts,
  monthlySalaryBill,
  nextDueDays,
  pay,
  payArrears,
  receive,
  runBailiff,
  visibleTotals,
  weeklyWageBill,
} from '../../src/engine/economy';
import { applyAction, tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import { createTask } from '../../src/engine/tasks';
import {
  act,
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

function joiner(id: string, weeklyWage: number): Worker {
  return {
    id,
    name: id,
    role: 'joiner',
    tier: 'poor',
    rate: 0.6,
    weeklyWage,
    monthlyWage: 0,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
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
    expect(ledgerFor(week, 'living')).toBeCloseTo(-6 * LIVING_COST_PER_WORKING_DAY, 6);
  });

  it('charges power per machine on top of the base', () => {
    const empty = newGame();
    expect(dailyPower(empty)).toBe(POWER_BASE_DAILY);
    const withSaw = buyNow(empty, 'tableSaw');
    expect(dailyPower(withSaw)).toBe(POWER_BASE_DAILY + POWER_PER_MACHINE_DAILY);
    const withExtractor = buyNow(withSaw, 'extractor');
    expect(dailyPower(withExtractor)).toBe(POWER_BASE_DAILY + 2 * POWER_PER_MACHINE_DAILY);
    // A drill is not a machine that draws power.
    const withDrill = buyNow(withExtractor, 'drill');
    expect(dailyPower(withDrill)).toBe(POWER_BASE_DAILY + 2 * POWER_PER_MACHINE_DAILY);
  });
});

describe('weekly and monthly cadences', () => {
  it('pays joiner wages on Friday only', () => {
    const state = newGame();
    state.workers.push(joiner('w1', 480), joiner('w2', 420));
    expect(weeklyWageBill(state)).toBe(900);
    const thursday = runToDay(state, 4);
    expect(ledgerFor(thursday.state, 'wages')).toBe(0);
    const friday = runToDay(state, 5);
    expect(ledgerFor(friday.state, 'wages')).toBe(-900);
    expect(eventsOfKind(friday.events, 'wagesPaid')).toHaveLength(1);
    // One Friday, one payment: the following Monday adds nothing.
    const monday = runToDay(state, 8);
    expect(ledgerFor(monday.state, 'wages')).toBe(-900);
  });

  it('pays office salaries on the 1st of the month', () => {
    const state = newGame();
    state.workers.push({ ...joiner('a1', 0), role: 'officeAdmin', monthlyWage: 1900, rate: 0 });
    expect(monthlySalaryBill(state)).toBe(1900);
    const before = runToDay(state, 30).state;
    expect(ledgerFor(before, 'salaries')).toBe(0);
    const after = runToDay(state, 31).state;
    expect(ledgerFor(after, 'salaries')).toBe(-1900);
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

  it('charges overdraft interest on the 1st when cash is negative', () => {
    const state = newGame();
    // Deep enough in the red for the interest to bite, with room left before the floor.
    state.cash = -2000;
    const nextMonth = runToDay(state, 31);
    const interest = ledgerFor(nextMonth.state, 'interest');
    expect(interest).toBeLessThan(0);
    const balanceOnThe31st =
      nextMonth.state.ledger.find((entry) => entry.category === 'interest')?.balance ?? 0;
    expect(-interest).toBeCloseTo((balanceOnThe31st - interest) * -OVERDRAFT_MONTHLY_INTEREST, 4);
    expect(eventsOfKind(nextMonth.events, 'monthlyBills').length).toBeGreaterThan(0);
  });

  it('names the next wage day and the next monthly bill day', () => {
    const state = newGame();
    expect(nextDueDays(state)).toEqual({ wages: 5, monthly: 31 });
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
    expect(state.ledger.length).toBeLessThanOrEqual(200);
  });
});

describe('arrears, bailiff and bankruptcy', () => {
  it('turns an unpayable periodic cost into arrears and warns once', () => {
    const start = newGame({ difficulty: 'hard' });
    // The 200 m2 hall costs 2400 a month, so Hard runs out of overdraft inside a fortnight: the
    // first miss is on day 11 and month two is not up until day 41.
    const run = runToDay(start, 30);
    expect(run.state.finance.arrearsAmount).toBeGreaterThan(0);
    expect(run.state.finance.firstArrearsDay).toBe(11);
    expect(run.state.finance.arrearsMonths).toBe(1);
    expect(run.state.cash).toBeGreaterThan(run.state.finance.overdraftLimit - 300);
    expect(eventsOfKind(run.events, 'arrearsWarning')).toHaveLength(1);
    const unpaid = run.state.ledger.filter((entry) => entry.unpaid);
    expect(unpaid.length).toBeGreaterThan(0);
  });

  it('counts months of arrears from the day the first bill went unpaid', () => {
    const kitted = buyNow(newGame({ difficulty: 'hard' }), 'tableSaw');
    // With the 5000 overdraft of Hard and 2400 of rent the first miss is on day 3, so month two
    // lands on day 33.
    const first = runToDay(kitted, 4);
    expect(first.state.finance.firstArrearsDay).toBe(3);
    expect(first.state.finance.arrearsMonths).toBe(1);
    // Day 32 is the last look inside month one.
    expect(runToDay(kitted, 32).state.finance.arrearsMonths).toBe(1);
    const run = runToDay(kitted, 33);
    expect(eventsOfKind(run.events, 'arrearsFinalWarning')).toHaveLength(1);
    expect(run.state.finance.arrearsMonths).toBe(2);
  });

  it('sends the bailiff for the cheapest machine at three months, within 90 days', () => {
    const kitted = buyNow(newGame({ difficulty: 'hard' }), 'tableSaw');
    const run = runToDay(kitted, 90);
    const bailiff = eventsOfKind(run.events, 'bailiff');
    expect(bailiff).toHaveLength(1);
    expect(bailiff[0]?.data.specId).toBe('tableSaw');
    expect(bailiff[0]?.data.credit).toBe(Math.round(1800 * BAILIFF_SEIZURE_FRACTION));
    expect(run.state.equipment).toHaveLength(0);
    // The debt outlived the machine, so the ladder starts again from one month.
    expect(run.state.finance.arrearsMonths).toBe(1);
    const seizure = run.state.ledger.find((entry) => entry.category === 'seizure');
    expect(seizure?.amount).toBe(1800 * BAILIFF_SEIZURE_FRACTION);
  });

  it('takes the cheapest machine first, so the company can carry on', () => {
    const state = newGame();
    const withKit = buyNow(buyNow(state, 'tableSaw'), 'thicknesser');
    const copy = { ...withKit, equipment: withKit.equipment.map((item) => ({ ...item })) };
    copy.finance = { ...copy.finance, arrearsAmount: 5000, arrearsMonths: 3, firstArrearsDay: 1 };
    runBailiff(copy);
    expect(copy.equipment.map((item) => item.specId)).toEqual(['thicknesser']);
    expect(copy.finance.arrearsAmount).toBe(5000 - 1800 * BAILIFF_SEIZURE_FRACTION);
  });

  it('takes the seized machine off everybody who was working on it', () => {
    const withKit = buyNow(newGame(), 'tableSaw');
    const saw = withKit.equipment[0];
    const service = createTask(withKit, {
      kind: 'service',
      label: 'Service the table saw',
      minutes: 30,
      equipmentId: saw?.id ?? null,
    });
    withKit.owner.currentTaskId = service.id;
    service.doneBy = 'owner';
    withKit.finance.arrearsAmount = 500;
    withKit.finance.arrearsMonths = 3;
    withKit.finance.firstArrearsDay = 1;
    runBailiff(withKit);
    // There is nothing left to service, so the job of work goes with the machine.
    expect(withKit.tasks.some((task) => task.id === service.id)).toBe(false);
    expect(withKit.owner.currentTaskId).toBeNull();
  });

  it('clears the arrears when the seizure covers them', () => {
    const withKit = buyNow(newGame(), 'tableSaw');
    withKit.finance.arrearsAmount = 500;
    withKit.finance.arrearsMonths = 3;
    withKit.finance.firstArrearsDay = 1;
    runBailiff(withKit);
    expect(withKit.finance.arrearsAmount).toBe(0);
    expect(withKit.finance.arrearsMonths).toBe(0);
    expect(withKit.finance.firstArrearsDay).toBeNull();
  });

  it('goes bankrupt at three months with nothing left to seize, and says so', () => {
    const run = runToDay(newGame({ difficulty: 'hard' }), 100);
    expect(run.state.gameOver).not.toBeNull();
    expect(run.state.gameOver?.reason).toContain('arrears');
    // First miss on day 11 with the 5000 overdraft and the 200 m2 rent, so three months are up
    // on day 71.
    expect(run.state.gameOver?.day).toBe(71);
    expect(eventsOfKind(run.events, 'bankruptcy')).toHaveLength(1);
  });

  it('stops the clock once the game is over', () => {
    const run = runToDay(newGame({ difficulty: 'hard' }), 100);
    const frozen = tick(run.state, 100);
    expect(frozen.clock).toEqual(run.state.clock);
  });
});

describe('30 days on very easy', () => {
  it('survives with cash to spare and no arrears', () => {
    const run = runDays(newGame({ difficulty: 'veryEasy' }), 30);
    expect(run.state.clock.day).toBe(31);
    expect(run.state.gameOver).toBeNull();
    expect(run.state.cash).toBeGreaterThan(0);
    expect(run.state.finance.arrearsAmount).toBe(0);
    expect(run.state.finance.arrearsMonths).toBe(0);
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

  it('declares bankruptcy at twice the limit, whatever the difficulty set it to', () => {
    const hard = newGame({ difficulty: 'hard' });
    expect(bankruptcyFloor(hard)).toBe(-10000);
    expect(bankruptcyFloor(newGame())).toBe(-20000);
  });

  it('pays arrears off from cash, all of them or a typed amount', () => {
    const state = newGame();
    state.finance.arrearsAmount = 1000;
    state.finance.arrearsMonths = 2;
    state.finance.firstArrearsDay = 3;
    const cash = state.cash;
    expect(payArrears(state, 400)).toBe(400);
    expect(state.cash).toBeCloseTo(cash - 400, 6);
    expect(state.finance.arrearsAmount).toBe(600);
    // Part paid, so the ladder is still running.
    expect(state.finance.arrearsMonths).toBe(2);
    expect(payArrears(state, null)).toBe(600);
    expect(state.finance.arrearsAmount).toBe(0);
    expect(state.finance.arrearsMonths).toBe(0);
    expect(state.finance.firstArrearsDay).toBeNull();
    const paid = state.ledger.filter((entry) => entry.category === 'arrears');
    expect(paid.map((entry) => entry.amount)).toEqual([-400, -600]);
  });

  it('never pays arrears past the overdraft floor', () => {
    const state = newGame();
    state.cash = state.finance.overdraftLimit + 100;
    state.finance.arrearsAmount = 5000;
    state.finance.firstArrearsDay = 1;
    state.finance.arrearsMonths = 1;
    expect(payArrears(state, null)).toBe(100);
    expect(state.finance.arrearsAmount).toBe(4900);
    expect(state.cash).toBe(state.finance.overdraftLimit);
    expect(payArrears(state, null)).toBe(0);
  });

  it('reaches the player through the PAY_ARREARS action', () => {
    let state = newGame();
    state.finance.arrearsAmount = 300;
    state.finance.firstArrearsDay = 1;
    state.finance.arrearsMonths = 1;
    state = act(state, { type: 'PAY_ARREARS', amount: 100 });
    expect(state.finance.arrearsAmount).toBe(200);
    state = act(state, { type: 'PAY_ARREARS', amount: null });
    expect(state.finance.arrearsAmount).toBe(0);
  });

  it('charges 1% a month on the arrears only while they are large', () => {
    const small = newGame();
    small.finance.arrearsAmount = 100;
    expect(arrearsCarryInterest(small)).toBe(false);
    const large = newGame();
    large.finance.arrearsAmount = monthlyFixedCosts(large) + 1;
    expect(arrearsCarryInterest(large)).toBe(true);

    // A whole month with large arrears on the books adds 1% of them on the 1st.
    const state = newGame();
    state.finance.arrearsAmount = 20000;
    state.finance.arrearsMonths = 1;
    state.finance.firstArrearsDay = 1;
    const run = runToDay(state, 31);
    const interest = run.state.ledger.filter(
      (entry) => entry.category === 'interest' && entry.label === 'Interest on the arrears',
    );
    expect(interest).toHaveLength(1);
    expect(-(interest[0]?.amount ?? 0)).toBeCloseTo(20000 * ARREARS_MONTHLY_INTEREST, 4);
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
