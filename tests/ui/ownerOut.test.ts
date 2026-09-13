// The owner is out, and the clock the player can skip through it (PIOTR, 13.09;
// CLAUDE.md T8 3.3).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  SHOPPING_MINUTES,
  SITE_MEASURE_MINUTES,
  SKIP_SPEED,
} from '../../src/engine/constants';
import { ownerOutTask, skippedTask } from '../../src/engine/tasks';
import { renderTopbar } from '../../src/ui/topbar';
import { tripLine } from '../../src/ui/modal';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderOwnerOut } from '../../src/ui/ownerOut';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, fillRack, newGame, runClock } from '../helpers';

/** A hall with the day 1 kit, and a saw ordered so the owner is out at the shops. */
function shopping(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  return act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'standard' });
}

describe('the trip the owner is on', () => {
  it('is one selector, read inside the catalogue and outside it alike', () => {
    const quiet = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    expect(ownerOutTask(quiet)).toBeNull();
    expect(tripLine(quiet, 'shopping')).toBe('');
    const out = shopping();
    const task = ownerOutTask(out);
    expect(task?.kind).toBe('shopping');
    expect(task?.minutesTotal).toBe(SHOPPING_MINUTES);
    // The catalogue's own line is the same fact, out of the same selector.
    expect(tripLine(out, 'shopping')).toContain(`0 of ${SHOPPING_MINUTES} min`);
    expect(renderCatalogue(out, '', 'sheetMachines')).toContain('Shopping: 0 of 60 min');
  });

  it('covers a site measure as well as a trip to the shops', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    state.tasks.push({
      id: 'task-measure',
      kind: 'siteMeasure',
      category: 'admin',
      label: 'Site measure: Wardrobe',
      minutesTotal: SITE_MEASURE_MINUTES,
      minutesRemaining: SITE_MEASURE_MINUTES,
      jobId: null,
      equipmentId: null,
      deliveryId: null,
      orderId: null,
      day: state.clock.day,
      done: false,
      doneDay: null,
      doneBy: null,
      orders: [],
    });
    state = act(state, { type: 'START_TASK', taskId: 'task-measure' });
    expect(ownerOutTask(state)?.kind).toBe('siteMeasure');
  });
});

describe('the component under the top bar', () => {
  it('is there while he is out and nowhere at all while he is not', () => {
    const quiet = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    expect(renderOwnerOut(quiet)).toBe('');
    const out = shopping();
    const line = renderOwnerOut(out);
    expect(line).toContain('Owner is out: Shopping, 0 of 60 min');
    expect(line).toContain('data-do="skipAhead"');
    // And once the trip is over it goes again.
    const back = clearEvents(runClock(out, SHOPPING_MINUTES));
    expect(renderOwnerOut(back)).toBe('');
  });

  it('says Skipping ahead instead of the button while the clock is being run for him', () => {
    const skipping = act(shopping(), { type: 'SKIP_AHEAD' });
    const line = renderOwnerOut(skipping);
    expect(line).toContain('Skipping ahead');
    expect(line).not.toContain('data-do="skipAhead"');
  });
});

describe('Skip ahead', () => {
  it('runs the clock at 4x until the trip is over and gives the speed back', () => {
    let state = act(shopping(), { type: 'SET_SPEED', speed: 1 });
    expect(state.speed).toBe(1);
    state = act(state, { type: 'SKIP_AHEAD' });
    expect(state.speed).toBe(SKIP_SPEED);
    expect(skippedTask(state)?.kind).toBe('shopping');
    // The speed chips are not his while it runs.
    expect(renderTopbar(state, 'hall')).toContain('Skipping ahead');
    expect(act(state, { type: 'SET_SPEED', speed: 1 }).speed).toBe(SKIP_SPEED);
    state = clearEvents(runClock(state, SHOPPING_MINUTES - 1));
    expect(state.speed).toBe(SKIP_SPEED);
    state = clearEvents(runClock(state, 1));
    // The trip is over: the clock is the player's again, at the speed he left it on.
    expect(skippedTask(state)).toBeNull();
    expect(state.speed).toBe(1);
    expect(renderTopbar(state, 'hall')).toContain('data-do="setSpeed"');
  });

  it('does nothing at all while the owner is at his bench', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    const same = act(state, { type: 'SKIP_AHEAD' });
    expect(same.skipTaskId).toBeNull();
    expect(same.speed).toBe(state.speed);
  });
});

describe('a trip the day ran out on', () => {
  it('is picked up at 08:00 with the counter carrying on from where it stopped', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    // Ten to five, and a trip out that wants a whole hour.
    state.clock.minute = DAY_END_MINUTE - 10;
    state.owner.homeAsked = true;
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'standard' });
    state = runClock(state, 10);
    const left = ownerOutTask(state)?.minutesRemaining ?? 0;
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(SHOPPING_MINUTES);
    // Home at five, and the skipped run does not run on into tomorrow behind his back.
    state = clearEvents(act(state, { type: 'END_DAY' }));
    state = clearEvents(runClock(state, 60));
    expect(state.clock.day).toBe(2);
    expect(state.skipTaskId).toBeNull();
    // The same trip, with the minutes it had left, and he is back on it in the morning.
    const trip = state.tasks.find((task) => task.kind === 'shopping' && !task.done);
    expect(trip?.minutesRemaining).toBeLessThanOrEqual(left);
    expect(trip?.minutesTotal).toBe(SHOPPING_MINUTES);
  });
});
