// The owner is out, and the clock the player can skip through it (PIOTR, 13.09;
// CLAUDE.md T8 3.3). Buying is not one of the things that take him out any more: an order costs
// him nothing and he never leaves the workshop for it (CLAUDE.md T9 3.1).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  SITE_MEASURE_MINUTES,
  SKIP_SPEED,
} from '../../src/engine/constants';
import { ownerOutTask, skippedTask } from '../../src/engine/tasks';
import { renderTopbar } from '../../src/ui/topbar';
import { renderOwnerOut } from '../../src/ui/ownerOut';
import type { GameState, TaskInstance } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, fillRack, newGame, runClock } from '../helpers';

function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  return state;
}

/** A site measure on the list, which is one of the three things that take the owner out of the
 *  workshop (CLAUDE.md T9 3.3). */
function measureTask(state: GameState): TaskInstance {
  const task: TaskInstance = {
    id: 'task-measure',
    kind: 'siteMeasure',
    category: 'admin',
    label: 'Site measure: Wardrobe',
    minutesTotal: SITE_MEASURE_MINUTES,
    minutesRemaining: SITE_MEASURE_MINUTES,
    jobId: null,
    equipmentId: null,
    deliveryId: null,
    orderIds: [],
    day: state.clock.day,
    done: false,
    doneDay: null,
    doneBy: null,
    orders: [],
  };
  state.tasks.push(task);
  return task;
}

/** A hall with the day 1 kit and the owner out on a site measure. */
function measuring(): GameState {
  const state = quietHall();
  measureTask(state);
  return act(state, { type: 'START_TASK', taskId: 'task-measure' });
}

describe('what the owner is out on', () => {
  it('is one selector, and an order is not one of the things on it', () => {
    const quiet = quietHall();
    expect(ownerOutTask(quiet)).toBeNull();
    const ordering = act(quiet, {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
      variantId: 'standard',
    });
    // The order is on the list and the owner is at his bench (CLAUDE.md T9 3.1).
    expect(ordering.onOrder).toHaveLength(1);
    expect(ownerOutTask(ordering)).toBeNull();
    expect(renderOwnerOut(ordering)).toBe('');
  });

  it('covers a site measure', () => {
    expect(ownerOutTask(measuring())?.kind).toBe('siteMeasure');
  });
});

describe('the component under the top bar', () => {
  it('is there while he is out and nowhere at all while he is not', () => {
    expect(renderOwnerOut(quietHall())).toBe('');
    const out = measuring();
    const line = renderOwnerOut(out);
    expect(line).toContain(`Owner is out: Site measure: Wardrobe, 0 of ${SITE_MEASURE_MINUTES} min`);
    expect(line).toContain('data-do="skipAhead"');
    // And once he is back it goes again.
    const back = clearEvents(runClock(out, SITE_MEASURE_MINUTES));
    expect(renderOwnerOut(back)).toBe('');
  });

  it('says Skipping ahead instead of the button while the clock is being run for him', () => {
    const skipping = act(measuring(), { type: 'SKIP_AHEAD' });
    const line = renderOwnerOut(skipping);
    expect(line).toContain('Skipping ahead');
    expect(line).not.toContain('data-do="skipAhead"');
  });
});

describe('Skip ahead', () => {
  it('runs the clock at the skipping speed until he is back and gives the speed back', () => {
    let state = act(measuring(), { type: 'SET_SPEED', speed: 1 });
    expect(state.speed).toBe(1);
    state = act(state, { type: 'SKIP_AHEAD' });
    expect(state.speed).toBe(SKIP_SPEED);
    expect(skippedTask(state)?.kind).toBe('siteMeasure');
    // The speed chips are not his while it runs.
    expect(renderTopbar(state, 'hall')).toContain('Skipping ahead');
    expect(act(state, { type: 'SET_SPEED', speed: 1 }).speed).toBe(SKIP_SPEED);
    state = clearEvents(runClock(state, SITE_MEASURE_MINUTES - 1));
    expect(state.speed).toBe(SKIP_SPEED);
    state = clearEvents(runClock(state, 1));
    // He is back: the clock is the player's again, at the speed he left it on.
    expect(skippedTask(state)).toBeNull();
    expect(state.speed).toBe(1);
    expect(renderTopbar(state, 'hall')).toContain('data-do="setSpeed"');
  });

  it('does nothing at all while the owner is at his bench', () => {
    const state = quietHall();
    const same = act(state, { type: 'SKIP_AHEAD' });
    expect(same.skipTaskId).toBeNull();
    expect(same.speed).toBe(state.speed);
  });
});

describe('a trip the day ran out on', () => {
  it('is picked up at 08:00 with the counter carrying on from where it stopped', () => {
    const state = quietHall();
    // Ten to five, and a job of work that wants longer than that.
    state.clock.minute = DAY_END_MINUTE - 10;
    state.owner.homeAsked = true;
    measureTask(state);
    let next = act(state, { type: 'START_TASK', taskId: 'task-measure' });
    next = runClock(next, 10);
    const left = ownerOutTask(next)?.minutesRemaining ?? 0;
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(SITE_MEASURE_MINUTES);
    // Home at five, and the skipped run does not run on into tomorrow behind his back.
    next = clearEvents(act(next, { type: 'END_DAY' }));
    next = clearEvents(runClock(next, 60));
    expect(next.clock.day).toBe(2);
    expect(next.skipTaskId).toBeNull();
    // The same job of work, with the minutes it had left.
    const trip = next.tasks.find((task) => task.kind === 'siteMeasure' && !task.done);
    expect(trip?.minutesRemaining).toBeLessThanOrEqual(left);
    expect(trip?.minutesTotal).toBe(SITE_MEASURE_MINUTES);
  });
});
