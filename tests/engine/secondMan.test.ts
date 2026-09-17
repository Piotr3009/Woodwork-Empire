// @vitest-environment jsdom
// Two men on one job (PIOTR, 16.09; CLAUDE.md T17 2.10). Both book minutes into it, each at his
// own rate, at the stage's station: one of them at the machine and the other at the waiting cell
// until his turn, and both at the bench, the second in the bench's second place of Turn 16. A job
// with two men on it takes about half the days, minus the machine stage.

import { describe, expect, it } from 'vitest';
import { jobMen, jobRate, minutesRemainingFor } from '../../src/engine/jobs';
import { stationSecondAt, waitingStation } from '../../src/engine/stations';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState, Job } from '../../src/engine/index';
import { CREW, act, clearEvents, runClock, sixJoinersOnSheetWork } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The first joiner's job, which is the one the second man joins. */
function jobOfFirst(state: GameState): Job {
  const job = state.jobs.find((entry) => entry.assignedTo === 'staff-1');
  if (!job) throw new Error('the first joiner has no job');
  return job;
}

/** Six benches and a saw each, so the hall never queues for a machine: the question here is the
 *  two men, not the saw. The second joiner comes off his own job and stands at the first one's. */
function twoOnOne(saws = CREW): GameState {
  const state = sixJoinersOnSheetWork({ saws });
  const job = jobOfFirst(state);
  const second = act(state, { type: 'ASSIGN_JOB', jobId: jobIdOf(state, 'staff-2'), workerId: null });
  return act(second, { type: 'ASSIGN_SECOND', jobId: job.id, workerId: 'staff-2' });
}

function jobIdOf(state: GameState, workerId: string): string {
  const job = state.jobs.find((entry) => entry.assignedTo === workerId);
  if (!job) throw new Error(`no job for ${workerId}`);
  return job.id;
}

describe('a second man on a job', () => {
  it('stands at it beside the first, and holds no other job', () => {
    const state = twoOnOne();
    const job = jobOfFirst(state);
    expect(job.secondAssignee).toBe('staff-2');
    expect(jobMen(job)).toEqual(['staff-1', 'staff-2']);
    expect(state.workers.find((worker) => worker.id === 'staff-2')?.jobId).toBe(job.id);
    // The job he was on is nobody's now, and he is on no other.
    expect(state.jobs.filter((entry) => entry.assignedTo === 'staff-2')).toHaveLength(0);
  });

  it('halves the days, because both of them work at their own rate', () => {
    const alone = sixJoinersOnSheetWork();
    const one = jobOfFirst(alone);
    const two = twoOnOne();
    const both = jobOfFirst(two);
    expect(jobRate(two, both)).toBeCloseTo(jobRate(alone, one) * 2, 4);
    const left = minutesRemainingFor(two, both, jobRate(two, both));
    expect(left).toBeCloseTo(minutesRemainingFor(alone, one, jobRate(alone, one)) / 2, 4);
  });

  it('puts twice the labour into it in the same hour, with a machine each', () => {
    const alone = clearEvents(runClock(sixJoinersOnSheetWork(), 60));
    const two = clearEvents(runClock(twoOnOne(), 60));
    const oneMan = jobOfFirst(alone);
    const twoMen = jobOfFirst(two);
    const done = (job: Job): number => job.labourValue - job.labourRemaining;
    expect(done(twoMen)).toBeGreaterThan(done(oneMan) * 1.5);
  });

  it('sends the second man to the waiting cell while the first has the machine', () => {
    // One saw between the whole hall: the second man queues for it like anybody else.
    const state = clearEvents(runClock(twoOnOne(1), 30));
    const second = state.workers.find((worker) => worker.id === 'staff-2');
    const first = state.workers.find((worker) => worker.id === 'staff-1');
    if (!second || !first) throw new Error('the two men are wanted here');
    const machine = first.station.startsWith('machine:');
    if (machine) {
      expect(second.station).toBe(waitingStation('tableSaw'));
    } else {
      // Bench work: both of them are at the one bench, the second in its second place.
      expect(stationSecondAt(second.station)).not.toBe(null);
    }
  });

  it('is named on the work plan row, and the row offers the second man', () => {
    const state = twoOnOne();
    const job = jobOfFirst(state);
    const row = parse(renderWorkPlan(state)).querySelector(`[data-plan="${job.id}"]`);
    expect(row?.textContent).toContain('Joiner 1 and Joiner 2');
    const chips = Array.from(row?.querySelectorAll('[data-do="assignSecond"]') ?? []);
    // Alone, and every joiner on the books but the man it is already assigned to.
    expect(chips.map((chip) => chip.getAttribute('data-worker'))).not.toContain('staff-1');
    expect(chips.some((chip) => chip.className.includes('is-on'))).toBe(true);
    const alone = chips.find((chip) => chip.getAttribute('data-worker') === '');
    expect(alone?.textContent).toBe('Alone');
  });

  it('comes off again on a click, and the job is one man’s once more', () => {
    const state = twoOnOne();
    const job = jobOfFirst(state);
    const alone = act(state, { type: 'ASSIGN_SECOND', jobId: job.id, workerId: null });
    expect(jobOfFirst(alone).secondAssignee).toBe(null);
    // He is off that job. The hall gives a free joiner the oldest job waiting, as it always did.
    expect(alone.workers.find((worker) => worker.id === 'staff-2')?.jobId).not.toBe(job.id);
  });
});
