// A contract man with nothing to do stands at the canteen door (PIOTR, 22.09; CLAUDE.md T24 2.3).
// v45 let him go of his saw the minute the contract stopped wanting him and left him standing at
// the saw's waiting cell all the same. From v52 a man with no work wants no place at all, and the
// day plan gives the saw's places to the men who have work (CLAUDE.md T25 2.3).

import { describe, expect, it } from 'vitest';
import { bubbleFor } from '../../src/engine/bubbles';
import {
  acceptContract,
  assignContract,
  contractStationFor,
  drawContract,
  runContractMinute,
} from '../../src/engine/contracts';
import { STATION_DOOR } from '../../src/engine/stations';
import { dayPlan, planPlaces } from '../../src/engine/production';
import { menAtMachine } from '../../src/engine/machines';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import {
  buyStartingKit,
  fillRack,
  newGame,
  placeEquipment,
  withAir,
  withExtraction,
} from '../helpers';

function joiner(id: string, name: string): Worker {
  return {
    id,
    name,
    role: 'joiner',
    tier: 'novice',
    rate: 0.6,
    monthlyWage: 1950,
    startDay: 1,
    leavesOnDay: null,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    ordersToday: 0,
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
    anchorX: 6,
    anchorY: 6,
  };
}

/** The day 1 kit, enough fan and air, a joiner of his own and a standing contract he is on. */
function onAContract(sheets: number): { state: GameState; contract: Contract; man: Worker } {
  const state = withAir(
    withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), sheets)),
  );
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6, id: 'kit-bench-2' });
  state.enquiries = [];
  state.workers.push(joiner('staff-1', 'Ben'));
  state.clock.minute = 60;
  const contract = drawContract(state);
  contract.quantityPerWeek = 60;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
  const man = state.workers[0];
  if (!man) throw new Error('the joiner is wanted');
  return { state, contract, man };
}

/** The contract's minute with the day plan the day's minute would hand it (CLAUDE.md T25 2.3). */
function contractMinute(state: GameState): void {
  runContractMinute(state, new Map(planPlaces(state).map((entry) => [entry.who, entry])));
}

/** The men on a contract the day plan has at work this minute. */
function contractMenPlaced(state: GameState): string[] {
  return dayPlan(state)
    .filter((entry) => entry.contract !== null && entry.working)
    .map((entry) => entry.who);
}

describe('a contract man the contract cannot use', () => {
  it('stands at the canteen door with an empty rack, with no place at the saw', () => {
    const { state, man } = onAContract(0);
    expect(contractMenPlaced(state)).toEqual([]);
    expect(contractStationFor(state, man)).toBe(STATION_DOOR);
    contractMinute(state);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    expect(menAtMachine(state, saw)).toEqual([]);
  });

  it('carries the contract s own name over his head, and not the machine s', () => {
    const { state, contract, man } = onAContract(0);
    man.station = contractStationFor(state, man) ?? 'idle';
    const mark = bubbleFor(state, man.id);
    expect(mark?.key).toBe('noMaterial');
    expect(mark?.text).toBe(`no sheets for ${contract.name}`);
  });

  it('is back at the saw the minute a delivery lands, with nothing over his head', () => {
    const { state, man } = onAContract(0);
    expect(contractStationFor(state, man)).toBe(STATION_DOOR);
    state.stock.sheets = 60;
    expect(contractMenPlaced(state)).toEqual(['staff-1']);
    contractMinute(state);
    man.station = contractStationFor(state, man) ?? 'idle';
    expect(man.station).toBe('machine:tableSaw');
    expect(bubbleFor(state, man.id)).toBe(null);
  });

  it('goes to the door at five with the crew', () => {
    const { state, man } = onAContract(60);
    expect(contractStationFor(state, man)).not.toBe(STATION_DOOR);
    // Five o'clock: the crew have gone home and the contract wants nobody.
    state.clock.minute = 9 * 60 + 1;
    expect(contractMenPlaced(state)).toEqual([]);
    expect(contractStationFor(state, man)).toBe(STATION_DOOR);
  });
});
