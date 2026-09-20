// The floor limits the crew (PIOTR; CLAUDE.md T13 3.10): one person per so many square metres of
// free floor, the owner among them, so that a 200 m2 hall with a normal set of machines and racks
// lands at the owner plus four, five at most. "Without this the player buys ten people and pushes
// everything through two shifts."

import { describe, expect, it } from 'vitest';
import { M2_PER_PERSON, PRODUCTION_MANAGER_MONTHLY_WAGE } from '../../src/engine/constants';
import { crewLimit, freeFloorM2 } from '../../src/engine/layout';
import {
  canHire,
  crewCount,
  crewFull,
  crewLine,
  joiners,
  missingForHire,
} from '../../src/engine/staff';
import type { GameState, Worker } from '../../src/engine/index';
import { buyNow, buyStartingKit, hireNow, newGame } from '../helpers';

/** Buys exactly what the engine says is missing for one more joiner. */
function withJoinerKit(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (missingForHire(next, 'joiner').length > 0 && guard < 20) {
    for (const specId of missingForHire(next, 'joiner')) {
      next = buyNow(next, specId);
    }
    guard += 1;
  }
  return next;
}

/** Kits out and hires `count` joiners of one tier. */
function withCrew(state: GameState, count: number, tier: Worker['tier']): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = withJoinerKit(next);
    next = hireNow(next, 'joiner', tier);
  }
  return next;
}

/** A production manager on the books from day one (CLAUDE.md T13 3.9). */
function manager(id = 'pm-1'): Worker {
  return {
    id,
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

describe('the floor limit', () => {
  it('is the free floor over the square metres a person wants, rounded down', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(M2_PER_PERSON).toBe(24);
    expect(crewLimit(state)).toBe(Math.floor(freeFloorM2(state) / M2_PER_PERSON));
  });

  it('lands a 200 m2 hall with the standard set at the owner and four, and refuses the fifth', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 40;
    expect(state.unit.areaM2).toBe(200);
    expect(crewCount(state)).toBe(1);
    expect(crewLimit(state)).toBeGreaterThanOrEqual(5);
    state = withCrew(state, 4, 'novice');
    expect(joiners(state)).toHaveLength(4);
    expect(crewCount(state)).toBe(5);
    // Every man's bench and cabinets took floor of their own: five is what is left.
    expect(crewLimit(state)).toBe(5);
    expect(crewLine(state)).toBe('Crew 5 / 5, floor limited');
    expect(crewFull(state, 'joiner')).toBe(true);
    expect(canHire(state, 'joiner', 'novice')).toEqual({ ok: false, reason: 'Crew 5 / 5, floor limited' });
    // A helper stands on the floor too; the office does not.
    expect(canHire(state, 'helper', null).reason).toBe('Crew 5 / 5, floor limited');
    expect(crewFull(state, 'officeAdmin')).toBe(false);
    expect(canHire(state, 'officeAdmin', null).ok).toBe(true);
    expect(canHire(state, 'estimator', 'experienced').ok).toBe(true);
  });

  it('counts the owner, the men on the floor and the manager, and never the desks', () => {
    const state = newGame();
    expect(crewCount(state)).toBe(1);
    state.workers.push(manager());
    expect(crewCount(state)).toBe(2);
    state.workers.push({ ...manager('e1'), role: 'estimator', tier: 'experienced' });
    expect(crewCount(state)).toBe(2);
    state.workers.push({ ...manager('a1'), role: 'officeAdmin' });
    expect(crewCount(state)).toBe(2);
  });
});
