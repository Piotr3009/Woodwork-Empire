// @vitest-environment jsdom
// "A started job's bar turns all green to the deadline. It should stay the length of the work and
// fill green as the work is done; if the work stopped it should stretch" (PIOTR, 15.09;
// CLAUDE.md T11 3.3).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MINUTES_PER_WORKING_DAY } from '../../src/engine/constants';
import { workPlan } from '../../src/engine/plan';
import { workingDayIndex } from '../../src/engine/clock';
import { minutesRemainingFor } from '../../src/engine/jobs';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState, PlanRow } from '../../src/engine/index';
import { acceptNow, act, buyStartingKit, fillRack, firstJob, newGame, placeEnquiry } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The day 1 kit with one job on the books, ready for the bench and picked up by the owner. */
function started(options: { deadlineDays?: number; price?: number } = {}): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    price: options.price ?? 400,
    deadlineDays: options.deadlineDays ?? 10,
  });
  state = acceptNow(state, enquiry.id, false);
  const job = firstJob(state);
  job.stage = 'ready';
  const next = act(state, { type: 'WORK_HERE', jobId: job.id });
  // Picked up this very minute: nothing worked into it yet and no time lost.
  firstJob(next).stageRuns = [
    {
      stage: 'cutting',
      startDay: next.clock.day,
      startMinute: next.clock.minute,
      endDay: null,
      endMinute: null,
    },
  ];
  return next;
}

function row(state: GameState): PlanRow {
  const first = workPlan(state).rows[0];
  if (first === undefined) throw new Error('no row on the board');
  return first;
}

/** The bar in minutes of a working day, which is what the brief measures it in. */
function barMinutes(entry: PlanRow): number {
  return (entry.to - entry.from) * MINUTES_PER_WORKING_DAY;
}

describe('the bar of a started job', () => {
  it('is the length of its work at the rate it will get, and not of its deadline', () => {
    const state = started();
    const job = firstJob(state);
    const work = minutesRemainingFor(state, job, 1);
    const entry = row(state);
    expect(entry.notStarted).toBe(false);
    expect(entry.rateLabel).toBe('for you');
    expect(barMinutes(entry)).toBeCloseTo(work, 4);
    expect(entry.minutesTotal).toBeCloseTo(work, 4);
    // The right edge is the projected end, which is nowhere near the deadline.
    expect(entry.to).toBeLessThan(workingDayIndex(job.dueDay));
  });

  it('keeps its outline and fills green from the left as the work goes in', () => {
    const state = started();
    const job = firstJob(state);
    const work = minutesRemainingFor(state, job, 1);
    job.labourRemaining = job.labourValue * 0.5;
    state.clock.minute += Math.round(work * 0.5);
    const entry = row(state);
    expect(entry.done).toBeCloseTo(0.5, 2);
    expect(barMinutes(entry)).toBeCloseTo(work, 0);
    const page = parse(renderWorkPlan(state));
    const bar = page.querySelector('.plan-bar');
    // The outline stays: a started bar is not a solid green block (PIOTR, 15.09).
    expect(bar?.classList.contains('is-projected')).toBe(false);
    expect(bar?.querySelector('.plan-done')?.getAttribute('style')).toBe('width:50%');
    // And the outline itself is what the stylesheet draws, whatever the fill is doing.
    expect(readFileSync('src/ui/styles.css', 'utf8')).toContain(
      'border: 1px solid var(--text-dim);',
    );
  });

  it('stretches by sixty minutes when sixty minutes go by with no work in them', () => {
    const state = started();
    const before = barMinutes(row(state));
    // An hour of the clock in which the job's own clock did not move: waiting for a machine, the
    // owner at home, the break, the debt, the dust (CLAUDE.md T11 3.3).
    state.clock.minute += 60;
    const after = row(state);
    expect(barMinutes(after) - before).toBeCloseTo(60, 4);
    expect(after.lostMinutes).toBe(60);
    // And nothing at all has been made in that hour.
    expect(after.minutesDone).toBe(0);
    expect(after.done).toBe(0);
  });

  it('walks its right edge towards the deadline, one lost minute at a time', () => {
    const state = started();
    const first = row(state).to;
    state.clock.minute += 120;
    const second = row(state).to;
    expect(second).toBeGreaterThan(first);
    expect((second - first) * MINUTES_PER_WORKING_DAY).toBeCloseTo(120, 4);
  });
});

describe('a job whose end has gone past the deadline', () => {
  it('turns the outline red and says how many days late it is', () => {
    // One working day to do a job that takes days: the projection is past DL from the first
    // minute.
    const state = started({ deadlineDays: 1, price: 6000 });
    const entry = row(state);
    expect(entry.overdue).toBe(true);
    expect(entry.lateDays).toBeGreaterThanOrEqual(1);
    const page = parse(renderWorkPlan(state));
    const bar = page.querySelector('.plan-bar');
    expect(bar?.classList.contains('is-late')).toBe(true);
    expect(page.querySelector('.plan-late')?.textContent).toBe(
      `late by ${entry.lateDays} ${entry.lateDays === 1 ? 'day' : 'days'}`,
    );
  });

  it('is not red while the projection still lands before the deadline', () => {
    const state = started({ deadlineDays: 30, price: 400 });
    const entry = row(state);
    expect(entry.overdue).toBe(false);
    expect(entry.lateDays).toBe(0);
    const page = parse(renderWorkPlan(state));
    expect(page.querySelector('.plan-bar')?.classList.contains('is-late')).toBe(false);
    expect(page.querySelector('.plan-late')).toBeNull();
  });
});

describe('a job nobody has started', () => {
  it('is still a dashed outline as long as the work in it', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 10 });
    state = acceptNow(state, enquiry.id, false);
    firstJob(state).stage = 'ready';
    const entry = row(state);
    expect(entry.notStarted).toBe(true);
    expect(entry.lostMinutes).toBe(0);
    expect(barMinutes(entry)).toBeCloseTo(entry.minutesTotal, 4);
    const page = parse(renderWorkPlan(state));
    expect(page.querySelector('.plan-bar')?.classList.contains('is-projected')).toBe(true);
    // And the yellow tick is still on it (CLAUDE.md T9 3.6).
    expect(page.querySelector('.plan-start')).not.toBeNull();
  });
});
