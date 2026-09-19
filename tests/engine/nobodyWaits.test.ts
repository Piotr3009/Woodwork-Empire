// Nobody stands and waits while there is work he could do (PIOTR; CLAUDE.md T21 2.7). A man whose
// stage wants a machine another man is standing at is moved to another job in production that can use
// the minute, and only when there is nothing of the sort does he stand at the waiting cell.
//
// Two things the section asks for are not built, because the model cannot express them, and both are
// asserted here as the facts they really are rather than faked:
//
//  - "another stage of the same job that needs no machine or a free one" does not exist: a job stands
//    at exactly one stage, derived from its one labour number, and its stages are consumed in order.
//    The plan of a job is asserted below to be exactly that, ordered and end to end.
//  - "another job he is assigned to" is never more than one job: `assignJob` and `addToJob` both take
//    a man off everything else, so "nobody is on two jobs at once" is the rule of the game. The
//    scheduler therefore moves him, through that same one path, and the move is what these tests
//    assert.
//
// And "assembly never starts before the cutting stage of its job is complete" is an invariant of the
// labour number and not a second gate: it is asserted as an invariant here.
//
// The day loop in src/engine/game.ts keeps a second copy of the production minute and does not call
// `placeHand` yet: the exact edit is written out in docs/notes-t21-b2.md for the lead to apply, so
// these tests drive `workMinute`, which is the one function the night shift already runs on.

import { describe, expect, it } from 'vitest';
import {
  NO_CUT_PARTS,
  hands,
  otherWorkFor,
  placeHand,
  waitingWordsFor,
  workMinute,
} from '../../src/engine/production';
import { jobHasWorkFor, waitingLine } from '../../src/engine/jobs';
import { currentStage, stagePlanFor } from '../../src/engine/stages';
import { stageText } from '../../src/engine/plan';
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
  // A quarter of the way through is cutting and two thirds of the way is assembly, which is the
  // reading the rest of the tests of the stages use.
  cutting.labourRemaining = cutting.labourValue * 0.95;
  bench.labourRemaining = bench.labourValue * 0.45;
  return { state, cutting, bench };
}

describe('four men, one saw, two jobs', () => {
  it('leaves nobody standing while the second job has bench work', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    // The cutting job wants the one saw and the assembly job wants a bench.
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    expect(currentStage(state, bench)?.id).toBe('assembly');
    const report = workMinute(state, hands(state));
    // Four men, four minutes of work, and not one of them lost to a machine.
    expect(report.worked).toBe(4);
    expect(report.lost.noMachine).toBeUndefined();
    expect(report.lost.noMaterial).toBeUndefined();
    // The man who could not have the saw is on the other job now, at its bench, and the man who has
    // the saw is still cutting: the job is never left with nobody on it.
    expect(state.workers.find((worker) => worker.id === 'staff-3')?.jobId).toBe(bench.id);
    expect(cutting.assignees).toEqual(['staff-1']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4', 'staff-3']);
    expect(bench.productionMinutes).toBe(3);
    expect(cutting.productionMinutes).toBe(1);
  });

  it('stands them at the saw when both jobs want it and there is nothing else', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    // Both jobs at their cutting stage: one saw, four men, and nothing else in the hall to do.
    bench.labourRemaining = bench.labourValue * 0.95;
    const report = workMinute(state, hands(state));
    expect(report.worked).toBe(1);
    expect(report.lost.noMachine).toBe(3);
    // Nobody was moved: a move is only a move to work, never to another queue.
    expect(cutting.assignees).toEqual(['staff-1', 'staff-3']);
    expect(bench.assignees).toEqual(['staff-2', 'staff-4']);
    // And the job says what it is waiting for, in the words the Work Plan and the job card print.
    expect(cutting.blockedBy).toBe('waiting for the table saw');
    expect(waitingLine('tableSaw')).toBe('waiting for the table saw');
    expect(stageText(state, cutting)).toBe('Cutting, waiting for the table saw');
    expect(jobRow(state, cutting)).toContain('waiting for the table saw');
  });

  it('never moves the last man on a job, and never the owner', () => {
    const { state, cutting, bench } = fourMenTwoJobs();
    // One man each: the man who cannot have the saw is the only man on his job, so he stays on it
    // rather than leave it with nobody, which would put it back on the ready list.
    cutting.assignees = ['staff-1'];
    bench.assignees = ['staff-2'];
    for (const worker of state.workers) {
      if (worker.id === 'staff-1') worker.jobId = cutting.id;
      else if (worker.id === 'staff-2') worker.jobId = bench.id;
      else worker.jobId = null;
    }
    // The owner takes the saw, so the man on the cutting job cannot have it.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('one saw is wanted');
    saw.takenBy = 'owner';
    const blocked = hands(state).find((hand) => hand.job.id === cutting.id);
    if (!blocked) throw new Error('the man on the cutting job is wanted');
    expect(otherWorkFor(state, blocked)).toBeNull();
    const place = placeHand(state, blocked);
    expect(place.moved).toBe(false);
    expect(place.lost).toBe('noMachine');
    expect(cutting.assignees).toEqual(['staff-1']);
    // And the owner is never moved by the scheduler, whatever else is going on: what he does next is
    // his own decision (CLAUDE.md T4 3.2, T21 2.7).
    saw.takenBy = null;
    const ownerHand = { who: 'owner', job: cutting, rate: 1 };
    expect(otherWorkFor(state, ownerHand)).toBeNull();
  });

  it('only ever moves a man to a job that can use the minute', () => {
    const { state, bench } = fourMenTwoJobs();
    // The bench job has no material: the rack is emptied, so it can take nobody.
    state.stock.sheets = 0;
    bench.sheetsUsed = 0;
    bench.sheetsReserved = 0;
    expect(jobHasWorkFor(state, bench, 'staff-3')).toBe(false);
    const blocked = hands(state).find((hand) => hand.who === 'staff-3');
    if (!blocked) throw new Error('the third man is wanted');
    expect(otherWorkFor(state, blocked)).toBeNull();
  });
});

describe('the cutting stage and the men behind it', () => {
  it('gives a job whose cutting is half done nothing for an assembler', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Half way through its cutting: the stage it stands at is the cutting one and no other, because
    // a job stands at exactly one stage and its stages are consumed in order. There is no assembly to
    // send a second man at, which is what "assembly never starts before the cutting stage of its job
    // is complete" means in this model (CLAUDE.md T21 2.7).
    const plan = stagePlanFor(state, cutting);
    const cut = plan.find((stage) => stage.id === 'cutting');
    const assembly = plan.find((stage) => stage.id === 'assembly');
    if (!cut || !assembly) throw new Error('a plan with both stages is wanted');
    expect(cut.to).toBeLessThanOrEqual(assembly.from);
    // Half of the cutting done, and the job is still at cutting.
    cutting.labourRemaining = cutting.labourValue - (cut.from + (cut.to - cut.from) / 2);
    expect(currentStage(state, cutting)?.id).toBe('cutting');
    // The saw is taken, so the job can take nobody: the scheduler will not send an assembler to it.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('one saw is wanted');
    saw.takenBy = 'staff-1';
    expect(jobHasWorkFor(state, cutting, 'staff-4')).toBe(false);
    // And the whole plan is ordered and end to end, which is the invariant the rule rests on.
    for (let at = 1; at < plan.length; at += 1) {
      expect(plan[at]?.from).toBe(plan[at - 1]?.to);
    }
  });

  it('has the first man in the queue waiting for the saw and the men behind him short of parts', () => {
    const { state, cutting } = fourMenTwoJobs();
    // Three men on the one cutting job and one saw between them: the hall has nothing else at all,
    // so the queue forms and every man in it says his own truth.
    state.jobs = [cutting];
    cutting.assignees = ['staff-1', 'staff-2', 'staff-3'];
    for (const worker of state.workers) {
      worker.jobId = cutting.assignees.includes(worker.id) ? cutting.id : null;
    }
    workMinute(state, hands(state));
    // The man on the saw says nothing: he is working.
    expect(waitingWordsFor(state, 'staff-1', cutting)).toBeNull();
    // The first man of the queue is waiting for the machine; the man behind him is waiting for the
    // parts it has not cut yet, which is what the drawing has the second man in the queue saying
    // (docs/mockups/t21/bubbles.html; CLAUDE.md T21 2.6).
    expect(waitingWordsFor(state, 'staff-2', cutting)).toBe('waiting for the table saw');
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

describe('the hall the scheduler was written for', () => {
  it('works every man of a six man hall with one saw and a book of work', () => {
    // The hall Piotr watched: six men, one saw, six jobs at six different points of their making.
    // Before tonight five of them queued at the saw whenever two jobs were at their cutting stage.
    const state = sixJoinersOnSheetWork({ saws: 1 });
    const report = workMinute(state, hands(state));
    expect(report.worked).toBeGreaterThan(1);
    // Every man who lost the minute lost it because there was nothing in the hall he could do, and
    // never because he had not been asked.
    const stood = CREW - report.worked;
    expect(report.lost.noMachine ?? 0).toBeCloseTo(stood, 6);
    for (const worker of state.workers) {
      if (worker.jobId === null) continue;
      const job = state.jobs.find((entry) => entry.id === worker.jobId);
      expect(job?.stage, worker.id).toBe('inProduction');
    }
  });
});
