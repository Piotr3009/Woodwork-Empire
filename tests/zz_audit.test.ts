import { describe, expect, it } from 'vitest';
import { newGame } from './helpers';
import { daySummaryOf } from '../src/engine/index';
import { labourFactorFor, runOwnerDayStart } from '../src/engine/owner';
import { isMonday, weekday } from '../src/engine/clock';
import { serviceDueOn, machineHoursPerDay, machineUsersNow } from '../src/engine/machines';
import type { Equipment } from '../src/engine/index';

describe('audit', () => {
  it('friday summary claims a factor monday will not honour', () => {
    const state = newGame();
    // Day 5 is Friday (day 1 is Monday).
    state.clock.day = 5;
    expect(weekday(5)).toBe(4);
    state.owner.overtimeDebt = 0.3;
    state.owner.breakSkipped = false;
    const summary = daySummaryOf(state);
    // What the evening tells him.
    expect(summary.tomorrowFactor).toBe(0.7);
    // What Monday actually gives him.
    const monday = { ...state, clock: { day: 8, minute: 0 }, owner: { ...state.owner } };
    expect(isMonday(8)).toBe(true);
    runOwnerDayStart(monday as never);
    expect(monday.owner.labourFactor).toBe(1);
  });

  it('serviceDueOn counts calendar days for hours that only accrue on working days', () => {
    const state = newGame();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw).toBeTruthy();
    // One man on one sheet job.
    state.jobs = [{ stage: 'inProduction', materialKind: 'sheet' } as never];
    expect(machineUsersNow(state, saw as Equipment)).toBe(1);
    expect(machineHoursPerDay(state, saw as Equipment)).toBeCloseTo(8 / 3, 6);
    (saw as Equipment).hoursUsed = 0;
    (saw as Equipment).serviceHours = 0;
    state.clock.day = 1;
    // 80 h at 2.667 h per WORKING day is 30 working days, which is calendar day 41, not 31.
    expect(serviceDueOn(state, saw as Equipment)).toBe(31);
  });

  it('machineUsersNow counts jobs nobody is working', () => {
    const state = newGame();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    state.jobs = [
      { stage: 'inProduction', materialKind: 'sheet', assignedTo: 'owner' },
      { stage: 'inProduction', materialKind: 'sheet', assignedTo: 'w1' },
      { stage: 'inProduction', materialKind: 'sheet', assignedTo: 'w2' },
    ] as never;
    state.workers = [];
    expect(machineUsersNow(state, saw as Equipment)).toBe(3);
    expect(machineHoursPerDay(state, saw as Equipment)).toBe(8);
  });
});
