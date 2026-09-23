// The floor limits the crew (PIOTR; CLAUDE.md T13 3.10): one person per so many square metres of
// free floor, the owner among them, so that a 200 m2 hall with a normal set of machines and racks
// lands at the owner plus four, five at most. "Without this the player buys ten people and pushes
// everything through two shifts."

import { describe, expect, it } from 'vitest';
import { M2_PER_PERSON, PRODUCTION_MANAGER_MONTHLY_WAGE } from '../../src/engine/constants';
import { crewLimit } from '../../src/engine/layout';
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
      // A bench of two places. A hall owns no more benches than the unit has slots for, six, so a
      // crew of one place benches now tops out at five men and the owner: the gate counts his own
      // place from Turn 24 (CLAUDE.md T24 2.2). The class is the lever, as it is for the cabinet.
      next = buyNow(next, specId, specId === 'workbench' ? 'standard' : undefined);
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
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
    anchorX: 1,
    anchorY: 1,
  };
}

describe('the floor limit', () => {
  it('is the whole unit over the square metres a person wants, rounded down', () => {
    // The whole unit and not the free floor since v37 (PIOTR, 20.09: "200 over 24 is eight,
    // simplest"): a machine takes floor, and that is the only way it limits men.
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(M2_PER_PERSON).toBe(24);
    expect(crewLimit(state)).toBe(
      Math.floor((state.unit.widthCells * state.unit.depthCells) / M2_PER_PERSON),
    );
    expect(crewLimit(state)).toBe(8);
  });

  it('lands a 200 m2 hall at the owner and seven, and refuses the eighth man', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 40;
    expect(state.unit.areaM2).toBe(200);
    expect(crewCount(state)).toBe(1);
    expect(crewLimit(state)).toBe(8);
    // Six joiners fill the unit's six bench slots; the helper needs no bench and is the eighth
    // seat, so the crew is eight and the next man is refused by the unit and not the floor.
    state = withCrew(state, 6, 'novice');
    state = hireNow(state, 'helper', null);
    expect(joiners(state)).toHaveLength(6);
    expect(crewCount(state)).toBe(8);
    // The benches and the cabinets took floor of their own and the limit did not move: eight is
    // the unit's (v37).
    expect(crewLimit(state)).toBe(8);
    expect(crewLine(state)).toBe('Crew 8 / 8, the unit takes 8 people');
    expect(crewFull(state, 'joiner')).toBe(true);
    // A seventh joiner is stopped by the six bench slots before the crew line is reached; a
    // second helper needs no bench and hears the unit's own line. The office does not.
    expect(canHire(state, 'joiner', 'novice').ok).toBe(false);
    expect(canHire(state, 'helper', null)).toEqual({
      ok: false,
      reason: 'Crew 8 / 8, the unit takes 8 people',
    });
    expect(crewFull(state, 'officeAdmin')).toBe(false);
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
