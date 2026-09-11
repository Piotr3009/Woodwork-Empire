import { describe, expect, it } from 'vitest';
import {
  BAILIFF_SEIZURE_FRACTION,
  DAYS_PER_MONTH,
  DUST_WASTE_MONTHLY,
  LIVING_COST_PER_WORKING_DAY,
  OVERDRAFT_LIMIT,
  OVERDRAFT_MONTHLY_INTEREST,
  POWER_BASE_DAILY,
  POWER_PER_MACHINE_DAILY,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  UNIT_DEPOSIT,
} from '../../src/engine/constants';
import {
  canAfford,
  dailyPower,
  dailyRates,
  dailyRent,
  monthlySalaryBill,
  nextDueDays,
  pay,
  receive,
  runBailiff,
  weeklyWageBill,
} from '../../src/engine/economy';
import { applyAction, tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import { act, clearEvents, eventsOfKind, newGame, runDays, runToDay } from '../helpers';

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
    absentDaysRemaining: 0,
    anchorX: 0,
    anchorY: 4,
  };
}

describe('daily costs', () => {
  it('charges the deposit once, on day 1', () => {
    const day1 = newGame();
    expect(ledgerFor(day1, 'unitDeposit')).toBe(-UNIT_DEPOSIT);
    const later = runToDay(day1, 4).state;
    expect(ledgerFor(later, 'unitDeposit')).toBe(-UNIT_DEPOSIT);
  });

  it('charges rent and rates as a thirtieth of the month, every calendar day', () => {
    const state = newGame();
    expect(dailyRent(state)).toBeCloseTo(1200 / DAYS_PER_MONTH, 8);
    expect(dailyRates(state)).toBeCloseTo(450 / DAYS_PER_MONTH, 8);
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
    const withSaw = act(empty, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    expect(dailyPower(withSaw)).toBe(POWER_BASE_DAILY + POWER_PER_MACHINE_DAILY);
    const withExtractor = act(withSaw, { type: 'BUY_EQUIPMENT', specId: 'extractor' });
    expect(dailyPower(withExtractor)).toBe(POWER_BASE_DAILY + 2 * POWER_PER_MACHINE_DAILY);
    // A drill is not a machine that draws power.
    const withDrill = act(withExtractor, { type: 'BUY_EQUIPMENT', specId: 'drill' });
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
    const subscription = act(
      act(newGame(), { type: 'BUY_EQUIPMENT', specId: 'desk' }),
      { type: 'BUY_EQUIPMENT', specId: 'laptop' },
    );
    const subscribed = act(subscription, { type: 'BUY_SOFTWARE', mode: 'subscription' });
    expect(subscribed.software.mode).toBe('subscription');
    const nextMonth = runToDay(subscribed, 31).state;
    expect(ledgerFor(nextMonth, 'software')).toBe(-SOFTWARE_SUBSCRIPTION_MONTHLY);
    const oneOff = act(subscription, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
    expect(oneOff.software.jobsRemaining).toBe(30);
    const oneOffNextMonth = runToDay(oneOff, 31).state;
    expect(ledgerFor(oneOffNextMonth, 'software')).toBe(-900);
  });

  it('charges dust waste collection only with the dust system', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const withSystem = act(state, { type: 'BUY_EQUIPMENT', specId: 'dustSystem' });
    expect(withSystem.equipment).toHaveLength(1);
    const nextMonth = runToDay(withSystem, 31).state;
    expect(ledgerFor(nextMonth, 'waste')).toBe(-DUST_WASTE_MONTHLY);
    const plain = runToDay(state, 31).state;
    expect(ledgerFor(plain, 'waste')).toBe(0);
  });

  it('charges overdraft interest on the 1st when cash is negative', () => {
    const state = newGame({ difficulty: 'hard' });
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
    const tooDear = act(state, { type: 'BUY_EQUIPMENT', specId: 'cnc' });
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
    const run = runToDay(start, 45);
    expect(run.state.finance.arrearsAmount).toBeGreaterThan(0);
    expect(run.state.finance.arrearsMonths).toBe(1);
    expect(run.state.cash).toBeGreaterThan(OVERDRAFT_LIMIT - 300);
    expect(eventsOfKind(run.events, 'arrearsWarning')).toHaveLength(1);
    const unpaid = run.state.ledger.filter((entry) => entry.unpaid);
    expect(unpaid.length).toBeGreaterThan(0);
  });

  it('escalates to a final warning at two months', () => {
    const kitted = act(newGame({ difficulty: 'hard' }), {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
    });
    const run = runToDay(kitted, 32);
    expect(eventsOfKind(run.events, 'arrearsFinalWarning')).toHaveLength(1);
    expect(run.state.finance.arrearsMonths).toBe(2);
  });

  it('sends the bailiff for the dearest machine at three months, within 90 days', () => {
    const kitted = act(newGame({ difficulty: 'hard' }), {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
    });
    const run = runToDay(kitted, 61);
    const bailiff = eventsOfKind(run.events, 'bailiff');
    expect(bailiff).toHaveLength(1);
    expect(bailiff[0]?.data.specId).toBe('tableSaw');
    expect(bailiff[0]?.data.credit).toBe(Math.round(1800 * BAILIFF_SEIZURE_FRACTION));
    expect(run.state.equipment).toHaveLength(0);
    expect(run.state.finance.arrearsMonths).toBe(3);
    const seizure = run.state.ledger.find((entry) => entry.category === 'seizure');
    expect(seizure?.amount).toBe(1800 * BAILIFF_SEIZURE_FRACTION);
  });

  it('takes the dearest machine first', () => {
    const state = newGame();
    const withKit = act(act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' }), {
      type: 'BUY_EQUIPMENT',
      specId: 'thicknesser',
    });
    const copy = { ...withKit, equipment: withKit.equipment.map((item) => ({ ...item })) };
    copy.finance = { ...copy.finance, arrearsAmount: 5000, arrearsMonths: 3, firstArrearsDay: 1 };
    runBailiff(copy);
    expect(copy.equipment.map((item) => item.specId)).toEqual(['tableSaw']);
    expect(copy.finance.arrearsAmount).toBe(5000 - 2500 * BAILIFF_SEIZURE_FRACTION);
  });

  it('clears the arrears when the seizure covers them', () => {
    const withKit = act(newGame(), { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    withKit.finance.arrearsAmount = 500;
    withKit.finance.arrearsMonths = 3;
    withKit.finance.firstArrearsDay = 1;
    runBailiff(withKit);
    expect(withKit.finance.arrearsAmount).toBe(0);
    expect(withKit.finance.arrearsMonths).toBe(0);
    expect(withKit.finance.firstArrearsDay).toBeNull();
  });

  it('goes bankrupt at three months with nothing left to seize', () => {
    const run = runToDay(newGame({ difficulty: 'hard' }), 95);
    expect(run.state.gameOver).not.toBeNull();
    expect(run.state.gameOver?.reason).toContain('arrears');
    expect(run.state.gameOver?.day).toBe(91);
  });

  it('stops the clock once the game is over', () => {
    const run = runToDay(newGame({ difficulty: 'hard' }), 95);
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
