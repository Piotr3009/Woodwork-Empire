// Where a figure stands: at the machine of the stage he is working, or waiting at one somebody
// else has. The Turn 2 cycle of fifteen minutes at the bench and five at the saw is gone
// (CLAUDE.md T7 3.1 and 3.9).

import { describe, expect, it } from 'vitest';
import { footprintIn, renderHall, stationCell } from '../../src/render/hall';
import { STATION_BENCH, machineStation, waitingStation } from '../../src/engine/stations';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  twoMenOnSheetWork,
} from '../helpers';

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
    // He is at the front edge of the saw itself, not at the corner of its working zone: a used
    // saw is 2 by 1 of machine centred on 3 by 3 of floor (CLAUDE.md T7 3.3).
    const stands = footprintIn(saw);
    expect(atSaw).toEqual({ x: Math.floor(stands.x), y: Math.floor(stands.y + stands.depth) });
    expect(atSaw.y).toBeGreaterThan(saw.anchorY);
    const job = firstJob(cutting);
    job.labourRemaining = job.labourValue * 0.5;
    const assembling = tick(cutting, 1);
    expect(assembling.owner.station).toBe('bench');
    // And the hall draws him there, with what he is doing under his name.
    expect(renderHall(assembling)).toContain('the bench');
  });

  it('stands the man who cannot have the saw at it, and says what he is waiting for', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1 }), 1);
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    expect(joiner.station).toBe(waitingStation('tableSaw'));
    const svg = renderHall(state);
    expect(svg).toContain('waiting for table saw');
    // He waits beside the man who has it rather than on top of him.
    const working = stationCell(state, machineStation('tableSaw'), { x: 0, y: 0 });
    const waiting = stationCell(state, waitingStation('tableSaw'), { x: 0, y: 0 });
    expect(waiting).not.toEqual(working);
    expect(waiting.y).toBe(working.y);
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
    expect(finishing.owner.station).toBe('bench');
    // Nothing but his bench, so the cell he is given is the bench cell he was handed.
    expect(stationCell(finishing, STATION_BENCH, { x: 7, y: 7 })).toEqual({ x: 7, y: 7 });
  });
});
