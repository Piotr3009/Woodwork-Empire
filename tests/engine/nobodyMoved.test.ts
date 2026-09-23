// Nobody is moved between jobs [PIOTR, 19.09: "he is assigned to it, so he works on it"]
// (CLAUDE.md T22 2.6), and from v52 nobody queues either [PIOTR, 21.09: "they never stand, they
// always work"] (CLAUDE.md T25 2.2, 2.3). A machine is a number of places. A man on a job works his
// job's current stage at a place of its family, or the hall has no place for him: then he stands at
// his own home cell, says `no place at the saw` over his head, and the minute is booked to
// `noPlace`, which is what the day meter's idle segment counts. Nobody is sent to another stage of
// his own job to fill the gap and nobody is sent to another job.
//
// This file was the queue's own test until Turn 25: the same four men and the same one saw, flipped
// to the places, and nothing of the queue kept beside it.

import { describe, expect, it } from 'vitest';
import { hands, placeLine, planPlaces, stageOfMan, workMinute } from '../../src/engine/production';
import { ownerJob } from '../../src/engine/jobs';
import { currentStage, stagePlanFor } from '../../src/engine/stages';
import { stageText } from '../../src/engine/plan';
import { bubbleFor } from '../../src/engine/bubbles';
import { STATION_HOME, machineStation } from '../../src/engine/stations';
import type { GameState, Job } from '../../src/engine/index';
import { CREW, act, sixJoinersOnSheetWork } from '../helpers';

/** Puts labour into the stages by name, the way the job keeps it: the shares of the labour value,
 *  and the job's own figure kept in step with them. */
function bagged(state: GameState, job: Job, shares: Partial<Record<string, number>>): void {
  const plan = stagePlanFor(state, job);
  let done = 0;
  job.stageLabour = {};
  for (const stage of plan) {
    const share = shares[stage.id];
    if (share === undefined) continue;
    const put = (stage.to - stage.from) * share;
    job.stageLabour[stage.id] = put;
    done += put;
  }
  job.labourRemaining = job.labourValue - done;
}

/** Four men, one budget saw of one place, two jobs: two men on a job at its cutting stage, which
 *  wants the saw, and two on a job at its assembly, which wants a bench. The other four jobs and
 *  the two men left over are taken out of the hall, so what is asserted is these four men and
 *  nothing else. */
function fourMenTwoJobs(): { state: GameState; cutting: Job; bench: Job } {
  let state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
  const first = state.jobs[0];
  const second = state.jobs[1];
  if (!first || !second) throw new Error('two jobs are wanted');
  // The third man joins the first job and the fourth joins the second, each coming off his own as
  // the game's one path takes him off it.
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-3' });
  state = act(state, { type: 'ADD_TO_JOB', jobId: second.id, workerId: 'staff-4' });
  const cutting = state.jobs.find((job) => job.id === first.id);
  const bench = state.jobs.find((job) => job.id === second.id);
  if (!cutting || !bench) throw new Error('the two jobs went missing');
  state.jobs = [cutting, bench];
  for (const worker of state.workers) {
    if (worker.jobId !== null && !state.jobs.some((job) => job.id === worker.jobId)) {
      worker.jobId = null;
    }
  }
  // The cutting job is a fifth through its cutting with its machining and its assembly done; the
  // bench job is past its cutting and its machining and a quarter into its assembly.
  bagged(state, cutting, { cutting: 0.2, machining: 1, assembly: 1 });
  bagged(state, bench, { cutting: 1, machining: 1, assembly: 0.25 });
  return { state, cutting, bench };
}

describe('four men, one saw of one place, two jobs (CLAUDE.md T22 2.6, T25 2.3)', () => {
  it('works the saw s one place and the bench, and stands the man the saw has no place for', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    expect(currentStage(state, bench)?.id).toBe('assembly');
    const report = workMinute(state, hands(state));
    // Three of the four minutes are worked: the man at the saw's one place and the two at the
    // benches. The fourth is the man the saw has no place for, booked to `noPlace`.
    expect(report.worked).toBe(3);
    expect(report.lost.noPlace).toBe(1);
    expect(report.lost.noMaterial).toBeUndefined();
    // Nobody was moved: every man is on the job he was assigned to.
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.jobId).toBe(cutting.id);
    expect(cutting.productionMinutes).toBe(1);
    expect(bench.productionMinutes).toBe(2);
  });

  it('says why he stands, at his home cell and over his head, and leaves the job s row alone', () => {
    const { state, cutting } = fourMenTwoJobs();
    workMinute(state, hands(state));
    const man = state.workers.find((worker) => worker.id === 'staff-3');
    expect(man?.station).toBe(STATION_HOME);
    expect(man?.working).toBe(false);
    expect(man?.noPlaceFor).toBe('tableSaw');
    // The trade's own short word for the machine and not the catalogue's "Table saw", the one
    // phrase the mark and the card both read (CLAUDE.md T21 2.7, T25 2.3).
    expect(bubbleFor(state, 'staff-3')?.text).toBe('no place at the saw');
    expect(placeLine('tableSaw')).toBe('no place at the saw');
    expect(placeLine('cnc')).toBe('no place at the CNC');
    expect(placeLine('sprayBooth')).toBe('no place at the booth');
    // A family with no short word of its own keeps the catalogue's, lowercased.
    expect(placeLine('thicknesser')).toBe('no place at the thicknesser');
    // The job is not stopped: the saw works it all day. Its row says its stage and nothing else.
    expect(cutting.blockedBy).toBe('');
    expect(stageText(state, cutting)).toBe('Cutting');
  });

  it('has no place for three of the four when both jobs want the one place', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    bagged(state, bench, { cutting: 0.2, machining: 1, assembly: 1 });
    const report = workMinute(state, hands(state));
    expect(report.worked).toBe(1);
    expect(report.lost.noPlace).toBe(3);
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    for (const who of ['staff-2', 'staff-3', 'staff-4']) {
      expect(state.workers.find((worker) => worker.id === who)?.noPlaceFor, who).toBe('tableSaw');
    }
  });

  it('gives the owner the first place, the plan s order being the owner first', () => {
    const { state, cutting } = fourMenTwoJobs();
    // A man is on a job by being one of its assignees, the owner included.
    cutting.assignees = [...cutting.assignees, 'owner'];
    const plan = planPlaces(state);
    expect(plan.map((entry) => entry.who)).toEqual(['owner', 'staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(state.owner.working).toBe(true);
    expect(state.owner.station).toBe(machineStation('tableSaw'));
    expect(state.owner.noPlaceFor).toBe('');
    // The man who had the place has none now, and says so.
    expect(state.workers.find((worker) => worker.id === 'staff-1')?.noPlaceFor).toBe('tableSaw');
    // And the owner is still on the job he put himself on (CLAUDE.md T4 3.2).
    expect(ownerJob(state)?.id).toBe(cutting.id);
  });

  it('gives the place to the next man the minute a man is taken off his job', () => {
    const { state, cutting } = fourMenTwoJobs();
    workMinute(state, hands(state));
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.working).toBe(false);
    const off = act(state, { type: 'REMOVE_FROM_JOB', jobId: cutting.id, workerId: 'staff-1' });
    const next = off.jobs.find((job) => job.id === cutting.id);
    if (!next) throw new Error('the job went missing');
    const before = next.labourRemaining;
    workMinute(off, hands(off));
    const man = off.workers.find((worker) => worker.id === 'staff-3');
    expect(man?.working).toBe(true);
    expect(man?.station).toBe(machineStation('tableSaw'));
    expect(next.labourRemaining).toBeLessThan(before);
  });
});

describe('every man on a job works its current stage (CLAUDE.md T25 2.2)', () => {
  it('sends nobody to another stage of his own job to fill a gap', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Half way through its cutting with the machining done: the bag of work of v37 and v43 sent the
    // second man to the assembly while the first had the saw. From v52 both are at the cutting,
    // one at the saw's place and one with no place, and the plan is still ordered end to end.
    const plan = stagePlanFor(state, cutting);
    for (let at = 1; at < plan.length; at += 1) {
      expect(plan[at]?.from).toBe(plan[at - 1]?.to);
    }
    bagged(state, cutting, { cutting: 0.5, machining: 1 });
    planPlaces(state);
    expect(stageOfMan(state, 'staff-1', cutting)?.id).toBe('cutting');
    expect(stageOfMan(state, 'staff-3', cutting)?.id).toBe('cutting');
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.noPlaceFor).toBe('tableSaw');
  });

  it('says nothing over the men at a stage the hall has places for', () => {
    const { state, bench } = fourMenTwoJobs();
    state.jobs = [bench];
    planPlaces(state);
    for (const who of bench.assignees) expect(bubbleFor(state, who), who).toBeNull();
  });
});

describe('the hall Piotr watched', () => {
  it('works every man of a six man hall on his own job, and moves nobody', () => {
    // Six men, one saw of one place, six jobs at six different points of their making. Every man
    // stays on the job he was put on, and the men whose stage wants the saw and have no place at
    // it say so.
    const state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
    const before = new Map(state.workers.map((worker) => [worker.id, worker.jobId]));
    const report = workMinute(state, hands(state));
    expect(report.worked).toBeGreaterThan(1);
    // Every man who lost the minute lost it to no place, and every one of them is still on his own
    // job.
    const stood = CREW - report.worked;
    expect(report.lost.noPlace ?? 0).toBeCloseTo(stood, 6);
    for (const worker of state.workers) {
      expect(worker.jobId, worker.id).toBe(before.get(worker.id));
      if (worker.jobId === null) continue;
      const job = state.jobs.find((entry) => entry.id === worker.jobId);
      expect(job?.stage, worker.id).toBe('inProduction');
    }
  });
});
