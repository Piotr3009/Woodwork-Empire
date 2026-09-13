// @vitest-environment jsdom
// The Work Plan board, the simple one: a row a job, one bar, the minutes under it, a blue line for
// now and a red tick for the deadline (PIOTR, the mockup of 13.09; CLAUDE.md T9 3.6).

import { describe, expect, it } from 'vitest';
import { MINUTES_PER_WORKING_DAY, WORKER_RATES } from '../../src/engine/constants';
import { BOARD_DAYS_PAST_DUE, workPlan, workshopRate } from '../../src/engine/plan';
import { minutesRemainingFor } from '../../src/engine/jobs';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyNow,
  buyStartingKit,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The day 1 kit with one job of this deadline on the books, ready for the bench. */
function boardWith(options: { deadlineDays?: number; price?: number } = {}): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    price: options.price ?? 4000,
    deadlineDays: options.deadlineDays ?? 10,
  });
  state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  firstJob(state).stage = 'ready';
  return state;
}

describe('the rows of the board', () => {
  it('runs to the latest deadline and three days past it, with Now on it', () => {
    const state = boardWith({ deadlineDays: 10 });
    const plan = workPlan(state);
    expect(plan.fromDay).toBe(1);
    expect(plan.rows[0]?.dueDay).toBe(11);
    expect(plan.toDay).toBeGreaterThanOrEqual(11 + BOARD_DAYS_PAST_DUE);
    expect(plan.now).toBeGreaterThanOrEqual(1);
    expect(plan.now).toBeLessThan(2);
  });

  it('puts the nearest deadline first', () => {
    let state = boardWith({ deadlineDays: 30 });
    const second = placeEnquiry(state, { price: 900, name: 'Bookcase', deadlineDays: 4 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: second.id, byHand: false });
    const rows = workPlan(state).rows;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe('Bookcase');
    expect((rows[0]?.dueDay ?? 0) < (rows[1]?.dueDay ?? 0)).toBe(true);
  });

  it('says where a job is standing as a word, and nothing else', () => {
    const state = boardWith();
    expect(workPlan(state).rows[0]?.stage).toBe('ready for production');
    const started = act(state, { type: 'WORK_HERE', jobId: null });
    const row = workPlan(started).rows[0];
    expect(row?.stage).toBe('Cutting');
    expect(row?.who).toBe('you');
  });
});

describe('a job nobody has started', () => {
  it('is as long as the work in it at the workshop average, with the latest start on it', () => {
    const state = boardWith({ deadlineDays: 10 });
    const job = firstJob(state);
    const row = workPlan(state).rows[0];
    expect(row?.notStarted).toBe(true);
    expect(row?.rateLabel).toBe('at workshop average');
    // One hand in the workshop, the owner, so the average is his own rate.
    expect(workshopRate(state)).toBe(1);
    const minutes = minutesRemainingFor(state, job, 1);
    expect(row?.minutesTotal).toBeCloseTo(minutes, 6);
    expect(row?.minutesDone).toBe(0);
    // The bar is as long as the work, and the yellow tick is the day it wants starting.
    const days = minutes / MINUTES_PER_WORKING_DAY;
    expect((row?.to ?? 0) - (row?.from ?? 0)).toBeCloseTo(days, 6);
    expect(row?.latestStart).toBeCloseTo(job.dueDay - days, 2);
    expect(row?.late).toBe(false);
  });

  it('moves the latest start earlier when a poor joiner is put on it', () => {
    // A man wants his bench, his locker, his seat, his cabinet and his tools before he starts
    // (CLAUDE.md 9.3).
    let kitted = boardWith({ deadlineDays: 10 });
    for (const specId of ['workbench', 'locker', 'canteenSeat', 'toolCabinet', 'handToolSet']) {
      kitted = buyNow(kitted, specId, specId === 'workbench' ? 'budget' : undefined);
    }
    const state = hireNow(kitted, 'joiner', 'poor');
    const joiner = state.workers[state.workers.length - 1];
    if (joiner === undefined) throw new Error('nobody was taken on');
    const before = workPlan(state).rows[0];
    const assigned = act(state, {
      type: 'ASSIGN_JOB',
      jobId: firstJob(state).id,
      workerId: joiner.id,
    });
    const after = workPlan(assigned).rows[0];
    expect(after?.rateLabel).toBe(`for ${joiner.name}`);
    expect(joiner.rate).toBe(WORKER_RATES.poor);
    // He is slower, so the job takes longer and has to be started sooner.
    expect(after?.minutesTotal ?? 0).toBeGreaterThan(before?.minutesTotal ?? 0);
    expect(after?.latestStart ?? 0).toBeLessThan(before?.latestStart ?? 0);
  });

  it('says late, at Now, when the day it wanted starting has gone', () => {
    const state = boardWith({ deadlineDays: 1 });
    const row = workPlan(state).rows[0];
    expect(row?.late).toBe(true);
    expect((row?.latestStart ?? 0) < workPlan(state).now).toBe(true);
    const page = parse(renderWorkPlan(state));
    const tick = page.querySelector('.plan-start');
    expect(tick?.classList.contains('is-late')).toBe(true);
    expect(tick?.textContent).toBe('late');
  });
});

describe('a job somebody has started', () => {
  it('shows the minutes done of the minutes it takes, and fills the bar that far', () => {
    const state = act(boardWith(), { type: 'WORK_HERE', jobId: null });
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.25;
    job.stageRuns = [
      { stage: 'cutting', startDay: 1, startMinute: 0, endDay: null, endMinute: null },
    ];
    const row = workPlan(state).rows[0];
    expect(row?.notStarted).toBe(false);
    expect(row?.done).toBeCloseTo(0.75, 6);
    expect(row?.minutesDone ?? 0).toBeGreaterThan(0);
    expect(row?.latestStart).toBeNull();
    // It runs to its deadline, from the day it was picked up.
    expect(row?.to).toBe(job.dueDay);
    const page = parse(renderWorkPlan(state));
    const done = page.querySelector('.plan-bar .plan-done');
    expect(done?.getAttribute('style')).toBe('width:75%');
    expect(page.querySelector('.plan-figures')?.textContent).toContain('min ·');
  });
});

describe('what the board draws', () => {
  it('gives every job one row with one bar, a blue line and a red tick', () => {
    const state = boardWith({ deadlineDays: 10 });
    const page = parse(renderWorkPlan(state));
    const rows = Array.from(page.querySelectorAll('.plan-row[data-plan]'));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.querySelectorAll('.plan-bar')).toHaveLength(1);
    expect(row?.querySelector('.plan-due')?.getAttribute('data-due')).toBe('11');
    expect(row?.querySelectorAll('.plan-now')).toHaveLength(1);
    // The name, the price and the man on it are to the left of the bar.
    expect(row?.querySelector('.plan-head')?.textContent).toContain('Garage shelves');
    expect(row?.querySelector('.plan-head')?.textContent).toContain('4,000');
    expect(row?.querySelector('.plan-head [data-do="assignJob"]')).not.toBeNull();
    // And there are no stage bars and no stage colours left anywhere on it.
    expect(page.querySelectorAll('.gantt-bar')).toHaveLength(0);
    expect(page.innerHTML).not.toContain('stage-cutting');
  });

  it('puts the deadline tick on the right day of the axis', () => {
    const state = boardWith({ deadlineDays: 10 });
    const plan = workPlan(state);
    const page = parse(renderWorkPlan(state));
    const due = page.querySelector('.plan-due');
    const span = plan.toDay - plan.fromDay;
    const wanted = ((plan.rows[0]?.dueDay ?? 0) - plan.fromDay) / span * 100;
    expect(due?.getAttribute('style')).toContain(`left:${Math.round(wanted * 100) / 100}%`);
  });

  it('says so plainly when there is nothing on the books', () => {
    const page = parse(renderWorkPlan(newGame()));
    expect(page.textContent).toContain('No jobs yet');
    expect(page.querySelectorAll('.plan-row')).toHaveLength(0);
  });
});
