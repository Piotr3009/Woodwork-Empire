// Dropping a project: the client has his deposit back and the company takes reputation for it, at
// once (PIOTR, 13.09: "drastically"; CLAUDE.md T9 3.9). From Turn 21 what it takes follows the price
// of the job through `dropReputationCost`, and the click that does it is on a card of its own
// (CLAUDE.md T21 2.3, 2.4).

import { describe, expect, it } from 'vitest';
import { DROP_PROJECT_REPUTATION } from '../../src/engine/constants';
import { dropReputationCost } from '../../src/engine/index';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  newGame,
  placeEnquiry,
} from '../helpers';

/** A hall with one job of a round price on the books. */
function withJob(price: number, options: { sheets?: number } = {}): { state: GameState; job: Job } {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), options.sheets ?? 0);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price, deadlineDays: 30 });
  state = clearEvents(acceptNow(state, enquiry.id, false));
  const job = state.jobs[0];
  if (job === undefined) throw new Error('no job');
  return { state, job };
}

describe('Drop project', () => {
  it('refunds the deposit on a 1,600 job, removes it and takes the floor of ten', () => {
    const { state, job } = withJob(1600);
    expect(job.depositPaid).toBe(800);
    const cash = state.cash;
    const reputation = state.reputation;
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(cash - dropped.cash).toBe(800);
    expect(dropped.jobs).toHaveLength(0);
    // From Turn 21 the ten is the floor of a scale and not a flat charge, so a job under the five
    // thousand the scale starts at costs exactly what Turn 9 charged, and the figure is read
    // through the one function the drop card reads (CLAUDE.md T21 2.4; the scale itself is
    // tests/engine/dropReputation.test.ts).
    expect(dropReputationCost(job)).toBe(DROP_PROJECT_REPUTATION);
    expect(dropped.reputation).toBe(reputation - dropReputationCost(job));
    expect(DROP_PROJECT_REPUTATION).toBe(10);
    // The books say what happened, and so does the company board.
    const line = dropped.ledger.find((entry) => entry.label.startsWith('Deposit returned'));
    expect(line?.amount).toBe(-800);
    const logged = dropped.reputationLog[dropped.reputationLog.length - 1];
    expect(logged?.reason).toContain('Dropped');
    expect(logged?.points).toBe(-dropReputationCost(job));
    expect(logged?.day).toBe(dropped.clock.day);
  });

  it('leaves nobody working on a job that is not there any more', () => {
    const { state, job } = withJob(1600);
    expect(state.tasks.some((task) => task.jobId === job.id)).toBe(true);
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(dropped.tasks.some((task) => task.jobId === job.id)).toBe(false);
    expect(dropped.owner.currentTaskId).toBeNull();
  });

  it('puts material that came off the rack back on it', () => {
    const { state, job } = withJob(1600, { sheets: 40 });
    // Off the rack and held for the job, as From stock leaves it (CLAUDE.md T9 3.7).
    job.sheetsUsed = job.sheets;
    state.stock.sheets -= job.sheets;
    const onTheRack = state.stock.sheets;
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(dropped.stock.sheets).toBe(onTheRack + job.sheets);
  });

  it('writes off material that was ordered in for that job and nothing else', () => {
    const { state, job } = withJob(1600, { sheets: 40 });
    job.sheetsUsed = job.sheets;
    state.stock.sheets -= job.sheets;
    // A lorry was booked for this job: that is what makes it the job's own material and not the
    // company's (CLAUDE.md T9 3.9).
    state.deliveries.push({
      id: 'del-test',
      jobId: job.id,
      sheets: job.sheets,
      orderedDay: state.clock.day,
      pricePaid: job.materialCost,
      arriveDay: state.clock.day + 1,
      arrived: true,
      unloaded: true,
      bespoke: false,
      overflowSheets: 0,
    });
    const onTheRack = state.stock.sheets;
    const cash = state.cash;
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(dropped.stock.sheets).toBe(onTheRack);
    // A write off is a line in the books and not a payment: the cash went when it was ordered.
    const loss = dropped.ledger.find((entry) => entry.label.startsWith('Material written off'));
    expect(loss).toBeDefined();
    expect(loss?.unpaid).toBe(true);
    expect(cash - dropped.cash).toBe(job.depositPaid);
  });

  it('is meant on the second click, and the row carries only the one button that asks', () => {
    // Turn 21 moved the second click off the row and onto a card of its own: the row's job is to ask
    // the question, and the card's is to answer what it costs before anything is dropped. So the row
    // carries `Drop project` and no figures at all, where Turn 9's row carried a reason line, a
    // deposit and a flat ten points (CLAUDE.md T9 3.9, T21 2.3).
    const { state } = withJob(1600);
    const row = renderWorkPlan(state, 'jobs');
    expect(row).toContain('data-do="dropJob"');
    expect(row).toContain('Drop project');
    // Nothing on the row commits anything, and nothing on it quotes a figure any more.
    expect(row).not.toContain('data-confirm="1"');
    expect(row).not.toContain('Confirm drop');
    expect(row).not.toContain('off the reputation');
  });
});
