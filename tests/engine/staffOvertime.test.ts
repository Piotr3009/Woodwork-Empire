// The evenings the crew stay for, what Friday pays them for it, and the men who have had enough
// of them (PIOTR, Turn 1 rule; CLAUDE.md T8 3.6).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  OVERTIME_QUIT_CHANCE,
  OVERTIME_TIRED_DAYS,
  STAFF_OVERTIME_MAX_MINUTES,
  STAFF_OVERTIME_RATE,
  WORKER_HOURS_PER_WEEK,
} from '../../src/engine/constants';
import {
  overtimePayFor,
  overtimeWageBill,
  staysForOvertime,
  worksOvertime,
} from '../../src/engine/staff';
import { runOvertimeQuits } from '../../src/engine/game';
import { next } from '../../src/engine/rng';
import { renderHiring } from '../../src/ui/hiring';
import type { GameState, Worker } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  hireNow,
  newGame,
  placeEquipment,
  runClock,
} from '../helpers';

/** A hall with two poor joiners on the books and a bench and a kit each, at five o'clock. */
function atFive(joiners = 2): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
  state.enquiries = [];
  for (let man = 0; man < joiners; man += 1) {
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 6 + man * 2, y: 6 });
    placeEquipment(state, 'locker', { x: 6 + man, y: 9 });
    placeEquipment(state, 'canteenSeat', { x: 8 + man, y: 9 });
    placeEquipment(state, 'toolCabinet', { x: 10 + man, y: 9 });
    placeEquipment(state, 'handToolSet', { x: 12 + man, y: 9 });
    state = hireNow(state, 'joiner', 'poor');
  }
  // They start the next working day, so the evening under test is day 2.
  state = clearEvents(runClock(state, 600));
  let guard = 0;
  while (state.clock.day < 2 && guard < 40) {
    state = clearEvents(act(state, { type: 'END_DAY' }));
    state = clearEvents(runClock(state, 60));
    guard += 1;
  }
  // Five o'clock on day 2, with the owner staying on.
  state.clock.minute = DAY_END_MINUTE;
  state.owner.homeAsked = true;
  return state;
}

function joinersOf(state: GameState): Worker[] {
  return state.workers.filter((worker) => worker.role === 'joiner');
}

/** Works the evening out: 17:00 to 19:00 and no further, because the tools go down at seven
 *  whoever wants what. The day end event is left standing, so the minutes it counted can be read
 *  before the morning wipes them (CLAUDE.md T6 3.4). */
function evening(state: GameState, minutes = STAFF_OVERTIME_MAX_MINUTES): GameState {
  return runClock(state, minutes);
}

/** Answers the day end and puts the clock at five o'clock of the next working day, so a run of
 *  evenings is a run of evenings and not a month of playing. */
function nextEvening(state: GameState): GameState {
  const next = clearEvents(act(state, { type: 'END_DAY' }));
  next.clock.minute = DAY_END_MINUTE;
  next.owner.homeAsked = true;
  return next;
}

describe('who stays past five', () => {
  it('is the men on the floor and never the office', () => {
    expect(worksOvertime('joiner')).toBe(true);
    expect(worksOvertime('helper')).toBe(true);
    expect(worksOvertime('officeAdmin')).toBe(false);
    expect(worksOvertime('purchasingClerk')).toBe(false);
    expect(worksOvertime('salesman')).toBe(false);
  });
});

describe('two joiners on one overtime evening', () => {
  it('add two hours each at one and a half times the hour to the Friday wages', () => {
    let state = atFive();
    expect(joinersOf(state)).toHaveLength(2);
    // Two whole hours of evening, and then the tools go down at seven.
    state = evening(state);
    const crew = joinersOf(state);
    for (const worker of crew) {
      expect(worker.overtimeMinutes, worker.name).toBe(STAFF_OVERTIME_MAX_MINUTES);
      expect(worker.overtimeMinutesWeek, worker.name).toBe(STAFF_OVERTIME_MAX_MINUTES);
    }
    const hourly = (crew[0]?.weeklyWage ?? 0) / WORKER_HOURS_PER_WEEK;
    const each = hourly * 2 * STAFF_OVERTIME_RATE;
    expect(overtimePayFor(crew[0] ?? ({} as Worker))).toBe(each);
    expect(overtimeWageBill(state)).toBe(2 * each);
    // Piotr's own sum: two men, two hours, one and a half times twelve an hour.
    expect(each).toBe(36);
    expect(overtimeWageBill(state)).toBe(72);
  });

  it('stops at two hours: past that he will not stay whoever asks', () => {
    let state = atFive(1);
    state = evening(state);
    const worker = joinersOf(state)[0];
    if (!worker) throw new Error('no joiner');
    expect(worker.overtimeMinutes).toBe(STAFF_OVERTIME_MAX_MINUTES);
    // Two hours in, he is done: the clock never runs past seven anyway, and if it did he would
    // not be there (PIOTR, CLAUDE.md T8 3.6).
    expect(staysForOvertime(state, worker)).toBe(false);
    expect(staysForOvertime(state, { ...worker, overtimeMinutes: 119 })).toBe(true);
  });

  it('pays the office nothing at all', () => {
    let state = atFive(1);
    state.reputation = 20;
    state = hireNow(state, 'officeAdmin', null);
    const admin = state.workers.find((worker) => worker.role === 'officeAdmin');
    if (!admin) throw new Error('no admin');
    admin.startDay = state.clock.day;
    state = evening(state);
    const after = state.workers.find((worker) => worker.id === admin.id);
    expect(after?.overtimeMinutes).toBe(0);
    expect(overtimePayFor(after ?? ({} as Worker))).toBe(0);
    // The men on the floor were paid for the same evening.
    expect(joinersOf(state)[0]?.overtimeMinutes).toBe(STAFF_OVERTIME_MAX_MINUTES);
  });

  it('keeps them all at home on an evening the owner does not stay for', () => {
    let state = atFive(1);
    state.owner.wentHome = true;
    state = runClock(state, 60);
    expect(joinersOf(state)[0]?.overtimeMinutes).toBe(0);
  });

  it('puts the whole of it on Friday as its own line', () => {
    let state = atFive(1);
    state = evening(state);
    const owed = overtimeWageBill(state);
    expect(owed).toBeGreaterThan(0);
    // On to Friday, which is day 5.
    let guard = 0;
    while (state.clock.day < 5 && guard < 60) {
      state = clearEvents(act(state, { type: 'END_DAY' }));
      state = clearEvents(runClock(state, 60));
      guard += 1;
    }
    expect(state.clock.day).toBe(5);
    const line = state.ledger.find((entry) => entry.label === 'Overtime');
    expect(line?.amount).toBe(-owed);
    // And the slate is clean for the week that follows.
    expect(overtimeWageBill(state)).toBe(0);
  });
});

describe('a man who has had enough of the evenings', () => {
  /** The cursor whose next draw comes out under one in twenty, so the roll is a rule under test
   *  and not a coin the test hopes lands. */
  function unluckyCursor(): number {
    for (let seed = 1; seed < 5000; seed += 1) {
      const carrier = { rng: seed };
      if (next(carrier) < OVERTIME_QUIT_CHANCE) return seed;
    }
    throw new Error('no cursor draws under the quit chance');
  }

  it('hands his notice in at the month end, and his bench is free', () => {
    const state = atFive(1);
    const worker = joinersOf(state)[0];
    if (!worker) throw new Error('no joiner');
    worker.tiredOfOvertime = true;
    worker.jobId = null;
    state.lastQuitMonth = 0;
    state.rng = unluckyCursor();
    runOvertimeQuits(state);
    expect(state.workers.some((entry) => entry.id === worker.id)).toBe(false);
    const quit = state.eventQueue.find((event) => event.kind === 'workerQuit');
    expect(quit?.title).toContain(worker.name);
    // And the notices are read once for a month, whatever day of the week the 1st falls on.
    expect(state.lastQuitMonth).toBe(1);
  });

  it('stays while he is not tired, and the notices are read once a month', () => {
    const state = atFive(1);
    const worker = joinersOf(state)[0];
    if (!worker) throw new Error('no joiner');
    state.lastQuitMonth = 0;
    state.rng = unluckyCursor();
    runOvertimeQuits(state);
    expect(state.workers.some((entry) => entry.id === worker.id)).toBe(true);
    // A second reading in the same month does nothing at all.
    const tired = joinersOf(state)[0];
    if (tired) tired.tiredOfOvertime = true;
    state.rng = unluckyCursor();
    runOvertimeQuits(state);
    expect(state.workers.some((entry) => entry.id === worker.id)).toBe(true);
  });
});

describe('three evenings in a row', () => {
  it('leave a man tired of overtime, and the Team tab says so', () => {
    let state = atFive(1);
    expect(joinersOf(state)[0]?.tiredOfOvertime).toBe(false);
    for (let night = 0; night < OVERTIME_TIRED_DAYS; night += 1) {
      state = evening(state);
      if (night < OVERTIME_TIRED_DAYS - 1) state = nextEvening(state);
    }
    const worker = joinersOf(state)[0];
    expect(worker?.overtimeDays).toBeGreaterThanOrEqual(OVERTIME_TIRED_DAYS);
    expect(worker?.tiredOfOvertime).toBe(true);
    expect(renderHiring(state)).toContain('Tired of overtime');
  });

  it('are broken by one evening at home', () => {
    let state = evening(atFive(1));
    expect(joinersOf(state)[0]?.overtimeDays).toBe(1);
    // A day with nothing after five on it.
    state = nextEvening(state);
    state = clearEvents(act(state, { type: 'END_DAY' }));
    expect(joinersOf(state)[0]?.overtimeDays).toBe(0);
    expect(joinersOf(state)[0]?.tiredOfOvertime).toBe(false);
  });
});
