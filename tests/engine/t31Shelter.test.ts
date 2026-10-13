/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.8: the timber shelter behind the rear wall [PIOTR, 11.10: "it hides our hall; rather
// where the extractors are, or behind them; nothing in the hall may be hidden"], 6 m along the wall
// by 3 m deep, and its plate hung over the wall's top (CLAUDE.md T31 2.8, section 7). A save's
// shelter on the apron moved there is asserted on raw saves in tests/cloud/migrate.test.ts.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { standsBehindTheWall, standsOutside } from '../../src/engine/layout';
import { itemFootprint } from '../../src/engine/machines';
import { tileToScreen } from '../../src/render/iso';
import { REAR_WALL, REAR_WALL_CLIP, renderHall } from '../../src/render/hall';
import { act, buyNow, buyStartingKit, newGame, nextDay, placeEquipment } from '../helpers';

/** A company in the 800 m² unit with the day one kit and its van. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = buyStartingKit(state);
  placeEquipment(state, 'van', { x: state.unit.widthCells, y: 7, id: 'kit-van' });
  state.cash = 500000;
  return state;
}

describe('the shelter behind the rear wall (CLAUDE.md T31 2.8)', () => {
  it('is declared 6 m along the wall by 3 m deep, its zone its footprint, and stands behind the wall with the plant', () => {
    const spec = EQUIPMENT_SPECS.find((entry) => entry.id === 'timberShelter');
    expect(spec).toMatchObject({ width: 6, depth: 3, height: 3, zoneWidth: 6, zoneDepth: 3 });
    expect(spec?.effect).toContain('outside behind the hall');
    expect(spec?.variants[0]?.description).toContain('outside behind the hall');
    expect(standsOutside('timberShelter')).toBe(true);
    expect(standsBehindTheWall('timberShelter')).toBe(true);
  });

  it('bought into the 800 m² unit, stands behind the rear wall, never on the apron, where the van stands alone', () => {
    const state = buyNow(bigUnit(), 'timberShelter');
    const shelter = state.equipment.find((item) => item.specId === 'timberShelter');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    expect(shelter.anchorY).toBe(-4);
    expect(shelter.anchorX + 6).toBeLessThanOrEqual(state.unit.widthCells);
    const foot = itemFootprint(shelter);
    expect([foot.width, foot.depth]).toEqual([6, 3]);
    const onTheApron = state.equipment.filter((item) => item.anchorX >= state.unit.widthCells && item.anchorY >= 0);
    expect(onTheApron.map((item) => item.specId)).toEqual(['van']);
  });

  it('is drawn through the rear wall s clip, its plate hung over the wall s top above it', () => {
    const state = buyNow(bigUnit(), 'timberShelter');
    const shelter = state.equipment.find((item) => item.specId === 'timberShelter');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    const holder = document.createElement('div');
    holder.innerHTML = renderHall(state);
    const drawn = holder.querySelector(`[data-kit="${shelter.id}"]`);
    if (drawn === null) throw new Error('the shelter is drawn');
    if (holder.querySelector(`#${REAR_WALL_CLIP}`) !== null) {
      expect(drawn.getAttribute('clip-path')).toBe(`url(#${REAR_WALL_CLIP})`);
    }
    const plate = drawn.querySelector('.rack-count-plate');
    const y = Number(plate?.getAttribute('y')) + Number(plate?.getAttribute('height')) / 2;
    const wallTop = tileToScreen(shelter.anchorX + 3, -REAR_WALL.back, REAR_WALL.top);
    // Over the wall's top, where it can be read and clicked, and above the middle of the shelter.
    expect(y).toBeLessThan(wallTop.y);
    expect(Number(plate?.getAttribute('x')) + Number(plate?.getAttribute('width')) / 2).toBeCloseTo(wallTop.x, 0);
    expect(drawn.querySelector('.rack-count')?.textContent).toBe('0');
  });

  it('hangs a plate of three figures clear of the wall s clip at both lower corners', () => {
    const state = buyNow(bigUnit(), 'timberShelter');
    const shelter = state.equipment.find((item) => item.specId === 'timberShelter');
    if (shelter === undefined) throw new Error('the shelter is wanted');
    // Four hundred boards on the store: full, its plate at its widest. Flipped in v96: on the boards'
    // own counter (CLAUDE.md T32 2.2).
    state.stock.boards = 400;
    const holder = document.createElement('div');
    holder.innerHTML = renderHall(state);
    const plate = holder.querySelector(`[data-kit="${shelter.id}"] .rack-count-plate`);
    expect(holder.querySelector(`[data-kit="${shelter.id}"] .rack-count`)?.textContent).toBe('400');
    const x = Number(plate?.getAttribute('x'));
    const width = Number(plate?.getAttribute('width'));
    const bottom = Number(plate?.getAttribute('y')) + Number(plate?.getAttribute('height'));
    // The clip's line is the wall's top seen from the camera: it rises half a pixel for every pixel
    // to the left, so the plate's lower left corner is the one that has to clear it.
    const wallAt = (screenX: number): number => {
      const start = tileToScreen(0, -REAR_WALL.back, REAR_WALL.top);
      return start.y + (screenX - start.x) / 2;
    };
    expect(bottom).toBeLessThan(wallAt(x));
    expect(bottom).toBeLessThan(wallAt(x + width));
  });

  it('has its two pictures back in their places: the art side s 0 view is the picture, its 90 view the .r', () => {
    // The art side's two files of Turn 29, byte for byte, each where the other stood until tonight:
    // eaef91e8 was the `.r` and is the picture, 7587d989 the picture and is the `.r`.
    const hash = (name: string): string => createHash('sha256').update(readFileSync(`public/sprites/${name}`)).digest('hex');
    expect(hash('timberShelter.standard.png')).toBe('eaef91e8c697730353d798bbfe97969b7d194e63cd0341d555223fea0c8c8167');
    expect(hash('timberShelter.standard.r.png')).toBe('7587d9893f7b4d0763e4d1795da2d56d987851f5c605ff32d9a4930db5fa25c6');
    // Each 448 by 376, the contract's canvas for 6 by 3 by 3 and for 3 by 6 by 3 alike.
    const picture = readFileSync('public/sprites/timberShelter.standard.png');
    expect([picture.readUInt32BE(16), picture.readUInt32BE(20)]).toEqual([448, 376]);
  });
});
