// The contract man at the canteen door, drawn (PIOTR, 22.09; CLAUDE.md T24 2.3). The words are
// `tests/engine/contractDoor.test.ts`; what is asserted here is that the hall stands him on the
// cell a man with nothing to do stands on and hangs the contract's own name off his mark.

import { describe, expect, it } from 'vitest';
import { bubbleFor } from '../../src/engine/bubbles';
import {
  acceptContract,
  assignContract,
  contractStationFor,
  drawContract,
} from '../../src/engine/contracts';
import { roomDoorCell } from '../../src/engine/constants';
import { STATION_DOOR } from '../../src/engine/stations';
import { renderHall, stationCell } from '../../src/render/hall';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import {
  buyStartingKit,
  fillRack,
  newGame,
  placeEquipment,
  withAir,
  withExtraction,
} from '../helpers';

/** The whole group of one figure, out of the hall's markup. */
function groupOf(svg: string, figure: string): string {
  const at = svg.indexOf(`data-figure="${figure}"`);
  if (at < 0) throw new Error(`${figure} is not on the hall`);
  const from = svg.lastIndexOf('<g ', at);
  let depth = 0;
  for (let index = from; index < svg.length; index += 1) {
    if (svg.startsWith('<g ', index) || svg.startsWith('<g>', index)) depth += 1;
    if (svg.startsWith('</g>', index)) {
      depth -= 1;
      if (depth === 0) return svg.slice(from, index + 4);
    }
  }
  return svg.slice(from);
}

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

/** A hall with an empty rack and one man on a standing contract that cannot use him. */
function dryContract(): { state: GameState; contract: Contract; man: Worker } {
  const state = withAir(
    withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 0)),
  );
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6, id: 'kit-bench-2' });
  state.enquiries = [];
  state.workers.push(joiner('staff-1', 'Ben'));
  state.clock.minute = 60;
  const contract = drawContract(state);
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
  const man = state.workers[0];
  if (!man) throw new Error('the joiner is wanted');
  man.station = contractStationFor(state, man) ?? 'idle';
  return { state, contract, man };
}

describe('the contract man with nothing to do, on the hall', () => {
  it('stands on the canteen door cell, the one a man with no bench of his own stands on', () => {
    const { state, man } = dryContract();
    expect(man.station).toBe(STATION_DOOR);
    expect(stationCell(state, man.station, { x: man.anchorX, y: man.anchorY })).toMatchObject(
      roomDoorCell('canteen'),
    );
  });

  it('carries the contract s name on his mark, and no place at the saw', () => {
    const { state, contract, man } = dryContract();
    const mark = groupOf(renderHall(state), `worker-${man.id}`);
    expect(mark).toContain('data-bubble="noMaterial"');
    expect(mark).toContain(`<div class="bubble">no sheets for ${contract.name}</div>`);
    expect(mark).not.toContain('no place at the saw');
    expect(bubbleFor(state, man.id)?.text).toBe(`no sheets for ${contract.name}`);
  });
});
