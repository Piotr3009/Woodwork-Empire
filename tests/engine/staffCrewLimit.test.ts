// The unit limits the crew (PIOTR; CLAUDE.md T13 3.10): one place per so many square metres of the
// whole unit, 200 over 24 is eight. From Turn 26 the eight are joiners and nobody else: the owner,
// the labourer, the manager and the office are outside it [PIOTR, 02.10: "eight joiners, however
// many others"] (CLAUDE.md T26 2.10).

import { describe, expect, it } from 'vitest';
import { M2_PER_PERSON, PRODUCTION_MANAGER_MONTHLY_WAGE } from '../../src/engine/constants';
import { crewLimit } from '../../src/engine/layout';
import {
  canHire,
  crewCount,
  crewFull,
  crewLine,
  joiners,
  FLOOR_ROLES,
  missingForHire,
} from '../../src/engine/staff';
import { STATION_OFFICE } from '../../src/engine/stations';
import type { GameState, Worker } from '../../src/engine/index';
import { buyNow, buyStartingKit, hireNow, newGame, runClock } from '../helpers';

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

  it('counts six joiners and a labourer as six, and the seventh joiner is the bench slots\' to refuse', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 40;
    expect(state.unit.areaM2).toBe(200);
    expect(crewCount(state)).toBe(0);
    expect(crewLimit(state)).toBe(8);
    // Six joiners fill the unit's six bench slots; the labourer is not a joiner and is not counted.
    state = withCrew(state, 6, 'novice');
    state = hireNow(state, 'helper', null);
    expect(joiners(state)).toHaveLength(6);
    expect(crewCount(state)).toBe(6);
    // The benches and the cabinets took floor of their own and the limit did not move: eight is
    // the unit's (v37).
    expect(crewLimit(state)).toBe(8);
    expect(crewLine(state)).toBe('Joiners 6 / 8, the unit takes 8 joiners');
    expect(crewFull(state, 'joiner')).toBe(false);
    // A seventh joiner is stopped by the six bench slots, which this turn leaves as they are.
    expect(canHire(state, 'joiner', 'novice')).toEqual({
      ok: false,
      reason: 'No free bench slot in this unit',
    });
  });

  it('is full for a ninth joiner and for nobody else, with eight joiners and six others on the books', () => {
    // The cross check of CLAUDE.md T26 7: eight joiners, a labourer, a manager and three office
    // staff. The eight are put on the books directly, because the unit's bench slots refuse a
    // seventh joiner at the hire card before the crew line is reached.
    const state = newGame();
    for (let index = 0; index < 8; index += 1) {
      state.workers.push({ ...manager(`j${index}`), role: 'joiner', tier: 'novice' });
    }
    state.workers.push({ ...manager('l1'), role: 'helper', tier: null });
    state.workers.push(manager());
    state.workers.push({ ...manager('a1'), role: 'officeAdmin', tier: null });
    state.workers.push({ ...manager('d1'), role: 'draftsman', tier: 'experienced' });
    state.workers.push({ ...manager('s1'), role: 'salesman', tier: null });
    expect(crewCount(state)).toBe(8);
    expect(crewLine(state)).toBe('Joiners 8 / 8, the unit takes 8 joiners');
    expect(crewFull(state, 'joiner')).toBe(true);
    for (const role of ['helper', 'productionManager', 'officeAdmin', 'draftsman', 'salesman'] as const) {
      expect(crewFull(state, role)).toBe(false);
    }
  });

  it('counts the joiners and nobody else, the owner included', () => {
    const state = newGame();
    expect(crewCount(state)).toBe(0);
    state.workers.push(manager());
    state.workers.push({ ...manager('h1'), role: 'helper', tier: null });
    state.workers.push({ ...manager('e1'), role: 'draftsman', tier: 'experienced' });
    state.workers.push({ ...manager('a1'), role: 'officeAdmin' });
    expect(crewCount(state)).toBe(0);
    state.workers.push({ ...manager('j1'), role: 'joiner', tier: 'novice' });
    expect(crewCount(state)).toBe(1);
  });

  it('keeps the production manager off the floor, behind the office door', () => {
    // On the floor there are joiners and the labourer, and nobody else [PIOTR, 02.10] (CLAUDE.md
    // T26 1): a manager with nothing in hand waits at his desk and not at the canteen door.
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.workers.push(manager());
    state.clock.minute = 60;
    state = runClock(state, 1);
    expect(FLOOR_ROLES).toEqual(['joiner', 'helper']);
    expect(state.workers.find((worker) => worker.id === 'pm-1')?.station).toBe(STATION_OFFICE);
  });
});
