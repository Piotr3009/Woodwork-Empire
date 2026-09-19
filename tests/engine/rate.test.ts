// The workshop rate: what the workshop earns for every hour it pays for (PIOTR, 17.09;
// CLAUDE.md T17 2.26). The four readings the brief asks for are here: the owner alone at full
// work for a week reads 40, two days idle reads 24, a poor joiner half idle pulls it under 40,
// and an express job pushes it over.

import { describe, expect, it } from 'vitest';
import {
  OWNER_LABOUR_VALUE_PER_DAY,
  OWNER_RATE_PER_HOUR,
  PAID_HOURS_PER_WORKING_DAY,
  RATE_WEEK_DAYS,
  WORKER_RATES,
} from '../../src/engine/constants';
import { daySummaryOf, tick } from '../../src/engine/index';
import {
  labourEarnedOn,
  lastWeekRate,
  monthRate,
  paidHoursToday,
  weekRate,
  workshopRateOf,
} from '../../src/engine/rate';
import type { DaySummary, GameState } from '../../src/engine/types';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  nextDay,
  placeEnquiry,
  withExtraction,
} from '../helpers';

/** A closed day as the evening writes one, with the figures the rate reads set and the rest of
 *  the record the engine's own blank. */
const BLANK: DaySummary = daySummaryOf(newGame());

function closed(day: number, labour: number, paidHours: number, extra: Partial<DaySummary> = {}): DaySummary {
  return { ...BLANK, day, labourValue: labour, paidHours, ...extra };
}

/** A game whose closed days are these. */
function withDays(days: DaySummary[]): GameState {
  const state = newGame();
  state.days = days;
  state.clock.day = (days[days.length - 1]?.day ?? 0) + 1;
  return state;
}

/** A working week of the owner on his own: five days, each earning what he earns and paying for
 *  his eight hours. */
function ownerWeek(labourPerDay: number[]): GameState {
  return withDays(labourPerDay.map((labour, index) => closed(index + 1, labour, PAID_HOURS_PER_WORKING_DAY)));
}

/** A hall with the day 1 kit, one job on the bench and the owner standing at it. */
function atTheBench(options: { express?: boolean } = {}): GameState {
  const state = withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60));
  state.enquiries = [];
  // An express job is the same work at a dearer price: the labour comes off the base price and
  // the uplift is pure profit, which is what the rate sees (CLAUDE.md T17 2.23, 2.26).
  const enquiry = placeEnquiry(state, {
    price: options.express === true ? 52000 : 40000,
    basePrice: 40000,
    express: options.express === true,
    deadlineDays: 90,
  });
  const taken = acceptNow(state, enquiry.id, false);
  firstJob(taken).stage = 'ready';
  return act(taken, { type: 'WORK_HERE', jobId: null });
}

describe('the four readings of 2.26', () => {
  it('reads 40 an hour for the owner alone at full work for a week', () => {
    const state = ownerWeek(new Array<number>(RATE_WEEK_DAYS).fill(OWNER_LABOUR_VALUE_PER_DAY));
    const rate = weekRate(state);
    expect(rate.rate).toBe(OWNER_RATE_PER_HOUR);
    expect(rate.rate).toBe(40);
    expect(rate.days).toBe(RATE_WEEK_DAYS);
    expect(rate.paidHours).toBe(RATE_WEEK_DAYS * PAID_HOURS_PER_WORKING_DAY);
    // One man on the books, so a man earns what the workshop earns.
    expect(rate.people).toBe(1);
    expect(rate.perMan).toBe(40);
  });

  it('reads 24 an hour when the shop stands two of the five days', () => {
    // The wages are paid for all five (PIOTR: "if the shop stands two days and the wages are
    // paid, the rate drops by itself").
    const state = ownerWeek([320, 320, 0, 320, 0]);
    expect(weekRate(state).rate).toBe(24);
    expect(weekRate(state).paidHours).toBe(40);
  });

  it('is pulled under 40 by a joiner with no experience who is idle half the day', () => {
    // The owner at his work all day is 320; a joiner with no experience at 0.8 of him is 256 a
    // day, and half of that is 128. Two men are sixteen hours paid for (CLAUDE.md T20 2.5).
    const green = OWNER_LABOUR_VALUE_PER_DAY * WORKER_RATES.novice;
    const days = new Array<number>(RATE_WEEK_DAYS)
      .fill(0)
      .map((_, index) => closed(index + 1, OWNER_LABOUR_VALUE_PER_DAY + green / 2, PAID_HOURS_PER_WORKING_DAY * 2));
    const rate = weekRate(withDays(days));
    expect(rate.rate).toBe(28);
    expect(rate.rate).toBeLessThan(OWNER_RATE_PER_HOUR);
    expect(rate.people).toBe(2);
    expect(rate.perMan).toBe(14);
  });

  it('is pushed over 40 by an express job', () => {
    // The same eight hours, and the client pays the uplift on top of them.
    const days = new Array<number>(RATE_WEEK_DAYS)
      .fill(0)
      .map((_, index) =>
        closed(index + 1, OWNER_LABOUR_VALUE_PER_DAY, PAID_HOURS_PER_WORKING_DAY, { expressUplift: 240 }),
      );
    const rate = weekRate(withDays(days));
    expect(rate.rate).toBe(70);
    expect(rate.rate).toBeGreaterThan(OWNER_RATE_PER_HOUR);
    expect(labourEarnedOn(days[0] as DaySummary)).toBe(560);
  });
});

describe('the hours paid for', () => {
  it('is eight for the owner on his own, and eight more for every man on the books', () => {
    const alone = newGame();
    expect(paidHoursToday(alone)).toBe(PAID_HOURS_PER_WORKING_DAY);
    // Money enough to take him on: the gate refuses a hire the bank cannot cover (T17 2.11). A
    // labourer needs no bench of his own, so a bare hall can take him on.
    alone.cash = 50000;
    const crew = hireNow(alone, 'helper', null);
    const worker = crew.workers[0];
    expect(worker).toBeDefined();
    // He starts the next working day, and nobody pays him before he does.
    expect(paidHoursToday(crew)).toBe(PAID_HOURS_PER_WORKING_DAY);
    if (worker) worker.startDay = crew.clock.day;
    expect(paidHoursToday(crew)).toBe(PAID_HOURS_PER_WORKING_DAY * 2);
    // A man off sick is on the books and is paid: that is the point of the figure.
    if (worker) worker.absentDaysRemaining = 2;
    expect(paidHoursToday(crew)).toBe(PAID_HOURS_PER_WORKING_DAY * 2);
  });

  it('adds the evening the owner actually stayed for, and nobody else’s', () => {
    const state = newGame();
    state.owner.overtimeMinutes = 90;
    expect(paidHoursToday(state)).toBe(9.5);
  });

  it('pays nobody on a day the workshop is shut', () => {
    const state = newGame();
    state.clock.day = 6;
    expect(paidHoursToday(state)).toBe(0);
  });

  it('is written onto the day the evening closes, and the week reads it back', () => {
    const closedDay = nextDay(atTheBench());
    const record = closedDay.days[0];
    expect(record?.day).toBe(1);
    expect(record?.paidHours).toBe(PAID_HOURS_PER_WORKING_DAY);
    expect(record?.labourValue).toBeGreaterThan(0);
    const rate = weekRate(closedDay);
    expect(rate.days).toBe(1);
    expect(rate.rate).toBe(
      Math.round(((record?.labourValue ?? 0) / PAID_HOURS_PER_WORKING_DAY) * 100) / 100,
    );
    // He is one man and he did not work every minute of the eight, so he is under the reference.
    expect(rate.rate).toBeLessThan(OWNER_RATE_PER_HOUR);
  });
});

describe('an express job in the hall', () => {
  it('earns its uplift with the labour that earns it, and reads higher than the same day at the standard price', () => {
    const plain = tick(atTheBench(), 120);
    const express = tick(atTheBench({ express: true }), 120);
    expect(plain.dayStats.expressUplift).toBe(0);
    expect(express.dayStats.labourValue).toBeCloseTo(plain.dayStats.labourValue, 4);
    // 12,000 of uplift on 16,000 of labour: three quarters again on every minute of it.
    expect(express.dayStats.expressUplift).toBeCloseTo(express.dayStats.labourValue * 0.75, 2);
    const rateOf = (state: GameState): number =>
      workshopRateOf([
        closed(1, state.dayStats.labourValue, PAID_HOURS_PER_WORKING_DAY, {
          expressUplift: state.dayStats.expressUplift,
        }),
      ]).rate;
    expect(rateOf(express)).toBeGreaterThan(rateOf(plain));
  });
});

describe('the windows the figure is read over', () => {
  it('takes the last five closed days as the week, and the five before them as last week', () => {
    const days = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12].map((day, index) =>
      closed(day, index < RATE_WEEK_DAYS ? 160 : 320, PAID_HOURS_PER_WORKING_DAY),
    );
    const state = withDays(days);
    expect(weekRate(state).rate).toBe(40);
    expect(lastWeekRate(state).rate).toBe(20);
    expect(lastWeekRate(state).days).toBe(RATE_WEEK_DAYS);
  });

  it('says nothing when no day has closed, and nothing for a week that is not there yet', () => {
    const fresh = newGame();
    expect(weekRate(fresh)).toMatchObject({ rate: 0, days: 0, paidHours: 0 });
    expect(lastWeekRate(withDays([closed(1, 320, 8)]))).toMatchObject({ rate: 0, days: 0 });
  });

  it('leaves out a day from before the hours were counted, which paid nobody', () => {
    // Every day of a v24 save carries paidHours 0 (CLAUDE.md T17 section 4): they are not days
    // this build can read a rate over.
    const state = withDays([closed(1, 500, 0), closed(2, 320, PAID_HOURS_PER_WORKING_DAY)]);
    expect(weekRate(state).days).toBe(1);
    expect(weekRate(state).rate).toBe(40);
  });

  it('reads a whole month for the month end', () => {
    const days = [1, 2, 30, 31, 32].map((day) => closed(day, 320, PAID_HOURS_PER_WORKING_DAY));
    const state = withDays(days);
    expect(monthRate(state, 1).days).toBe(3);
    expect(monthRate(state, 2).days).toBe(2);
    expect(monthRate(state, 1).rate).toBe(40);
    expect(monthRate(state, 3).rate).toBe(0);
  });

  it('counts the owner’s evening in the hours paid but not in the heads on the books', () => {
    const state = withDays([closed(1, 320, 10, { overtimeMinutes: 120 })]);
    const rate = weekRate(state);
    expect(rate.paidHours).toBe(10);
    expect(rate.rate).toBe(32);
    expect(rate.people).toBe(1);
  });
});
