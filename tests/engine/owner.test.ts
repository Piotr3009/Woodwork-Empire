import { describe, expect, it } from 'vitest';
import {
  ABSENCE_OUTPUT_FACTOR,
  ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO,
  ABSENCE_OUTPUT_FACTOR_WITH_CEO,
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  BREAK_SKIP_FACTOR,
  DAY_END_MINUTE,
  LABOUR_FACTOR_FLOOR,
  MINUTES_PER_WORKING_DAY,
  OVERTIME_DEBT_PER_DAY,
  OVERTIME_END_MINUTE,
} from '../../src/engine/constants';
import {
  absenceFactor,
  labourFactorFor,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  ownerMinutesToday,
  scheduleSickLeave,
  staffOutputFactor,
} from '../../src/engine/owner';
import { createTask } from '../../src/engine/tasks';
import { isWorkingDay, yearOfDay } from '../../src/engine/clock';
import { applyAction, runMinutes, tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  act,
  choose,
  clearEvents,
  eventsOfKind,
  newGame,
  nextDay,
  runToDay,
  withLicence,
} from '../helpers';

describe('the labour factor', () => {
  it('is the whole of the owner efficiency: an overtime minute is worth any other minute', () => {
    const state = newGame();
    expect(state.owner.labourFactor).toBe(1);
    expect(ownerEfficiency(state)).toBe(1);
    state.clock.minute = DAY_END_MINUTE + 60;
    expect(ownerEfficiency(state)).toBe(1);
    state.owner.labourFactor = 0.7;
    expect(ownerEfficiency(state)).toBe(0.7);
  });

  it('takes 3% off for a dinner worked through and 10% for a day with overtime', () => {
    expect(labourFactorFor(0, false)).toBe(1);
    expect(labourFactorFor(0, true)).toBe(BREAK_SKIP_FACTOR);
    expect(labourFactorFor(OVERTIME_DEBT_PER_DAY, false)).toBe(0.9);
    expect(labourFactorFor(3 * OVERTIME_DEBT_PER_DAY, false)).toBe(0.7);
    // Both at once multiply: the debt first, then the 3%.
    expect(labourFactorFor(OVERTIME_DEBT_PER_DAY, true)).toBe(0.873);
  });

  it('never falls through the floor', () => {
    expect(labourFactorFor(0.9, true)).toBe(LABOUR_FACTOR_FLOOR);
    expect(labourFactorFor(5, false)).toBe(LABOUR_FACTOR_FLOOR);
  });

  it('counts the minutes left in the pool, and the break takes none of them', () => {
    const state = newGame();
    expect(ownerMinutesLeft(state)).toBe(MINUTES_PER_WORKING_DAY);
    state.clock.minute = 318 + BREAK_MINUTES;
    expect(ownerMinutesLeft(state)).toBe(162);
    state.clock.minute = BREAK_START_MINUTE;
    const atDinner = ownerMinutesLeft(state);
    state.clock.minute = BREAK_START_MINUTE + BREAK_MINUTES;
    expect(ownerMinutesLeft(state)).toBe(atDinner);
    state.clock.minute = DAY_END_MINUTE;
    expect(ownerMinutesLeft(state)).toBe(0);
  });

  it('gives him the hour when he works through it', () => {
    const state = newGame();
    state.owner.breakSkipped = true;
    expect(ownerMinutesToday(state)).toBe(MINUTES_PER_WORKING_DAY + BREAK_MINUTES);
    state.clock.minute = BREAK_START_MINUTE + BREAK_MINUTES;
    // Every minute of it counted, so the pool has run down by the same.
    expect(ownerMinutesLeft(state)).toBe(
      MINUTES_PER_WORKING_DAY + BREAK_MINUTES - (BREAK_START_MINUTE + BREAK_MINUTES),
    );
    state.clock.minute = DAY_END_MINUTE;
    expect(ownerMinutesLeft(state)).toBe(0);
  });
});

/** Runs the day until the named question is on the table, answering everything else. */
function runTo(state: GameState, kind: string): GameState {
  let next = state;
  for (let guard = 0; guard < 400; guard += 1) {
    if (next.activeEvent?.kind === kind) return next;
    if (next.activeEvent !== null) {
      const choice = next.activeEvent.choices[0];
      next = choose(next, choice ? choice.id : 'ok');
      continue;
    }
    next = tick(next, 15);
  }
  throw new Error(`the day never asked about ${kind}`);
}

/** Plays one whole day: takes or skips the break, goes home at five or stays on. */
function playDay(
  state: GameState,
  options: { skipBreak?: boolean; overtime?: number } = {},
): GameState {
  let next = clearEvents(state);
  const day = next.clock.day;
  let guard = 0;
  while (next.clock.day === day && !next.gameOver && guard < 400) {
    guard += 1;
    const event = next.activeEvent;
    if (event?.kind === 'breakTime') {
      next = choose(next, options.skipBreak === true ? 'skip' : 'take');
      continue;
    }
    if (event?.kind === 'goingHome') {
      if ((options.overtime ?? 0) > 0) {
        next = clearEvents(tick(choose(next, 'overtime'), options.overtime ?? 0));
        next = clearEvents(act(next, { type: 'END_DAY' }));
        continue;
      }
      next = choose(next, 'home');
      continue;
    }
    if (event !== null) {
      next = clearEvents(next);
      continue;
    }
    next = tick(next, 30);
  }
  return next;
}

describe('what a day costs the next one', () => {
  it('ends the day at 17:00 with the whole 480 behind him and nothing owing', () => {
    const day2 = playDay(newGame());
    expect(day2.clock.day).toBe(2);
    expect(day2.owner.overtimeDebt).toBe(0);
    expect(day2.owner.labourFactor).toBe(1);
  });

  it('charges 3% for a dinner worked through, and gives it back the day after', () => {
    const day2 = playDay(newGame(), { skipBreak: true });
    expect(day2.owner.labourFactor).toBe(BREAK_SKIP_FACTOR);
    const day3 = playDay(day2);
    expect(day3.owner.labourFactor).toBe(1);
  });

  it('lets him work through the hour, and stops him dead when he takes it', () => {
    const withTask = (): GameState => {
      const state = withLicence(newGame());
      const task = createTask(state, { kind: 'design', label: 'Long drawing', minutes: 900 });
      return act(state, { type: 'START_TASK', taskId: task.id });
    };
    const asked = runTo(withTask(), 'breakTime');
    const before = asked.owner.minutesWorked;
    const eating = tick(choose(asked, 'take'), BREAK_MINUTES);
    expect(eating.owner.minutesWorked).toBe(before);
    expect(eating.owner.breakSkipped).toBe(false);
    const working = tick(choose(asked, 'skip'), BREAK_MINUTES);
    expect(working.owner.minutesWorked).toBe(before + BREAK_MINUTES);
    expect(working.owner.breakSkipped).toBe(true);
  });

  it('gives 0.7 on the fourth morning after three days of overtime', () => {
    let state = newGame();
    for (let day = 0; day < 3; day += 1) state = playDay(state, { overtime: 60 });
    expect(state.clock.day).toBe(4);
    expect(state.owner.overtimeDebt).toBeCloseTo(0.3, 10);
    expect(state.owner.labourFactor).toBe(0.7);
  });

  it('wipes the debt on Monday morning', () => {
    let state = newGame();
    // Thursday and Friday on overtime, then the weekend.
    state = playDay(state);
    state = playDay(state);
    state = playDay(state);
    state = playDay(state, { overtime: 60 });
    expect(state.clock.day).toBe(5);
    state = playDay(state, { overtime: 60 });
    // Day 8 is the Monday: the weekend was walked over on the way.
    expect(state.clock.day).toBe(8);
    expect(state.owner.overtimeDebt).toBe(0);
    expect(state.owner.labourFactor).toBe(1);
  });

  it('puts the day to him at 17:00 and never lets the clock past 19:00', () => {
    const asked = runTo(newGame(), 'goingHome');
    expect(asked.clock.minute).toBe(DAY_END_MINUTE);
    const home = choose(asked, 'home');
    expect(home.owner.wentHome).toBe(true);
    const staying = runMinutes(choose(asked, 'overtime'), 400);
    expect(staying.state.clock.minute).toBe(OVERTIME_END_MINUTE);
    expect(staying.state.activeEvent?.kind).toBe('dayEnd');
    expect(staying.state.owner.overtimeMinutes).toBe(OVERTIME_END_MINUTE - DAY_END_MINUTE);
  });
});

describe('absence', () => {
  it('costs the company 30% of its output with no CEO', () => {
    expect(absenceFactor(false, false)).toBe(ABSENCE_OUTPUT_FACTOR);
    expect(absenceFactor(true, false)).toBe(ABSENCE_OUTPUT_FACTOR_WITH_CEO);
    expect(absenceFactor(true, true)).toBe(ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO);
  });

  it('applies the penalty the moment the owner is not in', () => {
    const state = newGame();
    expect(staffOutputFactor(state)).toBe(1);
    const home = applyAction(state, { type: 'SKIP_DAY' });
    expect(home.owner.present).toBe(false);
    expect(ownerIsAvailable(home)).toBe(false);
    expect(staffOutputFactor(home)).toBe(ABSENCE_OUTPUT_FACTOR);
  });

  it('stops the owner taking work on a day off, and lets him back in the next day', () => {
    let state = applyAction(newGame(), { type: 'SKIP_DAY' });
    const task = createTask(state, { kind: 'emails', label: 'Emails', minutes: 60 });
    state = act(state, { type: 'START_TASK', taskId: task.id });
    expect(state.owner.currentTaskId).toBeNull();
    // Nobody is in the hall, so the day is over the moment it is taken off (Turn 2 brief 3.1).
    expect(state.clock.minute).toBe(0);
    expect(state.activeEvent?.kind).toBe('dayEnd');
    const day2 = clearEvents(state);
    expect(day2.owner.present).toBe(true);
    expect(day2.owner.stayHome).toBe(false);
  });

  it('still charges the fixed costs on a day off', () => {
    const home = applyAction(newGame(), { type: 'SKIP_DAY' });
    const before = home.cash;
    const day2 = nextDay(home);
    expect(day2.cash).toBeLessThan(before);
  });
});

describe('sick leave', () => {
  it('books one spell a year on a working day', () => {
    const state = newGame();
    scheduleSickLeave(state);
    const day = state.owner.sickStartDay;
    expect(day).not.toBeNull();
    expect(isWorkingDay(day ?? 0)).toBe(true);
    expect(yearOfDay(day ?? 0)).toBe(1);
    // Calling again while it is still ahead changes nothing.
    scheduleSickLeave(state);
    expect(state.owner.sickStartDay).toBe(day);
  });

  it('keeps the owner out for four or five days', () => {
    const state = newGame();
    state.owner.sickStartDay = 3;
    const run = runToDay(state, 4);
    expect(eventsOfKind(run.events, 'ownerSick')).toHaveLength(1);
    const days = Number(eventsOfKind(run.events, 'ownerSick')[0]?.data.days ?? 0);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(5);
    expect(run.state.owner.present).toBe(false);
    // The spell eats working days: the weekend does not count against it.
    const workingDays = [3, 4, 5, 8, 9, 10, 11, 12];
    for (let index = 0; index < days; index += 1) {
      const day = workingDays[index] ?? 0;
      expect(runToDay(state, day).state.owner.present, `day ${day}`).toBe(false);
    }
    const backDay = workingDays[days] ?? 0;
    expect(runToDay(state, backDay).state.owner.present, `day ${backDay}`).toBe(true);
  });
});
