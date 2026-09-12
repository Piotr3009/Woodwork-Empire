// Moving the kit about costs time and ducting, and the clock runs itself while it is done
// (CLAUDE.md T4 3.5).

import { describe, expect, it } from 'vitest';
import {
  DUCTING_RECONNECT_COST,
  MOVE_MINUTES_PER_ITEM,
  MOVING_SPEED,
} from '../../src/engine/constants';
import { ductingDue, hasCentralExtraction, needsDucting } from '../../src/engine/machines';
import { movingMachines } from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { renderTopbar } from '../../src/ui/topbar';
import {
  act,
  buyStartingKit,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

/** A hall with the day 1 kit, the clock stopped the way setup mode stops it. */
function inSetup(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  return act(state, { type: 'SET_SPEED', speed: 0 });
}

/** Drags an item of this kind one tile down the hall. */
function drag(state: GameState, specId: string): GameState {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  return act(state, {
    type: 'MOVE_ITEM',
    itemId: item.id,
    x: item.anchorX,
    y: item.anchorY + 1,
  });
}

describe('which items are ducted', () => {
  it('is every machine family but the compressor, and nothing that is not a machine', () => {
    expect(needsDucting('tableSaw')).toBe(true);
    expect(needsDucting('edgebander')).toBe(true);
    expect(needsDucting('thicknesser')).toBe(true);
    expect(needsDucting('cnc')).toBe(true);
    expect(needsDucting('compressor')).toBe(false);
    expect(needsDucting('handToolSet')).toBe(false);
    expect(needsDucting('drill')).toBe(false);
    expect(needsDucting('workbench')).toBe(false);
    expect(needsDucting('sheetRack')).toBe(false);
    expect(needsDucting('locker')).toBe(false);
    expect(needsDucting('canteenSeat')).toBe(false);
  });
});

describe('a move of two machines', () => {
  it('charges 1,600 and takes 120 minutes with the clock forced to 4x', () => {
    let state = drag(drag(inSetup(), 'tableSaw'), 'edgebander');
    expect(state.movedItems).toHaveLength(2);
    expect(ductingDue(state)).toEqual({ machines: 2, cost: 2 * DUCTING_RECONNECT_COST });
    const cash = state.cash;
    // The player presses Done, asking for the speed he was on before he started dragging.
    state = act(state, { type: 'END_SETUP', speed: 1 });
    const move = movingMachines(state);
    expect(move?.minutesTotal).toBe(2 * MOVE_MINUTES_PER_ITEM);
    expect(state.speed).toBe(MOVING_SPEED);
    expect(renderTopbar(state, 'hall')).toContain('Moving machines');
    // The speed is not his while it runs.
    state = act(state, { type: 'SET_SPEED', speed: 1 });
    expect(state.speed).toBe(MOVING_SPEED);
    // Nothing is charged until the kit is back down.
    state = tick(state, 119);
    expect(state.cash).toBe(cash);
    expect(movingMachines(state)).not.toBeNull();
    state = tick(state, 1);
    expect(movingMachines(state)).toBeNull();
    expect(cash - state.cash).toBe(2 * DUCTING_RECONNECT_COST);
    const lines = state.ledger.filter((entry) => entry.category === 'ducting');
    expect(lines.map((entry) => entry.label)).toEqual([
      'Ducting reconnection: table saw',
      'Ducting reconnection: hand edgebander',
    ]);
    expect(state.movedItems).toEqual([]);
    // And the clock is the player's again.
    expect(renderTopbar(state, 'hall')).toContain('data-do="setSpeed"');
    state = act(state, { type: 'SET_SPEED', speed: 2 });
    expect(state.speed).toBe(2);
  });

  it('stops every bench while the kit is being shifted', () => {
    let state = inSetup();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const job = state.jobs[0];
    if (!job) throw new Error('no job');
    job.stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: job.id });
    const left = state.jobs[0]?.labourRemaining ?? 0;
    state = drag(state, 'tableSaw');
    state = act(state, { type: 'END_SETUP', speed: 4 });
    // The owner is the one carrying it, so he is not at any bench.
    expect(state.owner.currentTaskId).toBe(movingMachines(state)?.id);
    state = tick(state, 30);
    expect(state.jobs[0]?.labourRemaining).toBe(left);
    // The kit is down, and he walks back to the job he was on.
    state = tick(state, 35);
    expect(movingMachines(state)).toBeNull();
    expect(state.jobs[0]?.labourRemaining).toBeLessThan(left);
  });
});

describe('the flexi extraction system', () => {
  it('makes the reconnection free for ever', () => {
    let state = inSetup();
    placeEquipment(state, 'flexiSystem');
    expect(hasCentralExtraction(state)).toBe(true);
    state = drag(drag(state, 'tableSaw'), 'edgebander');
    expect(ductingDue(state)).toEqual({ machines: 0, cost: 0 });
    const cash = state.cash;
    state = act(state, { type: 'END_SETUP', speed: 1 });
    // The hour an item is still worked, and not a penny is charged for the ducting.
    expect(movingMachines(state)?.minutesTotal).toBe(2 * MOVE_MINUTES_PER_ITEM);
    state = tick(state, 120);
    expect(movingMachines(state)).toBeNull();
    expect(state.cash).toBe(cash);
    expect(state.ledger.some((entry) => entry.category === 'ducting')).toBe(false);
  });

  it('has everything the central system has, and the pelletiser works off it', () => {
    const state = inSetup();
    placeEquipment(state, 'flexiSystem');
    expect(hasCentralExtraction(state)).toBe(true);
    // No bags once it is in, exactly as with the central system.
    expect(state.equipment.some((item) => item.specId === 'extractor')).toBe(true);
    expect(act(state, { type: 'BUY_EQUIPMENT', specId: 'pelletiser' }).equipment.some(
      (item) => item.specId === 'pelletiser',
    )).toBe(true);
  });
});

describe('a bench move', () => {
  it('costs the hour and nothing in ducting', () => {
    let state = drag(inSetup(), 'workbench');
    expect(ductingDue(state)).toEqual({ machines: 0, cost: 0 });
    const cash = state.cash;
    state = act(state, { type: 'END_SETUP', speed: 1 });
    expect(movingMachines(state)?.minutesTotal).toBe(MOVE_MINUTES_PER_ITEM);
    state = tick(state, MOVE_MINUTES_PER_ITEM);
    expect(movingMachines(state)).toBeNull();
    expect(state.cash).toBe(cash);
  });

  it('is not a move at all when the item goes back exactly where it stood', () => {
    const state = inSetup();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    const stood = act(state, {
      type: 'MOVE_ITEM',
      itemId: saw.id,
      x: saw.anchorX,
      y: saw.anchorY,
    });
    expect(stood.movedItems).toEqual([]);
    expect(act(stood, { type: 'END_SETUP', speed: 1 }).speed).toBe(1);
  });
});
