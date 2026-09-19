// The warning strip's list: one engine function, the problems the game sees, the most urgent
// first, and nothing at all when nothing is wrong (CLAUDE.md T13 3.22). Turn 18 adds the two money
// lines, which read the ledger and the closed days and change neither, and the first steps line,
// which walks a new player in over the first three days (CLAUDE.md T18 2.6, 2.7).

import { describe, expect, it } from 'vitest';
import {
  FIRST_STEPS_LAST_DAY,
  NO_INSURANCE_REASON,
  OVERDRAFT_RATE_YEARLY,
  DAYS_PER_YEAR,
  PAID_HOURS_PER_WORKING_DAY,
  RATE_WEEK_DAYS,
  SPEND_WARNING_FROM_CLOSED_DAYS,
  WORKER_RATES,
} from '../../src/engine/constants';
import { bagStore, crewFull, crewLimit, daySummaryOf, workPlan } from '../../src/engine/index';
import type { DaySummary, GameState, LedgerCategory, Worker } from '../../src/engine/index';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillBags,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

/** A hall with the day 1 kit and an empty board: nothing is wrong with it. The clock is past the
 *  first steps line's last day, so the line that walks a new player in is behind this workshop and
 *  a quiet hall is quiet (CLAUDE.md T18 2.7). */
function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  state.clock.day = FIRST_STEPS_LAST_DAY + 1;
  return state;
}

const BLANK: DaySummary = daySummaryOf(newGame());

/** A closed day with a labour figure and the hours it paid for. */
function closed(day: number, labour: number): DaySummary {
  return { ...BLANK, day, labourValue: labour, paidHours: PAID_HOURS_PER_WORKING_DAY };
}

/** Puts a charge on the ledger of a given day, the way the engine's own `charge` does: money out
 *  is negative. */
function spend(state: GameState, day: number, category: LedgerCategory, amount: number): void {
  state.ledger.push({
    id: `led-${state.ledger.length}`,
    day,
    minute: 0,
    category,
    label: category,
    amount: -amount,
    balance: state.cash,
    unpaid: false,
  });
}

/** A workshop with `SPEND_WARNING_FROM_CLOSED_DAYS` days behind it, each earning `labour`, and
 *  `wagesPerDay` of wages on the ledger of each of the five the window reads. */
function tradedWeek(labour: number, wagesPerDay: number): GameState {
  const state = quietHall();
  const days: DaySummary[] = [];
  for (let day = 1; day <= SPEND_WARNING_FROM_CLOSED_DAYS; day += 1) days.push(closed(day, labour));
  state.days = days;
  state.clock.day = SPEND_WARNING_FROM_CLOSED_DAYS + 1;
  for (const day of days.slice(days.length - RATE_WEEK_DAYS)) {
    spend(state, day.day, 'wages', wagesPerDay);
  }
  return state;
}

function joiner(index: number): Worker {
  return {
    id: `staff-${index}`,
    name: `Joiner ${index}`,
    role: 'joiner',
    tier: 'novice',
    rate: WORKER_RATES.novice,
    monthlyWage: 1950,
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
    anchorX: 4 + index * 2,
    anchorY: 6,
  };
}

function withBagsFull(state: GameState): GameState {
  fillBags(state);
  expect(bagStore(state).full).toBe(true);
  return state;
}

function withStartedJobNobodyOn(state: GameState): GameState {
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
  const next = acceptNow(state, enquiry.id);
  const job = firstJob(next);
  job.stage = 'inProduction';
  job.assignees = [];
  return next;
}

function withDeadlineAtRisk(state: GameState): GameState {
  // A big job due tomorrow: the last day it could have been started has gone.
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 1, name: 'Boardroom table' });
  const next = acceptNow(state, enquiry.id);
  const row = workPlan(next).rows.find((entry) => entry.name === 'Boardroom table');
  expect(row?.late || row?.overdue).toBe(true);
  return next;
}

function withUninsuredCommercial(state: GameState): GameState {
  placeEnquiry(state, {
    name: 'Shop fit out',
    kind: 'commercial',
    unreachable: true,
    blockReason: NO_INSURANCE_REASON,
  });
  return state;
}

function withCrewAtTheLimit(state: GameState): GameState {
  const limit = crewLimit(state);
  expect(limit).toBeGreaterThan(0);
  for (let index = 1; index <= limit; index += 1) state.workers.push(joiner(index));
  expect(crewFull(state, 'joiner')).toBe(true);
  return state;
}

describe('the list', () => {
  it('is empty when nothing is wrong', () => {
    expect(warnings(quietHall())).toEqual([]);
  });

  it('says the bags are full', () => {
    const found = warnings(withBagsFull(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['bagsFull']);
    expect(found[0]?.text).toContain('bags are full');
  });

  it('names a started job nobody is on', () => {
    const found = warnings(withStartedJobNobodyOn(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['nobodyAssigned']);
    expect(found[0]?.text).toBe('Garage shelves is started and nobody is on it');
  });

  it('names a job whose deadline is at risk, off the work plan', () => {
    const found = warnings(withDeadlineAtRisk(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['deadlineAtRisk']);
    expect(found[0]?.text).toContain('Boardroom table');
    expect(found[0]?.text).toContain('deadline');
  });

  it('says nothing about a deadline that is comfortable', () => {
    const state = quietHall();
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 60 });
    expect(warnings(acceptNow(state, enquiry.id))).toEqual([]);
  });

  it('names a commercial enquiry greyed for want of insurance', () => {
    const found = warnings(withUninsuredCommercial(quietHall()));
    expect(found.map((warning) => warning.key)).toEqual(['noInsurance']);
    expect(found[0]?.text).toContain('Shop fit out');
    expect(found[0]?.text).toContain('no insurance');
  });

  it('says the crew is at the floor limit, in the crew line', () => {
    const state = withCrewAtTheLimit(quietHall());
    const found = warnings(state);
    expect(found.map((warning) => warning.key)).toEqual(['crewFull']);
    expect(found[0]?.text).toMatch(/^Crew \d+ \/ \d+, floor limited: no floor for another person$/);
  });
});

describe('the money speaks before the month end (CLAUDE.md T18 2.6)', () => {
  it('says what the overdraft costs a day while the account is under zero, and clears when it is not', () => {
    const state = quietHall();
    state.cash = -10000;
    const found = warnings(state);
    expect(found.map((warning) => warning.key)).toEqual(['belowZero']);
    // The engine's own figure: the balance at the yearly rate over a year of days.
    const aDay = (10000 * OVERDRAFT_RATE_YEARLY) / DAYS_PER_YEAR;
    expect(found[0]?.text).toBe(
      `Account below zero: the overdraft costs \u00a3${Math.round(aDay).toLocaleString('en-GB')} a day`,
    );
    // It follows the balance every day, and goes the moment the account is back.
    state.cash = -20000;
    expect(warnings(state)[0]?.text).toContain(
      `\u00a3${Math.round((20000 * OVERDRAFT_RATE_YEARLY) / DAYS_PER_YEAR).toLocaleString('en-GB')}`,
    );
    state.cash = 0;
    expect(warnings(state)).toEqual([]);
    state.cash = 1;
    expect(warnings(state)).toEqual([]);
  });

  it('counts the pence while the charge is under a pound', () => {
    const state = quietHall();
    state.cash = -500;
    const aDay = (500 * OVERDRAFT_RATE_YEARLY) / DAYS_PER_YEAR;
    expect(aDay).toBeLessThan(1);
    expect(warnings(state)[0]?.text).toBe(
      `Account below zero: the overdraft costs \u00a3${aDay.toFixed(2)} a day`,
    );
  });

  it('says a week of wages with no work done for them', () => {
    const state = tradedWeek(0, 500);
    const found = warnings(state);
    expect(found.map((warning) => warning.key)).toEqual(['spendingOverEarning']);
    expect(found[0]?.text).toBe(
      'You spend more than you earn: \u00a32,500 out, \u00a30 in this week',
    );
  });

  it('says nothing about a week that earns more than it spends', () => {
    expect(warnings(tradedWeek(1000, 500))).toEqual([]);
    // And nothing at the line either: it wants more out than in, not as much.
    expect(warnings(tradedWeek(500, 500))).toEqual([]);
  });

  it('is never said before the sixth day the game has closed', () => {
    const state = tradedWeek(0, 500);
    state.days = state.days.slice(0, SPEND_WARNING_FROM_CLOSED_DAYS - 1);
    expect(warnings(state)).toEqual([]);
    expect(state.days).toHaveLength(SPEND_WARNING_FROM_CLOSED_DAYS - 1);
  });

  it('counts the wages, the draw and the fixed charges, and not the material or the kit', () => {
    const state = tradedWeek(1000, 0);
    const window = state.days.slice(state.days.length - RATE_WEEK_DAYS);
    const first = window[0]?.day ?? 1;
    // Five thousand of sheets and a saw: bought against work, so they are not the line's business.
    spend(state, first, 'material', 5000);
    spend(state, first, 'equipment', 7000);
    expect(warnings(state)).toEqual([]);
    // The draw and the fixed charges are.
    spend(state, first, 'ownerDraw', 3000);
    spend(state, first, 'rent', 2000);
    spend(state, first, 'overdraftInterest', 500);
    expect(warnings(state).map((warning) => warning.key)).toEqual(['spendingOverEarning']);
    expect(warnings(state)[0]?.text).toContain('\u00a35,500 out');
    expect(warnings(state)[0]?.text).toContain('\u00a35,000 in');
  });

  it('reads the same five closed days the Company board reads, and no older one', () => {
    const state = tradedWeek(1000, 0);
    const oldest = state.days[0]?.day ?? 1;
    // The sixth day back is outside the window: a fortune spent on it says nothing today.
    spend(state, oldest, 'wages', 99999);
    expect(warnings(state)).toEqual([]);
  });
});

describe('the first days say what to do (CLAUDE.md T18 2.7)', () => {
  /** Day 1: a new company, nothing bought and nothing delivered. */
  function dayOne(): GameState {
    return newGame({ difficulty: 'veryEasy' });
  }

  it('walks a new player through the three steps, in order', () => {
    const state = dayOne();
    state.enquiries = [];
    expect(warnings(state).map((warning) => warning.key)).toEqual(['firstSteps']);
    expect(warnings(state)[0]?.text).toBe('Set up the hall');
    // The hall set up: the kit is in, put down, and setup mode left behind. The line reads the
    // flag the engine writes then, not the floor (CLAUDE.md T19 2.13).
    const fitted = act(fillRack(buyStartingKit(dayOne())), { type: 'END_SETUP', speed: 1 });
    fitted.enquiries = [];
    expect(warnings(fitted)[0]?.text).toBe('Accept an enquiry on the board');
    // A job on the books: the last step is to start it.
    const enquiry = placeEnquiry(fitted, { price: 4000, deadlineDays: 90 });
    const taken = acceptNow(fitted, enquiry.id);
    taken.enquiries = [];
    expect(warnings(taken)[0]?.text).toBe('Press Start production on the work plan');
    // Started: the line is gone for good.
    firstJob(taken).stage = 'inProduction';
    firstJob(taken).assignees = ['owner'];
    expect(warnings(taken)).toEqual([]);
  });

  it('reads the flag, not the floor: a hall full of kit still asks to be set up until it is left', () => {
    // Turn 18 looked for a workbench, which is on the floor the moment the day 1 kit is delivered,
    // before the player has put a thing down (CLAUDE.md T19 2.13).
    const delivered = fillRack(buyStartingKit(dayOne()));
    delivered.enquiries = [];
    expect(delivered.hallSetUp).toBe(false);
    expect(delivered.equipment.some((item) => item.specId === 'workbench')).toBe(true);
    expect(warnings(delivered)[0]?.text).toBe('Set up the hall');
    const left = act(delivered, { type: 'END_SETUP', speed: 1 });
    expect(left.hallSetUp).toBe(true);
    expect(warnings(left)[0]?.text).toBe('Accept an enquiry on the board');
    // An empty hall left behind is no hall at all: the flag stays down and the line stays up.
    const empty = act(dayOne(), { type: 'END_SETUP', speed: 1 });
    empty.enquiries = [];
    expect(empty.hallSetUp).toBe(false);
    expect(warnings(empty)[0]?.text).toBe('Set up the hall');
  });

  it('is gone from the day after the third, whatever the player has done', () => {
    const state = dayOne();
    state.enquiries = [];
    expect(warnings(state)[0]?.key).toBe('firstSteps');
    state.clock.day = FIRST_STEPS_LAST_DAY;
    expect(warnings(state)[0]?.key).toBe('firstSteps');
    state.clock.day = FIRST_STEPS_LAST_DAY + 1;
    expect(warnings(state)).toEqual([]);
  });

  it('goes off with the tips, because it is a tip', () => {
    const state = dayOne();
    state.enquiries = [];
    expect(warnings(state)[0]?.key).toBe('firstSteps');
    state.settings.tips = false;
    expect(warnings(state)).toEqual([]);
  });

  it('gives way to anything the game actually has to warn about', () => {
    const state = fillRack(buyStartingKit(dayOne()));
    state.enquiries = [];
    expect(warnings(state)[0]?.key).toBe('firstSteps');
    fillBags(state);
    expect(warnings(state)[0]?.key).toBe('bagsFull');
    // And it is still under it, last of the list.
    expect(warnings(state)[warnings(state).length - 1]?.key).toBe('firstSteps');
  });
});

describe('the line that says the bank is about to close you', () => {
  /** A company standing where Piotr's was on 15 May: in the overdraft with arrears beside it. */
  function inDebt(cash: number, arrears: number): GameState {
    const state = quietHall();
    state.cash = cash;
    state.finance.arrearsAmount = arrears;
    state.finance.firstArrearsDay = 1;
    state.finance.arrearsMonths = 1;
    return state;
  }

  it('says the four things the drawing says, in its words', () => {
    const found = warnings(inDebt(-7259, 25740));
    expect(found[0]?.key).toBe('pastTheLimit');
    expect(found[0]?.text).toBe(
      'Account below zero and \u00a325,740 in arrears: together -\u00a332,999, past the ' +
        '-\u00a315,000 the bank allows. Pay the arrears or the bank closes you.',
    );
  });

  it('says nothing while the net position is still inside what the bank allows', () => {
    // 5,000 owed on a 9,000 overdraft is -14,000 against the -15,000 the bank allows.
    const found = warnings(inDebt(-9000, 5000)).map((warning) => warning.key);
    expect(found).not.toContain('pastTheLimit');
    // The overdraft line is still said, because the account is still under zero.
    expect(found).toContain('belowZero');
  });

  it('says nothing about a company that owes nothing, however deep in the overdraft it is', () => {
    const state = quietHall();
    state.cash = -9999;
    expect(warnings(state).map((warning) => warning.key)).not.toContain('pastTheLimit');
  });

  it('drops the account clause for a company that owes but has been paid since', () => {
    // A big bill missed and a big client paid: the arrears stand, the account does not.
    const found = warnings(inDebt(2000, 20000));
    expect(found[0]?.key).toBe('pastTheLimit');
    expect(found[0]?.text).toBe(
      '\u00a320,000 in arrears: together -\u00a318,000, past the -\u00a315,000 the bank allows. ' +
        'Pay the arrears or the bank closes you.',
    );
  });

  it('is gone the day the arrears are cleared', () => {
    const state = inDebt(-7259, 25740);
    expect(warnings(state)[0]?.key).toBe('pastTheLimit');
    state.finance.arrearsAmount = 0;
    state.finance.arrearsMonths = 0;
    state.finance.firstArrearsDay = null;
    expect(warnings(state).map((warning) => warning.key)).not.toContain('pastTheLimit');
  });
});

describe('the order of urgency', () => {
  it('is bags, past the limit, nobody assigned, overdue, no insurance, below zero, spending over earning, crew full, first steps', () => {
    expect(WARNING_ORDER).toEqual([
      'bagsFull',
      // Turn 21: above everything but the bags. The bags stop every machine in the hall this
      // minute; this stops the company for good at the next look at the money (CLAUDE.md T21 2.1).
      'pastTheLimit',
      'nobodyAssigned',
      'deadlineAtRisk',
      'noInsurance',
      'belowZero',
      'spendingOverEarning',
      'crewFull',
      'firstSteps',
    ]);
  });

  it('puts every problem in that order when the hall has them all at once', () => {
    // Eight of the nine at once. The first steps line cannot be one of them: it is only said
    // while production has never started, and "a started job nobody is on" is production started.
    let state = tradedWeek(0, 500);
    state = withStartedJobNobodyOn(state);
    state = withDeadlineAtRisk(state);
    state = withUninsuredCommercial(state);
    state = withCrewAtTheLimit(state);
    state = withBagsFull(state);
    // The deposits of those two jobs put the account back over: the overdraft is the last thing
    // set, so the line is about the balance the strip would actually read.
    state.cash = -10000;
    // And 6,000 it never paid, which puts the net position at -16,000 against the -15,000 the bank
    // allows: the Turn 21 line (CLAUDE.md T21 2.1).
    state.finance.arrearsAmount = 6000;
    state.finance.firstArrearsDay = 1;
    state.finance.arrearsMonths = 1;
    expect(warnings(state).map((warning) => warning.key)).toEqual(
      WARNING_ORDER.filter((key) => key !== 'firstSteps'),
    );
  });

  it('puts the first steps line under everything the game actually has to warn about', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    state.clock.day = FIRST_STEPS_LAST_DAY;
    withUninsuredCommercial(state);
    withBagsFull(state);
    state.cash = -10000;
    expect(warnings(state).map((warning) => warning.key)).toEqual([
      'bagsFull',
      'noInsurance',
      'belowZero',
      'firstSteps',
    ]);
  });

  it('shows the next one down once the most urgent is dealt with', () => {
    let state = quietHall();
    state = withStartedJobNobodyOn(state);
    state = withUninsuredCommercial(state);
    state = withBagsFull(state);
    expect(warnings(state)[0]?.key).toBe('bagsFull');
    state.bagFillM3 = 0;
    expect(warnings(state)[0]?.key).toBe('nobodyAssigned');
    firstJob(state).assignees = ['owner'];
    expect(warnings(state)[0]?.key).toBe('noInsurance');
  });
});
