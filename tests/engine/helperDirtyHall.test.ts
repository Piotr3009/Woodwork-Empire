// "Dave stands and does not sweep; I see the dirt" (PIOTR, 18.09; CLAUDE.md T20 2.8).
//
// THIS IS A CHARACTERISATION TEST. Every expectation in it is what the game does TODAY, on the
// base of Turn 20, and not what it ought to do: it is here to pin the complaint down so the fix
// has something to flip. The cause it pins is (c) of the brief's four, the dust band: the floor
// shows its first pile of sawdust at 5 points of dust and the helper is not asked for a broom
// until the dust is past 40, so a hall the player can see the dirt in is a hall the labourer has
// nothing to do about.
//
// The one line that fixes it is in `runHelperClean`, which lives in the frozen
// `src/engine/game.ts`, so B3 could not write it: it is note 1 of NOTES-B3.md, for phase C. The
// day that note is applied, the three expectations marked FLIP below become their opposite (the
// hall is clean by the end of the day and the helper is the man who cleaned it), and this comment
// goes with them.

import { describe, expect, it } from 'vitest';
import { HELPER_CLEAN_DUST_BAND } from '../../src/engine/constants';
import { dustAtLeast, dustBand, hallLooksDirty, sawdustPiles } from '../../src/engine/machines';
import { helperOnDuty } from '../../src/engine/staff';
import { renderHall } from '../../src/render/hall';
import type { GameState, Worker } from '../../src/engine/index';
import { buyStartingKit, clearEvents, fillRack, hireNow, newGame, nextDay, runClock } from '../helpers';

/** The dust the hall is dirtied to at 10:00: three piles of sawdust on the floor, which is dirt
 *  the player sees, and still inside the clean band, which is what the helper is asked about. */
const DIRTIED_TO = 30;

/** The day one kit, room on the rack and a quiet board, with a helper who is in today. */
function hallWithHelper(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10);
  state.enquiries = [];
  const next = hireNow(state, 'helper', null);
  const helper = next.workers.find((worker) => worker.role === 'helper');
  if (helper === undefined) throw new Error('no helper on the books');
  helper.startDay = next.clock.day;
  return next;
}

/** The piles of sawdust the hall is actually painting, counted off the drawing and not off the
 *  figure they are drawn from. */
function pilesDrawn(state: GameState): number {
  return renderHall(state, { files: [] }).split('var(--sawdust)').length - 1;
}

function theHelper(state: GameState): Worker {
  const helper = state.workers.find((worker) => worker.role === 'helper');
  if (helper === undefined) throw new Error('no helper on the books');
  return helper;
}

/** Runs the day on to this minute of it, taking the dinner hour and answering whatever the day
 *  asks, the way the test driver plays a day. */
function onTo(state: GameState, minute: number): GameState {
  let next = clearEvents(state);
  let guard = 0;
  while (next.clock.minute < minute && guard < 40) {
    next = clearEvents(runClock(next, minute - next.clock.minute));
    guard += 1;
  }
  return next;
}

/** The scenario the brief asks for: a helper on the books, a lorry in the yard from the morning,
 *  and a hall that dirties at 10:00. */
function theDay(): { atTen: GameState; evening: GameState } {
  let state = hallWithHelper();
  state.deliveries.push({
    id: 'del-dirty-hall',
    jobId: null,
    sheets: 12,
    orderedDay: state.clock.day,
    pricePaid: 0,
    arriveDay: state.clock.day + 1,
    arrived: false,
    unloaded: false,
    bespoke: false,
    overflowSheets: 0,
  });
  // The morning the lorry lands: 08:00, the pallet at the gate and the unloading on the list.
  state = clearEvents(nextDay(state));
  theHelper(state).startDay = state.clock.day;
  // 10:00, and the hall stops being clean to the eye.
  const atTen = onTo(state, 120);
  atTen.dust = DIRTIED_TO;
  return { atTen, evening: onTo(atTen, 470) };
}

describe('why the helper stands beside the dirt (CLAUDE.md T20 2.8)', () => {
  it('paints its first pile of sawdust at an eighth of the dust the helper answers', () => {
    // The measurement the diagnosis rests on. The renderer draws one pile per ten points of dust,
    // so the first one is on the floor at 5; the helper is asked at the messy band, past 40.
    const state = hallWithHelper();
    state.dust = 5;
    expect(pilesDrawn(state)).toBe(1);
    // The drawing and the count are one figure, which is what note 1 hands the helper.
    expect(sawdustPiles(state.dust)).toBe(1);
    expect(hallLooksDirty(state.dust)).toBe(true);
    expect(dustBand(state.dust).label).toBe('clean');
    expect(dustAtLeast(state.dust, HELPER_CLEAN_DUST_BAND)).toBe(false);
    // And at the band he does answer, the floor has been dirty to the eye for a long time.
    state.dust = 41;
    expect(pilesDrawn(state)).toBe(4);
    expect(dustAtLeast(state.dust, HELPER_CLEAN_DUST_BAND)).toBe(true);
  });

  it('leaves a hall that dirties at 10:00 dirty when the men go home', () => {
    const { atTen, evening } = theDay();
    // 10:00: three piles on the floor, and the game does not think the hall wants sweeping.
    expect(atTen.dust).toBe(DIRTIED_TO);
    expect(pilesDrawn(atTen)).toBe(3);
    expect(hallLooksDirty(atTen.dust)).toBe(true);
    expect(dustAtLeast(atTen.dust, HELPER_CLEAN_DUST_BAND)).toBe(false);
    // FLIP: after note 1 the helper picks up a broom here and the hall is clean by the evening.
    expect(evening.tasks.some((task) => task.kind === 'cleaning')).toBe(false);
    expect(pilesDrawn(evening)).toBeGreaterThan(0);
    expect(evening.dust).toBeGreaterThanOrEqual(DIRTIED_TO);
  });

  it('is not the lorry, not his day and not the owner s queue that stops him', () => {
    // The other three causes the brief lists, each one shown false in the same day.
    const { atTen, evening } = theDay();
    // (a) The delivery did not swallow him: it was his, he did it, and it was over before 10:00.
    const unload = atTen.tasks.find((task) => task.kind === 'unload');
    expect(unload?.doneBy).toBe(theHelper(atTen).id);
    expect(unload?.done).toBe(true);
    expect(atTen.deliveries[0]?.unloaded).toBe(true);
    // FLIP: he is holding a broom here after note 1, instead of holding nothing at all.
    expect(theHelper(atTen).taskId).toBeNull();
    // (b) He is on duty, all day.
    expect(helperOnDuty(atTen)).toBe(true);
    expect(helperOnDuty(evening)).toBe(true);
    // (d) The cleaning is not made for the owner: past the band it is made for nobody and the
    // helper takes it off the list himself, and the owner never spends a minute on it.
    const dirty = { ...atTen, dust: 55 };
    const swept = runClock(dirty, 2);
    const cleaning = swept.tasks.find((task) => task.kind === 'cleaning' && !task.done);
    expect(cleaning?.doneBy).toBe(theHelper(swept).id);
    expect(swept.owner.currentTaskId).toBeNull();
  });
});
