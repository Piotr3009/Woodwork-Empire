// Walking between the machines (PIOTR, 02.10: "they walk over the machines... they should walk
// between the machines"; CLAUDE.md T26 2.3, 7): a walk crosses no footprint and no cell a
// machine's picture covers, goes the long way round when it has to, and takes the straight line
// only for a cell with no free neighbour at all.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateState } from '../../src/engine/migrate';
import { findSpec, isSold, itemStandsInTheHall } from '../../src/engine/machines';
import { covers, footprintCells, isFree, pictureCovers, walkRoute } from '../../src/engine/walk';
import { standingCell } from '../../src/engine/stations';
import { figureStandings } from '../../src/render/hall';
import type { Equipment, GameState } from '../../src/engine/index';
import { day53Hall, runClock } from '../helpers';

function standing(state: GameState): Equipment[] {
  return state.equipment.filter((item) => !isSold(item) && itemStandsInTheHall(item));
}

/** A cell something stands on, or a machine's picture covers. */
function onAMachine(state: GameState, cell: { x: number; y: number }): string | null {
  for (const item of standing(state)) {
    if (covers(footprintCells(item), cell)) return `${item.id} footprint`;
    if (findSpec(item.specId)?.category === 'machine' && pictureCovers(item, cell)) return `${item.id} picture`;
  }
  return null;
}

function fixture(path: string): GameState {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { state: Record<string, unknown> & { version: number } };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error(`${path} did not open`);
  return state;
}

describe('a walk on the day 53 hall', () => {
  it('goes from the bench row to the saw over no footprint and no picture', () => {
    const state = day53Hall();
    const bench = standing(state).find((item) => item.specId === 'workbench') as Equipment;
    const saw = standing(state).find((item) => item.specId === 'tableSaw') as Equipment;
    // From the bench's operator's cell to the saw's: the walk the day plan sends a man on every
    // half hour.
    const from = standingCell(state, bench, 'operator');
    const to = standingCell(state, saw, 'operator');
    expect(isFree(state, from)).toBe(true);
    expect(isFree(state, to)).toBe(true);
    const route = walkRoute(state, from, to);
    expect(route.kind).toBe('floor');
    // Every step between the two ends is on the walkway: on no footprint and on no machine's
    // picture (a bench's top reaching into its front row is where its men stand, and is no
    // machine's table).
    for (const cell of route.path.slice(1, -1)) {
      expect(onAMachine(state, cell), `${cell.x},${cell.y}`).toBeNull();
    }
    // And the saw's table is never crossed: no step is on its picture but the last.
    for (const cell of route.path.slice(0, -1)) expect(pictureCovers(saw, cell), `${cell.x},${cell.y}`).toBe(false);
    // A step at a time, never a jump.
    for (let at = 1; at < route.path.length; at += 1) {
      const a = route.path[at - 1];
      const b = route.path[at];
      expect(Math.abs((a?.x ?? 0) - (b?.x ?? 0)) + Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBe(1);
    }
  });

  it('goes the long way round a machine standing in the straight line', () => {
    const state = day53Hall();
    const cnc = standing(state).find((item) => item.specId === 'cnc') as Equipment;
    const box = footprintCells(cnc);
    // From the cell left of the CNC to the cell right of it: the straight line is through it.
    const from = { x: box.x - 1, y: box.y };
    const to = { x: box.x + box.width + 1, y: box.y };
    const route = walkRoute(state, from, to);
    expect(route.kind).not.toBe('straight');
    expect(route.path.length).toBeGreaterThan(to.x - from.x + 1);
    for (const cell of route.path.slice(1, -1)) expect(covers(box, cell)).toBe(false);
  });

  it('takes the straight line only for a cell with no free neighbour at all', () => {
    const state = day53Hall();
    // A cell inside the office block has no free neighbour: the one case left for the line.
    const boxed = { x: 1, y: 1 };
    for (const step of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      expect(isFree(state, { x: boxed.x + step.x, y: boxed.y + step.y })).toBe(false);
    }
    expect(walkRoute(state, { x: 8, y: 7 }, boxed).kind).toBe('straight');
  });
});

describe('how often the fixtures walk the straight line', () => {
  it('is never, from every figure s cell to every other s, on the day 53, 128 and 149 halls', () => {
    const halls: Array<[string, GameState]> = [
      ['day 53', runClock(day53Hall(), 10)],
      ['day 128', runClock(fixture('tests/fixtures/day128-v25.woodwork.json'), 1)],
      ['day 149', runClock(fixture('tests/fixtures/day149-v25.woodwork.json'), 1)],
    ];
    const counts: Record<string, Record<string, number>> = {};
    for (const [name, state] of halls) {
      const cells = [...figureStandings(state).values()];
      const kinds: Record<string, number> = { floor: 0, overhang: 0, straight: 0 };
      for (const from of cells) {
        for (const to of cells) {
          if (from === to) continue;
          kinds[walkRoute(state, from, to).kind] = (kinds[walkRoute(state, from, to).kind] ?? 0) + 1;
        }
      }
      counts[name] = kinds;
    }
    // The figures for the report (REPORT-T26.md, T26-C3).
    console.log('WALKS', JSON.stringify(counts));
    for (const [name, kinds] of Object.entries(counts)) expect(kinds.straight, name).toBe(0);
  });
});
