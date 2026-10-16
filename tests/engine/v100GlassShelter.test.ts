/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v100: the glass shelter [PIOTR, 16.10: "an outside shelter for glass, 3,200 units"; "yes" to
// £60,000, 12 m along the wall by 3 m deep, ten working days; "later" to its picture]: 3,200 glass
// units outside behind the rear wall, as the timber shelter keeps its boards, counted with the
// glass racks, filled by the glass's Restock, standing in for a glass rack on the board, and drawn
// as kit with no picture until the art side draws it.

import { describe, expect, it } from 'vitest';
import { missingEquipment, template } from '../../src/engine/catalog';
import { standsBehindTheWall } from '../../src/engine/layout';
import { capacityOf, findSpec, glassCapacityOf, isServiced, roomFor, stockKindOf } from '../../src/engine/machines';
import { restockCheck } from '../../src/engine/materials';
import { firstStoreOf } from '../../src/engine/stations';
import { renderHall } from '../../src/render/hall';
import { spriteFiles } from '../../src/render/sprites';
import type { GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, newGame } from '../helpers';

function hall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 1000000;
  return state;
}

describe('the glass shelter (v100)', () => {
  it('is a family of one class in the storage tab, at Piotr s price, metres and days', () => {
    expect(findSpec('glassShelter')).toMatchObject({
      name: 'Glass shelter',
      folder: 'Glass shelters',
      tab: 'storage',
      category: 'storage',
      price: 60000,
      deliveryDays: 10,
      width: 12,
      depth: 3,
      height: 3,
      zoneWidth: 12,
      zoneDepth: 3,
      glassCapacity: 3200,
      sheetCapacity: 0,
      spriteKey: 'glassShelter',
    });
    expect(findSpec('glassShelter')?.variants).toHaveLength(1);
    expect(isServiced('glassShelter')).toBe(false);
    // No picture yet: the hall draws it as any kit whose picture has not landed.
    expect(spriteFiles().some((file) => file.startsWith('glassShelter'))).toBe(false);
  });

  it('stands outside behind the rear wall and holds 3,200 glass units and nothing else', () => {
    expect(standsBehindTheWall('glassShelter')).toBe(true);
    const state = buyNow(hall(), 'glassShelter');
    const shelter = state.equipment.find((item) => item.specId === 'glassShelter');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    expect(shelter.anchorY).toBeLessThan(0);
    expect(glassCapacityOf(shelter)).toBe(3200);
    expect(capacityOf(shelter, 'sheets')).toBe(0);
    expect(capacityOf(shelter, 'boards')).toBe(0);
    expect(stockKindOf(shelter)).toBe('glass');
    expect(roomFor(state, 'glass')).toBe(3200);
    // Nobody is walked out of the hall to it: a load of glass with only the shelter is unloaded at
    // the gate, as boards with only the timber shelter are.
    expect(firstStoreOf(state, 'glass')).toBeNull();
    // The glass's Restock fills it.
    expect(restockCheck(state, 'glass').ok).toBe(true);
    // Drawn as kit with no picture, its plate over the wall.
    const holder = document.createElement('div');
    holder.innerHTML = renderHall(state);
    expect(holder.innerHTML).toContain('Glass shelter: 0 / 3200');
    expect(holder.querySelectorAll('.rack-count-plate').length).toBe(
      state.equipment.filter((item) => stockKindOf(item) !== null).length,
    );
  });

  it('stands in for a glass rack on the board', () => {
    const sash = template('sashWindows');
    const without = hall();
    expect(missingEquipment(without, sash)).toContain('glassRack');
    const withShelter = buyNow(hall(), 'glassShelter');
    expect(missingEquipment(withShelter, sash)).not.toContain('glassRack');
  });
});
