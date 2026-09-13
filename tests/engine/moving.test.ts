// Moving the kit about costs time and ducting, and the clock runs itself while it is done
// (CLAUDE.md T4 3.5).

import { describe, expect, it } from 'vitest';
import {
  OVERTIME_END_MINUTE,
  DUCTING_RECONNECT_COST,
  MOVE_MINUTES_PER_ITEM,
  MOVING_SPEED,
} from '../../src/engine/constants';
import {
  bagsExist,
  ductingDue,
  extractorBreakdownChance,
  hasCentralExtraction,
  hasExtraction,
  needsDucting,
} from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { movePending, movingMachines } from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { renderTopbar } from '../../src/ui/topbar';
import {
  act,
  buyStartingKit,
  clearEvents,
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

describe('a move the day ended in the middle of', () => {
  it('is picked up again in the morning, and charged when it is finished', () => {
    let state = drag(drag(inSetup(), 'tableSaw'), 'edgebander');
    const cash = state.cash;
    state = act(state, { type: 'END_SETUP', speed: 1 });
    const move = movePending(state);
    expect(move).not.toBeNull();
    // Near seven o'clock, where the tools go down whatever anybody wants, so the day ends with
    // the kit still up in the air.
    state.clock.minute = OVERTIME_END_MINUTE - 20;
    state.owner.homeAsked = true;
    state = clearEvents(tick(state, 30));
    expect(state.clock.day).toBe(2);
    expect(movePending(state)?.id).toBe(move?.id);
    // Nobody had to be told: he starts the morning where he left off.
    expect(state.owner.currentTaskId).toBe(move?.id);
    expect(state.speed).toBe(MOVING_SPEED);
    let guard = 0;
    while (movePending(state) !== null && guard < 400) {
      state = clearEvents(tick(state, 1));
      guard += 1;
    }
    expect(cash - state.cash).toBeGreaterThanOrEqual(2 * DUCTING_RECONNECT_COST);
    expect(state.movedItems).toEqual([]);
  });
});

describe('the speed the player was on', () => {
  it('comes back the moment the kit is down', () => {
    let state = act(drag(inSetup(), 'workbench'), { type: 'END_SETUP', speed: 2 });
    expect(state.speed).toBe(MOVING_SPEED);
    state = tick(state, MOVE_MINUTES_PER_ITEM);
    expect(movingMachines(state)).toBeNull();
    expect(state.speed).toBe(2);
    expect(state.speedBeforeMove).toBeNull();
  });
});

describe('a client ringing in the middle of a move', () => {
  it('takes the fifteen minutes and leaves the move forced at 4x all the way through', () => {
    let state = inSetup();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    state = drag(state, 'tableSaw');
    state = act(state, { type: 'END_SETUP', speed: 1 });
    const move = movingMachines(state);
    expect(move).not.toBeNull();
    // Make the client ring this minute.
    const call = state.jobs[0]?.calls[0];
    if (!call) throw new Error('no call in the diary');
    call.day = state.clock.day;
    call.minute = state.clock.minute;
    call.state = 'waiting';
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('clientCall');
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'answer' });
    // He is on the phone, the move is still his, and the clock is still not the player's.
    expect(state.owner.resumeTaskId).toBe(move?.id);
    expect(movingMachines(state)?.id).toBe(move?.id);
    expect(state.speed).toBe(MOVING_SPEED);
    expect(act(state, { type: 'SET_SPEED', speed: 1 }).speed).toBe(MOVING_SPEED);
    state = tick(state, 15);
    // Phone down, back on the move, and it still has all its minutes to go but fifteen fewer
    // of the day.
    expect(state.owner.currentTaskId).toBe(move?.id);
    expect(state.owner.resumeTaskId).toBeNull();
    expect(state.owner.minutesByCategory.admin).toBe(15);
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
    const plain = inSetup();
    // The day 1 kit has a bag extractor, so there are bags until a ducted system goes in.
    expect(bagsExist(plain)).toBe(true);
    expect(hasCentralExtraction(plain)).toBe(false);
    expect(canBuy(plain, 'pelletiser').reason).toContain('Central dust extraction system or Flexi');
    const flexi = inSetup();
    placeEquipment(flexi, 'flexiSystem');
    expect(hasCentralExtraction(flexi)).toBe(true);
    expect(hasExtraction(flexi)).toBe(true);
    // No bags, and the extractor cannot break down, exactly as with the central system.
    expect(bagsExist(flexi)).toBe(false);
    expect(extractorBreakdownChance(flexi)).toBe(0);
    // The waste is the same 400 a month unless the pelletiser is in, which it will take.
    expect(canBuy(flexi, 'pelletiser').ok).toBe(true);
    const central = inSetup();
    placeEquipment(central, 'dustSystem');
    expect(bagsExist(central)).toBe(bagsExist(flexi));
    expect(extractorBreakdownChance(central)).toBe(extractorBreakdownChance(flexi));
    expect(canBuy(central, 'pelletiser').ok).toBe(canBuy(flexi, 'pelletiser').ok);
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

  it('is not a move either when he drags it away and drags it back again', () => {
    const start = inSetup();
    const saw = start.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    const from = { x: saw.anchorX, y: saw.anchorY };
    const away = act(start, { type: 'MOVE_ITEM', itemId: saw.id, x: from.x, y: from.y + 1 });
    expect(away.movedItems).toHaveLength(1);
    const back = act(away, { type: 'MOVE_ITEM', itemId: saw.id, x: from.x, y: from.y });
    expect(back.movedItems).toEqual([]);
    expect(ductingDue(back)).toEqual({ machines: 0, cost: 0 });
    // Nothing to carry and nothing to pay for.
    const done = act(back, { type: 'END_SETUP', speed: 1 });
    expect(movePending(done)).toBeNull();
    expect(done.cash).toBe(start.cash);
  });
});
