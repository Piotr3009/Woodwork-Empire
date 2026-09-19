// Nobody is moved between jobs [PIOTR, 19.09: "he is assigned to it, so he works on it; the
// production manager will do the moving, later"] (CLAUDE.md T22 2.6). A man whose stage wants a
// machine another man is standing at waits for it at the machine's own waiting cell, on the job he
// is on, with the red mark over his head and the job's own line on the Work Plan and the job card.
// The minute he stands is booked to the machine, which is what the day meter's idle segment counts.
//
// This is the reverse of Turn 21's 2.7, which moved him to another job in production and was
// asserted in tests/engine/nobodyWaits.test.ts; that file is gone with the move it asserted.
//
// Two rules of Turn 21 stay and are asserted here as well, because the queue is what they are
// about: assembly never starts before the cutting stage of its job is complete, which in this model
// is an invariant of the one labour number and not a second gate, and the words each man of a queue
// says are his own.

import { describe, expect, it } from 'vitest';
import {
  NO_CUT_PARTS,
  hands,
  ownerIdleReason,
  placeHand,
  waitingWordsFor,
  workMinute,
} from '../../src/engine/production';
import { ownerJob, waitingLine } from '../../src/engine/jobs';
import { currentStage, stagePlanFor } from '../../src/engine/stages';
import { stageText } from '../../src/engine/plan';
import { bubbleFor } from '../../src/engine/bubbles';
import { jobRow } from '../../src/ui/jobCard';
import type { GameState, Job } from '../../src/engine/index';
import { CREW, act, sixJoinersOnSheetWork } from '../helpers';

/** Four men, one saw, two jobs: the hall of the section's own test. Two men on a job at its cutting
 *  stage, which wants the one saw, and two on a job at its assembly, which wants a bench. The other
 *  four jobs and the two men left over are taken out of the hall, so what is asserted is these four
 *  men and nothing else. */
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
  // A twentieth of the way through its making is the cutting stage and fifty five per cent of the
  // way is the assembly one, which is the reading every test of the stages takes.
  cutting.labourRemaining = cutting.labourValue * 0.95;
  bench.labourRemaining = bench.labourValue * 0.45;
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
    // Both jobs at their cutting stage: one saw, four men, and nothing else in the hall to do.
    bench.labourRemaining = bench.labourValue * 0.95;
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
  it('gives a job whose cutting is half done nothing for an assembler', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Half way through its cutting: the stage it stands at is the cutting one and no other, because
    // a job stands at exactly one stage and its stages are consumed in order. There is no assembly to
    // put a second man on, which is what "assembly never starts before the cutting stage of its job
    // is complete" means in this model (CLAUDE.md T21 2.7, T22 2.6).
    const plan = stagePlanFor(state, cutting);
    const cut = plan.find((stage) => stage.id === 'cutting');
    const assembly = plan.find((stage) => stage.id === 'assembly');
    if (!cut || !assembly) throw new Error('a plan with both stages is wanted');
    expect(cut.to).toBeLessThanOrEqual(assembly.from);
    cutting.labourRemaining = cutting.labourValue - (cut.from + (cut.to - cut.from) / 2);
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    // And the whole plan is ordered and end to end, which is the invariant the rule rests on.
    for (let at = 1; at < plan.length; at += 1) {
      expect(plan[at]?.from).toBe(plan[at - 1]?.to);
    }
  });

  it('has the first man in the queue waiting for the saw and the men behind him short of parts', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Three men on the one cutting job and one saw between them: the queue forms and every man in it
    // says his own truth (CLAUDE.md T21 2.6, T22 2.5).
    state.jobs = [cutting];
    cutting.assignees = ['staff-1', 'staff-2', 'staff-3'];
    for (const worker of state.workers) {
      worker.jobId = cutting.assignees.includes(worker.id) ? cutting.id : null;
    }
    workMinute(state, hands(state));
    // The man on the saw says nothing: he is working, and a man at work carries no mark at all.
    expect(waitingWordsFor(state, 'staff-1', cutting)).toBeNull();
    expect(bubbleFor(state, 'staff-1')).toBeNull();
    // The first man of the queue is waiting for the machine; the man behind him is waiting for the
    // parts it has not cut yet.
    expect(waitingWordsFor(state, 'staff-2', cutting)).toBe('waiting for the saw');
    expect(waitingWordsFor(state, 'staff-3', cutting)).toBe(NO_CUT_PARTS);
    expect(NO_CUT_PARTS).toBe('no cut parts yet');
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
