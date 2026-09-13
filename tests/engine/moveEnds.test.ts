// A move of the hall always ends and always gives the clock back, whatever interrupts it
// (bug of 13.09: a call or the end of the day could leave it marked as the owner's with nobody on it).
// A move of the hall must always end: the marks on it cannot outlive the man who is on it
// (bug, 13.09: the clock stayed at 4x with nobody shifting anything).

import { describe, expect, it } from 'vitest';
import { act, buyStartingKit, choose, newGame, runClock } from '../helpers';
import { movePending, movingMachines } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';

function setupMove(state: GameState): GameState {
  let s = buyStartingKit(state);
  s = act(s, { type: 'SET_SPEED', speed: 1 });
  const saw = s.equipment.find((e) => e.specId === 'tableSaw');
  if (!saw) throw new Error('no saw');
  s = act(s, { type: 'MOVE_ITEM', itemId: saw.id, x: saw.anchorX + 4, y: saw.anchorY });
  // A machine is asked about before it is booked, and the answer here is always yes
  // (CLAUDE.md T8 3.4).
  s = act(s, { type: 'END_SETUP', speed: 1 });
  return choose(s, 'do');
}

function runUntilMoved(state: GameState, steps = 60): GameState {
  let s = state;
  for (let i = 0; i < steps; i++) {
    s = runClock(s, 10);
    if (s.activeEvent?.kind === 'goingHome') s = choose(s, 'home');
    if (s.activeEvent?.kind === 'dayEnd') s = choose(s, 'next');
    if (s.activeEvent?.kind === 'breakTime') s = choose(s, 'take');
    if (s.activeEvent?.kind === 'moveConfirm') s = choose(s, 'do');
    if (movePending(s) === null) break;
  }
  return s;
}

describe('a move of the hall always ends', () => {
  it('runs through and hands the speed back', () => {
    const s = runUntilMoved(setupMove(newGame({ difficulty: 'veryEasy' })));
    expect(movePending(s)).toBeNull();
    expect(movingMachines(s)).toBeNull();
    expect(s.speed).toBe(1);
  });

  it('comes off the owner when he is not holding it, and he picks it up again when free', () => {
    let s = setupMove(newGame({ difficulty: 'veryEasy' }));
    s = runClock(s, 10);
    const move = movePending(s);
    if (!move) throw new Error('no move');
    // The shape the bug had: the task still marked as his while he holds something else, then
    // the day ends with the mark still on it.
    const other = s.tasks.find((t) => t.kind === 'bookkeeping' && !t.done);
    if (!other) throw new Error('no other task');
    s.owner.currentTaskId = other.id;
    s.owner.resumeTaskId = null;
    s = act(s, { type: 'SET_SPEED', speed: 1 });
    // Settled once: the mark is gone or he is back on it; either way the clock is not locked
    // with nobody on the job.
    const pending = movePending(s);
    expect(pending).not.toBeNull();
    expect(movingMachines(s) === null || s.owner.currentTaskId === pending?.id).toBe(true);
    s = runUntilMoved(s);
    expect(movePending(s)).toBeNull();
    expect(s.speed).toBe(1);
  });

  it('survives going home in the middle and is finished the next morning', () => {
    let s = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    s = act(s, { type: 'SET_SPEED', speed: 1 });
    while (s.clock.minute < 510 && s.clock.day === 1) {
      s = runClock(s, 10);
      if (s.activeEvent?.kind === 'breakTime') s = choose(s, 'take');
    }
    const saw = s.equipment.find((e) => e.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    s = act(s, { type: 'MOVE_ITEM', itemId: saw.id, x: saw.anchorX + 4, y: saw.anchorY });
    s = choose(act(s, { type: 'END_SETUP', speed: 1 }), 'do');
    s = runUntilMoved(s, 120);
    expect(movePending(s)).toBeNull();
    expect(movingMachines(s)).toBeNull();
  });
});
