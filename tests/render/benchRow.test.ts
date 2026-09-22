// The men at a bench stand on its front row (REPORT-T23 0.12; CLAUDE.md T24 2.5). The second place
// was the back right cell, which on a two wide bench is the cell diagonally off its top corner:
// measured, a bench at 8,6 put the first man at 8,7 and the second at 9,5, and at the fit he read
// as standing past the end of the bench. Every place is a column of the bench's own footprint now.

import { describe, expect, it } from 'vitest';
import { BENCH } from '../../src/engine/machines';
import {
  benchCellsAt,
  placeStation,
  secondStation,
  standingCell,
  standsOn,
} from '../../src/engine/stations';
import { stationCell } from '../../src/render/hall';
import type { Equipment, GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

/** A hall with one bench of this class at 8,6 and nothing else in the way. */
function benchAt(variantId: string): { state: GameState; bench: Equipment } {
  const state = newGame({ difficulty: 'veryEasy' });
  state.equipment = [];
  const bench = placeEquipment(state, BENCH, { variantId, x: 8, y: 6, id: 'kit-bench-1' });
  return { state, bench };
}

/** True when the cell is in front of the bench's own footprint: its own column range, one row out. */
function onTheFrontRow(bench: Equipment, cell: { x: number; y: number }): boolean {
  const box = standsOn(bench);
  return cell.y === box.y + box.depth && cell.x >= box.x && cell.x < box.x + box.width;
}

describe('the places at a bench', () => {
  it('puts the two men of a standard bench at 8,6 on 8,7 and 9,7', () => {
    const { state, bench } = benchAt('standard');
    const cells = benchCellsAt(state, bench, 2);
    expect(cells).toEqual([
      { x: 8, y: 7 },
      { x: 9, y: 7 },
    ]);
    for (const cell of cells) expect(onTheFrontRow(bench, cell), JSON.stringify(cell)).toBe(true);
  });

  it('puts the three men of an industrial bench in a row across its three columns', () => {
    const { state, bench } = benchAt('industrial');
    const cells = benchCellsAt(state, bench, 3);
    expect(cells).toEqual([
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 10, y: 7 },
    ]);
    for (const cell of cells) expect(onTheFrontRow(bench, cell), JSON.stringify(cell)).toBe(true);
  });

  it('resolves the second and the place stations to those very cells and to nothing off the bench', () => {
    const { state, bench } = benchAt('industrial');
    const home = { x: bench.anchorX, y: bench.anchorY };
    const second = stationCell(state, secondStation(bench.id), home);
    const third = stationCell(state, placeStation(bench.id, 2), home);
    expect({ x: second.x, y: second.y }).toEqual({ x: 9, y: 7 });
    expect({ x: third.x, y: third.y }).toEqual({ x: 10, y: 7 });
    expect(onTheFrontRow(bench, second)).toBe(true);
    expect(onTheFrontRow(bench, third)).toBe(true);
    // And the operator is the first of the same row, so the three are one line.
    const operator = standingCell(state, bench, 'operator');
    expect(operator).toEqual({ x: 8, y: 7 });
  });

  it('never puts a man behind the bench again', () => {
    for (const variantId of ['used', 'budget', 'standard', 'pro', 'industrial']) {
      const { state, bench } = benchAt(variantId);
      const box = standsOn(bench);
      const second = standingCell(state, bench, 'second');
      expect(second.y, variantId).toBe(box.y + box.depth);
      for (const cell of benchCellsAt(state, bench, 3)) {
        expect(cell.y, `${variantId} ${JSON.stringify(cell)}`).toBeGreaterThanOrEqual(box.y + box.depth);
      }
    }
  });
});
