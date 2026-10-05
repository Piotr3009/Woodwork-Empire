/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 28, 2.1: the pelletiser stands behind the rear wall, where the flexi is (PIOTR, 05.10: "the
// pelletiser is to go where the flexi is, outside the building"). Everything the two central
// systems have behind the wall it has by the code that was already there: its place, the refusal
// with the wall full, no cell of the floor, no walking, dragging or turning. A v40 save with one on
// the floor opens with it behind the wall, and kit that stands outside asks for no free floor in
// the hall [TUNE: chat] (CLAUDE.md T28 2.1, section 4).

import { describe, expect, it } from 'vitest';
import { CENTRAL_EXTRACTION_SPECS, DUCT_SYSTEMS, STATE_VERSION } from '../../src/engine/constants';
import { canBuy, placeEquipmentOrder } from '../../src/engine/game';
import type { GameState } from '../../src/engine/index';
import { canPlace, firstFreeCell, hallItems, outsidePlaceFor, standsBehindTheWall, standsOutside } from '../../src/engine/layout';
import { hasCentralExtraction } from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { isFree, standsOutsideTheHall } from '../../src/engine/walk';
import { buyNow, buyStartingKit, newGame, placeEquipment } from '../helpers';

/** The day one hall with a flexi system behind the wall, which the pelletiser asks for first. */
function withFlexi(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 1000000;
  state.reputation = 100;
  const at = outsidePlaceFor(state, 'flexiSystem');
  if (at === null) throw new Error('no room behind the wall');
  placeEquipment(state, 'flexiSystem', { x: at.x, y: at.y, id: 'kit-flexi' });
  return state;
}

/** Every free cell of the hall floor taken by a used compressor, the smallest machine there is. */
function floorFull(state: GameState): GameState {
  let count = 0;
  for (let at = firstFreeCell(state, 'compressor', 'used'); at !== null; at = firstFreeCell(state, 'compressor', 'used')) {
    count += 1;
    placeEquipment(state, 'compressor', { variantId: 'used', x: at.x, y: at.y, id: `kit-filler-${count}` });
  }
  return state;
}

describe('the pelletiser behind the rear wall (CLAUDE.md T28 2.1)', () => {
  it('is plant that stands behind the wall, and still not a central system', () => {
    expect(standsOutside('pelletiser')).toBe(true);
    expect(standsBehindTheWall('pelletiser')).toBe(true);
    expect(DUCT_SYSTEMS).not.toContain('pelletiser');
    expect(CENTRAL_EXTRACTION_SPECS).not.toContain('pelletiser');
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    placeEquipment(state, 'pelletiser', { x: 13, y: -4, id: 'kit-pelletiser' });
    expect(hasCentralExtraction(state)).toBe(false);
  });

  it('is bought behind the wall, beside the flexi, and takes no cell of the floor', () => {
    const before = withFlexi();
    const expected = outsidePlaceFor(before, 'pelletiser');
    expect(expected).not.toBeNull();
    expect(expected?.y).toBeLessThan(0);
    const state = buyNow(before, 'pelletiser');
    const pelletiser = state.equipment.find((item) => item.specId === 'pelletiser');
    if (pelletiser === undefined) throw new Error('no pelletiser bought');
    expect({ x: pelletiser.anchorX, y: pelletiser.anchorY }).toEqual(expected);
    expect(standsOutsideTheHall(state, pelletiser)).toBe(true);
    expect(hallItems(state).some((item) => item.id === pelletiser.id)).toBe(false);
    // Not dragged and not turned: it stands in the yard, as the systems do.
    expect(canPlace(state, pelletiser.id, 4, 4)).toEqual({ ok: false, reason: 'It stands in the yard' });
    expect(canPlace(state, pelletiser.id, pelletiser.anchorX, pelletiser.anchorY, 1).ok).toBe(false);
    // Every cell of the floor is as free as it was before it was bought.
    for (let x = 0; x < state.unit.widthCells; x += 1) {
      for (let y = 0; y < state.unit.depthCells; y += 1) {
        expect(isFree(state, { x, y }), `${x},${y}`).toBe(isFree(before, { x, y }));
      }
    }
  });

  it('is put on order for its place behind the wall', () => {
    const state = withFlexi();
    const expected = outsidePlaceFor(state, 'pelletiser');
    expect(placeEquipmentOrder(state, 'pelletiser').ok).toBe(true);
    const held = state.onOrder.find((item) => item.specId === 'pelletiser');
    expect(held && { x: held.anchorX, y: held.anchorY }).toEqual(expected);
  });

  it('is refused with the wall full, in the systems words', () => {
    const state = withFlexi();
    let count = 1;
    for (let at = outsidePlaceFor(state, 'flexiSystem'); at !== null; at = outsidePlaceFor(state, 'flexiSystem')) {
      count += 1;
      placeEquipment(state, 'flexiSystem', { x: at.x, y: at.y, id: `kit-flexi-${count}` });
    }
    expect(outsidePlaceFor(state, 'pelletiser')).toBeNull();
    expect(canBuy(state, 'pelletiser')).toEqual({ ok: false, reason: 'No room behind the hall' });
  });

  it('is not refused by a full hall floor, and neither is a central system [TUNE: chat]', () => {
    const state = floorFull(withFlexi());
    expect(firstFreeCell(state, 'compressor', 'used')).toBeNull();
    // A machine that stands in the hall is refused, as it always was.
    expect(canBuy(state, 'compressor', 'used').ok).toBe(false);
    expect(canBuy(state, 'compressor', 'used').reason).toMatch(/^No free .* in the hall$/);
    expect(canBuy(state, 'pelletiser')).toEqual({ ok: true, reason: '' });
    expect(canBuy(state, 'flexiSystem')).toEqual({ ok: true, reason: '' });
    expect(canBuy(state, 'dustSystem', 'standard').ok).toBe(true);
  });

  it('moves a v40 pelletiser off the floor behind the wall, and frees its cells', () => {
    const state = withFlexi();
    const fresh = withFlexi();
    placeEquipment(state, 'pelletiser', { x: 8, y: 2, id: 'kit-pelletiser' });
    expect(isFree(state, { x: 9, y: 3 })).toBe(false);
    const expected = outsidePlaceFor(fresh, 'pelletiser');
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 40;
    const lifted = migrateState(raw, 40);
    if (lifted === null) throw new Error('the save is wanted');
    expect(lifted.version).toBe(STATE_VERSION);
    const moved = lifted.equipment.find((item) => item.id === 'kit-pelletiser');
    expect(moved && { x: moved.anchorX, y: moved.anchorY }).toEqual(expected);
    // No moving time is booked for it, and the floor it stood on is floor again.
    expect(lifted.movedItems).toEqual(state.movedItems);
    expect(hallItems(lifted).some((item) => item.id === 'kit-pelletiser')).toBe(false);
    for (let x = 0; x < lifted.unit.widthCells; x += 1) {
      for (let y = 0; y < lifted.unit.depthCells; y += 1) {
        expect(isFree(lifted, { x, y }), `${x},${y}`).toBe(isFree(fresh, { x, y }));
      }
    }
    // The flexi it stood beside is where it was.
    const flexi = lifted.equipment.find((item) => item.id === 'kit-flexi');
    const before = state.equipment.find((item) => item.id === 'kit-flexi');
    expect(flexi && { x: flexi.anchorX, y: flexi.anchorY }).toEqual(before && { x: before.anchorX, y: before.anchorY });
  });

  it('forgets a drag of it the player had not confirmed, so no moving time is booked', () => {
    const state = withFlexi();
    placeEquipment(state, 'pelletiser', { x: 12, y: 6, id: 'kit-pelletiser' });
    state.movedItems = [{ itemId: 'kit-pelletiser', fromX: 8, fromY: 2, fromOrientation: 0 }];
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 40;
    const lifted = migrateState(raw, 40);
    if (lifted === null) throw new Error('the save is wanted');
    const moved = lifted.equipment.find((item) => item.id === 'kit-pelletiser');
    expect(moved?.anchorY).toBeLessThan(0);
    expect(lifted.movedItems).toEqual([]);
  });

  it('moves a floor pelletiser of a save from before v73 with the systems, after them', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const kerb = state.unit.widthCells;
    placeEquipment(state, 'pelletiser', { x: 8, y: 2, id: 'kit-pelletiser' });
    placeEquipment(state, 'flexiSystem', { x: kerb, y: 4, id: 'kit-flexi-1' });
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 37;
    const lifted = migrateState(raw, 37);
    if (lifted === null) throw new Error('the save is wanted');
    const at = (id: string) => {
      const item = lifted.equipment.find((entry) => entry.id === id);
      return { x: item?.anchorX, y: item?.anchorY };
    };
    // The system takes the first place behind the wall, as v73 gave it, though it was bought
    // after the pelletiser, and the pelletiser the next.
    expect(at('kit-flexi-1')).toEqual({ x: kerb - 6, y: -3 });
    expect(at('kit-pelletiser').y).toBe(-4);
    expect(at('kit-pelletiser').x).toBeLessThan(kerb - 6);
  });

  it('moves one on order for the floor of a v40 save as well', () => {
    const state = withFlexi();
    const expected = outsidePlaceFor(state, 'pelletiser');
    expect(placeEquipmentOrder(state, 'pelletiser').ok).toBe(true);
    const held = state.onOrder.find((item) => item.specId === 'pelletiser');
    if (held === undefined) throw new Error('nothing on order');
    held.anchorX = 8;
    held.anchorY = 2;
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 40;
    const lifted = migrateState(raw, 40);
    const moved = lifted?.onOrder.find((item) => item.id === held.id);
    expect(moved && { x: moved.anchorX, y: moved.anchorY }).toEqual(expected);
  });

  it('leaves a v40 pelletiser where it stands when the wall has no room for it', () => {
    const state = withFlexi();
    let count = 1;
    for (let at = outsidePlaceFor(state, 'flexiSystem'); at !== null; at = outsidePlaceFor(state, 'flexiSystem')) {
      count += 1;
      placeEquipment(state, 'flexiSystem', { x: at.x, y: at.y, id: `kit-flexi-${count}` });
    }
    placeEquipment(state, 'pelletiser', { x: 8, y: 2, id: 'kit-pelletiser' });
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 40;
    const lifted = migrateState(raw, 40);
    const stays = lifted?.equipment.find((item) => item.id === 'kit-pelletiser');
    expect(stays && { x: stays.anchorX, y: stays.anchorY }).toEqual({ x: 8, y: 2 });
  });

  it('leaves a system an older lift left on the apron where it stands', () => {
    // The v73 lift found no length of the wall for it; tonight's moves the pelletiser and nothing
    // else (section 4: no machine of a save is touched).
    const state = withFlexi();
    const kerb = state.unit.widthCells;
    placeEquipment(state, 'flexiSystem', { x: kerb, y: 4, id: 'kit-flexi-apron' });
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 40;
    const lifted = migrateState(raw, 40);
    const apron = lifted?.equipment.find((item) => item.id === 'kit-flexi-apron');
    expect(apron && { x: apron.anchorX, y: apron.anchorY }).toEqual({ x: kerb, y: 4 });
  });
});
