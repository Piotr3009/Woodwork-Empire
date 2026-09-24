// The men spread over the machines they are drawn at [PIOTR, 21.09: "with two saws let them go to
// the second one"] (CLAUDE.md T25 2.6). The machines of a family are filled in the order they were
// bought, each up to its places, so the second man of a two place saw stands at its second place
// and the third stands at the second saw, not in a heap at the first. `machineForPlace` is what the
// figure loop and the machine's card both read, and `placeCellsAt` lays out every family's places,
// the bench's included. A man the saw has no place for works at another machine of his job or at
// a bench, and a man stands at his own home cell only when every place he could take is taken
// (PIOTR, 24.09; v53).

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import { machineForPlace, menAtMachine, menAtPlaces } from '../../src/engine/machines';
import { planPlaces } from '../../src/engine/production';
import { homeCellOf } from '../../src/engine/staff';
import { STATION_HOME } from '../../src/engine/stations';
import { stationCell } from '../../src/render/hall';
import { placeEquipment, sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

/** So many men on jobs at the start of their cutting, in a hall of the saws named. */
function menAtTheSaws(men: number, saws: number, sawVariant: string): GameState {
  const state = sixJoinersOnSheetWork({ saws, sawVariant });
  for (const worker of state.workers.slice(men)) {
    const job = state.jobs.find((entry) => entry.id === worker.jobId);
    if (job) job.assignees = job.assignees.filter((who) => who !== worker.id);
    worker.jobId = null;
  }
  state.jobs = state.jobs.filter((job) => job.assignees.length > 0);
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue;
    job.sheetsUsed = 0;
  }
  withOnlyCuttingLeft(state);
  planPlaces(state);
  return state;
}

function cellOf(state: GameState, who: string): { x: number; y: number } {
  const worker = state.workers.find((entry) => entry.id === who);
  if (worker === undefined) throw new Error(`no ${who}`);
  const cell = stationCell(state, worker.station, homeCellOf(state, worker), who);
  return { x: cell.x, y: cell.y };
}

function key(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

describe('the men at their places (CLAUDE.md T25 2.6)', () => {
  it('stands two men at a two place saw at its two places', () => {
    const state = menAtTheSaws(2, 1, 'standard');
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('a saw is wanted');
    expect(menAtMachine(state, saw)).toEqual(['staff-1', 'staff-2']);
    const cells = ['staff-1', 'staff-2'].map((who) => key(cellOf(state, who)));
    expect(new Set(cells).size).toBe(2);
  });

  it('sends the third man to the second saw, and stands four men at four places over the two', () => {
    const state = menAtTheSaws(4, 2, 'standard');
    const [first, second] = state.equipment.filter((item) => item.specId === 'tableSaw');
    if (first === undefined || second === undefined) throw new Error('two saws are wanted');
    expect(machineForPlace(state, 'tableSaw', 0)).toEqual({ item: first, place: 0 });
    expect(machineForPlace(state, 'tableSaw', 1)).toEqual({ item: first, place: 1 });
    expect(machineForPlace(state, 'tableSaw', 2)).toEqual({ item: second, place: 0 });
    expect(machineForPlace(state, 'tableSaw', 4)).toBeNull();
    expect(menAtMachine(state, first)).toEqual(['staff-1', 'staff-2']);
    expect(menAtMachine(state, second)).toEqual(['staff-3', 'staff-4']);
    const cells = ['staff-1', 'staff-2', 'staff-3', 'staff-4'].map((who) => cellOf(state, who));
    expect(new Set(cells.map(key)).size).toBe(4);
    // Each man stands beside the saw that holds him, and not in a heap at the first.
    for (const entry of menAtPlaces(state)) {
      const cell = cellOf(state, entry.who);
      const item = entry.item;
      const near =
        Math.abs(cell.x - item.anchorX) <= 4 && Math.abs(cell.y - item.anchorY) <= 4;
      expect(near, `${entry.who} at ${key(cell)} by ${item.id}`).toBe(true);
    }
    const byFirst = cells.slice(0, 2);
    const bySecond = cells.slice(2);
    const spread = Math.min(
      ...byFirst.flatMap((a) => bySecond.map((b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y))),
    );
    expect(spread).toBeGreaterThan(0);
  });

  it('stands three men at an industrial bench at three places of its front row', () => {
    const state = menAtTheSaws(3, 1, 'standard');
    // Every job past its cutting and its machining: the stage is the assembly, which wants a
    // bench, and the hall's benches are taken away but one industrial of three places.
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench');
    placeEquipment(state, 'workbench', { variantId: 'industrial', x: 10, y: 6, id: 'kit-bench-big' });
    for (const job of state.jobs) job.labourRemaining = job.labourValue * 0.5;
    for (const job of state.jobs) job.stageLabour = {};
    planPlaces(state);
    const bench = state.equipment.find((item) => item.id === 'kit-bench-big');
    if (bench === undefined) throw new Error('the bench is wanted');
    expect(menAtMachine(state, bench)).toEqual(['staff-1', 'staff-2', 'staff-3']);
    const cells = ['staff-1', 'staff-2', 'staff-3'].map((who) => key(cellOf(state, who)));
    expect(new Set(cells).size).toBe(3);
  });

  it('spreads four men over a one place saw and the benches, and stands a man at home only when every place is taken', () => {
    const state = menAtTheSaws(4, 1, 'used');
    // Until v53 the three men the used saw had no place for stood at their home cells. Now they
    // work at the benches, each at a place and a cell of his own.
    expect(state.workers.slice(0, 4).map((worker) => worker.station)).toEqual([
      'machine:tableSaw',
      'machine:workbench',
      'machine:workbench',
      'machine:workbench',
    ]);
    const cells = ['staff-1', 'staff-2', 'staff-3', 'staff-4'].map((who) => key(cellOf(state, who)));
    expect(new Set(cells).size).toBe(4);
    // One bench of one place left: the saw's place and the bench's are the first two men's, and
    // the third and the fourth have every place they could take taken.
    const keep = state.equipment.find((item) => item.specId === 'workbench');
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench' || item === keep);
    planPlaces(state);
    const man = state.workers.find((worker) => worker.id === 'staff-3');
    if (man === undefined) throw new Error('the third man is wanted');
    expect(man.station).toBe(STATION_HOME);
    const home = homeCellOf(state, man);
    const cell = cellOf(state, 'staff-3');
    expect(Math.abs(cell.x - home.x) + Math.abs(cell.y - home.y)).toBeLessThanOrEqual(2);
  });
});
