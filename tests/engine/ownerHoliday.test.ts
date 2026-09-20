// The production manager covers the owner's absence and adds nothing while he is in, and the
// holiday he makes possible (PIOTR; CLAUDE.md T13 3.9 point 3). "This is the day the player stops
// being the bottleneck; his salary is a pure cost, he makes nothing." And the night's mark on a
// piece, which the rating reads (3.9 point 1).

import { describe, expect, it } from 'vitest';
import {
  HOLIDAY_MAX_DAYS,
  NIGHT_QUALITY_TIER_DROP,
  OWNER_AWAY_PENALTY,
  OWNER_AWAY_PENALTY_WITH_PM,
  PRODUCTION_MANAGER_MONTHLY_WAGE,
  HOLIDAY_OPTIONS_DAYS,
} from '../../src/engine/constants';
import {
  holidayCheck,
  managerOnDuty,
  nightQualityPenalty,
  nightShareOf,
  onHoliday,
  ownerIsAvailable,
  staffOutputFactor,
  startHoliday,
} from '../../src/engine/owner';
import { createTask } from '../../src/engine/tasks';
import { applyAction } from '../../src/engine/index';
import type { Job, Worker } from '../../src/engine/index';
import { act, newGame, runToDay, withLicence } from '../helpers';

/** A production manager on the books from day one (CLAUDE.md T13 3.9). */
function manager(): Worker {
  return {
    id: 'pm-1',
    name: 'Frank',
    role: 'productionManager',
    // The grade a save's manager is given and the grade he was always paid for: the experienced
    // man costs the 3,400 a manager cost before Turn 23 gave him four (CLAUDE.md T23 2.4).
    tier: 'experienced',
    rate: 0,
    monthlyWage: PRODUCTION_MANAGER_MONTHLY_WAGE.experienced,
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
    anchorX: 1,
    anchorY: 1,
  };
}

describe('the manager’s cover', () => {
  it('softens the absence from 30% to 8%, and adds nothing while the owner is in', () => {
    const state = newGame();
    state.workers.push(manager());
    expect(managerOnDuty(state)).toBe(true);
    expect(staffOutputFactor(state)).toBe(1);
    const home = applyAction(state, { type: 'SKIP_DAY' });
    expect(staffOutputFactor(home)).toBe(1 - OWNER_AWAY_PENALTY_WITH_PM);
    expect(OWNER_AWAY_PENALTY_WITH_PM).toBe(0.08);
    // The same day without him: the whole 30%.
    const alone = applyAction(newGame(), { type: 'SKIP_DAY' });
    expect(staffOutputFactor(alone)).toBe(1 - OWNER_AWAY_PENALTY);
    expect(OWNER_AWAY_PENALTY).toBe(0.3);
    // A manager who has not started covers nothing.
    const soon = newGame();
    soon.workers.push({ ...manager(), startDay: 5 });
    expect(managerOnDuty(soon)).toBe(false);
    expect(staffOutputFactor(applyAction(soon, { type: 'SKIP_DAY' }))).toBe(1 - OWNER_AWAY_PENALTY);
  });
});

describe('the holiday', () => {
  it('needs a manager, and the refusal says so', () => {
    const state = newGame();
    expect(holidayCheck(state, 5)).toEqual({ ok: false, reason: 'No production manager to cover' });
    expect(startHoliday(state, 5).ok).toBe(false);
    const refused = act(state, { type: 'TAKE_HOLIDAY', days: 5 });
    expect(refused.owner.present).toBe(true);
    expect(onHoliday(refused)).toBe(false);
  });

  it('takes the owner away for the days asked, today the first, and the draw goes on', () => {
    const state = newGame();
    state.workers.push(manager());
    expect(holidayCheck(state, 3).ok).toBe(true);
    // Day 1 is a Monday: three days is Monday to Wednesday, and Thursday he is back.
    const away = act(state, { type: 'TAKE_HOLIDAY', days: 3 });
    expect(away.owner.present).toBe(false);
    expect(ownerIsAvailable(away)).toBe(false);
    expect(onHoliday(away)).toBe(true);
    expect(away.owner.holidayDaysRemaining).toBe(3);
    expect(staffOutputFactor(away)).toBe(1 - OWNER_AWAY_PENALTY_WITH_PM);
    const day2 = runToDay(away, 2).state;
    expect(day2.owner.present).toBe(false);
    expect(day2.owner.holidayDaysRemaining).toBe(2);
    const day3 = runToDay(away, 3).state;
    expect(day3.owner.present).toBe(false);
    expect(day3.owner.holidayDaysRemaining).toBe(1);
    const day4 = runToDay(away, 4).state;
    expect(day4.owner.present).toBe(true);
    expect(day4.owner.holidayDaysRemaining).toBe(0);
    expect(onHoliday(day4)).toBe(false);
    // Living costs continue: the draw went out on every day he was away (CLAUDE.md T13 3.9).
    const draws = day4.ledger.filter(
      (line) => line.category === 'ownerDraw' && line.day >= 2 && line.day <= 3,
    );
    expect(draws).toHaveLength(2);
    // And he cannot take a second holiday while on one.
    expect(holidayCheck(away, 1)).toEqual({ ok: false, reason: 'Already on holiday' });
  });

  it('walks over the weekend and is capped at the longest the button offers', () => {
    const state = newGame();
    state.workers.push(manager());
    // Five days from Monday: back on the next Monday, day 8.
    const week = act(state, { type: 'TAKE_HOLIDAY', days: 5 });
    expect(runToDay(week, 5).state.owner.present).toBe(false);
    expect(runToDay(week, 8).state.owner.present).toBe(true);
    const long = act(state, { type: 'TAKE_HOLIDAY', days: 30 });
    expect(long.owner.holidayDaysRemaining).toBe(HOLIDAY_MAX_DAYS);
    expect(HOLIDAY_OPTIONS_DAYS[HOLIDAY_OPTIONS_DAYS.length - 1]).toBe(HOLIDAY_MAX_DAYS);
    expect(holidayCheck(state, HOLIDAY_MAX_DAYS + 1).ok).toBe(false);
  });

  it('puts down whatever he was holding', () => {
    const state = withLicence(newGame());
    state.workers.push(manager());
    const task = createTask(state, { kind: 'design', label: 'Long drawing', minutes: 900 });
    const busy = act(state, { type: 'START_TASK', taskId: task.id });
    expect(busy.owner.currentTaskId).toBe(task.id);
    const away = act(busy, { type: 'TAKE_HOLIDAY', days: 2 });
    expect(away.owner.currentTaskId).toBeNull();
    expect(away.tasks.find((entry) => entry.id === task.id)?.doneBy).toBeNull();
  });
});

describe('the night share of a piece', () => {
  function piece(productionMinutes: number, nightMinutes: number): Job {
    return { productionMinutes, nightMinutes } as Job;
  }

  it('is the night minutes over the minutes of the piece, and nothing for a day piece', () => {
    expect(nightShareOf(piece(0, 0))).toBe(0);
    expect(nightShareOf(piece(400, 0))).toBe(0);
    expect(nightShareOf(piece(400, 100))).toBe(0.25);
    expect(nightShareOf(piece(400, 400))).toBe(1);
  });

  it('takes a tier off the rating for a night piece, and the share of one otherwise', () => {
    expect(NIGHT_QUALITY_TIER_DROP).toBe(1);
    expect(nightQualityPenalty(piece(400, 400))).toBe(NIGHT_QUALITY_TIER_DROP);
    expect(nightQualityPenalty(piece(400, 100))).toBe(0.25);
    expect(nightQualityPenalty(piece(400, 0))).toBe(0);
  });
});
