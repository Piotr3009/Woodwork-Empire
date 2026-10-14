/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 32, 2.1: the two glass racks [PIOTR, 13.10: "yes": 40 glass units at £1,500 and 200 at
// £6,000], in the timber stores' shape, on the hall floor of any hall, drawn as any kit whose
// picture has not landed, never serviced, their plates and their sale's rule, and a window or a door
// on the board wanting one as it wants a timber store (CLAUDE.md T32 2.1, section 7).

import { describe, expect, it } from 'vitest';
import { MACHINE_ENDURANCE_HOURS } from '../../src/engine/constants';
import { lockReasonFor, missingEquipment, template, wantedKit, wantedName } from '../../src/engine/catalog';
import { canBuy } from '../../src/engine/game';
import { standsBehindTheWall, standsOutside } from '../../src/engine/layout';
import {
  boardCapacityOf,
  capacityOf,
  enduranceHoursFor,
  findSpec,
  isHeavy,
  isServiced,
  roomFor,
  sheetCapacityOf,
  glassCapacityOf,
  stockKindOf,
  stockStrandedBySale,
} from '../../src/engine/machines';
import { stockOnItem } from '../../src/engine/materials';
import { STATION_GLASS_RACK, STATION_OF_KIND, firstStoreOf, stationRow, storageSaleBlock } from '../../src/engine/stations';
import { renderHall } from '../../src/render/hall';
import { spriteFiles } from '../../src/render/sprites';
import { renderMachine } from '../../src/ui/machine';
import type { GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, newGame, placeEquipment, placeGlassRack } from '../helpers';

/** The 200 m2 unit with the day one kit and money in the bank. */
function smallHall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 1000000;
  return state;
}

describe('the two glass racks (CLAUDE.md T32 2.1)', () => {
  it('are two families of one class each in the storage tab, at Piotr s prices and chat s metres', () => {
    expect(findSpec('glassRack')).toMatchObject({
      name: 'Glass rack',
      folder: 'Glass racks',
      tab: 'storage',
      category: 'storage',
      price: 1500,
      deliveryDays: 3,
      width: 2,
      depth: 1,
      height: 2,
      zoneWidth: 2,
      zoneDepth: 2,
      glassCapacity: 40,
      sheetCapacity: 0,
      spriteKey: 'glassRack',
      effect: 'Holds the glass units of the windows and doors on the hall floor, upright in their frames.',
    });
    expect(findSpec('glassRackLarge')).toMatchObject({
      name: 'Large glass rack',
      folder: 'Large glass racks',
      tab: 'storage',
      category: 'storage',
      price: 6000,
      deliveryDays: 5,
      width: 4,
      depth: 2,
      height: 2.5,
      zoneWidth: 4,
      zoneDepth: 3,
      glassCapacity: 200,
      sheetCapacity: 0,
      spriteKey: 'glassRackLarge',
      effect: "Holds five times a glass rack's units on twice its floor.",
    });
    for (const id of ['glassRack', 'glassRackLarge']) {
      expect(findSpec(id)?.variants.map((variant) => variant.id)).toEqual(['standard']);
      expect(isHeavy(id, 'standard')).toBe(false);
      // They book no hours and are never serviced, as the timber stores.
      expect(MACHINE_ENDURANCE_HOURS[id]).toBe(100000);
      expect(enduranceHoursFor(id, 'standard')).toBe(100000);
      expect(isServiced(id)).toBe(false);
      // On the hall floor of any hall: neither rear kit nor yard kit.
      expect(standsBehindTheWall(id)).toBe(false);
      expect(standsOutside(id)).toBe(false);
      expect(canBuy(smallHall(), id)).toEqual({ ok: true, reason: '' });
      // Every rack is stood at its free side.
      expect(stationRow(id)).toEqual({ operator: 'freeSide', second: null });
    }
  });

  it('holds glass units and nothing else, and adds up as every rack does', () => {
    const state = smallHall();
    const small = placeGlassRack(state);
    const large = placeGlassRack(state, 'glassRackLarge');
    expect(glassCapacityOf(small)).toBe(40);
    expect(glassCapacityOf(large)).toBe(200);
    expect([sheetCapacityOf(small), boardCapacityOf(small)]).toEqual([0, 0]);
    expect(stockKindOf(small)).toBe('glass');
    expect(capacityOf(large, 'glass')).toBe(200);
    // Nothing else in the hall holds a glass unit, and the two hold what they hold between them.
    expect(roomFor(state, 'glass')).toBe(240);
    expect(roomFor(state, 'sheets')).toBe(roomFor(smallHall(), 'sheets'));
    // A rack sold stands until the van comes, and it is no room.
    large.soldOnDay = state.clock.day + 1;
    expect(roomFor(state, 'glass')).toBe(40);
  });

  it('has its picture from v98: the hall draws the art side s file of each, with its plate', () => {
    // Flipped in v98: G1 landed on 14.10 (docs/art/SPRITES.md 17), where the box and its name stood
    // in for each until then.
    for (const file of ['glassRack.standard.png', 'glassRack.standard.r.png', 'glassRackLarge.standard.png', 'glassRackLarge.standard.r.png']) {
      expect(spriteFiles()).toContain(file);
    }
    const state = buyNow(buyNow(smallHall(), 'glassRack'), 'glassRackLarge');
    const holder = document.createElement('div');
    holder.innerHTML = renderHall(state);
    for (const specId of ['glassRack', 'glassRackLarge']) {
      const rack = state.equipment.find((item) => item.specId === specId);
      if (rack === undefined) throw new Error(`the ${specId} is bought`);
      const drawn = holder.querySelector(`[data-kit="${rack.id}"]`);
      if (drawn === null) throw new Error(`the ${specId} is drawn`);
      expect(drawn.querySelector('image')?.getAttribute('href')).toBe(`/sprites/${specId}.standard.png`);
      expect(drawn.querySelector('.placeholder-art')).toBeNull();
      expect(drawn.querySelector('.rack-count')?.textContent).toBe('0');
      expect(stockOnItem(state, rack)).toBe(0);
    }
  });

  it('says what it holds on its catalogue card, with its picture from v98', () => {
    const holder = document.createElement('div');
    holder.innerHTML = renderMachine(smallHall(), 'glassRackLarge', '');
    expect(holder.textContent).toContain('Holds 200 glass units');
    // Flipped in v98: the picture slot holds the art side's file (docs/art/SPRITES.md 17).
    expect(holder.querySelector('[data-sprite="glassRackLarge"] img')?.getAttribute('src')).toBe('/sprites/glassRackLarge.standard.png');
  });

  it('is sold by the racks own rule: nothing on it, nobody at it', () => {
    const state = smallHall();
    const rack = placeGlassRack(state);
    expect(firstStoreOf(state, 'glass')?.id).toBe(rack.id);
    expect(STATION_OF_KIND.glass).toBe(STATION_GLASS_RACK);
    expect(stockStrandedBySale(state, rack)).toBe(0);
    expect(storageSaleBlock(state, rack)).toBe('');
    state.owner.station = STATION_GLASS_RACK;
    expect(storageSaleBlock(state, rack)).toBe('Somebody is standing at it');
  });
});

describe('the board asks for a glass rack (CLAUDE.md T32 2.1)', () => {
  it('lists it last for a window or a door, after the timber store, and never for a sheet product', () => {
    expect(wantedKit(template('sashWindows')).slice(-2)).toEqual(['timberRack', 'glassRack']);
    expect(wantedKit(template('frenchDoors')).at(-1)).toBe('glassRack');
    expect(wantedName('glassRack')).toBe('glass rack');
    expect(wantedKit(template('smallKitchen'))).not.toContain('glassRack');
  });

  it('locks a window with none in its own words, and takes it with either family', () => {
    const state = smallHall();
    placeEquipment(state, 'timberRack', { x: 14, y: 2 });
    const sash = template('sashWindows');
    expect(missingEquipment(state, sash)).toContain('glassRack');
    expect(lockReasonFor(state, sash)).toMatch(/, glass rack$/);
    const large = smallHall();
    placeEquipment(large, 'timberRack', { x: 14, y: 2 });
    placeGlassRack(large, 'glassRackLarge');
    expect(missingEquipment(large, sash)).not.toContain('glassRack');
    const small = smallHall();
    placeEquipment(small, 'timberRack', { x: 14, y: 2 });
    placeGlassRack(small);
    expect(missingEquipment(small, sash)).not.toContain('glassRack');
  });
});
