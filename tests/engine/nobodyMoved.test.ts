// Nobody is moved between jobs [PIOTR, 19.09: "he is assigned to it, so he works on it; the
// production manager will do the moving, later"] (CLAUDE.md T22 2.6). A man whose stage wants a
// machine another man is standing at waits for it at the machine's own waiting cell, on the job he
// is on, with the red mark over his head and the job's own line on the Work Plan and the job card.
// The minute he stands is booked to the machine, which is what the day meter's idle segment counts.
//
// This is the reverse of Turn 21's 2.7, which moved him to another job in production and was
// asserted in tests/engine/nobodyWaits.test.ts; that file is gone with the move it asserted.
//
// One rule of Turn 21 stays and is asserted here as well, because the queue is what it is about:
// the words each man of a queue says are his own. "Assembly never starts before the cutting is
// complete" is gone (PIOTR, 21.09; v43): a queue at the saw forms only when the saw is all a job
// has left, and every man in it is waiting for the saw.

import { describe, expect, it } from 'vitest';
import {
  hands,
  ownerIdleReason,
  placeHand,
  waitingWordsFor,
  workMinute,
} from '../../src/engine/production';
import { ownerJob, waitingLine } from '../../src/engine/jobs';
import { currentStage, stageFor, stagePlanFor } from '../../src/engine/stages';
import { stageText } from '../../src/engine/plan';
import { bubbleFor } from '../../src/engine/bubbles';
import { jobRow } from '../../src/ui/jobCard';
import type { GameState, Job } from '../../src/engine/index';
import { CREW, act, sixJoinersOnSheetWork } from '../helpers';

/** Four men, one saw, two jobs: the hall of the section's own test. Two men on a job at its cutting
 *  stage, which wants the one saw, and two on a job at its assembly, which wants a bench. The other
 *  four jobs and the two men left over are taken out of the hall, so what is asserted is these four
 *  men and nothing else. */
/** Puts labour into the stages by name, as the bag of work keeps it (v37): the shares of the
 *  labour value, and the job's own figure kept in step with them. */
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

function fourMenTwoJobs(): { state: GameState; cutting: Job; bench: Job } {
  let state = sixJoinersOnSheetWork({ saws: 1 });
  const first = state.jobs[0];
  const second = state.jobs[1];
  if (!first || !second) throw new Error('two jobs are wanted');
  // The third man joins the first job and the fourth joins the second, each coming off his own as the
  // game's one path takes him off it.
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
  // The cutting job is a fifth through its cutting with its machining and its assembly done, so the
  // saw is the one thing it has open: that is where a queue forms in the bag of work (v37, v43). The
  // bench job is past its cutting and its machining and a quarter into its assembly.
  bagged(state, cutting, { cutting: 0.2, machining: 1, assembly: 1 });
  bagged(state, bench, { cutting: 1, machining: 1, assembly: 0.25 });
  return { state, cutting, bench };
}

describe('four men, one saw, two jobs (CLAUDE.md T22 2.6)', () => {
  it('stands the second man of the cutting job and moves nobody to the bench work', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    // The cutting job wants the one saw and the assembly job wants a bench.
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    expect(currentStage(state, bench)?.id).toBe('assembly');
    const report = workMinute(state, hands(state));
    // Three of the four minutes are worked: the man on the saw and the two at the bench. The fourth
    // is the man who could not have the saw, and it is lost to the machine and counted as lost.
    expect(report.worked).toBe(3);
    expect(report.lost.noMachine).toBe(1);
    expect(report.lost.noMaterial).toBeUndefined();
    // Nobody was moved: every man is on the job he was assigned to, and the hall's book of work is
    // exactly as the player left it.
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.jobId).toBe(cutting.id);
    expect(cutting.productionMinutes).toBe(1);
    expect(bench.productionMinutes).toBe(2);
  });

  it('says why he stands, on the bar, on the job card and over his head', () => {
    const { state, cutting } = fourMenTwoJobs();
    workMinute(state, hands(state));
    // The job says what it is waiting for where it says its stage, in the trade's own short word for
    // the machine and not the catalogue's "Table saw" (CLAUDE.md T21 2.7, T22 2.6).
    expect(cutting.blockedBy).toBe('waiting for the saw');
    expect(waitingLine('tableSaw')).toBe('waiting for the saw');
    expect(waitingLine('cnc')).toBe('waiting for the CNC');
    expect(waitingLine('sprayBooth')).toBe('waiting for the booth');
    // A family with no short word of its own keeps the catalogue's, lowercased.
    expect(waitingLine('thicknesser')).toBe('waiting for the thicknesser');
    expect(stageText(state, cutting)).toBe('Cutting, waiting for the saw');
    expect(jobRow(state, cutting)).toContain('waiting for the saw');
    // And the mark over the man who stands says the same thing once (CLAUDE.md T22 2.5).
    expect(bubbleFor(state, 'staff-3')?.text).toBe('waiting for the saw');
  });

  it('stands three of the four at the saw when both jobs want it, and counts every minute of it', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    // Both jobs with nothing left but their cutting: one saw, four men, and nothing else in the
    // hall to do.
    bagged(state, bench, { cutting: 0.2, machining: 1, assembly: 1 });
    const report = workMinute(state, hands(state));
    expect(report.worked).toBe(1);
    expect(report.lost.noMachine).toBe(3);
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    expect(cutting.blockedBy).toBe('waiting for the saw');
    expect(bench.blockedBy).toBe('waiting for the saw');
  });

  it('books the owner s own idle minute to the machine he cannot have', () => {
    const { state, cutting } = fourMenTwoJobs();
    // The owner on the cutting job with the saw in another man's hands: his day meter's idle segment
    // counts the wait, which is the point of the section (CLAUDE.md T21 2.8, T22 2.6). A man is on a
    // job by being one of its assignees, the owner included, and that is the one place it is written.
    cutting.assignees = [...cutting.assignees, 'owner'];
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('one saw is wanted');
    saw.takenBy = 'staff-1';
    expect(ownerIdleReason(state)).toBe('noMachine');
    const ownerHand = hands(state).find((hand) => hand.who === 'owner');
    if (!ownerHand) throw new Error('the owner is wanted among the hands');
    const place = placeHand(state, ownerHand);
    expect(place.work).toBeNull();
    expect(place.lost).toBe('noMachine');
    // And he is still on the job he put himself on: nothing hands the owner work behind his back
    // (CLAUDE.md T4 3.2).
    expect(ownerJob(state)?.id).toBe(cutting.id);
  });
});

describe('the cutting stage and the men behind it', () => {
  it('gives a job whose cutting is half done its assembly for a second man (v43)', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Half way through its cutting with the machining done: the first man has the saw, and the
    // second assembles what he has cut instead of standing behind him for the rest of the cutting
    // (PIOTR, 21.09: three men at one saw the whole day). The plan is still ordered end to end and
    // cutting is still first in it, which is why the first man takes the saw.
    const plan = stagePlanFor(state, cutting);
    for (let at = 1; at < plan.length; at += 1) {
      expect(plan[at]?.from).toBe(plan[at - 1]?.to);
    }
    bagged(state, cutting, { cutting: 0.5, machining: 1 });
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('one saw is wanted');
    saw.takenBy = 'staff-1';
    expect(stageFor(state, 'staff-1', cutting)?.id).toBe('cutting');
    expect(stageFor(state, 'staff-3', cutting)?.id).toBe('assembly');
    // Finishing still waits for everything else.
    bagged(state, cutting, { cutting: 0.5, machining: 1, assembly: 1 });
    expect(stageFor(state, 'staff-3', cutting)?.id).toBe('cutting');
  });

  it('has every man in the queue waiting for the saw, and the man at it saying nothing', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Three men on the one job with nothing left but its cutting, one saw between them: the queue
    // forms and every man in it says the same true thing (CLAUDE.md T21 2.6, T22 2.5; v43).
    state.jobs = [cutting];
    cutting.assignees = ['staff-1', 'staff-2', 'staff-3'];
    for (const worker of state.workers) {
      worker.jobId = cutting.assignees.includes(worker.id) ? cutting.id : null;
    }
    workMinute(state, hands(state));
    expect(waitingWordsFor(state, 'staff-1', cutting)).toBeNull();
    expect(bubbleFor(state, 'staff-1')).toBeNull();
    expect(waitingWordsFor(state, 'staff-2', cutting)).toBe('waiting for the saw');
    expect(waitingWordsFor(state, 'staff-3', cutting)).toBe('waiting for the saw');
  });

  it('says nothing about cut parts at a stage that is not the cutting one', () => {
    const { state, bench } = fourMenTwoJobs();
    // A bench stage wants no machine, so nobody in the hall is waiting for one and nobody says a
    // word about it.
    state.jobs = [bench];
    for (const who of bench.assignees) expect(waitingWordsFor(state, who, bench)).toBeNull();
  });
});

describe('the hall Piotr watched', () => {
  it('works every man of a six man hall on his own job, and moves nobody', () => {
    // Six men, one saw, six jobs at six different points of their making. Every man stays on the job
    // he was put on, all day and every day, and the men whose stage wants the one saw queue for it.
    const state = sixJoinersOnSheetWork({ saws: 1 });
    const before = new Map(state.workers.map((worker) => [worker.id, worker.jobId]));
    const report = workMinute(state, hands(state));
    expect(report.worked).toBeGreaterThan(1);
    // Every man who lost the minute lost it to a machine somebody else had, and every one of them is
    // still on his own job.
    const stood = CREW - report.worked;
    expect(report.lost.noMachine ?? 0).toBeCloseTo(stood, 6);
    for (const worker of state.workers) {
      expect(worker.jobId, worker.id).toBe(before.get(worker.id));
      if (worker.jobId === null) continue;
      const job = state.jobs.find((entry) => entry.id === worker.jobId);
      expect(job?.stage, worker.id).toBe('inProduction');
    }
  });
});
