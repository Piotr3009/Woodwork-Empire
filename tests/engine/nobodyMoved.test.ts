// Nobody is moved between jobs [PIOTR, 19.09: "he is assigned to it, so he works on it"]
// (CLAUDE.md T22 2.6), from v52 nobody queues [PIOTR, 21.09: "they never stand, they always
// work"] (CLAUDE.md T25 2.2, 2.3), and from v53 nobody waits for a machine either [PIOTR, 24.09:
// "they never wait for the saw, they go from machine to machine and work"]. A machine is a number
// of places. A man on a job takes a free place at one of the families his job is made on, the
// one whose turn it is for him this half hour first (the men go round their job's machines, each
// starting one further on than the man hired before him; v55) and a bench last, and he stands at
// his own home cell with `no free machines` over his head only when every one of them is taken.
// Every minute of work is written on the stage the job's bar stands at, so the bar fills in
// order. Nobody is sent to another job. On this hall, a budget saw and the hand bander out of the
// cabinet, a job's round is the saw and a bench: in the first half hour the second man hired has
// the saw and the other three are at the benches.
//
// This file was the queue's own test until Turn 25 and the places' test until v53: the same four
// men and the same one saw, flipped to the rule of the day, and nothing of the old one kept beside
// it.

import { describe, expect, it } from 'vitest';
import { hands, placeLine, planPlaces, stageOfMan, workMinute } from '../../src/engine/production';
import { ownerJob } from '../../src/engine/jobs';
import { currentStage, stagePlanFor } from '../../src/engine/stages';
import { stageText } from '../../src/engine/plan';
import { bubbleFor } from '../../src/engine/bubbles';
import { menAtPlaces } from '../../src/engine/machines';
import { machineStation } from '../../src/engine/stations';
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
  // The cutting job is a fifth through its cutting with its other three quarters done; the bench
  // job is past its cutting, its edging and its moulding and a quarter into its assembly (v55).
  bagged(state, cutting, { cutting: 0.2, edging: 1, moulding: 1, assembly: 1 });
  bagged(state, bench, { cutting: 1, edging: 1, moulding: 1, assembly: 0.25 });
  return { state, cutting, bench };
}

const AT_THE_SAW = machineStation('tableSaw');
const AT_A_BENCH = machineStation('workbench');

function stationOf(state: GameState, who: string): string | undefined {
  return state.workers.find((worker) => worker.id === who)?.station;
}

describe('four men, one saw of one place, two jobs (CLAUDE.md T22 2.6, T25 2.3; v53)', () => {
  it('works all four minutes, the saw s one place and three benches, and moves nobody', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    expect(currentStage(state, bench)?.id).toBe('assembly');
    const report = workMinute(state, hands(state));
    // Four of the four minutes are worked: the man at the saw's one place and three at the
    // benches. Until v53 the second man of the cutting job stood with `noPlace`; now he works his
    // job at a bench (PIOTR, 24.09; v53). The saw is the second man's turn this half hour, though
    // his job's bar stands at the assembly: the bar is the bar and the round is the round (v55).
    expect(report.worked).toBe(4);
    expect(report.lost.noPlace).toBeUndefined();
    expect(report.lost.noMaterial).toBeUndefined();
    expect(menAtPlaces(state).map((entry) => `${entry.who} ${entry.item.specId}`)).toEqual([
      'staff-1 workbench',
      'staff-2 tableSaw',
      'staff-3 workbench',
      'staff-4 workbench',
    ]);
    // Nobody was moved: every man is on the job he was assigned to.
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.jobId).toBe(cutting.id);
    // Two minutes on each job; the cutting job had one until v53, its second man standing.
    expect(cutting.productionMinutes).toBe(2);
    expect(bench.productionMinutes).toBe(2);
  });

  it('says nothing over the cutting job s second man, and leaves the job s row alone', () => {
    const { state, cutting } = fourMenTwoJobs();
    workMinute(state, hands(state));
    const man = state.workers.find((worker) => worker.id === 'staff-3');
    expect(man?.station).toBe(AT_A_BENCH);
    expect(man?.working).toBe(true);
    expect(man?.noPlaceFor).toBe('');
    expect(bubbleFor(state, 'staff-3')).toBeNull();
    // The words for a man with every place taken are one phrase and name no machine
    // (PIOTR, 24.09; v53).
    expect(placeLine()).toBe('no free machines');
    // The job is not stopped: the saw and the bench both work it. Its row says its stage and
    // nothing else.
    expect(cutting.blockedBy).toBe('');
    expect(stageText(state, cutting)).toBe('Cutting');
  });

  it('works all four when both jobs bars stand at the saw: one at its place, three at the benches', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    bagged(state, bench, { cutting: 0.2, edging: 1, moulding: 1, assembly: 1 });
    const report = workMinute(state, hands(state));
    // Until v53 one minute was worked and three were `noPlace`; now nobody stands.
    expect(report.worked).toBe(4);
    expect(report.lost.noPlace).toBeUndefined();
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(['staff-1', 'staff-2', 'staff-3', 'staff-4'].map((who) => stationOf(state, who))).toEqual([
      AT_A_BENCH,
      AT_THE_SAW,
      AT_A_BENCH,
      AT_A_BENCH,
    ]);
    for (const who of ['staff-1', 'staff-3', 'staff-4']) {
      expect(state.workers.find((worker) => worker.id === who)?.noPlaceFor, who).toBe('');
    }
  });

  it('gives the owner the first place, the plan s order being the owner first', () => {
    const { state, cutting } = fourMenTwoJobs();
    // A man is on a job by being one of its assignees, the owner included.
    cutting.assignees = [...cutting.assignees, 'owner'];
    const plan = planPlaces(state);
    expect(plan.map((entry) => entry.who)).toEqual(['owner', 'staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(state.owner.working).toBe(true);
    // The owner's turn is the saw, being first in the order, and he has its one place; the second
    // man, whose turn it is too, finds it taken and goes to a bench and works (v53, v55).
    expect(state.owner.station).toBe(AT_THE_SAW);
    expect(state.owner.noPlaceFor).toBe('');
    const second = state.workers.find((worker) => worker.id === 'staff-2');
    expect(second?.station).toBe(AT_A_BENCH);
    expect(second?.working).toBe(true);
    expect(second?.noPlaceFor).toBe('');
    // And the owner is still on the job he put himself on (CLAUDE.md T4 3.2).
    expect(ownerJob(state)?.id).toBe(cutting.id);
  });

  it('gives the saw s place to the next man the minute a man is taken off his job', () => {
    const { state, bench } = fourMenTwoJobs();
    workMinute(state, hands(state));
    // The saw is the second man's this half hour and the fourth, whose turn it is too, is at a
    // bench; the second man off his job, and the fourth has the saw the next minute (v55).
    expect(stationOf(state, 'staff-4')).toBe(AT_A_BENCH);
    const off = act(state, { type: 'REMOVE_FROM_JOB', jobId: bench.id, workerId: 'staff-2' });
    const next = off.jobs.find((job) => job.id === bench.id);
    if (!next) throw new Error('the job went missing');
    const before = next.labourRemaining;
    workMinute(off, hands(off));
    const man = off.workers.find((worker) => worker.id === 'staff-4');
    expect(man?.working).toBe(true);
    expect(man?.station).toBe(AT_THE_SAW);
    expect(next.labourRemaining).toBeLessThan(before);
  });
});

describe('every man on a job works it, and the bar fills in order (PIOTR, 24.09; v53)', () => {
  it('writes every man s minute on the stage the bar stands at, wherever he stands', () => {
    const { state, cutting } = fourMenTwoJobs();
    // The plan is still ordered end to end: the stages are the bar.
    const plan = stagePlanFor(state, cutting);
    for (let at = 1; at < plan.length; at += 1) {
      expect(plan[at]?.from).toBe(plan[at - 1]?.to);
    }
    // Half way through its cutting with the edging and the moulding done. Until v53 both men were
    // at the cutting, one at the saw's place and one with none; now both work the job at a bench
    // this half hour, the saw being the second man's turn, and the stage of it to do at a bench is
    // the assembly, which is what their marks read (v53, v55).
    bagged(state, cutting, { cutting: 0.5, edging: 1, moulding: 1 });
    planPlaces(state);
    expect(stageOfMan(state, 'staff-1', cutting)?.id).toBe('assembly');
    expect(stageOfMan(state, 'staff-3', cutting)?.id).toBe('assembly');
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.noPlaceFor).toBe('');
    const bags = { ...cutting.stageLabour };
    const before = cutting.labourRemaining;
    workMinute(state, hands(state));
    // Both men's labour went into the cutting's bag, where the bar stands, and none into the
    // assembly's.
    const put = before - cutting.labourRemaining;
    expect(put).toBeGreaterThan(0);
    expect((cutting.stageLabour.cutting ?? 0) - (bags.cutting ?? 0)).toBeCloseTo(put, 10);
    expect(cutting.stageLabour.assembly ?? 0).toBe(bags.assembly ?? 0);
    expect(currentStage(state, cutting)?.id).toBe('cutting');
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
    // stays on the job he was put on, and every one of them works: one at the saw and five at the
    // benches. Until v53 the men whose stage wanted the saw stood with `noPlace`.
    const state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
    const before = new Map(state.workers.map((worker) => [worker.id, worker.jobId]));
    const report = workMinute(state, hands(state));
    expect(report.worked).toBe(CREW);
    expect(report.lost.noPlace).toBeUndefined();
    for (const worker of state.workers) {
      expect(worker.jobId, worker.id).toBe(before.get(worker.id));
      if (worker.jobId === null) continue;
      const job = state.jobs.find((entry) => entry.id === worker.jobId);
      expect(job?.stage, worker.id).toBe('inProduction');
    }
  });
});
