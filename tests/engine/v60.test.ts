// @vitest-environment jsdom
// v60 (PIOTR, 30.09): the pace of a minute is a sum of points and never a product, floored at
// 0.25, and the sheet and the top bar call it Pace; the men who work at a desk are behind the
// office door and never drawn on the hall; a machine on order locks nothing open on the board
// until it is delivered; the material take off is the office admin's when there is no estimator,
// at the owner's own speed.

import { describe, expect, it } from 'vitest';
import { PACE_FLOOR, WORKER_RATES } from '../../src/engine/constants';
import { crewPace, paceSum } from '../../src/engine/stages';
import { outputBreakdown } from '../../src/engine/machines';
import { STATION_IDLE, STATION_OFFICE } from '../../src/engine/stations';
import { bestTakerOf, rolesForTask, taskWorkRate } from '../../src/engine/tasks';
import { renderHall } from '../../src/render/hall';
import { renderTopbar } from '../../src/ui/topbar';
import { missingForHire } from '../../src/engine/staff';
import type { GameState, TaskInstance, Worker } from '../../src/engine/index';
import { buyNow, buyStartingKit, fillRack, hireNow, newGame, runClock } from '../helpers';

/** A joiner taken on with everything the gate wants bought first. */
function hireJoiner(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (missingForHire(next, 'joiner').length > 0 && guard < 20) {
    for (const specId of missingForHire(next, 'joiner')) {
      next = buyNow(next, specId, specId === 'workbench' ? 'standard' : undefined);
    }
    guard += 1;
  }
  return hireNow(next, 'joiner', 'novice');
}

function deskMan(role: Worker['role'], id: string, tier: Worker['tier'] = null): Worker {
  return {
    id,
    name: id,
    role,
    tier,
    rate: tier === null ? 0 : WORKER_RATES[tier],
    monthlyWage: 1900,
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
    station: STATION_IDLE,
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
    anchorX: 1,
    anchorY: 1,
  };
}

describe('the pace as a sum of points', () => {
  it('adds what every factor takes off one, and never multiplies', () => {
    expect(paceSum(1)).toBe(1);
    expect(paceSum(0.8, 1.05)).toBeCloseTo(0.85, 10);
    expect(paceSum(0.6, 0.9, 0.7)).toBeCloseTo(0.2 + 0.05, 10);
    // 0.6 times 0.9 times 0.7 would have been 0.378: the product is gone.
    expect(paceSum(0.6, 0.9, 0.7)).not.toBeCloseTo(0.6 * 0.9 * 0.7, 3);
    expect(paceSum(1.2, 1.12, 1.1)).toBeCloseTo(1.42, 10);
  });

  it('stands on the floor when the points take more than 0.75 off, and stops on a nought', () => {
    expect(PACE_FLOOR).toBe(0.25);
    expect(paceSum(0.6, 0.7, 0.7)).toBe(PACE_FLOOR);
    expect(paceSum(0.3)).toBeCloseTo(0.3, 10);
    expect(paceSum(0.2)).toBe(PACE_FLOOR);
    // A nought is a stop and not a point: a stage nobody can work stays at nothing.
    expect(paceSum(0.8, 0)).toBe(0);
  });

  it('adds a crew up a man at a time, so two slow men are two of them and not one fast one', () => {
    // Two novices on a job at 0.9 are 0.49 a minute each, 0.98 the pair: one rate of 1.20 would
    // have read 1.10 and promised the job sooner than the hall makes it.
    expect(crewPace([0.6, 0.6], 0.9)).toBeCloseTo(2 * paceSum(0.6, 0.9), 10);
    expect(crewPace(1.2, 0.9)).toBeCloseTo(1.1, 10);
    expect(crewPace([0.6, 0.6], 0.9)).toBeLessThan(crewPace(1.2, 0.9));
    // A man who cannot work adds nothing, and an empty crew is nothing.
    expect(crewPace([0, 1], 1)).toBe(1);
    expect(crewPace([], 1)).toBe(0);
  });

  it('is the hall s own number on the sheet: one plus the lines, floored', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const clean = outputBreakdown(state);
    expect(clean.total).toBe(1);
    state.dust = 95;
    const dirty = outputBreakdown(state);
    const hallPoints = dirty.lines.filter((line) => line.hall).reduce((sum, line) => sum + line.points, 0);
    expect(dirty.total).toBeCloseTo(Math.max(PACE_FLOOR, 1 + hallPoints), 4);
    expect(dirty.total).toBeCloseTo(0.7, 4);
    // The chip on the top bar says the same word as the sheet.
    expect(renderTopbar(state, 'hall')).toContain('Pace ');
    expect(renderTopbar(state, 'hall')).not.toContain('Output ');
  });
});

describe('the desk staff', () => {
  it('are behind the office door with nothing to do, and never drawn on the hall', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
    state.cash = 200000;
    state.reputation = 40;
    state = hireJoiner(state);
    state.workers.push(deskMan('officeAdmin', 'admin-1'), deskMan('estimator', 'estimator-1', 'experienced'));
    for (const worker of state.workers) worker.startDay = state.clock.day;
    state = runClock(state, 2);
    const admin = state.workers.find((worker) => worker.id === 'admin-1');
    const estimator = state.workers.find((worker) => worker.id === 'estimator-1');
    // Nothing on either desk yet: the office is where they are, not the canteen door.
    expect(admin?.station).toBe(STATION_OFFICE);
    expect(estimator?.station).toBe(STATION_OFFICE);
    const svg = renderHall(state);
    expect(svg).not.toContain('data-worker="admin-1"');
    expect(svg).not.toContain('data-worker="estimator-1"');
    // The joiner, who has nothing to do either, is on the hall at the canteen door as before.
    const joiner = state.workers.find((worker) => worker.role === 'joiner');
    expect(joiner?.station).toBe(STATION_IDLE);
    expect(svg).toContain(`data-worker="${joiner?.id ?? ''}"`);
  });
});

describe('the material take off', () => {
  it('is the estimator s first and the admin s behind him, at the owner s own speed', () => {
    expect(rolesForTask('materialTakeOff')).toEqual({
      eligible: ['estimator', 'officeAdmin'],
      auto: ['estimator', 'officeAdmin'],
    });
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const admin = deskMan('officeAdmin', 'admin-1');
    const estimator = deskMan('estimator', 'estimator-1', 'novice');
    const task: TaskInstance = {
      id: 'task-take-off',
      kind: 'materialTakeOff',
      category: 'admin',
      label: 'Material take off: Bookcase',
      minutesTotal: 30,
      minutesRemaining: 30,
      jobId: null,
      equipmentId: null,
      deliveryId: null,
      orderIds: [],
      day: state.clock.day,
      done: false,
      doneDay: null,
      doneBy: null,
      orders: [],
    };
    state.clock.minute = 60;
    // Both in: the estimator's. The admin alone: hers, a minute a minute where the estimator's is
    // his tier's.
    expect(bestTakerOf(state, [admin, estimator], task)?.id).toBe('estimator-1');
    expect(bestTakerOf(state, [admin], task)?.id).toBe('admin-1');
    expect(taskWorkRate(admin, task)).toBe(1);
    expect(taskWorkRate(estimator, task)).toBe(WORKER_RATES.novice);
  });
});
