// Three of Piotr's answers to the Turn 10 risks: products that are sprayed, air for every bench,
// and a light thing turned where it stands (PIOTR, 15.09; CLAUDE.md T11 3.7, 3.8, 3.9).

import { describe, expect, it } from 'vitest';
import {
  MOVE_MINUTES_PER_ITEM,
  NO_AIR_FACTOR,
  NO_AIR_LINE,
  PRODUCT_TEMPLATES,
  WET_AIR_FINISH_FACTOR,
  WET_AIR_FINISH_RATING,
} from '../../src/engine/constants';
import { blockFor, kitBlockFor } from '../../src/engine/board';
import { familyForStage } from '../../src/engine/stages';
import { hallAirCheck, sprayingOnWetAir } from '../../src/engine/media';
import { applyRating } from '../../src/engine/reputation';
import { itemIsHeavy } from '../../src/engine/machines';
import { renderMachine } from '../../src/ui/machine';
import type { GameState, ProductTemplate } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
  withExtraction,
} from '../helpers';

function template(id: string): ProductTemplate {
  const found = PRODUCT_TEMPLATES.find((entry) => entry.id === id);
  if (!found) throw new Error(`no template ${id}`);
  return found;
}

// ---------------------------------------------------------------------------
// 3.7 Lacquered products
// ---------------------------------------------------------------------------

describe('the two sprayed products', () => {
  it('are a wardrobe and a kitchen, both sheet work, both lacquer only', () => {
    for (const id of ['lacqueredWardrobe', 'lacqueredKitchen']) {
      const entry = template(id);
      expect(entry.material, id).toBe('sheet');
      expect(entry.allowedFinishes, id).toEqual(['lacquer']);
      expect(entry.requiredEquipment, id).toContain('sprayBooth');
    }
    // The bands Piotr gave, at the smallest size the board draws.
    expect(template('lacqueredWardrobe').basePrice * 0.8).toBe(3500);
    expect(template('lacqueredKitchen').basePrice * 0.8).toBe(12000);
  });

  it('is greyed on the board with the reason while there is no booth in the hall', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 40;
    for (const id of ['lacqueredWardrobe', 'lacqueredKitchen']) {
      const block = kitBlockFor(state, template(id));
      expect(block?.reason, id).toBe('needs a spray booth');
      expect(block?.where, id).toBe('catalogue');
      expect(blockFor(state, template(id), 90, 4000)?.reason, id).toBe('needs a spray booth');
    }
    // And with a booth standing in the hall the reason has gone.
    placeEquipment(state, 'sprayBooth', { x: 7, y: 6 });
    expect(kitBlockFor(state, template('lacqueredWardrobe'))).toBeNull();
  });

  it('does its Finishing at the booth, and nothing else does', () => {
    const lacquered = { labourValue: 1000, materialKind: 'sheet' as const, finish: 'lacquer' as const, byHand: false };
    const laminate = { ...lacquered, finish: 'laminate' as const };
    expect(familyForStage(lacquered, 'finishing')).toBe('sprayBooth');
    expect(familyForStage(laminate, 'finishing')).toBeNull();
  });

  it('takes half as long again over the finish on wet air, and loses a point of rating', () => {
    const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
    placeEquipment(state, 'compressor', { variantId: 'pro', x: 18, y: 4 });
    const booth = placeEquipment(state, 'sprayBooth', { x: 7, y: 6 });
    // A pro compressor has no dryer built in and none is fitted to it (CLAUDE.md T10 3.3).
    expect(sprayingOnWetAir(state, booth)).toBe(true);
    expect(WET_AIR_FINISH_FACTOR).toBe(1.5);
    // The rating a delivered piece carries is a point light for the defects in it.
    const sprayed = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
    sprayed.enquiries = [];
    const enquiry = placeEnquiry(sprayed, { price: 4000, deadlineDays: 40 });
    const taken = act(sprayed, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const job = firstJob(taken);
    const dry = JSON.parse(JSON.stringify(taken)) as GameState;
    job.wetFinish = true;
    const wet = applyRating(taken, job);
    const clean = applyRating(dry, firstJob(dry));
    expect(clean - wet).toBe(WET_AIR_FINISH_RATING);
  });
});

// ---------------------------------------------------------------------------
// 3.8 Air for every bench
// ---------------------------------------------------------------------------

/** Two men at their benches on assemblies, in a hall with the compressor class asked for, or with
 *  no compressor at all. The minutes that go into the first job are the answer. */
function assembledMinutes(compressorClass: string | null): number {
  const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
  if (compressorClass !== null) {
    placeEquipment(state, 'compressor', { variantId: compressorClass, x: 18, y: 4 });
  }
  placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
  placeEquipment(state, 'drill', { x: 16, y: 8 });
  fillRack(state, 200);
  state.enquiries = [];
  for (let index = 0; index < 2; index += 1) {
    placeEquipment(state, 'workbench', {
      variantId: 'budget',
      x: 2 + index * 2,
      y: 8,
      id: `kit-bench-${index}`,
    });
    placeEnquiry(state, { price: 4000, deadlineDays: 40, name: `Job ${index}` });
  }
  let next = state;
  for (const enquiry of state.enquiries.slice()) {
    next = act(next, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  }
  for (const job of next.jobs) {
    job.stage = 'inProduction';
    job.assignedTo = 'owner';
    // Into the assembly, which is the stage a man does with a nailer in his hand.
    job.labourRemaining = job.labourValue * 0.5;
  }
  const before = firstJob(next).labourRemaining;
  const worked = runClock(next, 20);
  return Math.round((before - firstJob(worked).labourRemaining) * 100000) / 100000;
}

describe('air for every bench', () => {
  it('runs the assembly at 0.67 in a hall with no compressor at all', () => {
    expect(NO_AIR_FACTOR).toBe(0.67);
    const withAir = assembledMinutes('budget');
    const without = assembledMinutes(null);
    expect(withAir).toBeGreaterThan(0);
    expect(without).toBeCloseTo(withAir * NO_AIR_FACTOR, 5);
  });

  it('runs it at 1.0 the moment a budget compressor is in the hall', () => {
    // A budget compressor gives 250 l/min, which two nailers at 30 each never trouble.
    const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
    placeEquipment(state, 'compressor', { variantId: 'budget', x: 18, y: 4 });
    expect(hallAirCheck(state).lowAir).toEqual([]);
  });

  it('says so under the hall while the hose is empty', () => {
    const state = fillRack(withExtraction(newGame({ difficulty: 'veryEasy' })), 60);
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 4, y: 8 });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
    const next = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const job = firstJob(next);
    job.stage = 'inProduction';
    job.assignedTo = 'owner';
    job.labourRemaining = job.labourValue * 0.5;
    expect(hallAirCheck(next).lines).toContain(NO_AIR_LINE);
  });

  it('says on the compressor tile what the benches want of it', () => {
    expect(renderMachine(newGame(), 'compressor')).toContain(
      'Benches and edgebanders need air',
    );
  });
});

// ---------------------------------------------------------------------------
// 3.9 Free rotation of light items
// ---------------------------------------------------------------------------

/** The hall set out, with the item turned where it stands. */
function turnedInPlace(state: GameState, itemId: string): GameState {
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`no ${itemId} in the hall`);
  return act(state, {
    type: 'MOVE_ITEM',
    itemId,
    x: item.anchorX,
    y: item.anchorY,
    rotated: !item.rotated,
  });
}

describe('turning a thing where it stands', () => {
  it('costs a bench nothing at all: no minutes and no ducting', () => {
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const bench = start.equipment.find((item) => item.specId === 'workbench');
    if (!bench) throw new Error('no bench in the hall');
    expect(itemIsHeavy(bench)).toBe(false);
    const turned = turnedInPlace(start, bench.id);
    expect(turned.equipment.find((item) => item.id === bench.id)?.rotated).toBe(true);
    // It is on the list of things that moved, and the list is emptied of everything light the
    // moment the player presses Done: no question, no minutes, no bill.
    const done = act(turned, { type: 'END_SETUP', speed: 1 });
    expect(done.movedItems).toEqual([]);
    expect(done.tasks.some((task) => task.kind === 'moveMachines' && !task.done)).toBe(false);
    expect(done.activeEvent).toBeNull();
    expect(done.eventQueue.some((event) => event.kind === 'moveConfirm')).toBe(false);
  });

  it('books a move for a saw, which is two hours and a ducting bill', () => {
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = start.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw in the hall');
    expect(itemIsHeavy(saw)).toBe(true);
    const turned = turnedInPlace(start, saw.id);
    expect(turned.movedItems.map((moved) => moved.itemId)).toEqual([saw.id]);
    const done = act(turned, { type: 'END_SETUP', speed: 1 });
    const asked = done.activeEvent?.kind === 'moveConfirm'
      || done.eventQueue.some((event) => event.kind === 'moveConfirm');
    expect(asked).toBe(true);
    const agreed = act(done, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    const move = agreed.tasks.find((task) => task.kind === 'moveMachines' && !task.done);
    expect(move?.minutesTotal).toBe(MOVE_MINUTES_PER_ITEM);
  });

  it('still costs nothing to turn a saw out and back again', () => {
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = start.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw in the hall');
    const back = turnedInPlace(turnedInPlace(start, saw.id), saw.id);
    expect(back.equipment.find((item) => item.id === saw.id)?.rotated).toBe(false);
    expect(back.movedItems).toEqual([]);
  });
});
