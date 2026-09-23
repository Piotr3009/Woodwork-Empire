// The cross check of CLAUDE.md T25 section 7, the part no task's own test already asserts: the
// saves open, and after one minute nobody is at a waiting cell and nobody stands on another man's
// cell. The brief names a day 53 fixture of seven men and two saws; the tree has none (docs/
// notes-t25.md 6), so the check runs on every save the tree has, the day 115 one being seven people
// and three saws.
//
// The rest of section 7 is asserted where its task put it: four men at a used saw for a full day
// and two at a standard one (tests/engine/dayPlan.test.ts), a man taken off freeing his place the
// next minute (the same, and tests/engine/nobodyMoved.test.ts), a used and an industrial saw
// cutting at 1.12 (tests/engine/variants.test.ts), four men over two saws at four places
// (tests/render/placesFigures.test.ts), the contract line falling with a saw sold
// (tests/engine/contractHall.test.ts).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateState } from '../../src/engine/migrate';
import { OWNER } from '../../src/engine/machines';
import { homeCellOf } from '../../src/engine/staff';
import {
  STATION_BENCH,
  STATION_HOME,
  stationMachine,
} from '../../src/engine/stations';
import { ownerBenchCell, stationCell } from '../../src/render/hall';
import type { GameState } from '../../src/engine/index';
import { runClock } from '../helpers';

const SAVES = [
  'tests/fixtures/day115-v25.woodwork.json',
  'tests/fixtures/day128-v25.woodwork.json',
  'tests/fixtures/day149-v25.woodwork.json',
  'tests/fixtures/save-v18.woodwork.json',
  'tests/fixtures/save-v19.woodwork.json',
  'tests/fixtures/save-v20.woodwork.json',
];

/** The station words the queue stood men at, before v52 (CLAUDE.md T25 2.2, section 4). */
const QUEUE_STATIONS = /^(waiting:|place:|second:|noBench$)/;

function open(path: string): GameState {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    state: Record<string, unknown> & { version: number };
  };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error(`${path} did not open`);
  return state;
}

/** Where every man who is on the floor at a place or at his home cell stands: the men the queue
 *  used to heap up. The men at a door, in a room or at the gate stand where their errand is. */
function floorCells(state: GameState): Array<{ who: string; cell: string }> {
  const out: Array<{ who: string; cell: string }> = [];
  const onTheFloor = (station: string): boolean =>
    stationMachine(station) !== null || station === STATION_BENCH || station === STATION_HOME;
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day || worker.absentDaysRemaining > 0) continue;
    if (!onTheFloor(worker.station)) continue;
    const cell = stationCell(state, worker.station, homeCellOf(state, worker), worker.id);
    out.push({ who: worker.id, cell: `${cell.x},${cell.y}` });
  }
  if (state.owner.present && onTheFloor(state.owner.station)) {
    const cell = stationCell(state, state.owner.station, ownerBenchCell(state), OWNER);
    out.push({ who: OWNER, cell: `${cell.x},${cell.y}` });
  }
  return out;
}

describe('every save the tree has, one minute after it opens (CLAUDE.md T25 section 7)', () => {
  for (const path of SAVES) {
    it(`opens ${path.split('/').pop()} with nobody at a waiting cell and nobody on another man s cell`, () => {
      const state = runClock(open(path), 1);
      for (const man of [state.owner, ...state.workers]) {
        expect(man.station, 'a queue station survived the lift').not.toMatch(QUEUE_STATIONS);
      }
      const cells = floorCells(state);
      const seen = new Map<string, string>();
      for (const { who, cell } of cells) {
        expect(seen.get(cell), `${who} on ${seen.get(cell)}'s cell ${cell}`).toBeUndefined();
        seen.set(cell, who);
      }
      for (const item of state.equipment) expect(item.takenBy ?? null).toBeNull();
    });
  }

  it('has the day 115 save s seven people and three saws, and spreads the working men over them', () => {
    const state = runClock(open('tests/fixtures/day115-v25.woodwork.json'), 1);
    expect(state.workers.length + 1).toBe(7);
    expect(state.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(3);
    expect(floorCells(state).length).toBeGreaterThan(1);
  });
});
