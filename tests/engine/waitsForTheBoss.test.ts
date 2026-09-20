// A man works when the boss puts him on a job (PIOTR, 20.09; CLAUDE.md T23 2.1).
//
// Until tonight a joiner with nothing to do helped himself to the oldest job on the list, so the
// owner was never needed and the production manager, who has existed since Turn 13, changed
// nothing while the owner was in. From tonight `autoAssignJobs` runs only while a manager is on
// duty. Without one a free man waits at his bench, with the red mark over his head, the words
// `waiting for the boss` on the hover, `needs a job` in the crew column of the Work Plan, and his
// minutes counted as idle on his own day meter with that reason.
//
// Two things still need no click, and both are proved here: a man who had a job yesterday carries
// on with it in the morning, and a man on a job stays on it to its end whatever else appears on
// the board.

import { describe, expect, it } from 'vitest';
import { bubbleFor } from '../../src/engine/bubbles';
import { missingForHire, waitsForTheBoss } from '../../src/engine/staff';
import { workerIdleReason } from '../../src/engine/production';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  runToDay,
  withExtraction,
} from '../helpers';

/** The day 1 hall, one joiner on the books and one job ready for the bench. No manager: this is
 *  the state the section is about. */
function oneManOneJob(price = 1600): GameState {
  let state = withExtraction(
    buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }),
  );
  state.reputation = 40;
  let guard = 0;
  while (missingForHire(state, 'joiner').length > 0 && guard < 20) {
    for (const specId of missingForHire(state, 'joiner')) state = buyNow(state, specId);
    guard += 1;
  }
  state = hireNow(state, 'joiner', 'novice');
  const enquiry = placeEnquiry(state, {
    templateId: 'wardrobe',
    name: 'Wardrobe',
    price,
    deadlineDays: 60,
  });
  state = fillRack(acceptNow(state, enquiry.id, false));
  firstJob(state).stage = 'ready';
  return clearEvents(runToDay(state, 2).state);
}

/** A second wardrobe on the board, ready for a bench, so the test can watch a man not move. */
function addSecondJob(state: GameState): GameState {
  const enquiry = placeEnquiry(state, {
    templateId: 'wardrobe',
    name: 'Second wardrobe',
    price: 1600,
    deadlineDays: 60,
  });
  const next = fillRack(acceptNow(state, enquiry.id, false));
  const second = next.jobs[next.jobs.length - 1];
  if (second) second.stage = 'ready';
  return next;
}

describe('nobody takes a job by himself without a manager on duty', () => {
  it('leaves a free man with an open job in front of him standing all day', () => {
    const state = oneManOneJob();
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    expect(man.jobId).toBeNull();
    expect(waitsForTheBoss(state, man)).toBe(true);
    // A whole working day of the clock, and not a minute of it goes into the job.
    const before = firstJob(state).labourRemaining;
    const after = tick(state, 480);
    expect(after.workers[0]?.jobId).toBeNull();
    expect(firstJob(after).labourRemaining).toBe(before);
    expect(firstJob(after).stage).toBe('ready');
  });

  it('puts him to work the minute the boss clicks Assign', () => {
    let state = oneManOneJob();
    const man = state.workers[0];
    const job = firstJob(state);
    if (!man) throw new Error('a joiner is wanted');
    state = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: man.id });
    expect(state.workers[0]?.jobId).toBe(job.id);
    const before = firstJob(state).labourRemaining;
    const worked = tick(state, 60);
    expect(firstJob(worked).labourRemaining).toBeLessThan(before);
  });

  it('costs nobody a minute: the click is the boss and it is free', () => {
    let state = oneManOneJob();
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    const ownerMinutes = state.owner.minutesWorked;
    const hisMinutes = man.minutesWorked;
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: man.id });
    expect(state.owner.minutesWorked).toBe(ownerMinutes);
    expect(state.workers[0]?.minutesWorked).toBe(hisMinutes);
  });

  it('has him still on it the next morning, with no second click', () => {
    let state = oneManOneJob();
    const man = state.workers[0];
    const job = firstJob(state);
    if (!man) throw new Error('a joiner is wanted');
    state = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: man.id });
    const tomorrow = clearEvents(runToDay(state, state.clock.day + 1).state);
    expect(tomorrow.workers[0]?.jobId).toBe(job.id);
  });

  it('does not move him when a second job appears on the board', () => {
    let state = oneManOneJob();
    const man = state.workers[0];
    const job = firstJob(state);
    if (!man) throw new Error('a joiner is wanted');
    state = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: man.id });
    state = addSecondJob(state);
    const later = tick(state, 120);
    expect(later.workers[0]?.jobId).toBe(job.id);
    // And the second wardrobe is nobody's: it waits for a click of its own.
    const second = later.jobs.find((entry) => entry.name === 'Second wardrobe');
    expect(second?.assignees).toEqual([]);
  });
});

describe('what the waiting man says and what it costs him', () => {
  it('carries the red mark and the words waiting for the boss', () => {
    const state = oneManOneJob();
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    const mark = bubbleFor(state, man.id);
    expect(mark?.key).toBe('waitingForBoss');
    expect(mark?.text).toBe('waiting for the boss');
  });

  it('books every minute he stands onto his day meter with that reason', () => {
    const state = oneManOneJob();
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    expect(workerIdleReason(state, man)).toBe('waitingForBoss');
    // An hour of the clock, and the hour is on his meter under the one reason.
    const after = tick(state, 60);
    const stood = after.workers[0];
    expect(stood?.idleMinutes).toBeGreaterThanOrEqual(59);
    expect(stood?.idleByReason.waitingForBoss).toBe(stood?.idleMinutes);
    expect(stood?.idleByReason.noMachine).toBe(0);
    expect(stood?.idleByReason.noMaterial).toBe(0);
  });

  it('stops booking it the moment he is put on the job', () => {
    let state = oneManOneJob();
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: man.id });
    const at = state.workers[0];
    if (!at) throw new Error('a joiner is wanted');
    expect(waitsForTheBoss(state, at)).toBe(false);
    const before = at.idleByReason.waitingForBoss;
    const worked = tick(state, 60);
    expect(worked.workers[0]?.idleByReason.waitingForBoss).toBe(before);
  });
});
