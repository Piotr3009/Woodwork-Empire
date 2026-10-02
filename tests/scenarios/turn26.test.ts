// The Turn 26 scenario of CLAUDE.md T26 D2: (tt), the advertising agency and its big one off jobs
// (PIOTR, 02.10; CLAUDE.md T26 2.13). The letters follow Turn 25's (ss).
//
// (tt) One big job taken and made. The three month playthrough of
//      tests/scenarios/playthrough.test.ts asks for the agency from month 2 and is refused every
//      morning: its standing never comes near the 50 the agency takes a shop on from. So the
//      question is asked here of a shop that has the name and the men: the day 53 hall of
//      `day53Hall` (six joiners, a CNC, a pro saw, two banders, a moulder, a booth, the labourer,
//      the office admin and the draftsman, Nathan on a contract), its standing written to 60 and
//      the agency on from its first morning. The scripted player takes the first big job that is
//      residential and worth no more than `REACH` the moment he has the free joiners it wants,
//      takes no other work, puts every joiner who comes free on it once it is in production, and
//      answers every question with its first choice (`runDays`). Measured, not tuned.
//
//      Turn 26 measured this job made three weeks late and the bank closing the company: every big
//      job had the ordinary rule's thirty three days whatever it was worth, its drawings were three
//      weeks at the board, and its four men stood by it through them. From v65 its deadline is its
//      wanted crew's own days with the paperwork's ten in front, its drawing is capped at five days
//      and its joiners are free until there is something to cut (PIOTR, 02.10), and the same job
//      in the same shop is made inside its deadline and paid for.

import { describe, expect, it } from 'vitest';
import { isBigJob, setAgency } from '../../src/engine/agency';
import { canAccept } from '../../src/engine/board';
import { acceptEnquiry, freeJoiners, resolveClientOffer } from '../../src/engine/jobs';
import type { GameState, Job } from '../../src/engine/index';
import { act, day53Hall, runDays } from '../helpers';

/** The most a big job may be worth for the scripted player to take it: the reach Turn 26 gave him,
 *  kept so the job taken is the one Turn 26 measured (docs/notes-t26.md 4) [TUNE]. */
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
  it('is taken the morning one in reach is on the board, with a deadline past the old thirty three days', () => {
    const taken = RUN.taken;
    if (taken === null) throw new Error('no big job in reach came');
    // Bookcases for a developer, 210,000, wanting four, on day 106: the first residential one of
    // no more than the reach the agency's stream drew for this hall [measured].
    expect(taken.value).toBeLessThanOrEqual(REACH);
    // Nobody is put on it by the click from v65: the four it wanted free are free still.
    expect(taken.crew).toBe(0);
    // Its wanted crew's own days and the paperwork's ten: 87 days on the calendar here, where the
    // ordinary rule gave every big job about 47 [measured].
    expect(taken.due - taken.day).toBeGreaterThan(60);
    console.log('TT_TAKEN', JSON.stringify(taken));
  });

  it('goes into production when its capped drawing and its sheets are in, and every joiner goes on it', () => {
    const taken = RUN.taken;
    if (taken === null || RUN.productionFrom === null) throw new Error('it never went into production');
    // The drawing of a job of 210,000 is capped at five days at the board, 2,400 minutes at the
    // draftsman's 0.8: ten days on the calendar to the first cut, where the uncapped 5,040 minutes
    // were three weeks [measured; a range, the exact day says nothing about the rule].
    expect(RUN.productionFrom - taken.day).toBeGreaterThanOrEqual(5);
    expect(RUN.productionFrom - taken.day).toBeLessThanOrEqual(14);
    expect(RUN.mostOnIt).toBeGreaterThanOrEqual(7);
    console.log('TT_PRODUCTION', RUN.productionFrom, RUN.mostOnIt);
  });

  it('is made inside its deadline and paid for, and the company trades on', () => {
    // Eight men of the hall on a job that wanted four: made on day 169 against a due day of 193,
    // delivered the day after, rated and paid its balance of 108,310, and nobody at the bank has
    // anything to say [measured]. On Turn 26's rules the same job was made 22 working days late
    // and the bank closed the company with it at the gate.
    const job = RUN.job;
    if (job === null) throw new Error('no big job was taken');
    expect(job.stage).toBe('completed');
    expect(job.finishedDay).not.toBeNull();
    expect(job.finishedDay ?? Infinity).toBeLessThanOrEqual(job.dueDay);
    expect(job.daysLate).toBe(0);
    expect(job.penalty).toBe(0);
    expect(job.balancePaid).toBeGreaterThan(0);
    expect(RUN.state.gameOver).toBeNull();
    console.log('TT_END', job.finishedDay, job.dueDay, job.completedDay, Math.round(job.balancePaid), job.rating);
  });
});
