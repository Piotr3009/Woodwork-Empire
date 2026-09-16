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
    expect(STATION_TABLE.tableSaw?.operator).toEqual({ side: 'front', along: 'right' });
    expect(STATION_TABLE.thicknesser?.waiting).toEqual({ side: 'left', along: 0, out: 1 });
    expect(STATION_TABLE.cnc?.second).toEqual({ side: 'back', along: 'middle' });
    expect(STATION_TABLE.workbench?.second).toEqual({ side: 'back', along: 'right' });
  });

  it('puts the saw man at the right end of the front, back to us, and the waiting man at the left', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const at = box(saw);
    // A standard saw is 3 by 1 of machine (CLAUDE.md T7 3.3).
    expect(at.width).toBe(3);
    const operator = standingCell(state, saw, 'operator');
    expect(operator).toEqual({ x: at.x + at.width - 1, y: at.y + at.depth });
    expect(standingCell(state, saw, 'waiting')).toEqual({ x: at.x, y: at.y + at.depth });
    // Facing the saw from its front is facing away from the camera.
    expect(['ne', 'nw']).toContain(facingAt(operator, saw));
  });

  it('puts the thicknesser man at the left end facing along it, the waiting man a cell further', () => {
    const state = emptyHall();
    const thicknesser = placeEquipment(state, 'thicknesser', { variantId: 'standard', x: 8, y: 4 });
    const at = box(thicknesser);
    const operator = standingCell(state, thicknesser, 'operator');
    expect(operator).toEqual({ x: at.x - 1, y: at.y });
    expect(standingCell(state, thicknesser, 'waiting')).toEqual({ x: at.x - 2, y: at.y });
    // Along the machine: towards +x on the world, down-right on the screen.
    expect(facingAt(operator, thicknesser)).toBe('se');
  });

  it('reads the edgebander row off its footprint, and the CNC and bench second places off theirs', () => {
    const state = emptyHall();
    const edgebander = placeEquipment(state, 'edgebander', { variantId: 'standard', x: 8, y: 4 });
    const eb = box(edgebander);
    expect(standingCell(state, edgebander, 'operator')).toEqual({ x: eb.x + 1, y: eb.y + eb.depth });
    expect(standingCell(state, edgebander, 'waiting')).toEqual({ x: eb.x, y: eb.y + eb.depth });
    const cnc = placeEquipment(state, 'cnc', { variantId: 'standard', x: 12, y: 5 });
    const at = box(cnc);
    expect(standingCell(state, cnc, 'operator')).toEqual({ x: at.x + at.width - 1, y: at.y + at.depth });
    expect(standingCell(state, cnc, 'waiting')).toEqual({ x: at.x + Math.floor(at.width / 2), y: at.y + at.depth });
    expect(standingCell(state, cnc, 'second')).toEqual({ x: at.x + Math.floor(at.width / 2), y: at.y - 1 });
    const bench = placeEquipment(state, 'workbench', { variantId: 'standard', x: 15, y: 8 });
    const wb = box(bench);
    expect(standingCell(state, bench, 'operator')).toEqual({ x: wb.x, y: wb.y + wb.depth });
    expect(standingCell(state, bench, 'second')).toEqual({ x: wb.x + wb.width - 1, y: wb.y - 1 });
    expect(['sw', 'se']).toContain(facingAt(standingCell(state, bench, 'second'), bench));
  });

  it('turns to the first free side at the same position when the table cell is taken', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4 });
    const at = box(saw);
    const front = { x: at.x + at.width - 1, y: at.y + at.depth };
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
    expect(standingCell(state, saw, 'operator')).toEqual({ x: at.x + at.width - 1, y: at.y - 1 });
    expect(cellAt(at, { side: 'back', along: 'right' })).toEqual({ x: at.x + at.width - 1, y: at.y - 1 });
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
    expect(cell.y).toBe(at.y + at.depth);
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
    expect(cell.y).toBe(at.y - 1);
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
    placeEquipment(state, 'drill', { variantId: 'standard', x: first.x, y: first.y });
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
