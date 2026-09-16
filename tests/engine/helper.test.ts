// "With a helper, I and the joiners stop unloading, cleaning and changing bags. And I cannot see
// him" (PIOTR, 14.09; CLAUDE.md T11 3.4).

import { describe, expect, it } from 'vitest';
import {
  HELPER_ONLY_KINDS,
  WAITING_FOR_HELPER,
  helperOnDuty,
  homeCellOf,
  isHelperTask,
  startTaskCheck,
} from '../../src/engine/index';
import {
  HELPER_HOME_CELL,
  LAPTOP_BOOT_MINUTES,
  ROOM_LAYOUT,
  WORKER_RATES,
} from '../../src/engine/constants';
import { assignWorkerTask, createTask } from '../../src/engine/tasks';
import { renderHall, stationCell } from '../../src/render/hall';
import type { GameState, TaskInstance, Worker } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  fillBags,
  fillRack,
  hireNow,
  newGame,
  nextDay,
  placeEquipment,
  runClock,
} from '../helpers';

/** The day 1 kit, a full rack and a quiet board, so a test is about the helper and nothing else. */
function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  return state;
}

/** The same hall with a helper who started this morning. */
function withHelper(): GameState {
  const state = hireNow(quietHall(), 'helper', null);
  const helper = state.workers.find((worker) => worker.role === 'helper');
  if (helper === undefined) throw new Error('no helper on the books');
  // He starts the next working day like everybody else; this test is about the day he is in.
  helper.startDay = state.clock.day;
  return state;
}

function taskOfKind(state: GameState, kind: TaskInstance['kind']): TaskInstance {
  return createTask(state, { kind, label: `${kind} test`, minutes: 30 });
}

/** True while the cell is on the painted floor and out of the three fixed rooms. */
function onTheFloor(state: GameState, cell: { x: number; y: number }): boolean {
  if (cell.x < 0 || cell.y < 0) return false;
  if (cell.x >= state.unit.widthCells || cell.y >= state.unit.depthCells) return false;
  return !ROOM_LAYOUT.some(
    (room) =>
      cell.x >= room.x &&
      cell.x < room.x + room.width &&
      cell.y >= room.y &&
      cell.y < room.y + room.depth,
  );
}

describe('the three jobs of work that are the helper s', () => {
  it('is the unloading, the bags and the cleaning, and nothing else', () => {
    expect([...HELPER_ONLY_KINDS]).toEqual(['unload', 'emptyBags', 'cleaning']);
  });

  it('belongs to nobody in particular while there is no helper in the hall', () => {
    const state = quietHall();
    expect(helperOnDuty(state)).toBe(false);
    for (const kind of HELPER_ONLY_KINDS) {
      expect(isHelperTask(state, taskOfKind(state, kind)), kind).toBe(false);
    }
  });

  it('is the helper s the moment he is in the hall', () => {
    const state = withHelper();
    expect(helperOnDuty(state)).toBe(true);
    for (const kind of HELPER_ONLY_KINDS) {
      expect(isHelperTask(state, taskOfKind(state, kind)), kind).toBe(true);
    }
    // Everything else is still the owner's to pick up.
    expect(isHelperTask(state, taskOfKind(state, 'repair'))).toBe(false);
    expect(isHelperTask(state, taskOfKind(state, 'emails'))).toBe(false);
  });
});

describe('the owner s own queue with a helper in the hall', () => {
  it('skips an unload, and says who it is waiting for', () => {
    const state = withHelper();
    const unload = taskOfKind(state, 'unload');
    const check = startTaskCheck(state, unload.id);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe(WAITING_FOR_HELPER);
    // And the explicit button the player presses himself is still an override.
    expect(startTaskCheck(state, unload.id, true).ok).toBe(true);
  });

  it('still offers him the unload when there is no helper', () => {
    const state = quietHall();
    const unload = taskOfKind(state, 'unload');
    expect(startTaskCheck(state, unload.id).ok).toBe(true);
  });

  it('lets the player clean up himself, from the button under the hall', () => {
    const state = withHelper();
    const next = act(state, { type: 'START_CLEANING' });
    const cleaning = next.tasks.find((task) => task.kind === 'cleaning' && !task.done);
    expect(cleaning?.doneBy).toBe('owner');
  });

  it('gives him back what the phone took him off, override and all', () => {
    // A forced job of work put down by an interruption has to come back to him. Refused on the
    // way back it would be left marked as his and nobody could ever pick it up again.
    const state = withHelper();
    const cleaning = act(state, { type: 'START_CLEANING' });
    const task = cleaning.tasks.find((entry) => entry.kind === 'cleaning' && !entry.done);
    if (task === undefined) throw new Error('no cleaning on the list');
    expect(cleaning.owner.currentTaskId).toBe(task.id);
    // The laptop is lifted: the boot interrupts him and he goes back to the cleaning after it.
    const booting = act(cleaning, { type: 'BOOT_LAPTOP' });
    expect(booting.owner.resumeTaskId).toBe(task.id);
    const back = runClock(booting, LAPTOP_BOOT_MINUTES + 1);
    expect(back.owner.currentTaskId).toBe(task.id);
    const same = back.tasks.find((entry) => entry.id === task.id);
    expect(same?.doneBy).toBe('owner');
  });
});

/** A joiner on the books today, without the interview: this test is about who may be sent at a
 *  bag change and not about hiring. */
function addJoiner(state: GameState): Worker {
  const joiner: Worker = {
    id: 'staff-joiner-1',
    name: 'Ben',
    role: 'joiner',
    tier: 'poor',
    rate: WORKER_RATES.poor,
    weeklyWage: 480,
    monthlyWage: 0,
    startDay: state.clock.day,
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
    anchorX: 6,
    anchorY: 6,
  };
  state.workers.push(joiner);
  return joiner;
}

describe('a helper who is on the books but not in the hall today', () => {
  it('is not on duty, and the bag is put to the owner as it always was', () => {
    const state = quietHall();
    const hired = hireNow(state, 'helper', null);
    const helper = hired.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    // He starts tomorrow, so today he is on the books and nowhere near the hall.
    expect(helper.startDay).toBeGreaterThan(hired.clock.day);
    expect(helperOnDuty(hired)).toBe(false);
    expect(isHelperTask(hired, taskOfKind(hired, 'emptyBags'))).toBe(false);
    // The bags fill: the question is put, because there is nobody to take it (T12 2.3).
    const asked = act(hired, { type: 'ASK_EMPTY_BAGS' });
    expect(asked.activeEvent).toBeNull();
    const again = act(fillBags({ ...hired }), { type: 'ASK_EMPTY_BAGS' });
    expect(again.activeEvent?.kind ?? again.eventQueue[0]?.kind).toBe('bagsFull');
  });
});

describe('a joiner with a helper in the hall', () => {
  it('is never sent at a bag change, at an unload or at the cleaning', () => {
    const state = withHelper();
    const joiner = addJoiner(state);
    for (const kind of HELPER_ONLY_KINDS) {
      const task = taskOfKind(state, kind);
      expect(assignWorkerTask(state, joiner.id, task.id), kind).toBe(false);
      expect(task.doneBy, kind).toBeNull();
    }
    // The helper himself may always be sent at his own work.
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    const bags = taskOfKind(state, 'emptyBags');
    expect(assignWorkerTask(state, helper.id, bags.id)).toBe(true);
  });

  it('may still be sent at one when there is no helper', () => {
    const state = quietHall();
    const joiner = addJoiner(state);
    const bags = taskOfKind(state, 'emptyBags');
    expect(assignWorkerTask(state, joiner.id, bags.id)).toBe(true);
  });

  it('is still sent at the repairs and the moves, which were never the helper s', () => {
    const state = withHelper();
    const joiner = addJoiner(state);
    const repair = taskOfKind(state, 'repair');
    expect(assignWorkerTask(state, joiner.id, repair.id)).toBe(true);
  });
});

describe('the helper you can see', () => {
  it('stands in the gate lane when the hall has no fan, and on the painted floor', () => {
    const state = quietHall();
    for (const item of [...state.equipment]) {
      if (item.specId === 'extractor') state.equipment.splice(state.equipment.indexOf(item), 1);
    }
    const next = hireNow(state, 'helper', null);
    const helper = next.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    expect(homeCellOf(next, helper)).toEqual(HELPER_HOME_CELL);
    expect(onTheFloor(next, homeCellOf(next, helper))).toBe(true);
  });

  it('stands at the fan when there is one', () => {
    const state = withHelper();
    const fan = state.equipment.find((item) => item.specId === 'extractor');
    if (fan === undefined) throw new Error('no extractor in the hall');
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    expect(homeCellOf(state, helper)).toEqual({ x: fan.anchorX, y: fan.anchorY });
  });

  it('is never inside the office block, which is where he used to be put', () => {
    const state = withHelper();
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    expect({ x: helper.anchorX, y: helper.anchorY }).not.toEqual({ x: 1, y: 1 });
    expect(onTheFloor(state, { x: helper.anchorX, y: helper.anchorY })).toBe(true);
  });

  it('is drawn on the painted floor on day 2, at every station the day puts him on', () => {
    const hired = hireNow(quietHall(), 'helper', null);
    const state = nextDay(hired);
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    expect(helper.startDay).toBeLessThanOrEqual(state.clock.day);
    const svg = renderHall(state);
    expect(svg).toContain(`data-worker="${helper.id}"`);
    const home = homeCellOf(state, helper);
    for (const station of ['bench', 'idle', 'gate', 'rack']) {
      const cell = stationCell(state, station, home);
      expect(onTheFloor(state, cell), station).toBe(true);
    }
  });

  it('keeps his corner when a second fan is stood in the hall', () => {
    const state = withHelper();
    placeEquipment(state, 'extractor', { variantId: 'pro', x: 17, y: 8, id: 'kit-fan-two' });
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper');
    expect(onTheFloor(state, homeCellOf(state, helper))).toBe(true);
  });
});
