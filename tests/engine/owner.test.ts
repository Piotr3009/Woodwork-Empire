import { describe, expect, it } from 'vitest';
import {
  ABSENCE_OUTPUT_FACTOR,
  ABSENCE_OUTPUT_FACTOR_EXCEPTIONAL_CEO,
  ABSENCE_OUTPUT_FACTOR_WITH_CEO,
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  FATIGUE_PER_OVERTIME_HOUR,
  MINUTES_PER_WORKING_DAY,
} from '../../src/engine/constants';
import {
  absenceFactor,
  hourEfficiency,
  ownerEfficiency,
  ownerIsAvailable,
  ownerMinutesLeft,
  scheduleSickLeave,
  staffOutputFactor,
} from '../../src/engine/owner';
import { createTask } from '../../src/engine/tasks';
import { isWorkingDay, yearOfDay } from '../../src/engine/clock';
import { applyAction, tick } from '../../src/engine/index';
import {
  act,
  clearEvents,
  eventsOfKind,
  newGame,
  nextDay,
  runToDay,
  withLicence,
} from '../helpers';

describe('owner efficiency', () => {
  it('is full for the first eight hours', () => {
    for (const minute of [0, 59, 60, 300, 479]) {
      expect(hourEfficiency(minute)).toBe(1);
    }
  });

  it('drops through the overtime hours 0.8, 0.6, 0.4, 0.4', () => {
    // Clock readings, which are half an hour past the work done once the break has been taken.
    const clock = (worked: number): number => worked + BREAK_MINUTES;
    expect(hourEfficiency(clock(479))).toBe(1);
    expect(hourEfficiency(clock(480))).toBe(0.8);
    expect(hourEfficiency(clock(539))).toBe(0.8);
    expect(hourEfficiency(clock(540))).toBe(0.6);
    expect(hourEfficiency(clock(600))).toBe(0.4);
    expect(hourEfficiency(clock(660))).toBe(0.4);
    expect(hourEfficiency(clock(719))).toBe(0.4);
  });

  it('subtracts the fatigue carried from yesterday', () => {
    const state = newGame();
    state.owner.fatigue = 0.1;
    expect(ownerEfficiency(state)).toBeCloseTo(0.9, 10);
    // His 480 are in once the clock reads 16:30, the break being half an hour of it.
    state.clock.minute = 480 + BREAK_MINUTES;
    expect(ownerEfficiency(state)).toBeCloseTo(0.7, 10);
  });

  it('never falls to zero', () => {
    const state = newGame();
    state.owner.fatigue = 5;
    expect(ownerEfficiency(state)).toBe(0.05);
  });

  it('counts the minutes left in the pool', () => {
    const state = newGame();
    expect(ownerMinutesLeft(state)).toBe(MINUTES_PER_WORKING_DAY);
    state.clock.minute = 318 + BREAK_MINUTES;
    expect(ownerMinutesLeft(state)).toBe(162);
    // The break itself takes nothing off the pool: it stands still while he eats.
    state.clock.minute = BREAK_START_MINUTE;
    const atDinner = ownerMinutesLeft(state);
    state.clock.minute = BREAK_START_MINUTE + BREAK_MINUTES;
    expect(ownerMinutesLeft(state)).toBe(atDinner);
    state.clock.minute = 600;
    expect(ownerMinutesLeft(state)).toBe(0);
  });
});

describe('fatigue', () => {
  it('charges 0.05 of efficiency per overtime hour worked, and recovers after a normal day', () => {
    let state = withLicence(newGame());
    const task = createTask(state, { kind: 'design', label: 'Long drawing', minutes: 900 });
    state = act(state, { type: 'START_TASK', taskId: task.id });
    state = tick(state, 800);
    // The owner is thrown out after 12 hours: four overtime hours.
    expect(state.owner.overtimeMinutes).toBe(240);
    expect(state.activeEvent?.kind).toBe('dayEnd');
    const day2 = clearEvents(state);
    expect(day2.owner.fatigue).toBeCloseTo(4 * FATIGUE_PER_OVERTIME_HOUR, 10);
    expect(ownerEfficiency(day2)).toBeCloseTo(0.8, 10);
    // Day 2 with no overtime clears it.
    const day3 = nextDay(day2);
    expect(day3.owner.fatigue).toBe(0);
  });

  it('charges a part hour pro rata: 30 minutes of overtime cost 0.025', () => {
    let state = withLicence(newGame());
    const task = createTask(state, { kind: 'design', label: 'Long drawing', minutes: 900 });
    state = act(state, { type: 'START_TASK', taskId: task.id });
    // 510 minutes of work, plus the half hour he spent at dinner on the way.
    state = tick(state, 510 + BREAK_MINUTES);
    expect(state.owner.overtimeMinutes).toBe(30);
    const day2 = clearEvents(act(state, { type: 'END_DAY' }));
    expect(day2.owner.fatigue).toBeCloseTo(FATIGUE_PER_OVERTIME_HOUR / 2, 10);
    expect(day2.owner.fatigue).toBe(0.025);
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
