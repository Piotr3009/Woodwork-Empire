// Where a figure stands: at his place at the machine of the stage he is working, or at his own
// home cell when the hall has no place for him. The Turn 2 cycle of fifteen minutes at the bench
// and five at the saw is gone (CLAUDE.md T7 3.1 and 3.9, T25 2.3, 2.6).

import { describe, expect, it } from 'vitest';
import { footprintIn, renderHall, stationCell } from '../../src/render/hall';
import {
  STATION_BENCH,
  STATION_HOME,
  itemAtCell,
  machineStation,
  standingCell,
} from '../../src/engine/stations';
import { OWNER } from '../../src/engine/machines';
import { footprintCells, isFree } from '../../src/engine/walk';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  hireNow,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  twoMenOnSheetWork, withOnlyCuttingLeft } from '../helpers';

/** The day 1 kit with a big job and the owner standing at it. */
function atWork(): GameState {
  let state = fillRack(
    buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }),
    80,
  );
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  state = acceptNow(state, enquiry.id, false);
  firstJob(state).stage = 'ready';
  return act(state, { type: 'WORK_HERE', jobId: null });
}

describe('the figure of a man at work', () => {
  it('stands at the saw for the cutting and walks to his bench for the assembly', () => {
    const cutting = tick(atWork(), 1);
    expect(cutting.owner.station).toBe(machineStation('tableSaw'));
    const saw = cutting.equipment.find((item) => item.specId === 'tableSaw');
    const bench = cutting.equipment.find((item) => item.specId === 'workbench');
    if (!saw || !bench) throw new Error('no kit in the hall');
    const atSaw = stationCell(cutting, cutting.owner.station, { x: 0, y: 0 });
    // He is at the front edge of the saw itself, on its right cell, not at the corner of its
    // working zone: a used saw is 2 by 1 of machine centred on 3 by 3 of floor, and the operator
    // of a saw stands at the right end of its front, back to the camera (CLAUDE.md T7 3.3; T16
    // 2.1), one cell out from the table since T19 2.4, where the floor is his and not the saw's.
    const stands = footprintIn(saw);
    expect({ x: atSaw.x, y: atSaw.y }).toEqual({
      x: Math.floor(stands.x) + 1,
      y: Math.floor(stands.y + stands.depth) + 1,
    });
    expect(atSaw.y).toBeGreaterThan(saw.anchorY);
    expect(['ne', 'nw']).toContain(atSaw.facing);
    const job = firstJob(cutting);
    job.labourRemaining = job.labourValue * 0.5;
    const assembling = tick(cutting, 1);
    // At his place at the bench, which is a family with places like any other (CLAUDE.md T25 2.2).
    expect(assembling.owner.station).toBe(machineStation('workbench'));
    // And the hall draws him there, with what he is doing under his name.
    expect(renderHall(assembling)).toContain('workbench');
  });

  it('stands the man the budget saw has no place for at his home cell, and says so', () => {
    const state = tick(withOnlyCuttingLeft(twoMenOnSheetWork({ saws: 1, sawVariant: 'budget' })), 1);
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    expect(joiner.station).toBe(STATION_HOME);
    const svg = renderHall(state);
    expect(svg).toContain('no place at the saw');
    // He is not in a heap at the saw: he stands at his own bench's cell (CLAUDE.md T25 2.3).
    const working = stationCell(state, machineStation('tableSaw'), { x: 0, y: 0 }, OWNER);
    const home = stationCell(state, STATION_HOME, { x: joiner.anchorX, y: joiner.anchorY }, joiner.id);
    expect({ x: home.x, y: home.y }).not.toEqual({ x: working.x, y: working.y });
  });

  it('stands two men at a standard saw s two places, side by side and neither on it', () => {
    const state = tick(withOnlyCuttingLeft(twoMenOnSheetWork({ saws: 1, sawVariant: 'standard' })), 1);
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    expect(joiner.station).toBe(machineStation('tableSaw'));
    const first = stationCell(state, machineStation('tableSaw'), { x: 0, y: 0 }, OWNER);
    const second = stationCell(state, machineStation('tableSaw'), { x: 0, y: 0 }, joiner.id);
    expect({ x: second.x, y: second.y }).not.toEqual({ x: first.x, y: first.y });
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    const stands = footprintIn(saw);
    expect(first.y).toBeGreaterThanOrEqual(Math.floor(stands.y + stands.depth));
    expect(second.y).toBeGreaterThanOrEqual(Math.floor(stands.y + stands.depth));
  });

  it('has no cycle of minutes left in it at all', () => {
    const state = atWork();
    // Two hours at the same stage is two hours at the same station: nothing walks him back and
    // forth on a timer any more (CLAUDE.md T7 3.1).
    const stations = new Set<string>();
    let next = state;
    for (let minute = 0; minute < 120; minute += 1) {
      next = tick(next, 1);
      stations.add(next.owner.station);
    }
    expect(Array.from(stations)).toEqual([machineStation('tableSaw')]);
    expect(next.owner.productionMinutes).toBe(120);
  });

  it('puts the owner at his bench when the stage wants no machine', () => {
    const state = atWork();
    const job = firstJob(state);
    // The finishing of a laminate job is done at the bench with nothing but hands (T7 3.1).
    job.labourRemaining = job.labourValue * 0.05;
    const finishing = tick(state, 1);
    // A stage with nothing but hands is bench work, and bench work wants a place at a bench
    // (CLAUDE.md T25 2.3).
    expect(finishing.owner.station).toBe(machineStation('workbench'));
    // Nothing but his bench, so the cell he is given is the bench cell he was handed.
    const cell = stationCell(finishing, STATION_BENCH, { x: 7, y: 7 });
    expect({ x: cell.x, y: cell.y }).toEqual({ x: 7, y: 7 });
  });
});

describe('at the bench, not on it (PIOTR, 17.09; CLAUDE.md T19 2.4)', () => {
  /** The day 1 kit with a joiner hired and on the floor, which gives him a bench of his own. */
  function withAJoiner(): GameState {
    let state = fillRack(
      buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }),
      40,
    );
    for (const specId of ['workbench', 'locker', 'toolCabinet', 'handToolSet']) {
      state = buyNow(state, specId, specId === 'workbench' ? 'budget' : undefined);
    }
    const hired = hireNow(state, 'joiner', 'novice');
    for (const worker of hired.workers) worker.startDay = hired.clock.day;
    return hired;
  }

  it('stands the joiner at his bench and never on it', () => {
    const state = withAJoiner();
    const joiner = state.workers[0];
    if (!joiner) throw new Error('nobody was hired');
    joiner.station = STATION_BENCH;
    // The cell the engine keeps for him is his bench's own anchor cell: that is what used to be
    // drawn under his feet.
    const his = { x: joiner.anchorX, y: joiner.anchorY };
    const bench = itemAtCell(state, his);
    if (bench === null) throw new Error('his cell is not a bench');
    expect(bench.specId).toBe('workbench');
    const cell = stationCell(state, STATION_BENCH, his);
    expect({ x: cell.x, y: cell.y }).toEqual(standingCell(state, bench, 'operator'));
    expect(itemAtCell(state, cell)).toBeNull();
    expect(isFree(state, cell)).toBe(true);
    const at = footprintCells(bench);
    expect(cell.y).toBe(at.y + at.depth);
    // And the hall really draws him there, feet on that cell.
    const svg = renderHall(state);
    expect(svg).toContain(`data-worker="${joiner.id}"`);
    const figure = svg.slice(svg.indexOf(`data-worker="${joiner.id}"`) - 400);
    expect(figure).toContain(`data-cell="${cell.x},${cell.y}"`);
  });

  it('stands the helper at the fan and never on it', () => {
    // His own corner of the hall is the fan's anchor cell, which is a cell the fan stands on: the
    // same bug and the same one fix.
    let state = withAJoiner();
    state = buyNow(state, 'extractor', 'standard');
    const hired = hireNow(state, 'helper', null);
    for (const worker of hired.workers) worker.startDay = hired.clock.day;
    const helper = hired.workers.find((worker) => worker.role === 'helper');
    if (!helper) throw new Error('no helper');
    helper.station = STATION_BENCH;
    const fan = hired.equipment.find((item) => item.specId === 'extractor');
    if (!fan) throw new Error('no fan');
    const cell = stationCell(hired, STATION_BENCH, { x: fan.anchorX, y: fan.anchorY });
    expect(itemAtCell(hired, cell)).toBeNull();
  });
});
