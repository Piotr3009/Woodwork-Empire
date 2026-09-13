// @vitest-environment jsdom
// The Work Plan board: a row a job, a bar a stage, the deadline as a red line (CLAUDE.md T7 3.2).

import { describe, expect, it } from 'vitest';
import { BOARD_DAYS_PAST_DUE, workPlanGantt } from '../../src/engine/plan';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  twoMenOnSheetWork,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The day 1 kit with one job of this deadline at the bench. */
function boardWith(options: { deadlineDays?: number; price?: number } = {}): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    price: options.price ?? 4000,
    deadlineDays: options.deadlineDays ?? 10,
  });
  state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  firstJob(state).stage = 'ready';
  return act(state, { type: 'WORK_HERE', jobId: null });
}

describe('the rows of the board', () => {
  it('runs from the day the job was taken to its deadline and three days past it', () => {
    const state = boardWith({ deadlineDays: 10 });
    const row = workPlanGantt(state)[0];
    expect(row?.fromDay).toBe(1);
    expect(row?.dueDay).toBe(11);
    expect(row?.toDay).toBeGreaterThanOrEqual(11 + BOARD_DAYS_PAST_DUE);
    expect(row?.today).toBe(1);
  });

  it('puts the nearest deadline first', () => {
    let state = boardWith({ deadlineDays: 30 });
    const second = placeEnquiry(state, { price: 900, name: 'Bookcase', deadlineDays: 4 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: second.id, byHand: false });
    const rows = workPlanGantt(state);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe('Bookcase');
    expect((rows[0]?.dueDay ?? 0) < (rows[1]?.dueDay ?? 0)).toBe(true);
  });

  it('draws five bars for a job in its finishing, with the first three filled', () => {
    const state = boardWith();
    const job = firstJob(state);
    // Nine tenths of the way through: the cutting, the machining and the assembly are behind it.
    job.labourRemaining = job.labourValue * 0.1;
    const row = workPlanGantt(state)[0];
    expect(row?.bars.map((bar) => bar.stage)).toEqual([
      'cutting',
      'machining',
      'assembly',
      'finishing',
      'delivery',
    ]);
    const done = row?.bars.map((bar) => bar.done) ?? [];
    expect(done.slice(0, 3)).toEqual([1, 1, 1]);
    // Two thirds through the finishing, and nothing of the delivery.
    expect(done[3]).toBeCloseTo(1 / 3, 6);
    expect(done[4]).toBe(0);
  });

  it('shows a grey gap with its reason while a job stands waiting for a machine', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1 }), 60);
    const rows = workPlanGantt(state);
    const waiting = rows.find((row) => row.gap !== null);
    expect(waiting?.gap?.reason).toBe('waiting for table saw');
    expect(waiting?.gap?.to).toBeGreaterThan(waiting?.gap?.from ?? 0);
    // The man who has the saw is not waiting for anything.
    expect(rows.filter((row) => row.gap === null)).toHaveLength(1);
  });
});

describe('what the board draws', () => {
  it('gives every job a row with its bars, its deadline line and today', () => {
    const state = boardWith({ deadlineDays: 10 });
    const page = parse(renderWorkPlan(state));
    const rows = Array.from(page.querySelectorAll('.gantt-row'));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.querySelectorAll('.gantt-bar')).toHaveLength(5);
    expect(row?.querySelector('.gantt-due')?.getAttribute('data-due')).toBe('11');
    expect(row?.querySelectorAll('.gantt-day.is-today')).toHaveLength(1);
    // The name, the price and the man on it are to the left of the bars.
    expect(row?.querySelector('.gantt-head')?.textContent).toContain('Garage shelves');
    expect(row?.querySelector('.gantt-head')?.textContent).toContain('4,000');
    expect(row?.querySelector('.gantt-head [data-do="assignJob"]')).not.toBeNull();
  });

  it('puts the deadline line on the right day of the row', () => {
    const state = boardWith({ deadlineDays: 10 });
    const model = workPlanGantt(state)[0];
    const page = parse(renderWorkPlan(state));
    const due = page.querySelector('.gantt-due');
    const span = (model?.toDay ?? 1) - (model?.fromDay ?? 0);
    const wanted = (((model?.dueDay ?? 0) - (model?.fromDay ?? 0)) / span) * 100;
    expect(due?.getAttribute('style')).toContain(`left:${Math.round(wanted * 100) / 100}%`);
  });

  it('hatches what is left and fills what is done', () => {
    const state = boardWith();
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.5;
    const page = parse(renderWorkPlan(state));
    const cutting = page.querySelector('.gantt-bar.stage-cutting .gantt-done');
    expect(cutting?.getAttribute('style')).toBe('width:100%');
    const finishing = page.querySelector('.gantt-bar.stage-finishing .gantt-done');
    expect(finishing?.getAttribute('style')).toBe('width:0%');
  });

  it('draws the grey gap with the reason on its hover', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1 }), 60);
    const page = parse(renderWorkPlan(state));
    const gaps = Array.from(page.querySelectorAll('.gantt-gap'));
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.getAttribute('title')).toBe('waiting for table saw');
  });

  it('says so plainly when there is nothing on the books', () => {
    const page = parse(renderWorkPlan(newGame()));
    expect(page.textContent).toContain('No jobs yet');
    expect(page.querySelectorAll('.gantt-row')).toHaveLength(0);
  });
});
