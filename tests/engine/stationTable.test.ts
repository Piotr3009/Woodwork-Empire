// Where a man stands: the station table and the free side (CLAUDE.md T16 2.1). Every row of the
// table on a known layout, the rack on five placements, the pallet cell and its fallback, and the
// facing, which is always into the item.

import { describe, expect, it } from 'vitest';
import { GATE_LAYOUT, ROOM_LAYOUT } from '../../src/engine/constants';
import {
  STATION_TABLE,
  cellAt,
  facingAt,
  facingAtPallet,
  facingTowards,
  freeSideOf,
  palletCell,
  placeCellsAt,
  standingCell,
  standsOn,
} from '../../src/engine/stations';
import { footprintCells, isFree } from '../../src/engine/walk';
import type { Equipment, GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

function emptyHall(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.equipment = [];
  state.pipes = [];
  return state;
}

function box(item: Equipment): { x: number; y: number; width: number; depth: number } {
  return footprintCells(item);
}

describe('the station table', () => {
  it('has a row for every family the brief names, with its offsets', () => {
    for (const family of [
      'tableSaw',
      'thicknesser',
      'spindleMoulder',
      'edgebander',
      'cnc',
      'sprayBooth',
      'workbench',
      'sheetRack',
      'extractor',
    ]) {
      expect(STATION_TABLE[family], family).toBeDefined();
    }
    expect(STATION_TABLE.tableSaw?.operator).toEqual({ side: 'front', along: 'right', out: 1 });
    expect(STATION_TABLE.thicknesser?.operator).toEqual({ side: 'left', along: 0 });
    expect(STATION_TABLE.cnc?.second).toEqual({ side: 'back', along: 'middle' });
    // The bench's places are a row along its front, one to a column of its own footprint, from
    // Turn 24 (CLAUDE.md T24 2.5): its row names no second place, and `placeCellsAt` runs the
    // places on along the front from the operator's, the one list every family's places come off
    // (CLAUDE.md T25 2.6). The waiting cells went with the queue (T25 2.2).
    expect(STATION_TABLE.workbench?.second).toBeNull();
    for (const row of Object.values(STATION_TABLE)) expect(Object.keys(row).sort()).toEqual(['operator', 'second']);
  });

  it('keeps the man a cell out of the cells his own body would be painted over', () => {
    // The rows moved by T19 2.4, each with the figure it was measured at: how much of the man was
    // painted over the machine at the table's cell, and how much a cell further out. The bench's
    // own two places are deliberately not among them.
    expect(STATION_TABLE.tableSaw?.operator).toEqual({ side: 'front', along: 'right', out: 1 });
    expect(STATION_TABLE.edgebander?.operator).toEqual({ side: 'front', along: 1, out: 1 });
    expect(STATION_TABLE.cnc?.operator).toEqual({ side: 'front', along: 'right', out: 1 });
    expect(STATION_TABLE.sprayBooth?.operator).toEqual({ side: 'front', along: 'middle', out: 1 });
    expect(STATION_TABLE.workbench?.operator).toEqual({ side: 'front', along: 0 });
    expect(STATION_TABLE.spindleMoulder?.operator).toEqual({ side: 'front', along: 0 });
  });

  it('never stands a man on the thing he is using, whatever the family', () => {
    // Nobody stands on a thing (CLAUDE.md T19 1): every cell the table gives, for every family and
    // every role it defines, is a free cell of the floor and none of it is the item's own.
    const families: Array<[string, string]> = [
      ['tableSaw', 'standard'],
      ['thicknesser', 'standard'],
      ['spindleMoulder', 'standard'],
      ['edgebander', 'standard'],
      ['cnc', 'standard'],
      ['sprayBooth', 'standard'],
      ['workbench', 'standard'],
      ['sheetRack', 'standard'],
      ['extractor', 'standard'],
      ['compressor', 'standard'],
    ];
    for (const [specId, variantId] of families) {
      const state = emptyHall();
      const item = placeEquipment(state, specId, { variantId, x: 8, y: 4 });
      const at = box(item);
      for (const role of ['operator', 'second'] as const) {
        const cell = standingCell(state, item, role);
        expect(isFree(state, cell), `${specId} ${role}`).toBe(true);
        const onIt =
          cell.x >= at.x && cell.x < at.x + at.width && cell.y >= at.y && cell.y < at.y + at.depth;
        expect(onIt, `${specId} ${role}`).toBe(false);
      }
    }
  });

  it('lays an item s places along one side, the operator first and the rest beside him', () => {
    // A machine's places, and a bench's, off the one list (CLAUDE.md T19 2.5, T25 2.6).
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const places = placeCellsAt(state, saw, 5);
    expect(places).toHaveLength(5);
    expect(places[0]).toEqual(standingCell(state, saw, 'operator'));
    for (const cell of places) expect(isFree(state, cell)).toBe(true);
    expect(new Set(places.map((cell) => `${cell.x},${cell.y}`)).size).toBe(5);
    expect(placeCellsAt(state, saw, 0)).toEqual([]);
    expect(placeCellsAt(state, saw, 1)).toEqual([standingCell(state, saw, 'operator')]);

    // The bench on open floor, where there is room for a queue at all.
    const floor = emptyHall();
    const bench = placeEquipment(floor, 'workbench', { variantId: 'standard', x: 8, y: 4 });
    const men = placeCellsAt(floor, bench, 4);
    expect(men).toHaveLength(4);
    expect(men[0]).toEqual(standingCell(floor, bench, 'operator'));
    const wb = box(bench);
    // Every place is on the front, where the player sees them, and the first of them are the
    // bench's own columns: nobody is drawn behind it or off the end of it (CLAUDE.md T24 2.5).
    expect(men[1]?.y).toBe(wb.y + wb.depth);
    expect(men[1]?.x).toBe(wb.x + 1);
    for (const cell of men) expect(cell.y).toBeGreaterThanOrEqual(wb.y + wb.depth);
    for (const cell of men.slice(0, wb.width)) {
      expect(cell.x).toBeGreaterThanOrEqual(wb.x);
      expect(cell.x).toBeLessThan(wb.x + wb.width);
    }
    expect(new Set(men.map((cell) => `${cell.x},${cell.y}`)).size).toBe(4);
  });

  it('puts the saw man at the right end of the front, back to us', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const at = box(saw);
    // A standard saw is 3 by 1 of machine (CLAUDE.md T7 3.3).
    expect(at.width).toBe(3);
    const operator = standingCell(state, saw, 'operator');
    // A cell out from the table, where the floor is his and not the saw's (CLAUDE.md T19 2.4).
    expect(operator).toEqual({ x: at.x + at.width - 1, y: at.y + at.depth + 1 });
    // Facing the saw from its front is facing away from the camera.
    expect(['ne', 'nw']).toContain(facingAt(operator, saw));
  });

  it('puts the thicknesser man at the left end facing along it', () => {
    const state = emptyHall();
    const thicknesser = placeEquipment(state, 'thicknesser', { variantId: 'standard', x: 8, y: 4 });
    const at = box(thicknesser);
    const operator = standingCell(state, thicknesser, 'operator');
    expect(operator).toEqual({ x: at.x - 1, y: at.y });
    // Along the machine: towards +x on the world, down-right on the screen.
    expect(facingAt(operator, thicknesser)).toBe('se');
  });

  it('reads the edgebander row off its footprint, and the CNC and bench second places off theirs', () => {
    const state = emptyHall();
    const edgebander = placeEquipment(state, 'edgebander', { variantId: 'standard', x: 8, y: 4 });
    const eb = box(edgebander);
    expect(standingCell(state, edgebander, 'operator')).toEqual({ x: eb.x + 1, y: eb.y + eb.depth + 1 });
    const cnc = placeEquipment(state, 'cnc', { variantId: 'standard', x: 12, y: 5 });
    const at = box(cnc);
    expect(standingCell(state, cnc, 'operator')).toEqual({ x: at.x + at.width - 1, y: at.y + at.depth + 1 });
    expect(standingCell(state, cnc, 'second')).toEqual({ x: at.x + Math.floor(at.width / 2), y: at.y - 1 });
    const bench = placeEquipment(state, 'workbench', { variantId: 'standard', x: 15, y: 8 });
    const wb = box(bench);
    expect(standingCell(state, bench, 'operator')).toEqual({ x: wb.x, y: wb.y + wb.depth });
    const second = placeCellsAt(state, bench, 2)[1];
    if (second === undefined) throw new Error('two places are wanted');
    expect(second).toEqual({ x: wb.x + 1, y: wb.y + wb.depth });
    expect(['nw', 'ne']).toContain(facingAt(second, bench));
  });

  it('turns to the first free side at the same position when the table cell is taken', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const at = box(saw);
    const front = cellAt(at, { side: 'front', along: 'right', out: 1 });
    // Another machine standing on the front cell: the table's cell is not free. A second saw is
    // anchored so that its own footprint covers that cell.
    let covered = false;
    for (let dy = 0; dy <= 2 && !covered; dy += 1) {
      for (let dx = 0; dx <= 2 && !covered; dx += 1) {
        const trial = emptyHall();
        placeEquipment(trial, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
        placeEquipment(trial, 'tableSaw', { variantId: 'standard', x: front.x - dx, y: front.y - dy });
        if (!isFree(trial, front)) {
          placeEquipment(state, 'tableSaw', { variantId: 'standard', x: front.x - dx, y: front.y - dy });
          covered = true;
        }
      }
    }
    expect(isFree(state, front)).toBe(false);
    // The same position along the next free side, with the cell out kept: a row that stands a man
    // a cell clear of the front stands him a cell clear of the back too (CLAUDE.md T19 2.4).
    expect(standingCell(state, saw, 'operator')).toEqual(cellAt(at, { side: 'back', along: 'right', out: 1 }));
    expect(cellAt(at, { side: 'back', along: 'right', out: 1 })).toEqual({ x: at.x + at.width - 1, y: at.y - 2 });
  });
});

describe('the free side of a rack', () => {
  function rackAt(x: number, y: number): { state: GameState; rack: Equipment } {
    const state = emptyHall();
    const rack = placeEquipment(state, 'sheetRack', { variantId: 'standard', x, y });
    return { state, rack };
  }

  it('is the hall side under the canteen: he stands in front, facing north', () => {
    const canteen = ROOM_LAYOUT.find((room) => room.id === 'canteen');
    if (!canteen) throw new Error('no canteen');
    const { state, rack } = rackAt(canteen.x, canteen.y + canteen.depth);
    const at = standsOn(rack);
    expect(freeSideOf(state, rack)).toBe('front');
    const cell = standingCell(state, rack);
    // A cell out from the rack: hard against it the rack was painted over half the man (T19 2.4).
    expect(cell.y).toBe(at.y + at.depth + 1);
    expect(['ne', 'nw']).toContain(facingAt(cell, rack));
  });

  it('is behind it against the front kerb: he stands at the back, facing south', () => {
    const state = emptyHall();
    const depth = box(placeEquipment(emptyHall(), 'sheetRack', { variantId: 'standard', x: 9, y: 2 })).depth;
    const rack = placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 9, y: state.unit.depthCells - depth });
    const at = standsOn(rack);
    expect(at.y + at.depth).toBe(state.unit.depthCells);
    expect(freeSideOf(state, rack)).toBe('back');
    const cell = standingCell(state, rack);
    expect(cell.y).toBe(at.y - 2);
    expect(['se', 'sw']).toContain(facingAt(cell, rack));
  });

  it('is never between the rack and a side wall, and is the front in the open', () => {
    const left = rackAt(0, 6);
    expect(freeSideOf(left.state, left.rack)).not.toBe('left');
    expect(isFree(left.state, standingCell(left.state, left.rack))).toBe(true);
    const width = box(left.rack).width;
    const right = rackAt(left.state.unit.widthCells - width, 6);
    expect(freeSideOf(right.state, right.rack)).not.toBe('right');
    expect(isFree(right.state, standingCell(right.state, right.rack))).toBe(true);
    const open = rackAt(9, 6);
    expect(freeSideOf(open.state, open.rack)).toBe('front');
  });
});

describe('the pallet', () => {
  it('has the man in front of it on the hall side, facing it, and between it and the office when that is taken', () => {
    const state = emptyHall();
    const first = { x: GATE_LAYOUT.x + GATE_LAYOUT.width, y: GATE_LAYOUT.y + 1 };
    expect(palletCell(state)).toEqual(first);
    expect(facingAtPallet(first)).toBe('nw');
    // Something standing on that cell: the fallback, facing south.
    placeEquipment(state, 'compressor', { variantId: 'budget', x: first.x, y: first.y });
    const fallback = palletCell(state);
    expect(fallback).toEqual({ x: GATE_LAYOUT.x + 1, y: GATE_LAYOUT.y - 1 });
    expect(['sw', 'se']).toContain(facingAtPallet(fallback));
  });

  it('faces the way the screen vector says', () => {
    expect(facingTowards({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe('se');
    expect(facingTowards({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe('nw');
    expect(facingTowards({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe('sw');
    expect(facingTowards({ x: 0, y: 0 }, { x: 0, y: -1 })).toBe('ne');
  });
});
