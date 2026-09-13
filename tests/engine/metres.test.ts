// The world unit is a metre from Turn 5 on (docs/art/SPRITES.md 9.1). Everything in this file
// checks that the one place a footprint is written down agrees with the contract, and that the
// projection still puts a cell where the painted hall expects it.

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS, findSpec } from '../../src/engine/index';
import {
  BENCH_SLOT_LAYOUT,
  CANTEEN_SLOT_LAYOUT,
  GATE_LANE,
  LOCKER_SLOT_LAYOUT,
  PERSONNEL_DOOR,
  RENT_PER_M2_MONTHLY,
  ROOM_LAYOUT,
  SHUTTER,
  STARTING_LAYOUT,
  roomById,
  roomDoorCell,
} from '../../src/engine/constants';
import { canPlaceSpec } from '../../src/engine/layout';
import { newGame } from '../helpers';
import { METRES_PER_CELL, TILE_HEIGHT, TILE_RISE, TILE_WIDTH, tileToScreen } from '../../src/render/iso';
import { spriteCanvas } from '../../src/render/sprites';

describe('one cell is one metre', () => {
  it('keeps the pixels of a cell and changes what a cell means', () => {
    // docs/art/SPRITES.md 9.1: 1 m = 48 by 24 px at 1x, 1 m of height = 24 px.
    expect(METRES_PER_CELL).toBe(1);
    expect(TILE_WIDTH).toBe(48);
    expect(TILE_HEIGHT).toBe(24);
    expect(TILE_RISE).toBe(24);
  });

  it('projects a cell where docs/art/SPRITES.md 9.2 puts it', () => {
    // The contract writes the projection on the 2x canvas as
    // sx = 600 + (x - y) * 48, sy = 288 + (x + y) * 24 - z * 48.
    // Halved and without the offsets, that is tileToScreen.
    const at2x = (x: number, y: number, z = 0) => ({
      x: 600 + (x - y) * 48,
      y: 288 + (x + y) * 24 - z * 48,
    });
    const corners: Array<[number, number, number]> = [
      [0, 0, 0],
      [20, 0, 0],
      [0, 10, 0],
      [20, 10, 0],
      [3, 4, 2.7],
    ];
    for (const [x, y, z] of corners) {
      const art = at2x(x, y, z);
      const game = tileToScreen(x, y, z);
      expect({ x: (art.x - 600) / 2, y: (art.y - 288) / 2 }, `${x},${y},${z}`).toEqual(game);
    }
  });
});

describe('footprints in metres', () => {
  it('gives the table saw the 2 by 1 by 1 m of the contract', () => {
    // The worked example of docs/art/SPRITES.md 9.1: 4 by 2 by 2 tiles is 2 by 1 by 1 m.
    const saw = findSpec('tableSaw');
    expect(saw).not.toBeNull();
    expect({ width: saw?.width, depth: saw?.depth, height: saw?.height }).toEqual({
      width: 2,
      depth: 1,
      height: 1,
    });
  });

  it('halves every footprint and never takes one below a whole cell', () => {
    // The tiles of Turns 1 to 4, which is what the halving was done from.
    const tiles: Record<string, [number, number, number]> = {
      desk: [3, 2, 1],
      chair: [1, 1, 1],
      laptop: [1, 1, 1],
      tableSaw: [4, 2, 2],
      drill: [1, 1, 1],
      edgebander: [3, 2, 2],
      compressor: [2, 2, 1],
      extractor: [2, 2, 3],
      workbench: [3, 2, 1],
      sheetRack: [4, 1, 2],
      sheetRackBetter: [4, 1, 2],
      locker: [1, 1, 2],
      canteenSeat: [1, 1, 1],
      handToolSet: [1, 1, 1],
      van: [4, 2, 2],
      forklift: [2, 2, 2],
      forkliftBetter: [2, 2, 2],
      thicknesser: [3, 2, 2],
      solidWoodTools: [3, 2, 2],
      cnc: [5, 3, 2],
      cncHead: [1, 1, 1],
      sprayBooth: [5, 3, 3],
      dustSystem: [3, 3, 4],
      flexiSystem: [3, 3, 4],
      pelletiser: [2, 2, 3],
    };
    // Every line of the catalogue is in the table above: a new family cannot slip in unmeasured.
    expect(EQUIPMENT_SPECS.map((spec) => spec.id).sort()).toEqual(Object.keys(tiles).sort());
    for (const spec of EQUIPMENT_SPECS) {
      const was = tiles[spec.id];
      expect(was, spec.id).toBeDefined();
      if (!was) continue;
      const half = (value: number): number => Math.max(1, Math.ceil(value / 2));
      expect({ width: spec.width, depth: spec.depth, height: spec.height }, spec.id).toEqual({
        width: half(was[0]),
        depth: half(was[1]),
        height: half(was[2]),
      });
    }
  });

  it('takes the sprite canvas from the metres, so the art is drawn at the new size', () => {
    // docs/art/SPRITES.md 9.1: the canvas formula of section 2 holds with w, d, h in metres.
    // The saw that wanted a 288 by 240 canvas on the old tiles wants 144 by 120 now.
    expect(spriteCanvas(2, 1, 1)).toEqual({ width: 144, height: 120 });
    expect(spriteCanvas(1, 1, 1)).toEqual({ width: 96, height: 96 });
  });
});

describe('the 200 square metre hall', () => {
  it('is the 20 by 10 m floor of the contract, and rents as 200 m2', () => {
    const state = newGame();
    expect(state.unit.widthCells).toBe(20);
    expect(state.unit.depthCells).toBe(10);
    expect(state.unit.widthCells * state.unit.depthCells).toBe(200);
    expect(state.unit.areaM2).toBe(200);
    // 12 per m2 a month (CLAUDE.md T2 3.4), so the painted hall costs 2400.
    expect(state.unit.rentMonthly).toBe(200 * RENT_PER_M2_MONTHLY);
  });

  it('gives the rooms the cells docs/art/SPRITES.md 9.3 registers the layers to', () => {
    expect(roomById('wc')).toMatchObject({ x: 0, y: 0, width: 1, depth: 2 });
    expect(roomById('office')).toMatchObject({ x: 1, y: 0, width: 2, depth: 4 });
    expect(roomById('canteen')).toMatchObject({ x: 3, y: 0, width: 2, depth: 4 });
    // 2 cells, 8 and 8.
    const cells = ROOM_LAYOUT.map((room) => room.width * room.depth);
    expect(cells).toEqual([2, 8, 8]);
    // All three blocks are 2.7 m high, which is what the art is drawn at.
    for (const room of ROOM_LAYOUT) expect(room.height, room.id).toBe(2.7);
  });

  it('leaves 174 cells for equipment, which is the contract arithmetic', () => {
    // 200 minus 18 for the rooms minus 8 for the gate lane (docs/art/SPRITES.md 9.3).
    const state = newGame();
    const rooms = ROOM_LAYOUT.reduce((sum, room) => sum + room.width * room.depth, 0);
    const lane = GATE_LANE.width * GATE_LANE.depth;
    expect(rooms).toBe(18);
    expect(lane).toBe(8);
    expect(state.unit.widthCells * state.unit.depthCells - rooms - lane).toBe(174);
    // And the same number counted cell by cell through the placement rule itself.
    let free = 0;
    for (let y = 0; y < state.unit.depthCells; y += 1) {
      for (let x = 0; x < state.unit.widthCells; x += 1) {
        if (canPlaceSpec(state, 'canteenSeat', x, y, null).ok) free += 1;
      }
    }
    expect(free).toBe(174);
  });

  it('puts the shutter and the personnel door in the left wall', () => {
    // docs/art/SPRITES.md 9.3: the shutter spans y 6 to 9 and is 3 m high, the door y 4.5 to 5.5.
    expect(SHUTTER).toEqual({ y: 6, width: 3, height: 3 });
    expect(PERSONNEL_DOOR).toEqual({ y: 4.5, width: 1 });
    // The lane starts at the shutter, so a lorry can come through it.
    expect(GATE_LANE.y).toBe(SHUTTER.y);
    expect(GATE_LANE.x).toBe(0);
  });

  it('centres each room door on the face that looks into the hall', () => {
    // The office and the canteen open on y = 4, the WC on y = 2.
    expect(roomDoorCell('office')).toEqual({ x: 2, y: 4 });
    expect(roomDoorCell('canteen')).toEqual({ x: 4, y: 4 });
    expect(roomDoorCell('wc')).toEqual({ x: 0, y: 2 });
  });

  it('keeps the starting layout off the rooms and off the lane', () => {
    const state = newGame();
    for (const [specId, slot] of Object.entries(STARTING_LAYOUT)) {
      if (slot.yard === true) continue;
      const check = canPlaceSpec(state, specId, slot.x, slot.y, null);
      expect(check, specId).toEqual({ ok: true, reason: '' });
    }
    // The bench, locker and canteen seat slots of a full hall fit too.
    const slots: Array<[string, typeof BENCH_SLOT_LAYOUT]> = [
      ['workbench', BENCH_SLOT_LAYOUT],
      ['locker', LOCKER_SLOT_LAYOUT],
      ['canteenSeat', CANTEEN_SLOT_LAYOUT],
    ];
    for (const [specId, layout] of slots) {
      for (const slot of layout) {
        const check = canPlaceSpec(state, specId, slot.x, slot.y, null);
        expect(check, `${specId} at ${slot.x},${slot.y}`).toEqual({ ok: true, reason: '' });
      }
    }
  });
});
