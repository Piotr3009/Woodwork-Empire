// The Turn 26 scenario of CLAUDE.md T26 D2: (tt), the advertising agency and its big one off jobs
// (PIOTR, 02.10; CLAUDE.md T26 2.13). The letters follow Turn 25's (ss).
//
// (tt) One big job taken and made, or the report says why not. The three month playthrough of
//      tests/scenarios/playthrough.test.ts asks for the agency from month 2 and is refused every
//      morning: its standing never comes near the 50 the agency takes a shop on from. So the
//      question is asked here of a shop that has the name and the men: the day 53 hall of
//      `day53Hall` (six joiners, a CNC, a pro saw, two banders, a moulder, a booth, the labourer,
//      the office admin and the draftsman, Nathan on a contract), its standing written to 60 and
//      the agency on from its first morning. The scripted player takes the first big job that is
//      residential and worth no more than `REACH` the moment he has the free joiners it wants,
//      takes no other work, puts every joiner who comes free on it once it is in production, and
//      answers every question with its first choice (`runDays`). Measured, not tuned.

import { describe, expect, it } from 'vitest';
import { isBigJob, setAgency } from '../../src/engine/agency';
import { canAccept } from '../../src/engine/board';
import { acceptEnquiry, freeJoiners, resolveClientOffer } from '../../src/engine/jobs';
import type { GameState, Job } from '../../src/engine/index';
import { act, day53Hall, runDays } from '../helpers';

/** The most a big job may be worth for the scripted player to take it: about what the crew of
 *  this hall can make inside the ordinary deadline of 34 working days (docs/notes-t26.md 4)
 *  [TUNE]. */
const REACH = 300000;
/** How many mornings the run is played for at the most. */
const MORNINGS = 140;

interface Run {
  state: GameState;
  taken: { day: number; name: string; value: number; crew: number; due: number } | null;
  /** The first morning the big job was in production. */
  productionFrom: number | null;
  /** The most joiners on it on any morning. */
  mostOnIt: number;
  /** The job on its due day. */
  atDue: { labourLeft: number; stage: string } | null;
  job: Job | null;
}

function play(): Run {
  let state = day53Hall();
  state.reputation = 60;
  expect(setAgency(state, true).ok).toBe(true);
  const run: Run = { state, taken: null, productionFrom: null, mostOnIt: 0, atDue: null, job: null };
  let jobId: string | null = null;
  for (let morning = 0; morning < MORNINGS; morning += 1) {
    if (jobId === null) {
      const big = state.enquiries.find(
        (enquiry) => isBigJob(enquiry) && enquiry.kind === 'residential' && enquiry.budget <= REACH,
      );
      if (big !== undefined && canAccept(state, big).ok) {
        acceptEnquiry(state, big.id, false);
        const offer = state.eventQueue.find(
          (event) => event.kind === 'clientOffer' && event.data.enquiryId === big.id,
        );
        if (offer !== undefined) {
          state.eventQueue = state.eventQueue.filter((event) => event !== offer);
          const taken = resolveClientOffer(state, 'accept', offer.data);
          if (taken.job !== null) {
            jobId = taken.job.id;
            run.taken = {
              day: state.clock.day,
              name: big.name,
              value: big.budget,
              crew: taken.job.assignees.length,
              due: taken.job.dueDay,
            };
          }
        }
      }
    }
    const job = jobId === null ? null : (state.jobs.find((entry) => entry.id === jobId) ?? null);
    if (job !== null && job.stage === 'inProduction') {
      run.productionFrom ??= state.clock.day;
      for (const worker of freeJoiners(state)) {
        state = act(state, { type: 'ADD_TO_JOB', jobId: job.id, workerId: worker.id });
      }
    }
    const now = jobId === null ? null : (state.jobs.find((entry) => entry.id === jobId) ?? null);
    if (now !== null) {
      run.mostOnIt = Math.max(run.mostOnIt, now.assignees.length);
      if (run.atDue === null && state.clock.day >= now.dueDay) {
        run.atDue = { labourLeft: now.labourRemaining, stage: now.stage };
      }
      if (now.stage === 'completed') break;
    }
    state = runDays(state, 1).state;
    if (state.gameOver !== null) break;
  }
  run.state = state;
  run.job = jobId === null ? null : (state.jobs.find((entry) => entry.id === jobId) ?? null);
  return run;
}

const RUN = play();

describe('(tt) a big job in a shop with the name and the men', () => {
  it('is taken the morning one in reach is on the board, and the four free joiners go on it', () => {
    const taken = RUN.taken;
    if (taken === null) throw new Error('no big job in reach came');
    // Bookcases for a developer, 210,000, wanting four, on day 106: the first residential one of
    // no more than the reach the agency's stream drew for this hall [measured].
    expect(taken.value).toBeLessThanOrEqual(REACH);
    expect(taken.crew).toBe(4);
    console.log('TT_TAKEN', JSON.stringify(taken));
  });

  it('stands its crew by it through the drawings and the sheets, and then puts every joiner on it', () => {
    const taken = RUN.taken;
    if (taken === null || RUN.productionFrom === null) throw new Error('it never went into production');
    // The drawings of a job of 210,000 are 5,040 minutes at the draftsman's 0.8: two and a half
    // weeks of the four standing by before the first cut [measured].
    expect(RUN.productionFrom - taken.day).toBeGreaterThan(10);
    expect(RUN.mostOnIt).toBeGreaterThanOrEqual(7);
    console.log('TT_PRODUCTION', RUN.productionFrom, RUN.mostOnIt);
  });

  it('is made three weeks late, and the bank closes the company with it standing at the gate', () => {
    // Why it is not made, measured: its labour is 0.4 of its value like any job's, 84,000 here, and
    // the eight men of the hall put in about 11,000 of it a week, so it wants about eight weeks of
    // production after the drawings against the 33 working days the client gives. Half of it is
    // still to make on its due day. No other work comes in while it is made and nothing of it is
    // paid until it is delivered, so the wages, the agency and the material empty the account: the
    // last of it is made on day 180, 22 working days late, the bank pulls the overdraft on day 181
    // with the piece at the gate, and the late days would have taken the whole of the balance
    // (docs/notes-t26.md 4).
    const due = RUN.atDue;
    const job = RUN.job;
    if (due === null || job === null) throw new Error('the run never reached its due day');
    expect(due.stage).toBe('inProduction');
    expect(due.labourLeft).toBeGreaterThan(job.labourValue / 3);
    expect(job.finishedDay).not.toBeNull();
    expect(job.finishedDay ?? 0).toBeGreaterThan(job.dueDay);
    const over = RUN.state.gameOver;
    if (over === null) throw new Error('the company was still trading');
    expect(over.day).toBeGreaterThanOrEqual(job.finishedDay ?? 0);
    expect(over.day).toBeLessThan(job.completedDay ?? Infinity);
    expect(job.balancePaid).toBe(0);
    console.log('TT_END', job.finishedDay, job.daysLate, over.day, job.completedDay, Math.round(job.penalty), job.rating);
  });
});
