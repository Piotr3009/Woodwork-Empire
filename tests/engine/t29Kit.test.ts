/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.5 and 2.6: the unit a spec names, a ladder of fewer than five classes, where a stage
// of a timber job is done asked of the hall, who stands in for whom on the board, and the five axis
// CNC [PIOTR, 04.10: "one five axis CNC replaces four spindle moulders, from a weak one at 150
// thousand to a fully automatic one at 500 thousand"] (CLAUDE.md T29 2.5, 2.6, section 7). Every
// figure is [TUNE: chat] unless Piotr's.

import { describe, expect, it } from 'vitest';
import {
  AIR_DEMAND,
  BY_HAND_DURATION_FACTOR,
  CNC5_STAGE_FACTOR,
  DUST_OUTPUT_M3_PER_HOUR,
  HEAVY_SPECS,
  MACHINE_CAPACITY,
  MACHINE_SHORT_WORDS,
  SPRAY_ROBOT_FINISH_FACTOR,
  TIMBER_FAMILIES,
  TIPS,
} from '../../src/engine/constants';
import type { GameState, StagedJob } from '../../src/engine/index';
import { lockReasonFor, missingEquipment, template } from '../../src/engine/catalog';
import { kitBlockFor } from '../../src/engine/board';
import { cancelOrder, canBuy, placeEquipmentOrder } from '../../src/engine/game';
import { stagedJob } from '../../src/engine/jobs';
import {
  deliveryDaysFor,
  enduranceHoursFor,
  findSpec,
  footprintOf,
  hallPace,
  isHeavy,
  isServiced,
  machineSavings,
  outputBreakdown,
  placesOf,
} from '../../src/engine/machines';
import { airDemandOf, extractionDemandOf } from '../../src/engine/media';
import { shoppingList } from '../../src/engine/orders';
import { portFor } from '../../src/engine/ports';
import { familyForStage, stageFamilyIn, stagePlanFor, stageSpeed } from '../../src/engine/stages';
import { STATION_TABLE } from '../../src/engine/stations';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, withAir } from '../helpers';

const CLASSES = ['standard', 'pro', 'industrial'] as const;

/** A company in the 800 m2 unit, both extensions open, the day one kit, air enough for a CNC, and
 *  the timber machines of Turn 28 at their standard class but what is named, away from the line's
 *  cells. */
function bigUnit(without: string[] = []): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 9000000;
  state.reputation = 40;
  state.enquiries = [];
  const kit: Array<[string, number, number]> = [
    ['crossCut', 20, 2],
    ['planer', 26, 2],
    ['spindleMoulder', 32, 2],
    ['sander', 20, 6],
    ['framePress', 26, 6],
    ['sprayBooth', 32, 6],
    ['cuttersSash', 0, 0],
    ['cuttersCasement', 0, 0],
    ['cuttersDoor', 0, 0],
  ];
  for (const [id, x, y] of kit) {
    if (without.includes(id)) continue;
    placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  }
  return state;
}

/** A window as the plan sees it: timber, lacquered, a hundred of labour. */
function windowJob(): StagedJob {
  return stagedJob(100, 'solidWood', false, 'lacquer', false, true);
}

/** The Moulding of a window in this hall: the family it is done on and its speed. */
function moulding(state: GameState): { family: string | null; speed: number; byHand: boolean } {
  const stage = stagePlanFor(state, windowJob()).find((entry) => entry.id === 'moulding');
  if (stage === undefined) throw new Error('a window has a Moulding');
  return { family: stage.family, speed: stage.speed, byHand: stage.byHand };
}

function withCnc5(state: GameState, variantId = 'standard'): GameState {
  placeEquipment(state, 'cnc5', { variantId, x: 20, y: 9, id: 'kit-cnc5' });
  return state;
}

describe('the five axis CNC in the catalogue (CLAUDE.md T29 2.6)', () => {
  it('has the three classes of the table, each figure as the brief gives it', () => {
    const spec = findSpec('cnc5');
    expect(spec).toMatchObject({ name: 'Five axis CNC', folder: 'Five axis CNCs', tab: 'cncCentre', category: 'machine' });
    expect(spec?.variants.map((variant) => variant.id)).toEqual([...CLASSES]);
    const table: Record<string, { price: number; metres: [number, number, number]; men: number; air: number; power: number; days: number; life: number }> = {
      standard: { price: 150000, metres: [5, 3, 2.5], men: 12, air: 2000, power: 16, days: 45, life: 6000 },
      pro: { price: 300000, metres: [6, 3, 2.75], men: 20, air: 2400, power: 24, days: 45, life: 7500 },
      industrial: { price: 500000, metres: [8, 4, 3], men: 32, air: 3000, power: 36, days: 60, life: 10000 },
    };
    for (const variantId of CLASSES) {
      const row = table[variantId];
      const variant = spec?.variants.find((entry) => entry.id === variantId);
      if (row === undefined || variant === undefined) throw new Error(variantId);
      expect(variant.price, variantId).toBe(row.price);
      expect(footprintOf('cnc5', variantId), variantId).toMatchObject({
        width: row.metres[0],
        depth: row.metres[1],
        height: row.metres[2],
      });
      // Its zone is its footprint and a metre more each way [TUNE].
      expect([variant.zoneWidth, variant.zoneDepth], variantId).toEqual([row.metres[0] + 1, row.metres[1] + 1]);
      expect(placesOf({ specId: 'cnc5', variantId }), variantId).toBe(row.men);
      expect(extractionDemandOf({ specId: 'cnc5', variantId }), variantId).toBe(row.air);
      expect(variant.powerPerDay, variantId).toBe(row.power);
      expect(deliveryDaysFor('cnc5', variantId), variantId).toBe(row.days);
      expect(enduranceHoursFor('cnc5', variantId), variantId).toBe(row.life);
      expect(airDemandOf({ specId: 'cnc5', variantId }), variantId).toEqual({ bar: 6.5, litres: 650 });
      expect(AIR_DEMAND.cnc5?.[variantId], variantId).toEqual({ bar: 6.5, litres: 650 });
      expect(portFor(`cnc5.${variantId}.png`), variantId).not.toBeNull();
      expect(portFor(`cnc5.${variantId}.r.png`), variantId).not.toBeNull();
    }
    expect(DUST_OUTPUT_M3_PER_HOUR.cnc5).toBe(0.06);
    expect(HEAVY_SPECS).toContain('cnc5');
    expect(MACHINE_SHORT_WORDS.cnc5).toBe('five axis CNC');
    expect(TIMBER_FAMILIES).toContain('cnc5');
    expect(STATION_TABLE.cnc5).toEqual(STATION_TABLE.spindleMoulder);
    expect(spec?.requiresOneOf).toEqual(['extractor', 'dustSystem', 'flexiSystem']);
  });

  it('is refused in a unit smaller than the 800 m2, straight after the reputation, and its first class is what a purchase buys', () => {
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 9000000;
    expect(small.unit.areaM2).toBe(200);
    expect(canBuy(small, 'cnc5')).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
    let middle = newGame({ difficulty: 'veryEasy' });
    middle.cash = 9000000;
    middle = nextDay(act(middle, { type: 'EXTEND_UNIT' }));
    expect(middle.unit.areaM2).toBe(400);
    expect(canBuy(middle, 'cnc5', 'industrial')).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
    // The reputation is asked first.
    small.reputation = -50;
    const spec = findSpec('cnc5');
    if (spec === null) throw new Error('no cnc5');
    const asked = spec.minReputation;
    spec.minReputation = 0;
    expect(canBuy(small, 'cnc5')).toEqual({ ok: false, reason: 'Needs reputation 0' });
    spec.minReputation = asked;
    // In the 800 m2 unit it is bought, its standard class by default.
    const big = bigUnit();
    expect(canBuy(big, 'cnc5')).toEqual({ ok: true, reason: '' });
    expect(placeEquipmentOrder(big, 'cnc5').ok).toBe(true);
    expect(big.onOrder.find((item) => item.specId === 'cnc5')?.variantId).toBe('standard');
  });

  it('cannot be called off once ordered, where a planer can', () => {
    const state = bigUnit();
    expect(placeEquipmentOrder(state, 'cnc5', 'pro').ok).toBe(true);
    expect(placeEquipmentOrder(state, 'planer', 'pro').ok).toBe(true);
    const cnc5 = state.onOrder.find((item) => item.specId === 'cnc5');
    const planer = state.onOrder.find((item) => item.specId === 'planer');
    if (cnc5 === undefined || planer === undefined) throw new Error('both are on order');
    const cash = state.cash;
    expect(cancelOrder(state, cnc5.id)).toEqual({ ok: false, reason: 'Built to order: it cannot be called off' });
    expect(state.cash).toBe(cash);
    expect(shoppingList(state).find((line) => line.id === cnc5.id)).toMatchObject({
      canCancel: false,
      cancelReason: 'Built to order: it cannot be called off',
    });
    expect(shoppingList(state).find((line) => line.id === planer.id)?.canCancel).toBe(true);
    expect(cancelOrder(state, planer.id).ok).toBe(true);
    expect(state.cash).toBe(cash + planer.pricePaid);
  });

  it('says what it does on each class card, and its folder starts at its first class', () => {
    const state = bigUnit();
    const html = renderCatalogue(state, '', catalogueTabFrom('cncCentre'), 'cnc5');
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const cards = Array.from(holder.querySelectorAll('.tile[data-variant]'));
    expect(cards.map((card) => card.getAttribute('data-variant'))).toEqual([...CLASSES]);
    for (const card of cards) {
      expect(card.textContent).toContain(`The Moulding of windows and doors goes ${CNC5_STAGE_FACTOR} times as fast on it`);
    }
    expect(CNC5_STAGE_FACTOR).toBe(4);
    const folders = document.createElement('div');
    folders.innerHTML = renderCatalogue(state, '', catalogueTabFrom('cncCentre'));
    expect(folders.textContent).toContain('Five axis CNCs');
    expect(folders.textContent).toContain('from £150,000');
    // The sheet CNC's card says nothing of its own two, and that stays.
    const cnc = document.createElement('div');
    cnc.innerHTML = renderCatalogue(state, '', catalogueTabFrom('cnc'), 'cnc');
    expect(cnc.textContent).not.toContain('times as fast');
    expect(TIPS.catalogue).toBe(
      'A machine family comes in classes, up to five: the effects come first, then the costs, then what it is.',
    );
  });
});

describe('where a timber job s Moulding is done (CLAUDE.md T29 2.5.3, 2.6)', () => {
  it('is the five axis CNC while one runs, at four times its class s pace', () => {
    const state = withCnc5(bigUnit());
    expect(moulding(state)).toEqual({ family: 'cnc5', speed: CNC5_STAGE_FACTOR * 1.05, byHand: false });
    expect(hallPace(state, 'cnc5')).toBe(1.05);
    const industrial = withCnc5(bigUnit(), 'industrial');
    expect(moulding(industrial).speed).toBeCloseTo(CNC5_STAGE_FACTOR * 1.12, 10);
    // The stage is still the Moulding: the old question asked of the job alone gives its old answer.
    expect(familyForStage(windowJob(), 'moulding')).toBe('spindleMoulder');
    expect(stageFamilyIn(state, windowJob(), 'moulding')).toBe('cnc5');
    // The bench does not go faster for it, as it does behind the sheet CNC.
    expect(stageSpeed(state, windowJob(), 'assembly').speed).toBe(stageSpeed(bigUnit(), windowJob(), 'assembly').speed);
  });

  it('goes back to the moulders the minute it does not run, and by hand with none', () => {
    const broken = withCnc5(bigUnit());
    const cnc5 = broken.equipment.find((item) => item.specId === 'cnc5');
    if (cnc5 === undefined) throw new Error('the CNC is wanted');
    cnc5.broken = true;
    expect(moulding(broken)).toEqual({ family: 'spindleMoulder', speed: hallPace(broken, 'spindleMoulder'), byHand: false });
    cnc5.broken = false;
    cnc5.inServiceUntilDay = broken.clock.day + 2;
    expect(moulding(broken).family).toBe('spindleMoulder');
    // No moulder in the hall and the CNC away: by hand.
    const bare = withCnc5(bigUnit(['spindleMoulder']));
    const away = bare.equipment.find((item) => item.specId === 'cnc5');
    if (away === undefined) throw new Error('the CNC is wanted');
    away.inServiceUntilDay = bare.clock.day + 2;
    expect(moulding(bare)).toEqual({ family: 'spindleMoulder', speed: 1 / BY_HAND_DURATION_FACTOR, byHand: true });
  });

  it('never moves a sheet job s stage, laminate or lacquered', () => {
    const plain = bigUnit();
    const kitted = withCnc5(bigUnit());
    for (const finish of ['laminate', 'lacquer'] as const) {
      const job = stagedJob(100, 'sheet', false, finish, true, false);
      const before = stagePlanFor(plain, job).map((stage) => [stage.id, stage.family, stage.speed]);
      const after = stagePlanFor(kitted, job).map((stage) => [stage.id, stage.family, stage.speed]);
      expect(after, finish).toEqual(before);
    }
  });
});

describe('who stands in for whom on the board (CLAUDE.md T29 2.5.4)', () => {
  it('takes a window with a five axis CNC and no moulder, and not without its cutters', () => {
    const sash = template('sashWindows');
    const state = withCnc5(bigUnit(['spindleMoulder']));
    expect(missingEquipment(state, sash)).toEqual([]);
    expect(lockReasonFor(state, sash)).toBeNull();
    expect(kitBlockFor(state, sash)).toBeNull();
    const noCutters = withCnc5(bigUnit(['spindleMoulder', 'cuttersSash']));
    expect(lockReasonFor(noCutters, sash)).toBe('Needs sash window cutter set');
    // Without the CNC the moulder is missing, in the words it always had.
    expect(lockReasonFor(bigUnit(['spindleMoulder']), sash)).toBe('Needs spindle moulder');
  });

  it('never stands a five axis CNC in for a sheet product s moulder', () => {
    const kitchen = template('handlelessKitchen');
    const state = withCnc5(bigUnit(['spindleMoulder']));
    expect(missingEquipment(state, kitchen)).toContain('spindleMoulder');
  });
});

describe('the spraying robot (CLAUDE.md T29 2.7)', () => {
  /** The 800 m2 company with a robot standing beside its booth. */
  function withRobot(state: GameState): GameState {
    placeEquipment(state, 'sprayRobot', { x: 36, y: 6, id: 'kit-robot' });
    return state;
  }

  function finishing(state: GameState, job: StagedJob): number {
    return stageSpeed(state, job, 'finishing').speed;
  }

  it('is one class of the table, carried in, with no places, no dust and no extraction or air', () => {
    const spec = findSpec('sprayRobot');
    expect(spec).toMatchObject({
      name: 'Spraying robot',
      folder: 'Spraying robots',
      tab: 'spraying',
      category: 'machine',
      requires: ['sprayBooth'],
      price: 120000,
      deliveryDays: 30,
    });
    expect(spec?.variants.map((variant) => variant.id)).toEqual(['standard']);
    expect(spec?.variants[0]).toMatchObject({ powerPerDay: 8, zoneWidth: 3, zoneDepth: 2 });
    expect(footprintOf('sprayRobot', 'standard')).toMatchObject({ width: 2, depth: 1, height: 2.25 });
    expect(MACHINE_CAPACITY.sprayRobot).toBeUndefined();
    expect(DUST_OUTPUT_M3_PER_HOUR.sprayRobot).toBe(0);
    expect(extractionDemandOf({ specId: 'sprayRobot', variantId: 'standard' })).toBe(0);
    expect(AIR_DEMAND.sprayRobot).toBeUndefined();
    expect(isHeavy('sprayRobot', 'standard')).toBe(false);
    expect(isServiced('sprayRobot')).toBe(true);
  });

  it('doubles the Finishing at a booth that runs, and only while it stands and runs', () => {
    const state = withRobot(bigUnit());
    const booth = hallPace(state, 'sprayBooth');
    expect(finishing(state, windowJob())).toBe(booth * SPRAY_ROBOT_FINISH_FACTOR);
    expect(SPRAY_ROBOT_FINISH_FACTOR).toBe(2);
    const robot = state.equipment.find((item) => item.specId === 'sprayRobot');
    if (robot === undefined) throw new Error('the robot is wanted');
    robot.broken = true;
    expect(finishing(state, windowJob())).toBe(booth);
    robot.broken = false;
    robot.inServiceUntilDay = state.clock.day + 3;
    expect(finishing(state, windowJob())).toBe(booth);
    robot.inServiceUntilDay = null;
    // With no booth that runs it does nothing.
    const boothItem = state.equipment.find((item) => item.specId === 'sprayBooth');
    if (boothItem === undefined) throw new Error('the booth is wanted');
    boothItem.broken = true;
    const without = bigUnit();
    const theirs = without.equipment.find((item) => item.specId === 'sprayBooth');
    if (theirs === undefined) throw new Error('the booth is wanted');
    theirs.broken = true;
    expect(finishing(state, windowJob())).toBe(finishing(without, windowJob()));
    expect(finishing(state, windowJob())).toBe(1);
  });

  it('speeds a lacquered sheet job s Finishing and nothing else of it, and leaves a laminate job alone', () => {
    const plain = bigUnit();
    const robot = withRobot(bigUnit());
    const lacquered = stagedJob(100, 'sheet', false, 'lacquer', false, false);
    const before = stagePlanFor(plain, lacquered);
    const after = stagePlanFor(robot, lacquered);
    expect(after.map((stage) => stage.family)).toEqual(before.map((stage) => stage.family));
    for (const [index, stage] of after.entries()) {
      const was = before[index];
      if (was === undefined) throw new Error('the plans are the same length');
      expect(stage.speed, stage.id).toBe(stage.id === 'finishing' ? was.speed * SPRAY_ROBOT_FINISH_FACTOR : was.speed);
    }
    const laminate = stagedJob(100, 'sheet', false, 'laminate', false, false);
    expect(stagePlanFor(robot, laminate)).toEqual(stagePlanFor(plain, laminate));
  });

  it('is refused a second, and asks for a booth first', () => {
    const state = bigUnit();
    expect(canBuy(state, 'sprayRobot')).toEqual({ ok: true, reason: '' });
    expect(placeEquipmentOrder(state, 'sprayRobot').ok).toBe(true);
    expect(canBuy(state, 'sprayRobot')).toEqual({ ok: false, reason: 'The hall has its spraying robot' });
    const owned = withRobot(bigUnit());
    expect(canBuy(owned, 'sprayRobot')).toEqual({ ok: false, reason: 'The hall has its spraying robot' });
    const noBooth = bigUnit(['sprayBooth']);
    expect(canBuy(noBooth, 'sprayRobot')).toEqual({ ok: false, reason: 'Needs Spray booth first' });
    // And it is bought in the 200 m2 unit as well: only the big kit names a unit.
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 900000;
    placeEquipment(small, 'sprayBooth', { variantId: 'standard', x: 7, y: 5 });
    expect(canBuy(small, 'sprayRobot').ok).toBe(true);
  });

  it('has no line of its own on the Output sheet or in the machine hours, and its card says what it does', () => {
    const state = withRobot(bigUnit());
    expect(outputBreakdown(state).lines.some((line) => line.label.startsWith('Spraying robot'))).toBe(false);
    expect(outputBreakdown(state).lines.some((line) => line.label.startsWith('Spray booth'))).toBe(true);
    expect(machineSavings(state, 'week').rows.some((row) => row.id === 'kit-robot')).toBe(false);
    const holder = document.createElement('div');
    holder.innerHTML = renderCatalogue(state, '', catalogueTabFrom('spraying'), 'sprayRobot');
    const card = holder.querySelector('.tile[data-variant]');
    expect(card?.textContent).toContain(`The Finishing at the booth goes ${SPRAY_ROBOT_FINISH_FACTOR} times as fast`);
    expect(card?.textContent).not.toContain('Output');
  });
});
