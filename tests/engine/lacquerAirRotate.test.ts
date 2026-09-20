// Three of Piotr's answers to the Turn 10 risks: products that are sprayed, air for every bench,
// and a light thing turned where it stands (PIOTR, 15.09; CLAUDE.md T11 3.7, 3.8, 3.9).

import { describe, expect, it } from 'vitest';
import {
  MOVE_MINUTES_PER_ITEM,
  NO_AIR_LINE,
  PRODUCT_TEMPLATES,
  WET_AIR_FINISH_FACTOR,
  WET_AIR_FINISH_RATING,
} from '../../src/engine/constants';
import { blockFor, kitBlockFor } from '../../src/engine/board';
import { lockReasonFor } from '../../src/engine/catalog';
import { familyForStage } from '../../src/engine/stages';
import { airCheck, benchHasAir, hallAirCheck, sprayingOnWetAir } from '../../src/engine/media';
import { bubbleFor } from '../../src/engine/bubbles';
import { applyRating } from '../../src/engine/reputation';
import { itemIsHeavy } from '../../src/engine/machines';
import { renderMachine } from '../../src/ui/machine';
import type { GameState, ProductTemplate } from '../../src/engine/index';
import {
  acceptNow,
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

  it('counts a booth on the road, so the same product is never takeable and greyed at once', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 40;
    const ordered = act(state, { type: 'BUY_EQUIPMENT', specId: 'sprayBooth' });
    expect(ordered.onOrder.some((item) => item.specId === 'sprayBooth')).toBe(true);
    expect(ordered.equipment.some((item) => item.specId === 'sprayBooth')).toBe(false);
    // The board and the tile agree: on the road counts, as it does for a saw (CLAUDE.md T8 3.2).
    expect(kitBlockFor(ordered, template('lacqueredWardrobe'))).toBeNull();
    expect(lockReasonFor(ordered, template('lacqueredWardrobe'))).toBeNull();
  });

  it('does its Finishing at the booth, and nothing else does', () => {
    const lacquered = { labourValue: 1000, materialKind: 'sheet' as const, finish: 'lacquer' as const, byHand: false, needsSpindle: false };
    const laminate = { ...lacquered, finish: 'laminate' as const };
    expect(familyForStage(lacquered, 'finishing')).toBe('sprayBooth');
    expect(familyForStage(laminate, 'finishing')).toBeNull();
  });

  it('takes half as long again over the finish on wet air, minute for minute', () => {
    // The minutes that go into a Finishing in a booth on wet air against the same minutes in a
    // booth with a dryer on it: the wet one is worth 1 / 1.5 of the dry one (CLAUDE.md T10 3.3).
    const wet = sprayedMinutes(false);
    const dry = sprayedMinutes(true);
    expect(dry).toBeGreaterThan(0);
    expect(wet).toBeCloseTo(dry / WET_AIR_FINISH_FACTOR, 4);
    expect(wet).toBeLessThan(dry);
  });

  it('marks the piece, and it loses a point of rating for it', () => {
    const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
    placeEquipment(state, 'compressor', { variantId: 'pro', x: 18, y: 4 });
    const booth = placeEquipment(state, 'sprayBooth', { x: 7, y: 6 });
    // A pro compressor has no dryer built in and none is fitted to it (CLAUDE.md T10 3.3).
    expect(sprayingOnWetAir(state, booth)).toBe(true);
    // The rating a delivered piece carries is a point light for the defects in it.
    const sprayed = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
    sprayed.enquiries = [];
    const enquiry = placeEnquiry(sprayed, { price: 4000, deadlineDays: 40 });
    const taken = acceptNow(sprayed, enquiry.id, false);
    const job = firstJob(taken);
    const dry = JSON.parse(JSON.stringify(taken)) as GameState;
    job.wetFinish = true;
    const wet = applyRating(taken, job);
    const clean = applyRating(dry, firstJob(dry));
    expect(clean - wet).toBe(WET_AIR_FINISH_RATING);
  });
});

/** The minutes a lacquered job takes at its Finishing, in a hall whose booth has a dryer on it or
 *  has not. Everything else about the two halls is the same. */
function sprayedMinutes(dryer: boolean): number {
  const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
  placeEquipment(state, 'compressor', { variantId: 'pro', x: 18, y: 4 });
  placeEquipment(state, 'sprayBooth', { x: 7, y: 6 });
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 4, y: 8 });
  placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
  placeEquipment(state, 'edgebander', { variantId: 'budget', x: 14, y: 8 });
  if (dryer) placeEquipment(state, 'airDryer', { x: 19, y: 2 });
  fillRack(state, 200);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    templateId: 'lacqueredWardrobe',
    name: 'Lacquered wardrobe',
    finish: 'lacquer',
    price: 4000,
    deadlineDays: 90,
  });
  let next = acceptNow(state, enquiry.id, false);
  const job = firstJob(next);
  job.stage = 'inProduction';
  job.assignees = ['owner'];
  // Into the Finishing, which for a lacquered job is done at the booth (CLAUDE.md T11 3.7).
  job.labourRemaining = job.labourValue * 0.1;
  const before = firstJob(next).labourRemaining;
  next = runClock(next, 20);
  return Math.round((before - firstJob(next).labourRemaining) * 100000) / 100000;
}

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
    next = acceptNow(next, enquiry.id, false);
  }
  for (const job of next.jobs) {
    job.stage = 'inProduction';
    job.assignees = ['owner'];
    // Into the assembly, which is the stage a man does with a nailer in his hand.
    job.labourRemaining = job.labourValue * 0.5;
  }
  const before = firstJob(next).labourRemaining;
  const worked = runClock(next, 20);
  return Math.round((before - firstJob(worked).labourRemaining) * 100000) / 100000;
}

describe('air for every bench', () => {
  it('works no assembly at all in a hall with no compressor at all', () => {
    // Turn 11 ran it at 0.67, the nailer put down and the carcass screwed together by hand.
    // Piotr looked at his own hall on 20.09 and said a bench without air stands still, so the
    // minutes are nought and not two thirds of them (CLAUDE.md T23 2.7).
    const withAir = assembledMinutes('budget');
    const without = assembledMinutes(null);
    expect(withAir).toBeGreaterThan(0);
    expect(without).toBe(0);
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
    const next = acceptNow(state, enquiry.id, false);
    const job = firstJob(next);
    job.stage = 'inProduction';
    job.assignees = ['owner'];
    job.labourRemaining = job.labourValue * 0.5;
    expect(hallAirCheck(next).lines).toContain(NO_AIR_LINE);
  });

  it('says on the compressor tile what the benches want of it', () => {
    expect(renderMachine(newGame(), 'compressor')).toContain(
      'Benches and edgebanders need air',
    );
  });
});

/** One man at one bench, halfway into the assembly of one job, in a hall with the compressor
 *  class asked for or with none at all. The saw is there because the cutting has to have been
 *  possible for the assembly to be the stage he is standing at. */
function benchHall(compressorClass: string | null): GameState {
  const state = fillRack(withExtraction(newGame({ difficulty: 'veryEasy' })), 200);
  if (compressorClass !== null) {
    placeEquipment(state, 'compressor', { variantId: compressorClass, x: 18, y: 4 });
  }
  placeEquipment(state, 'tableSaw', { variantId: 'used', x: 6, y: 1 });
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 4, y: 8 });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
  const next = acceptNow(state, enquiry.id, false);
  const job = firstJob(next);
  job.stage = 'inProduction';
  job.assignees = ['owner'];
  job.labourRemaining = job.labourValue * 0.5;
  return next;
}

/** Piotr looked at a hall of his own size on 20.09 and said a bench with no air behind it stands
 *  still: no nailer, no driver, no work, and not the two thirds of a minute Turn 11 gave it
 *  (CLAUDE.md T23 2.7). */
describe('no bench work without air', () => {
  it('stands the man at his bench, with the mark over his head and the minutes on his meter', () => {
    const ran = runClock(benchHall(null), 10);
    // Not a minute of the assembly went into the job.
    expect(firstJob(ran).labourRemaining).toBe(firstJob(benchHall(null)).labourRemaining);
    // The red mark over him says the one thing the player has to buy.
    expect(bubbleFor(ran, 'owner')?.key).toBe('noCompressor');
    expect(bubbleFor(ran, 'owner')?.text).toBe('no compressor');
    // And the minutes he stood are on his day meter under that reason, not under the machine.
    expect(ran.owner.idleByReason.noCompressor).toBeGreaterThan(0);
    expect(ran.owner.idleByReason.noMachine).toBe(0);
  });

  it('works the very next minute once a used compressor is in the hall', () => {
    const stood = runClock(benchHall(null), 10);
    const before = firstJob(stood).labourRemaining;
    placeEquipment(stood, 'compressor', { variantId: 'used', x: 18, y: 4 });
    const worked = runClock(stood, 1);
    expect(firstJob(worked).labourRemaining).toBeLessThan(before);
    expect(bubbleFor(worked, 'owner')).toBeNull();
  });

  it('keeps him working on a compressor that is merely short of litres, at Turn 10 s 0.7', () => {
    // A compressor short of litres is not "no air": rule 2 of T10 3.2 runs every pneumatic
    // consumer on it at 0.7 for the minute, the bench among them, and Turn 23 leaves that alone.
    // Only an empty hall stands a man still, which is what the hover line "no compressor" says
    // and what the brief's own "a used compressor bought: work resumes" asks for (T23 2.7).
    const hall = benchHall('used');
    expect(benchHasAir(hall)).toBe(true);
    // Eight men at benches and one sanding is far past what a used compressor will carry, and it
    // is still not a hall with no air in it.
    expect(airCheck(hall, { bench: 8, sanding: 1 }).lowAir).toHaveLength(1);
    expect(benchHasAir(hall)).toBe(true);
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
    orientation: item.orientation === 0 ? 1 : 0,
  });
}

describe('turning a thing where it stands', () => {
  it('costs a bench nothing at all: no minutes and no ducting', () => {
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const bench = start.equipment.find((item) => item.specId === 'workbench');
    if (!bench) throw new Error('no bench in the hall');
    expect(itemIsHeavy(bench)).toBe(false);
    const turned = turnedInPlace(start, bench.id);
    expect(turned.equipment.find((item) => item.id === bench.id)?.orientation).toBe(1);
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

  it('puts a saw back the way it stood when the player changes his mind', () => {
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = start.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw in the hall');
    const stood = { x: saw.anchorX, y: saw.anchorY, orientation: saw.orientation };
    const turned = turnedInPlace(start, saw.id);
    const done = act(turned, { type: 'END_SETUP', speed: 1 });
    const back = act(done, { type: 'RESOLVE_EVENT', choiceId: 'back' });
    const same = back.equipment.find((item) => item.id === saw.id);
    // Exactly where it stood means the way it stood as well (CLAUDE.md T11 3.9).
    expect({ x: same?.anchorX, y: same?.anchorY, orientation: same?.orientation }).toEqual(stood);
    expect(back.movedItems).toEqual([]);
    expect(back.tasks.some((task) => task.kind === 'moveMachines' && !task.done)).toBe(false);
  });

  it('still costs nothing to turn a saw out and back again', () => {
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = start.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw in the hall');
    const back = turnedInPlace(turnedInPlace(start, saw.id), saw.id);
    expect(back.equipment.find((item) => item.id === saw.id)?.orientation).toBe(0);
    expect(back.movedItems).toEqual([]);
  });
});
