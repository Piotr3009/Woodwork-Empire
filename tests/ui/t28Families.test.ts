/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 28, 2.4: the timber department's five families of machine, each defined as the thicknesser
// and the spindle moulder are, with its row in every side table (CLAUDE.md T28 2.4, section 7).
// Every figure below is the brief's table, [TUNE: chat] unless the art side's envelope; the
// fourteen prices of v81 and every older family's figures are held by the tests that pin them.

import { describe, expect, it } from 'vitest';
import {
  AIR_DEMAND,
  CLASS_LADDER_FAMILIES,
  CLASS_ORDER,
  CUTTER_SETS,
  DRAWN_TURN_MINUTES,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTION_DEMAND,
  GLUE_TABLE,
  GLUE_TABLE_PLACES,
  HEAVY_SPECS,
  LIGHT_CLASSES,
  MACHINE_CAPACITY,
  MACHINE_ENDURANCE_HOURS,
  MACHINE_SHORT_WORDS,
  TIMBER_FAMILIES,
} from '../../src/engine/constants';
import { canBuy, canSell } from '../../src/engine/game';
import type { GameState } from '../../src/engine/index';
import { hallItems } from '../../src/engine/layout';
import {
  deliveryDaysFor,
  enduranceHoursFor,
  findSpec,
  footprintOf,
  framePressesWithGlueTables,
  hallPlaces,
  isHeavy,
  isServiced,
  machinesWord,
  placesAt,
  placesOf,
  poweredMachines,
  zoneOf,
} from '../../src/engine/machines';
import { STATION_TABLE } from '../../src/engine/stations';
import { portFor } from '../../src/engine/ports';
import { spriteUrl } from '../../src/render/sprites';
import { renderSpriteCheck, spriteTargets } from '../../src/ui/spriteCheck';
import { floorLine } from '../../src/ui/machine';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { drawnPlaces } from '../../src/engine/drawn';
import { planPlaces } from '../../src/engine/production';
import { buyStartingKit, day53Hall, newGame, placeEquipment } from '../helpers';

const LADDERS = ['crossCut', 'planer', 'sander', 'framePress'] as const;

/** The brief's tables of 2.4, by family and class. */
const METRES: Record<string, Record<string, [number, number, number]>> = {
  crossCut: { used: [2, 1, 1.25], budget: [3, 1, 1.25], standard: [4, 1, 1.5], pro: [5, 1, 1.75], industrial: [7, 2, 2] },
  planer: { used: [3, 1, 1.5], budget: [3, 1, 1.5], standard: [4, 1, 1.5], pro: [5, 1, 1.75], industrial: [6, 2, 2] },
  sander: { used: [2, 1, 1], budget: [2, 1, 1.25], standard: [2, 1, 1.5], pro: [3, 2, 1.75], industrial: [6, 2, 2] },
  framePress: { used: [2, 1, 1], budget: [3, 1, 1.25], standard: [3, 1, 2.25], pro: [4, 1, 2.5], industrial: [5, 2, 2.75] },
};
const PRICES: Record<string, number[]> = {
  crossCut: [300, 2500, 8000, 24000, 60000],
  planer: [6000, 14000, 28000, 60000, 120000],
  sander: [400, 3000, 9000, 36000, 96000],
  framePress: [250, 1500, 7000, 24000, 72000],
};
const PLACES: Record<string, number[]> = {
  crossCut: [1, 1, 2, 2, 3],
  planer: [1, 2, 2, 3, 4],
  sander: [1, 1, 2, 3, 4],
  framePress: [1, 2, 2, 3, 4],
};
const EXTRACTION: Record<string, number[]> = {
  crossCut: [600, 700, 900, 1200, 1800],
  planer: [2000, 2200, 2800, 3400, 4500],
  sander: [0, 1200, 1500, 2200, 3500],
};
const DELIVERY: Record<string, number[]> = {
  crossCut: [1, 3, 5, 10, 20],
  planer: [3, 7, 12, 20, 30],
  sander: [1, 3, 7, 12, 25],
  framePress: [1, 3, 7, 12, 25],
};
const POWER: Record<string, number[]> = {
  crossCut: [3, 3, 4, 5, 7],
  planer: [4, 5, 7, 10, 14],
  sander: [3, 3, 4, 5, 7],
  framePress: [3, 3, 4, 5, 7],
};

function spec(id: string) {
  const found = findSpec(id);
  if (found === null) throw new Error(`no ${id} in the catalogue`);
  return found;
}

/** The day one hall with room to stand a press or two in. */
function hall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 1000000;
  state.reputation = 100;
  return state;
}

describe('the timber department s five families (CLAUDE.md T28 2.4)', () => {
  it('names them, files them in their folders and tabs, and calls the four ladders machines', () => {
    const rows: Array<[string, string, string, string]> = [
      ['crossCut', 'Cross cut saw', 'Cross cut saws', 'timberMachines'],
      ['planer', 'Four sided planer', 'Four sided planers', 'timberMachines'],
      ['framePress', 'Frame press', 'Frame presses', 'timberMachines'],
      ['glueTable', 'Glue table', 'Glue tables', 'timberMachines'],
      ['sander', 'Sander', 'Sanders', 'sanding'],
    ];
    for (const [id, name, folder, tab] of rows) {
      expect(spec(id), id).toMatchObject({ name, folder, tab, spriteKey: id });
    }
    for (const id of LADDERS) {
      expect(spec(id).category, id).toBe('machine');
      expect(spec(id).variants.map((variant) => variant.id), id).toEqual([...CLASS_ORDER]);
      expect(CLASS_LADDER_FAMILIES, id).toContain(id);
    }
    expect(spec(GLUE_TABLE).category).toBe('storage');
    expect(spec(GLUE_TABLE).variants.map((variant) => variant.id)).toEqual(['standard']);
    expect(CLASS_LADDER_FAMILIES).not.toContain(GLUE_TABLE);
  });

  it('gives every class the art side s metres, a metre of working room each way, and its price', () => {
    for (const id of LADDERS) {
      CLASS_ORDER.forEach((tier, index) => {
        const [width, depth, height] = METRES[id]?.[tier] ?? [0, 0, 0];
        expect(footprintOf(id, tier), `${id}.${tier}`).toEqual({ width, depth, height });
        expect(zoneOf(id, tier), `${id}.${tier}`).toEqual({ width: width + 1, depth: depth + 1 });
        expect(spec(id).variants[index]?.price, `${id}.${tier}`).toBe(PRICES[id]?.[index]);
      });
    }
    // The glue table: 3 by 1 by 1, its footprint and a metre on the long side, 2,500.
    expect(footprintOf(GLUE_TABLE, 'standard')).toEqual({ width: 3, depth: 1, height: 1 });
    expect(zoneOf(GLUE_TABLE, 'standard')).toEqual({ width: 3, depth: 2 });
    expect(spec(GLUE_TABLE).price).toBe(2500);
    // The catalogue's line carries the cheapest class.
    expect(spec('planer').price).toBe(6000);
  });

  it('keeps the brief s men at once, its extraction, dust, air, life, power and waits', () => {
    for (const id of LADDERS) {
      CLASS_ORDER.forEach((tier, index) => {
        const label = `${id}.${tier}`;
        expect(MACHINE_CAPACITY[id]?.[tier], label).toBe(PLACES[id]?.[index]);
        expect(placesOf({ specId: id, variantId: tier }), label).toBe(PLACES[id]?.[index]);
        expect(EXTRACTION_DEMAND[id]?.[tier] ?? 0, label).toBe(EXTRACTION[id]?.[index] ?? 0);
        expect(deliveryDaysFor(id, tier), label).toBe(DELIVERY[id]?.[index]);
        expect(spec(id).variants[index]?.powerPerDay, label).toBe(POWER[id]?.[index]);
      });
    }
    // The glue table is no row of places: it adds them to a press.
    expect(MACHINE_CAPACITY[GLUE_TABLE]).toBeUndefined();
    expect(deliveryDaysFor(GLUE_TABLE, 'standard')).toBe(5);
    expect(DUST_OUTPUT_M3_PER_HOUR).toMatchObject({ planer: 0.5, sander: 0.03, crossCut: 0.02, framePress: 0, glueTable: 0 });
    expect(EXTRACTION_DEMAND.framePress).toBeUndefined();
    expect(AIR_DEMAND.framePress).toEqual({
      standard: { bar: 6, litres: 100 },
      pro: { bar: 7, litres: 200 },
      industrial: { bar: 7, litres: 300 },
    });
    expect(AIR_DEMAND.crossCut).toEqual({ pro: { bar: 6, litres: 100 }, industrial: { bar: 6, litres: 200 } });
    expect(AIR_DEMAND.planer).toBeUndefined();
    expect(AIR_DEMAND.sander).toBeUndefined();
    expect(MACHINE_ENDURANCE_HOURS).toMatchObject({ planer: 4000, crossCut: 3000, sander: 3500, framePress: 6000 });
    expect(enduranceHoursFor('planer', 'used')).toBe(1000);
    expect(enduranceHoursFor('framePress', 'industrial')).toBe(12000);
  });

  it('carries the hand classes and wants somebody at the gate for the rest', () => {
    expect(HEAVY_SPECS).toEqual(expect.arrayContaining(['planer', 'crossCut', 'sander', 'framePress']));
    for (const tier of CLASS_ORDER) expect(isHeavy('planer', tier), tier).toBe(true);
    for (const id of ['crossCut', 'sander', 'framePress']) {
      expect(LIGHT_CLASSES[id], id).toEqual(['used', 'budget']);
      for (const tier of CLASS_ORDER) expect(isHeavy(id, tier), `${id}.${tier}`).toBe(tier !== 'used' && tier !== 'budget');
    }
  });

  it('calls them by the trade s short words, and presses and not presss', () => {
    expect(MACHINE_SHORT_WORDS).toMatchObject({ crossCut: 'cross cut saw', planer: 'planer', sander: 'sander', framePress: 'press' });
    expect(machinesWord('framePress')).toBe('presses');
    expect(machinesWord('planer')).toBe('planers');
    expect(machinesWord('tableSaw')).toBe('saws');
    expect(machinesWord('sprayBooth')).toBe('booths');
  });

  it('stands the operator at the front, as at the spindle moulder', () => {
    for (const id of LADDERS) expect(STATION_TABLE[id], id).toEqual(STATION_TABLE.spindleMoulder);
  });

  it('cuts the thicknesser s promise of a stage and leaves the rest of its card', () => {
    expect(spec('thicknesser').effect).toBe(
      'Planes and thicknesses timber. With it the workshop takes on solid wood. Timber only: a sheet job never touches it.',
    );
  });
});

describe('the glue table beside a frame press (CLAUDE.md T28 2.4)', () => {
  it('adds two places to one press for each table, and is refused past the presses in the racks words', () => {
    const state = hall();
    expect(GLUE_TABLE_PLACES).toBe(2);
    expect(canBuy(state, GLUE_TABLE)).toEqual({ ok: false, reason: 'Needs Frame press first' });
    const first = placeEquipment(state, 'framePress', { variantId: 'standard', x: 7, y: 5, id: 'kit-press-1' });
    expect(placesAt(state, first)).toBe(2);
    expect(canBuy(state, GLUE_TABLE).ok).toBe(true);
    placeEquipment(state, GLUE_TABLE, { x: 11, y: 5, id: 'kit-glue-1' });
    expect(canBuy(state, GLUE_TABLE)).toEqual({ ok: false, reason: 'Every frame press has its glue table' });
    expect(Array.from(framePressesWithGlueTables(state))).toEqual([first.id]);
    expect(placesAt(state, first)).toBe(4);
    expect(placesOf(first)).toBe(2);
    const second = placeEquipment(state, 'framePress', { variantId: 'industrial', x: 14, y: 5, id: 'kit-press-2' });
    expect(placesAt(state, second)).toBe(4);
    expect(hallPlaces(state, 'framePress')).toBe(8);
    placeEquipment(state, GLUE_TABLE, { x: 2, y: 5, id: 'kit-glue-2' });
    expect(placesAt(state, second)).toBe(6);
    // A table and not a machine: no power, no service, and it does stand on the floor.
    expect(poweredMachines(state).some((item) => item.specId === GLUE_TABLE)).toBe(false);
    expect(isServiced(GLUE_TABLE)).toBe(false);
    expect(hallItems(state).some((item) => item.specId === GLUE_TABLE)).toBe(true);
    expect(floorLine(GLUE_TABLE, 'standard')).toBe('Takes 3 m by 1 m, works in 3 m by 2 m');
  });
});

describe('the pictures and the Sprite check page (CLAUDE.md T28 2.4, 2.11, section 7)', () => {
  it('finds a file, a footprint and a measured port for every class of the five families', () => {
    const targets = spriteTargets().filter((target) => [...LADDERS, GLUE_TABLE].includes(target.specId as never));
    expect(targets).toHaveLength(21);
    for (const target of targets) {
      expect(spriteUrl(target.spriteKey, target.tier), target.name).not.toBeNull();
    }
    const page = document.createElement('div');
    page.innerHTML = renderSpriteCheck();
    for (const target of targets) {
      const cell = page.querySelector(`[data-sprite-target="${target.name}"]`);
      expect(cell, target.name).not.toBeNull();
      // A file: the picture drawn on its anchor, and its url, and not the missing box.
      expect(cell?.querySelector('.sprite-shot.is-missing'), target.name).toBeNull();
      expect(cell?.querySelector('.sprite-shot image'), target.name).not.toBeNull();
      expect(cell?.textContent, target.name).not.toContain('no file yet');
      // A footprint: its metres and its working room.
      expect(cell?.textContent, target.name).toContain('works in');
      // And no red line for a missing port.
      expect(cell?.querySelector('[data-port="none"]'), target.name).toBeNull();
    }
  });

  it('measures a port on both views of every class that pulls on the extraction, and none on the rest', () => {
    for (const id of ['crossCut', 'planer', 'sander']) {
      for (const tier of CLASS_ORDER) {
        const wants = (EXTRACTION_DEMAND[id]?.[tier] ?? 0) > 0;
        expect(portFor(`${id}.${tier}.png`) !== null, `${id}.${tier}`).toBe(wants);
        expect(portFor(`${id}.${tier}.r.png`) !== null, `${id}.${tier}.r`).toBe(wants);
      }
    }
    // The used sander has a vacuum of its own; the presses and the glue table make no dust.
    expect(portFor('sander.used.png')).toBeNull();
    for (const tier of CLASS_ORDER) expect(portFor(`framePress.${tier}.png`), tier).toBeNull();
    expect(portFor('glueTable.standard.png')).toBeNull();
  });
});

describe('where the men are drawn with timber machines in the hall (CLAUDE.md T28 2.7)', () => {
  it('draws no sheet man at a timber machine, and draws the hall as it was without them', () => {
    // A company with no timber job draws its men as v82 drew them: the four new families are spots
    // for a man on a timber job only.
    const without = day53Hall();
    const withTimber = day53Hall();
    placeEquipment(withTimber, 'planer', { variantId: 'industrial', x: 2, y: 9, id: 'kit-planer' });
    placeEquipment(withTimber, 'crossCut', { variantId: 'standard', x: 12, y: 9, id: 'kit-crossCut' });
    for (let hour = 0; hour < 9; hour += 1) {
      for (const state of [without, withTimber]) {
        state.clock.minute = hour * DRAWN_TURN_MINUTES;
        planPlaces(state);
      }
      const drawn = drawnPlaces(withTimber);
      for (const entry of drawn) expect(TIMBER_FAMILIES, `${hour} ${entry.who}`).not.toContain(entry.item.specId);
      expect(drawn.map((entry) => [entry.who, entry.item.id])).toEqual(
        drawnPlaces(without).map((entry) => [entry.who, entry.item.id]),
      );
    }
  });
});

describe('the cutter sets (CLAUDE.md T28 2.5)', () => {
  const SETS: Array<[string, string, string, number, string]> = [
    ['cuttersSash', 'Sash window cutter set', 'Sash cutters', 4000, 'sash windows'],
    ['cuttersCasement', 'Casement window cutter set', 'Casement cutters', 3000, 'casement windows'],
    ['cuttersDoor', 'Door cutter set', 'Door cutters', 5000, 'doors'],
  ];

  it('are three single class tools of the Timber machines tab, at the brief s prices', () => {
    expect([...CUTTER_SETS]).toEqual(SETS.map(([id]) => id));
    for (const [id, name, folder, price, what] of SETS) {
      expect(spec(id), id).toMatchObject({ name, folder, price, tab: 'timberMachines', category: 'tools', requires: [] });
      expect(spec(id).variants.map((variant) => variant.id), id).toEqual(['standard']);
      expect(deliveryDaysFor(id, 'standard'), id).toBe(5);
      expect(zoneOf(id, 'standard'), id).toEqual({ width: 0, depth: 0 });
      expect(spec(id).effect, id).toBe(
        `The profile cutters for ${what}. Without the set the workshop cannot take them.`,
      );
      expect(floorLine(id, 'standard'), id).toBe('Kept at the spindle moulders');
    }
    // The hand tool set keeps its cabinet.
    expect(floorLine('handToolSet', 'standard')).toBe('Kept in a tool cabinet');
  });

  it('ask for no cabinet and no slot, stand nowhere on the hall, and are never sold', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    state.cash = 100000;
    expect(state.equipment.some((item) => item.specId === 'toolCabinet')).toBe(false);
    expect(canBuy(state, 'cuttersSash')).toEqual({ ok: true, reason: '' });
    const set = placeEquipment(state, 'cuttersSash', { id: 'kit-cutters' });
    expect(hallItems(state).some((item) => item.id === set.id)).toBe(false);
    expect(canSell(state, set.id)).toEqual({ ok: false, reason: 'Nobody buys second hand fittings' });
  });

  it('show the empty picture box and where they are kept, on the card and on the Sprite check page', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const card = document.createElement('div');
    card.innerHTML = renderCatalogue(state, '', catalogueTabFrom('timberMachines'), 'cuttersSash');
    expect(card.querySelector('.tile-picture[data-sprite="cuttersSash"] .tile-picture-box')).not.toBeNull();
    expect(card.textContent).toContain('Kept at the spindle moulders');
    expect(card.textContent).toContain('£4,000');
    const page = document.createElement('div');
    page.innerHTML = renderSpriteCheck();
    for (const [id] of SETS) {
      const row = page.querySelector(`[data-sprite-target="${id}"]`);
      expect(row, id).not.toBeNull();
      expect(row?.textContent, id).toContain('kept at the spindle moulders');
      expect(row?.textContent, id).toContain('no file yet');
    }
  });
});
