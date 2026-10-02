// No two figures on one cell, ever (PIOTR, 02.10: "three of them stand in one cell"; CLAUDE.md T26
// 2.2, 7): every man the hall draws has a cell of his own out of one pass, `figureStandings`, the
// men at the machines' places first and everybody else after them, the canteen door's queue among
// them. And a machine draws as many men as it keeps busy (2.1): the count at the CNC is the men
// whose turn it is, up to its places.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contractFamilyOf, contractPiece, drawContract } from '../../src/engine/contracts';
import { menAtMachine, menAtPlaces, placesOf } from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { dayPlan, familiesFor } from '../../src/engine/production';
import { STATION_DOOR, roomBehindStation, stationMachine, stationNow } from '../../src/engine/stations';
import { figureStandings } from '../../src/render/hall';
import type { Equipment, GameState } from '../../src/engine/index';
import { act, day53Hall, runClock, sixJoinersOnSheetWork } from '../helpers';

function fixture(path: string): GameState {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { state: Record<string, unknown> & { version: number } };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error(`${path} did not open`);
  return state;
}

/** The figures standing on the hall: a man on his way into the office or the canteen walks through
 *  its door and stands nowhere on the floor. */
function onTheFloor(state: GameState): Array<{ who: string; key: string }> {
  return [...figureStandings(state).entries()]
    .filter(([who]) => roomBehindStation(stationNow(state, who)) === null)
    .map(([who, cell]) => ({ who, key: `${cell.x},${cell.y}` }));
}

function assertOwnCells(state: GameState, name: string): void {
  const figures = onTheFloor(state);
  expect(figures.length, name).toBeGreaterThan(0);
  const keys = figures.map((figure) => figure.key);
  expect(new Set(keys).size, `${name}: ${keys.join(' ')}`).toBe(keys.length);
}

/** Every man at work is at a machine of the family his station names, a bench being one. */
function assertAtHisFamily(state: GameState, name: string): void {
  const placed = new Map(menAtPlaces(state).map((entry) => [entry.who, entry.item]));
  const men = [{ id: 'owner', man: state.owner }, ...state.workers.map((worker) => ({ id: worker.id, man: worker }))];
  for (const { id, man } of men) {
    if (!man.working) continue;
    const family = stationMachine(man.station);
    if (family === null) continue;
    expect(placed.get(id)?.specId, `${name}: ${id}`).toBe(family);
  }
}

/** The men whose turn this half hour is the CNC, on a job or on a contract. */
function wantTheCnc(state: GameState): number {
  let count = 0;
  for (const entry of dayPlan(state)) {
    const first =
      entry.job !== null
        ? familiesFor(state, entry.job, entry.who)[0]
        : entry.contract !== null
          ? contractFamilyOf(state, contractPiece(entry.contract), true)
          : null;
    if (first === 'cnc') count += 1;
  }
  return count;
}

describe('the day 53 hall after one minute', () => {
  const state = day53Hall();

  it('has nobody sharing a cell, and every man at a machine of his family or at a bench', () => {
    assertOwnCells(state, 'day 53');
    assertAtHisFamily(state, 'day 53');
  });

  it('has as many men at the CNC as want it, up to its places', () => {
    const cnc = state.equipment.find((item) => item.specId === 'cnc') as Equipment;
    const wanted = wantTheCnc(state);
    expect(wanted).toBeGreaterThan(1);
    expect(menAtMachine(state, cnc)).toHaveLength(Math.min(placesOf(cnc), wanted));
  });

  it('still has nobody sharing a cell ten minutes on', () => {
    assertOwnCells(runClock(day53Hall(), 10), 'day 53, ten minutes on');
  });
});

describe('Piotr s day 128 and day 149 saves after one minute', () => {
  for (const [name, path] of [
    ['day 128', 'tests/fixtures/day128-v25.woodwork.json'],
    ['day 149', 'tests/fixtures/day149-v25.woodwork.json'],
  ] as const) {
    it(`has nobody sharing a cell on ${name}, every man at a machine of his family`, () => {
      const state = runClock(fixture(path), 1);
      assertOwnCells(state, name);
      assertAtHisFamily(state, name);
    });
  }
});

describe('the canteen door s queue', () => {
  it('stands four men on four cells in front of the door', () => {
    // Four men on a standing contract whose rack has no sheets: the contract sends every one of
    // them to the door (CLAUDE.md T24 2.3).
    let state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'standard' });
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    contract.status = 'offered';
    state.contracts = [contract];
    state = act(state, { type: 'ACCEPT_CONTRACT', contractId: contract.id });
    const men = ['staff-1', 'staff-2', 'staff-3', 'staff-4'];
    for (const who of men) {
      state = act(state, { type: 'ASSIGN_CONTRACT', contractId: contract.id, workerId: who, on: true });
    }
    state.stock.sheets = 0;
    state = runClock(state, 2);
    for (const who of men) expect(stationNow(state, who), who).toBe(STATION_DOOR);
    const standings = figureStandings(state);
    const cells = men.map((who) => {
      const cell = standings.get(who);
      return `${cell?.x},${cell?.y}`;
    });
    expect(new Set(cells).size).toBe(4);
  });
});
