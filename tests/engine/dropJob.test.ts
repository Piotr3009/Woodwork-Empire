// Dropping a project: the client has his deposit back and the company takes ten points of
// reputation for it, at once (PIOTR, 13.09: "drastically"; CLAUDE.md T9 3.9).

import { describe, expect, it } from 'vitest';
import { DROP_PROJECT_REPUTATION } from '../../src/engine/constants';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState, Job } from '../../src/engine/index';
import {
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
  state = clearEvents(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
  const job = state.jobs[0];
  if (job === undefined) throw new Error('no job');
  return { state, job };
}

describe('Drop project', () => {
  it('refunds the deposit on a 1,600 job, removes it and takes 10 reputation', () => {
    const { state, job } = withJob(1600);
    expect(job.depositPaid).toBe(800);
    const cash = state.cash;
    const reputation = state.reputation;
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(cash - dropped.cash).toBe(800);
    expect(dropped.jobs).toHaveLength(0);
    expect(dropped.reputation).toBe(reputation - DROP_PROJECT_REPUTATION);
    expect(DROP_PROJECT_REPUTATION).toBe(10);
    // The books say what happened, and so does the company board.
    const line = dropped.ledger.find((entry) => entry.label.startsWith('Deposit returned'));
    expect(line?.amount).toBe(-800);
    const logged = dropped.reputationLog[dropped.reputationLog.length - 1];
    expect(logged?.reason).toContain('Dropped');
    expect(logged?.points).toBe(-DROP_PROJECT_REPUTATION);
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
    job.materialMode = 'stock';
    job.sheetsUsed = job.sheets;
    state.stock.sheets -= job.sheets;
    const onTheRack = state.stock.sheets;
    const dropped = act(state, { type: 'DROP_JOB', jobId: job.id });
    expect(dropped.stock.sheets).toBe(onTheRack + job.sheets);
  });

  it('writes off material that was ordered in for that job and nothing else', () => {
    const { state, job } = withJob(1600, { sheets: 40 });
    job.materialMode = 'perJob';
    job.sheetsUsed = job.sheets;
    state.stock.sheets -= job.sheets;
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

  it('is meant on the second click, inside the card', () => {
    const { state, job } = withJob(1600);
    const card = renderWorkPlan(state, null);
    expect(card).toContain('data-do="dropJob"');
    expect(card).not.toContain('data-confirm="1"');
    const armed = renderWorkPlan(state, job.id);
    expect(armed).toContain('Confirm drop');
    expect(armed).toContain('data-confirm="1"');
    expect(armed).toContain('800');
    expect(armed).toContain('10 off the reputation');
  });
});
