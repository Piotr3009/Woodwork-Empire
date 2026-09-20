// Moving the kit about. A bench, a rack, a cabinet, a locker or a seat is simply where the player
// dropped it; a machine is two hours and a ducting bill, and he is asked before either is booked
// (PIOTR, 13.09; CLAUDE.md T4 3.5, T8 3.4).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  OVERTIME_END_MINUTE,
  MOVE_MINUTES_PER_ITEM,
  SKIP_SPEED,
} from '../../src/engine/constants';
import { formatTime } from '../../src/engine/clock';
import { finishTimeFor } from '../../src/engine/tasks';
import {
  bagsExist,
  ductingDue,
  extractorBreakdownChance,
  hasCentralExtraction,
  hasExtraction,
  needsDucting,
} from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { firstFreeCell } from '../../src/engine/layout';
import { movePending, movingMachines } from '../../src/engine/tasks';
import { moveConfirmPending } from '../../src/engine/game';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { renderTopbar } from '../../src/ui/topbar';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

/** A hall with the day 1 kit and a thicknesser stood in it, the clock stopped the way setup mode
 *  stops it. The thicknesser is the second ducted machine: the hand edgebander holds no cell of
 *  the floor any more and cannot be moved at all (CLAUDE.md T6 3.5). */
function inSetup(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'thicknesser', { x: 12, y: 1 });
  return act(state, { type: 'SET_SPEED', speed: 0 });
}

/** Drags an item of this kind to the first cell of the hall its working zone fits in. A tile down
 *  the hall is no longer a move that always lands: a class reserves the room around it, so the
 *  test asks the engine where the thing will go (CLAUDE.md T7 3.3). */
function drag(state: GameState, specId: string): GameState {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  const to = firstFreeCell(state, item.specId, item.variantId);
  if (!to) throw new Error(`nowhere to drag the ${specId}`);
  return act(state, { type: 'MOVE_ITEM', itemId: item.id, x: to.x, y: to.y });
}

/** Presses Done and says yes to whatever it asks. */
function doIt(state: GameState, speed: 0 | 1 | 2 | 4 = 1): GameState {
  return act(act(state, { type: 'END_SETUP', speed }), {
    type: 'RESOLVE_EVENT',
    choiceId: 'do',
  });
}

describe('which items are ducted', () => {
  it('is every machine family but the compressor, and nothing that is not a machine', () => {
    expect(needsDucting('tableSaw')).toBe(true);
    // It holds no cell of the floor, so there is nothing to unplug it from (T6 3.5).
    expect(needsDucting('edgebander')).toBe(false);
    expect(needsDucting('thicknesser')).toBe(true);
    expect(needsDucting('cnc')).toBe(true);
    expect(needsDucting('compressor')).toBe(false);
    expect(needsDucting('handToolSet')).toBe(false);
    expect(needsDucting('workbench')).toBe(false);
    expect(needsDucting('sheetRack')).toBe(false);
    expect(needsDucting('locker')).toBe(false);
  });
});

describe('leaving setup with two machines moved', () => {
  it('asks the question in the words of the brief before anything is booked', () => {
    const dragged = drag(drag(inSetup(), 'tableSaw'), 'thicknesser');
    expect(dragged.movedItems).toHaveLength(2);
    expect(ductingDue(dragged)).toEqual({ machines: 2 });
    const asked = act(dragged, { type: 'END_SETUP', speed: 1 });
    expect(asked.activeEvent?.kind).toBe('moveConfirm');
    expect(asked.activeEvent?.body).toBe(
      'Moving 2 machines takes 2 h and the extraction pipe of 2 machines run again at the new ' +
        'length. Do it?',
    );
    expect(asked.activeEvent?.choices.map((choice) => choice.label)).toEqual([
      'Do it',
      'Put them back',
    ]);
    // Nothing is booked and nothing is charged until he says so.
    expect(movePending(asked)).toBeNull();
    expect(asked.cash).toBe(dragged.cash);
  });

  it('runs both pipes again at the new length, and takes 120 minutes with the clock run through it', () => {
    const dragged = drag(drag(inSetup(), 'tableSaw'), 'thicknesser');
    const cash = dragged.cash;
    let state = doIt(dragged);
    const move = movingMachines(state);
    expect(move?.minutesTotal).toBe(2 * MOVE_MINUTES_PER_ITEM);
    expect(state.speed).toBe(SKIP_SPEED);
    expect(renderTopbar(state, 'hall')).toContain('Skipping ahead');
    // The speed is not his while it runs.
    state = act(state, { type: 'SET_SPEED', speed: 1 });
    expect(state.speed).toBe(SKIP_SPEED);
    // Nothing is charged until the kit is back down.
    state = tick(state, 119);
    expect(state.cash).toBe(cash);
    expect(movingMachines(state)).not.toBeNull();
    state = tick(state, 1);
    expect(movingMachines(state)).toBeNull();
    // Moving a machine disconnects it and refunds nothing; reconnecting charges the new length,
    // by the metre (CLAUDE.md T13 3.19). The first line is the day 1 connection of the saw.
    const lines = state.ledger.filter((entry) => entry.category === 'pipes');
    expect(lines.map((entry) => entry.label.split(',')[0])).toEqual([
      'Extraction pipe: table saw',
      'Extraction pipe: table saw',
      'Extraction pipe: thicknesser',
    ]);
    expect(cash - state.cash).toBe(lines.slice(1).reduce((total, entry) => total - entry.amount, 0));
    expect(cash - state.cash).toBeGreaterThan(0);
    expect(state.movedItems).toEqual([]);
    // And the clock is the player's again, at the speed he pressed Done on.
    expect(renderTopbar(state, 'hall')).toContain('data-do="setSpeed"');
    expect(state.speed).toBe(1);
    state = act(state, { type: 'SET_SPEED', speed: 2 });
    expect(state.speed).toBe(2);
  });

  it('puts every one of them back where it stood when he says so', () => {
    const start = inSetup();
    const stood = start.equipment.map((item) => ({
      id: item.id,
      x: item.anchorX,
      y: item.anchorY,
    }));
    const dragged = drag(drag(start, 'tableSaw'), 'thicknesser');
    expect(dragged.equipment.map((item) => item.anchorX)).not.toEqual(stood.map((was) => was.x));
    const back = act(act(dragged, { type: 'END_SETUP', speed: 1 }), {
      type: 'RESOLVE_EVENT',
      choiceId: 'back',
    });
    for (const was of stood) {
      const item = back.equipment.find((entry) => entry.id === was.id);
      expect(item?.anchorX, was.id).toBe(was.x);
      expect(item?.anchorY, was.id).toBe(was.y);
    }
    expect(back.movedItems).toEqual([]);
    expect(movePending(back)).toBeNull();
    expect(back.cash).toBe(start.cash);
    expect(back.speed).toBe(1);
  });

  it('stops every bench while the kit is being shifted', () => {
    let state = inSetup();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    state = acceptNow(state, enquiry.id, false);
    const job = state.jobs[0];
    if (!job) throw new Error('no job');
    job.stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: job.id });
    const left = state.jobs[0]?.labourRemaining ?? 0;
    state = doIt(drag(state, 'tableSaw'), 4);
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

describe('the light kit', () => {
  it('is simply where he dropped it: no question, no time and no money', () => {
    const start = inSetup();
    const dragged = drag(drag(start, 'workbench'), 'sheetRack');
    expect(dragged.movedItems).toHaveLength(2);
    const done = act(dragged, { type: 'END_SETUP', speed: 1 });
    // Nothing to ask about, nothing on the list and nothing out of the bank.
    expect(done.activeEvent).toBeNull();
    expect(movePending(done)).toBeNull();
    expect(done.movedItems).toEqual([]);
    expect(done.cash).toBe(start.cash);
    expect(done.speed).toBe(1);
    // And they are where he put them.
    const bench = dragged.equipment.find((item) => item.specId === 'workbench');
    const after = done.equipment.find((item) => item.id === bench?.id);
    expect(after?.anchorX).toBe(bench?.anchorX);
    expect(after?.anchorY).toBe(bench?.anchorY);
  });

  it('is not counted in the bill when a machine goes with it', () => {
    const asked = act(drag(drag(inSetup(), 'workbench'), 'tableSaw'), {
      type: 'END_SETUP',
      speed: 1,
    });
    expect(asked.activeEvent?.body).toBe(
      'Moving 1 machine takes 1 h and the extraction pipe of 1 machine run again at the new ' +
        'length. Do it?',
    );
    expect(asked.movedItems).toHaveLength(1);
  });
});

describe('the question itself', () => {
  it('cannot be asked twice: the hall is not set out again over the top of it', () => {
    const asked = act(drag(inSetup(), 'tableSaw'), { type: 'END_SETUP', speed: 1 });
    expect(moveConfirmPending(asked)).toBe(true);
    // Pressing Done again changes nothing at all: one question, one move.
    const again = act(asked, { type: 'END_SETUP', speed: 1 });
    expect(again.eventQueue.filter((event) => event.kind === 'moveConfirm')).toHaveLength(0);
    expect(again.activeEvent?.kind).toBe('moveConfirm');
    const done = act(again, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movePending(done)).not.toBeNull();
    expect(movingMachines(done)?.minutesTotal).toBe(MOVE_MINUTES_PER_ITEM);
    expect(moveConfirmPending(done)).toBe(false);
  });
});

describe('a move that will not fit in what is left of the day', () => {
  it('says so: the rest of it is done tomorrow morning', () => {
    let state = inSetup();
    // Four o'clock, with two hours of shifting to do.
    state.clock.minute = DAY_END_MINUTE - 60;
    state.owner.homeAsked = true;
    state = doIt(drag(drag(state, 'tableSaw'), 'thicknesser'));
    const move = movePending(state);
    if (!move) throw new Error('no move');
    const at = finishTimeFor(state, move.minutesRemaining);
    expect(at.day).toBe(state.clock.day + 1);
    expect(formatTime(at.minute)).toBe('09:00');
  });
});

describe('a move the day ended in the middle of', () => {
  it('is picked up again in the morning, and charged when it is finished', () => {
    let state = doIt(drag(drag(inSetup(), 'tableSaw'), 'thicknesser'));
    const cash = state.cash;
    const move = movePending(state);
    expect(move).not.toBeNull();
    // Near seven o'clock, where the tools go down whatever anybody wants, so the day ends with
    // the kit still up in the air.
    state.clock.minute = OVERTIME_END_MINUTE - 20;
    state.owner.homeAsked = true;
    state = clearEvents(tick(state, 30));
    expect(state.clock.day).toBe(2);
    expect(movePending(state)?.id).toBe(move?.id);
    // Nobody had to be told: he starts the morning where he left off. The run the player asked
    // for ended with the day, so the clock is his again (CLAUDE.md T8 3.3).
    expect(state.owner.currentTaskId).toBe(move?.id);
    expect(state.skipTaskId).toBeNull();
    let guard = 0;
    while (movePending(state) !== null && guard < 400) {
      state = clearEvents(tick(state, 1));
      guard += 1;
    }
    // The day 1 connection of the saw, and the two runs of the move (CLAUDE.md T13 3.19).
    expect(state.ledger.filter((entry) => entry.category === 'pipes').length).toBe(3);
    expect(cash - state.cash).toBeGreaterThan(0);
    expect(state.movedItems).toEqual([]);
  });
});

describe('the speed the player was on', () => {
  it('comes back the moment the kit is down', () => {
    let state = doIt(drag(inSetup(), 'tableSaw'), 2);
    expect(state.speed).toBe(SKIP_SPEED);
    state = tick(state, MOVE_MINUTES_PER_ITEM);
    expect(movingMachines(state)).toBeNull();
    expect(state.speed).toBe(2);
    expect(state.skipTaskId).toBeNull();
  });
});

describe('a client ringing in the middle of a move', () => {
  it('takes the fifteen minutes and leaves the clock run through the whole of it', () => {
    let state = inSetup();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    state = acceptNow(state, enquiry.id, false);
    state = doIt(drag(state, 'tableSaw'));
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
    expect(state.speed).toBe(SKIP_SPEED);
    expect(act(state, { type: 'SET_SPEED', speed: 1 }).speed).toBe(SKIP_SPEED);
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
    state = drag(drag(state, 'tableSaw'), 'thicknesser');
    expect(ductingDue(state)).toEqual({ machines: 0 });
    const cash = state.cash;
    const pipeLines = state.ledger.filter((entry) => entry.category === 'pipes').length;
    const asked = act(state, { type: 'END_SETUP', speed: 1 });
    // Still two hours of somebody's day, and not a penny of ducting in the question.
    expect(asked.activeEvent?.body).toBe('Moving 2 machines takes 2 h. Do it?');
    state = act(asked, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movingMachines(state)?.minutesTotal).toBe(2 * MOVE_MINUTES_PER_ITEM);
    state = tick(state, 120);
    expect(movingMachines(state)).toBeNull();
    expect(state.cash).toBe(cash);
    expect(state.ledger.filter((entry) => entry.category === 'pipes')).toHaveLength(pipeLines);
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

describe('a drag that changes nothing', () => {
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
    const away = drag(start, 'tableSaw');
    expect(away.movedItems).toHaveLength(1);
    const back = act(away, { type: 'MOVE_ITEM', itemId: saw.id, x: from.x, y: from.y });
    expect(back.movedItems).toEqual([]);
    expect(ductingDue(back)).toEqual({ machines: 0 });
    // Nothing to carry and nothing to pay for.
    const done = act(back, { type: 'END_SETUP', speed: 1 });
    expect(movePending(done)).toBeNull();
    expect(done.activeEvent).toBeNull();
    expect(done.cash).toBe(start.cash);
  });
});
