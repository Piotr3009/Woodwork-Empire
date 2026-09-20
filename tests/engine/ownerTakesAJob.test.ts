// The owner never stands doing nothing (PIOTR, 20.09; CLAUDE.md T23 2.3).
//
// Once a minute, when he is in, on the hall side of the door, holding no chore and no job, and
// with nothing in his office queue he could do now, he takes the oldest job standing open with
// nobody on it, as lead, exactly the way a joiner did until tonight. A job somebody else is on he
// does not join by day: that is still the evening take over of Turn 17, which is a click. He never
// takes a standing contract.
//
// His own idle reason `nothingAssigned` therefore only fires when there is work about that he
// cannot take, which is work somebody else already has; `officeEmpty` is unchanged.

import { describe, expect, it } from 'vitest';
import { ownerIdleReason } from '../../src/engine/production';
import { OWNER } from '../../src/engine/machines';
import { oldestOpenJob } from '../../src/engine/jobs';
import { missingForHire } from '../../src/engine/staff';
import { createTask, openTasks } from '../../src/engine/tasks';
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

/** The day 1 hall with one wardrobe ready for a bench and nothing at all in the office queue: the
 *  state 2.3 is about. Whatever the morning raised is marked done, so the only thing left for the
 *  owner to do is the job. */
function emptyOffice(options: { withJoiner?: boolean } = {}): GameState {
  let state = withExtraction(
    buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }),
  );
  state.reputation = 40;
  if (options.withJoiner === true) {
    let guard = 0;
    while (missingForHire(state, 'joiner').length > 0 && guard < 20) {
      for (const specId of missingForHire(state, 'joiner')) state = buyNow(state, specId);
      guard += 1;
    }
    state = hireNow(state, 'joiner', 'novice');
  }
  const enquiry = placeEnquiry(state, {
    templateId: 'wardrobe',
    name: 'Wardrobe',
    price: 1600,
    deadlineDays: 60,
  });
  state = fillRack(acceptNow(state, enquiry.id, false));
  firstJob(state).stage = 'ready';
  state = clearEvents(runToDay(state, 2).state);
  return clearOffice(state);
}

/** Everything on the list marked done, and the owner's hands empty with it. */
function clearOffice(state: GameState): GameState {
  for (const task of state.tasks) task.done = true;
  state.owner.currentTaskId = null;
  state.owner.resumeTaskId = null;
  return state;
}

describe('an empty office sends the owner to the bench', () => {
  it('puts him on the oldest open job within a minute', () => {
    const state = emptyOffice();
    const job = firstJob(state);
    expect(oldestOpenJob(state)?.id).toBe(job.id);
    const after = tick(clearOffice(state), 1);
    expect(firstJob(after).assignees).toEqual([OWNER]);
    // And he is the lead, so the work goes in at his own speed.
    expect(firstJob(after).assignees[0]).toBe(OWNER);
  });

  it('turns the minutes into work on the job', () => {
    const state = tick(emptyOffice(), 1);
    const before = firstJob(state).labourRemaining;
    const worked = tick(clearOffice(state), 60);
    expect(firstJob(worked).labourRemaining).toBeLessThan(before);
  });

  it('leaves him alone once the player moves him off it', () => {
    let state = tick(emptyOffice({ withJoiner: true }), 1);
    expect(firstJob(state).assignees).toEqual([OWNER]);
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    // The Work Plan moves him off it and onto the joiner, like anybody.
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: man.id });
    expect(firstJob(state).assignees).toEqual([man.id]);
    // And he does not walk back onto a job that is now somebody's: that is the evening take over
    // and it is a click of its own (CLAUDE.md T17 2.12).
    const later = tick(clearOffice(state), 30);
    expect(firstJob(later).assignees).toEqual([man.id]);
  });
});

describe('the office comes first', () => {
  it('takes him off the bench when a chore of his own appears', () => {
    let state = tick(emptyOffice(), 1);
    expect(firstJob(state).assignees).toEqual([OWNER]);
    createTask(state, { kind: 'emails', label: 'Emails', minutes: 30 });
    expect(openTasks(state).some((task) => task.doneBy === null)).toBe(true);
    // The owner's tasks already take him: the minute he starts one he is off the job.
    const task = state.tasks.find((entry) => !entry.done);
    if (!task) throw new Error('a task is wanted');
    state = act(state, { type: 'START_TASK', taskId: task.id });
    expect(state.owner.currentTaskId).toBe(task.id);
    // He keeps the job on his name and puts nothing into it while the chore is in his hands:
    // that is how the owner's tasks have always taken him, and it is the piece he is on being
    // finished and set down rather than dropped (CLAUDE.md T23 2.3).
    const before = firstJob(state).labourRemaining;
    const later = tick(state, 20);
    expect(later.owner.currentTaskId).not.toBeNull();
    expect(firstJob(later).labourRemaining).toBe(before);
  });

  it('does not put him on a job while his queue still holds one', () => {
    const state = emptyOffice();
    createTask(state, { kind: 'emails', label: 'Emails', minutes: 30 });
    const after = tick(state, 1);
    // He may have picked the chore up, but he is not at a bench with the office still open.
    expect(after.jobs.some((job) => job.assignees.includes(OWNER))).toBe(false);
  });
});

describe('what he says when there is nothing at all', () => {
  it('reads officeEmpty with no work on the books', () => {
    const state = clearOffice(
      clearEvents(
        runToDay(
          withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' })),
          2,
        ).state,
      ),
    );
    state.jobs = [];
    expect(oldestOpenJob(state)).toBeNull();
    expect(ownerIdleReason(state)).toBe('officeEmpty');
  });

  it('reads nothingAssigned only when every open job is already a man of his own', () => {
    let state = tick(emptyOffice({ withJoiner: true }), 1);
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    // The job is the joiner's, so there is work about and none of it the owner can take.
    state = clearOffice(act(state, {
      type: 'ASSIGN_JOB',
      jobId: firstJob(state).id,
      workerId: man.id,
    }));
    expect(oldestOpenJob(state)).toBeNull();
    expect(ownerIdleReason(state)).toBe('nothingAssigned');
  });
});
