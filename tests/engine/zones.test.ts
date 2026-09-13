// A zone is floor the player cannot build on; a footprint is what the picture stands on. Both are
// the class's own, both are in metres, and the zone contains the footprint (CLAUDE.md T7 2, 3.3).

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { footprintOf, standsInTheHall, zoneOf } from '../../src/engine/machines';
import { boxOf, canPlaceSpec, firstFreeCell } from '../../src/engine/layout';
import { footprintIn } from '../../src/render/hall';
import { spriteBox } from '../../src/render/sprites';
import { tileToScreen } from '../../src/render/iso';
import { canBuy } from '../../src/engine/game';
import type { GameState } from '../../src/engine/index';
import { act, newGame, placeEquipment } from '../helpers';

/** An empty 200 m2 hall with money in the bank. */
function emptyHall(): GameState {
  return newGame({ difficulty: 'veryEasy' });
}

describe('what a class says about the floor', () => {
  it('gives the table saw the five zones of the brief, the biggest twenty square metres', () => {
    const zones: Array<[string, number, number]> = [
      ['used', 3, 3],
      ['budget', 3, 3],
      ['standard', 4, 3],
      ['pro', 6, 3],
      ['industrial', 5, 4],
    ];
    for (const [id, width, depth] of zones) {
      expect(zoneOf('tableSaw', id), id).toEqual({ width, depth });
    }
    // "max 20": the industrial saw is 4 by 2 of machine on 20 m2 of floor.
    expect(footprintOf('tableSaw', 'industrial')).toEqual({ width: 4, depth: 2, height: 1.2 });
    expect(zoneOf('tableSaw', 'industrial').width * zoneOf('tableSaw', 'industrial').depth).toBe(20);
  });

  it('contains the footprint in every class of every family', () => {
    for (const spec of EQUIPMENT_SPECS) {
      for (const variant of spec.variants) {
        const stands = footprintOf(spec.id, variant.id);
        const zone = zoneOf(spec.id, variant.id);
        const where = `${spec.id}.${variant.id}`;
        if (!standsInTheHall(spec.id, variant.id)) {
          expect(zone, where).toEqual({ width: 0, depth: 0 });
          continue;
        }
        expect(zone.width, where).toBeGreaterThanOrEqual(stands.width);
        expect(zone.depth, where).toBeGreaterThanOrEqual(stands.depth);
      }
    }
  });

  it('is what placement works on, not what the machine stands on', () => {
    // A used saw is 2 by 1 of machine on a 3 by 3 zone, so the cells it holds are the zone's.
    expect(boxOf('tableSaw', 4, 4, 'used')).toEqual({ x: 4, y: 4, width: 3, depth: 3 });
  });
});

describe('two things on the floor', () => {
  it('will not let two saws stand where their zones would overlap', () => {
    const state = emptyHall();
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 8, y: 4 });
    // The machines themselves would not touch: the first is 2 by 1 inside a 3 by 3 zone, so its
    // right hand cells are working room. The zone is what the floor gives up (CLAUDE.md T7 3.3).
    expect(canPlaceSpec(state, 'tableSaw', 10, 4, null, 'used').ok).toBe(false);
    expect(canPlaceSpec(state, 'tableSaw', 10, 4, null, 'used').reason).toBe('On the table saw');
    // Three metres along, and the two zones stand side by side.
    expect(canPlaceSpec(state, 'tableSaw', 11, 4, null, 'used').ok).toBe(true);
  });

  it('lets two benches stand edge to edge, because zones touch without overlapping', () => {
    const state = emptyHall();
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 8, y: 4 });
    // A bench is 2 by 1 on a 2 by 2 zone: the next one starts where the first one's zone ends.
    expect(canPlaceSpec(state, 'workbench', 10, 4, null, 'budget').ok).toBe(true);
    expect(canPlaceSpec(state, 'workbench', 9, 4, null, 'budget').ok).toBe(false);
    // And down the hall as well as along it.
    expect(canPlaceSpec(state, 'workbench', 8, 6, null, 'budget').ok).toBe(true);
    expect(canPlaceSpec(state, 'workbench', 8, 5, null, 'budget').ok).toBe(false);
  });

  it('refuses a machine the hall has no room for, and says how much room it wants', () => {
    let state = emptyHall();
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'extractor' });
    // A floor edgebander wants extraction and a free 5 by 3 (CLAUDE.md T7 3.6).
    expect(canBuy(state, 'edgebander', 'standard').ok).toBe(true);
    const full = { ...state, equipment: [...state.equipment] };
    // Fill the floor with cabinets, which hold a cell each, and nothing 5 by 3 is left.
    for (let y = 0; y < full.unit.depthCells; y += 1) {
      for (let x = 0; x < full.unit.widthCells; x += 1) {
        if (canPlaceSpec(full, 'toolCabinet', x, y, null).ok) {
          placeEquipment(full, 'toolCabinet', { x, y, id: `cab-${x}-${y}` });
        }
      }
    }
    expect(firstFreeCell(full, 'edgebander', 'standard')).toBeNull();
    const refused = canBuy(full, 'edgebander', 'standard');
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe('No free 5 by 3 m in the hall');
  });

  it('needs extraction before a floor edgebander, where a hand one needs a cabinet', () => {
    const bare = emptyHall();
    expect(canBuy(bare, 'edgebander', 'standard').reason).toBe(
      'Needs Extractor or Central dust extraction system or Flexi extraction system first',
    );
    expect(canBuy(bare, 'edgebander', 'budget').reason).toBe('Needs Tool cabinet first');
  });
});

describe('where the picture stands', () => {
  it('centres the footprint in the zone and anchors it at the footprint corner', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 8, y: 4 });
    // A pro saw is 3 by 2 of machine on a 6 by 3 zone, so it stands one and a half metres in
    // along the zone and half a metre down it.
    const stands = footprintIn(saw);
    expect(stands).toEqual({ x: 9.5, y: 4.5, width: 3, depth: 2, height: 1 });
    const zone = zoneOf('tableSaw', 'pro');
    expect(stands.x).toBeGreaterThanOrEqual(saw.anchorX);
    expect(stands.x + stands.width).toBeLessThanOrEqual(saw.anchorX + zone.width);
    expect(stands.y + stands.depth).toBeLessThanOrEqual(saw.anchorY + zone.depth);
    // And the picture's anchor pixel is the bottom corner of that footprint diamond.
    const box = spriteBox(stands.x, stands.y, stands.width, stands.depth, stands.height);
    const anchor = tileToScreen(stands.x + stands.width, stands.y + stands.depth);
    expect(box.x + box.width / 2).toBeCloseTo(anchor.x, 6);
    expect(box.y + box.height - 4).toBeCloseTo(anchor.y, 6);
  });

  it('anchors a hand edgebander in the cabinet slot it is kept in', () => {
    const state = emptyHall();
    const cabinet = placeEquipment(state, 'toolCabinet', { x: 5, y: 3 });
    const bander = placeEquipment(state, 'edgebander', { variantId: 'budget', x: 5, y: 3 });
    // It holds no cell of the floor, so its zone is nothing and its picture stands on the cell
    // the cabinet stands on (CLAUDE.md T7 3.5, 3.6).
    expect(zoneOf('edgebander', 'budget')).toEqual({ width: 0, depth: 0 });
    const stands = footprintIn(bander);
    expect({ x: stands.x, y: stands.y }).toEqual({ x: cabinet.anchorX, y: cabinet.anchorY });
    const box = spriteBox(stands.x, stands.y, 1, 1, 0.5);
    const anchor = tileToScreen(stands.x + 1, stands.y + 1);
    expect(box.x + box.width / 2).toBeCloseTo(anchor.x, 6);
    expect(box.y + box.height - 4).toBeCloseTo(anchor.y, 6);
  });
});

describe('the whole catalogue on one floor', () => {
  it('fits, with every zone standing clear of every other', () => {
    let state = emptyHall();
    state.cash = 1000000;
    // Twice round the list, because a line that wants another one first cannot be bought until
    // that one is standing in the hall.
    const forSale = EQUIPMENT_SPECS.filter((spec) => !spec.locked);
    for (let pass = 0; pass < 2; pass += 1) {
      for (const spec of forSale) {
        state = act(state, { type: 'BUY_EQUIPMENT', specId: spec.id });
      }
    }
    // Everything the catalogue sells is in the hall, and nothing is standing on anything else.
    for (const spec of forSale) {
      expect(state.equipment.some((item) => item.specId === spec.id), spec.id).toBe(true);
    }
    for (const item of state.equipment) {
      if (!standsInTheHall(item.specId, item.variantId)) continue;
      // The van stands on the apron outside the front kerb, which is not hall floor at all.
      if (item.anchorX >= state.unit.widthCells) continue;
      const check = canPlaceSpec(
        state,
        item.specId,
        item.anchorX,
        item.anchorY,
        item.id,
        item.variantId,
      );
      expect(check, `${item.specId} at ${item.anchorX},${item.anchorY}`).toEqual({
        ok: true,
        reason: '',
      });
    }
  });
});
