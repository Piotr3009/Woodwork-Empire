// One click takes what the rack already has: no second order for material that is standing in the
// hall (PIOTR, 13.09: "do not make me order again"; CLAUDE.md T9 3.7).

import { describe, expect, it } from 'vitest';
import { stockCheck } from '../../src/engine/jobs';
import { renderMaterials } from '../../src/ui/materials';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState, Job } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  doTask,
  fillRack,
  newGame,
  placeEnquiry,
} from '../helpers';

/** A hall with the day 1 kit, a job on the books whose drawing is done, and an empty rack. */
function waitingForMaterial(): { state: GameState; job: Job } {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 0);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 2400, deadlineDays: 30 });
  state = clearEvents(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
  const job = state.jobs[0];
  if (job === undefined) throw new Error('no job');
  // The drawing first, which is what puts the material order on the list.
  state = doTask(state, 'design');
  const drawn = state.jobs[0];
  if (drawn === undefined) throw new Error('no job');
  return { state, job: drawn };
}

describe('From stock', () => {
  it('says what the rack is short of while it cannot supply the job', () => {
    const { state, job } = waitingForMaterial();
    expect(job.stage).toBe('materialPending');
    state.stock.sheets = 4;
    const check = stockCheck(state, job);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe(`Rack has 4 of ${job.sheets} sheets`);
    // And the button on the card says exactly that, and cannot be pressed.
    const page = renderMaterials(state, '0');
    expect(page).toContain('From stock');
    expect(page).toContain(`Rack has 4 of ${job.sheets} sheets`);
    expect(page).not.toContain('data-do="fromStock"');
  });

  it('drains the rack by the job’s sheets, ticks the order green and makes the job ready', () => {
    const { state, job } = waitingForMaterial();
    state.stock.sheets = job.sheets + 6;
    const before = state.stock.sheets;
    const cash = state.cash;
    expect(stockCheck(state, job).ok).toBe(true);
    const next = act(state, { type: 'DRAW_FROM_STOCK', jobId: job.id });
    const after = next.jobs[0];
    if (after === undefined) throw new Error('no job');
    // The sheets are off the rack and held for this job.
    expect(next.stock.sheets).toBe(before - job.sheets);
    expect(after.sheetsUsed).toBe(job.sheets);
    expect(after.materialMode).toBe('stock');
    // The order is done and says where the material came from.
    const order = next.tasks.find((task) => task.kind === 'materialOrder' && task.jobId === job.id);
    expect(order?.done).toBe(true);
    expect(order?.minutesRemaining).toBe(0);
    expect(order?.label).toContain('Material from stock');
    // The job is ready, and nothing was bought: the sheets were paid for when they were bought.
    expect(after.stage).toBe('ready');
    expect(next.cash).toBe(cash);
    expect(next.deliveries.filter((delivery) => delivery.jobId === job.id)).toHaveLength(0);
  });

  it('is never ordered a second time for that job', () => {
    const { state, job } = waitingForMaterial();
    state.stock.sheets = job.sheets;
    const taken = act(state, { type: 'DRAW_FROM_STOCK', jobId: job.id });
    // Pressing it again does nothing at all: there is nothing left to take and nothing to order.
    const again = act(taken, { type: 'DRAW_FROM_STOCK', jobId: job.id });
    expect(again.stock.sheets).toBe(0);
    expect(again.jobs[0]?.sheetsUsed).toBe(job.sheets);
    expect(again.deliveries).toHaveLength(0);
    // And the control is gone from the card, because the material is settled.
    expect(renderMaterials(again, '0')).not.toContain('data-do="fromStock"');
    expect(stockCheck(again, again.jobs[0] ?? job).ok).toBe(false);
  });

  it('is on the job card as well as in the Materials tab', () => {
    const { state, job } = waitingForMaterial();
    state.stock.sheets = job.sheets;
    expect(renderWorkPlan(state)).toContain('data-do="fromStock"');
    expect(renderMaterials(state, '0')).toContain('data-do="fromStock"');
  });
});
