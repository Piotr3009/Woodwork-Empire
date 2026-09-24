// The owner never stands doing nothing (PIOTR, 20.09; CLAUDE.md T23 2.3; v41).
//
// Once a minute, when he is in, on the hall side of the door, holding no chore and no job, and
// with nothing in his office queue he could do now, he goes to the job with the SOONEST DEADLINE
// and JOINS it, whoever is already on it [PIOTR, 21.09: "I should jump on the first job with a DL,
// automatically"]. Turn 23 gave him the oldest job with nobody on it, and in a hall where the crew
// hold every job that is no job at all, so he stood in the office exactly as he did before 2.3 was
// written. He never takes a standing contract. From v52 to v53 he joined only a job whose current
// stage had a place to spare, so as not to stand a man the player put there; from v53 nobody waits
// for a machine, so he joins it whatever its saw's places: first in the day plan's order he takes
// the first free place, and the man he displaces works the job at another of its machines or at a
// bench (PIOTR, 24.09; CLAUDE.md T25 2.3; v53).
//
// `officeEmpty` is unchanged: no work of the board's about at all.

import { describe, expect, it } from 'vitest';
import { ownerIdleReason } from '../../src/engine/production';
import { OWNER } from '../../src/engine/machines';
import { jobForTheOwner } from '../../src/engine/jobs';
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
function emptyOffice(options: { withJoiner?: boolean; sawVariant?: string } = {}): GameState {
  let state = withExtraction(
    buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: options.sawVariant ?? 'budget' }),
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
  it('puts him on the job with the soonest deadline within a minute', () => {
    const state = emptyOffice();
    const job = firstJob(state);
    expect(jobForTheOwner(state)?.id).toBe(job.id);
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

  it('joins the job the crew are already on, as a second pair of hands, at a saw of two places', () => {
    let state = tick(emptyOffice({ withJoiner: true, sawVariant: 'standard' }), 1);
    expect(firstJob(state).assignees).toEqual([OWNER]);
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    // The Work Plan moves him off it and onto the joiner, like anybody: ASSIGN_JOB hands the job
    // to the one man named, so the joiner is the lead of it from that click.
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: man.id });
    expect(firstJob(state).assignees[0]).toBe(man.id);
    // And from v41 the owner walks back onto it beside him rather than standing in the office:
    // the job has the soonest deadline on the board and it is the only one there is, and its saw
    // has a second place. The joiner keeps it and the lead with it; the owner is the second name
    // on it (PIOTR, 21.09).
    const later = tick(clearOffice(state), 2);
    expect(firstJob(later).assignees).toEqual([man.id, OWNER]);
    // The evening take over of Turn 17, which puts him on INSTEAD of the man, is still its own
    // click and is not what this is.
  });

  it('joins it at a saw of one place as well: he cuts, and the joiner works on at a bench', () => {
    let state = tick(emptyOffice({ withJoiner: true }), 1);
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: man.id });
    // A budget saw of one place, and the joiner the player put on the job at it. Until v53 the
    // owner stayed off, because first in the day plan's order he would have stood the joiner at
    // his home cell. Nobody waits for the saw now: he walks on, he has the saw, and the joiner
    // goes on with the same job at a bench (PIOTR, 24.09; v53).
    const later = tick(clearOffice(state), 2);
    expect(firstJob(later).assignees).toEqual([man.id, OWNER]);
    expect(later.owner.station).toBe('machine:tableSaw');
    expect(later.owner.working).toBe(true);
    expect(later.workers[0]?.id).toBe(man.id);
    expect(later.workers[0]?.station).toBe('machine:workbench');
    expect(later.workers[0]?.working).toBe(true);
    expect(later.workers[0]?.noPlaceFor).toBe('');
    // The one minute between the click and his next look at the board, and no more.
    expect(later.owner.idleByReason.nothingAssigned ?? 0).toBeLessThanOrEqual(1);
  });

  it('goes to the soonest deadline and not to the oldest job', () => {
    const state = emptyOffice();
    // A second job, taken later but due sooner: that is the one he goes to.
    const older = firstJob(state);
    older.dueDay = state.clock.day + 40;
    const urgent = { ...older, id: 'job-urgent', name: 'Urgent bookcase', assignees: [], dueDay: state.clock.day + 3 };
    state.jobs.push(urgent);
    expect(jobForTheOwner(state)?.id).toBe('job-urgent');
    const after = tick(clearOffice(state), 1);
    expect(after.jobs.find((job) => job.id === 'job-urgent')?.assignees).toEqual([OWNER]);
    expect(after.jobs.find((job) => job.id === older.id)?.assignees).toEqual([]);
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
    expect(jobForTheOwner(state)).toBeNull();
    expect(ownerIdleReason(state)).toBe('officeEmpty');
  });

  it('never reads nothingAssigned over a job the crew are on with a place to spare: he joins it', () => {
    let state = tick(emptyOffice({ withJoiner: true, sawVariant: 'standard' }), 1);
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    // The job is the joiner's. Until v41 that left the owner standing with `nothingAssigned`;
    // now the job is still his to join, so the reason is not the one he reads.
    state = clearOffice(act(state, {
      type: 'ASSIGN_JOB',
      jobId: firstJob(state).id,
      workerId: man.id,
    }));
    const later = tick(state, 2);
    // The joiner has it and the owner is on it beside him, so the minutes he would have stood
    // through with `nothingAssigned` are minutes of work instead.
    expect(firstJob(later).assignees[0]).toBe(man.id);
    expect(firstJob(later).assignees).toContain(OWNER);
    // One minute of it at most: the minute between the player's click and the next look at the
    // board, which is the same minute a man takes to walk over. It never runs on.
    expect(later.owner.idleByReason.nothingAssigned ?? 0).toBeLessThanOrEqual(1);
    expect(ownerIdleReason(later)).not.toBe('nothingAssigned');
    const onwards = tick(later, 30);
    expect(onwards.owner.idleByReason.nothingAssigned ?? 0).toBeLessThanOrEqual(1);
  });
});
