// @vitest-environment jsdom
// The Work Plan says in one line who is working and who the hall has no place for
// (CLAUDE.md T25 2.8), and the efficiency plate says what the machines buy the hall, one line a
// family whose pace is not 1.00, beside the `No place` line of the lost minutes (T25 2.3, 2.4).

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import { paceLines } from '../../src/engine/machines';
import { placesSummary, planPlaces } from '../../src/engine/production';
import { renderTopbar } from '../../src/ui/topbar';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { placeEquipment, sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

/** Four men on jobs at their cutting and one saw of the class named. */
function fourAtOneSaw(sawVariant: string): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant });
  for (const worker of state.workers.slice(4)) {
    const job = state.jobs.find((entry) => entry.id === worker.jobId);
    if (job) job.assignees = job.assignees.filter((who) => who !== worker.id);
    worker.jobId = null;
  }
  state.jobs = state.jobs.filter((job) => job.assignees.length > 0);
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue;
    job.sheetsUsed = 0;
  }
  withOnlyCuttingLeft(state);
  planPlaces(state);
  return state;
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the Work Plan s one line (CLAUDE.md T25 2.8)', () => {
  it('counts the men working and the men with no place, by the machine they want', () => {
    const used = fourAtOneSaw('used');
    expect(placesSummary(used)).toBe('1 man working · 3 with no place at the saw');
    const industrial = fourAtOneSaw('industrial');
    expect(placesSummary(industrial)).toBe('3 men working · 1 with no place at the saw');
    const line = parse(renderWorkPlan(industrial)).querySelector('[data-plan-places]');
    expect(line?.textContent).toBe('3 men working · 1 with no place at the saw');
    expect(line?.classList.contains('warn')).toBe(true);
  });

  it('says only who is working when everybody has a place, and nought when nobody is on anything', () => {
    const state = fourAtOneSaw('industrial');
    placeEquipment(state, 'tableSaw', { variantId: 'budget', x: 14, y: 1, id: 'kit-saw-second' });
    planPlaces(state);
    expect(placesSummary(state)).toBe('4 men working');
    const line = parse(renderWorkPlan(state)).querySelector('[data-plan-places]');
    expect(line?.classList.contains('warn')).toBe(false);
    state.jobs = [];
    for (const worker of state.workers) worker.jobId = null;
    planPlaces(state);
    // Still a line, so the board keeps its shape under the pointer from frame to frame
    // (CLAUDE.md T14 2.4).
    expect(placesSummary(state)).toBe('0 men working');
  });
});

describe('the efficiency plate s pace lines (CLAUDE.md T25 2.4)', () => {
  it('says what an industrial saw buys, and says nothing of a family at 1.00', () => {
    const state = fourAtOneSaw('industrial');
    expect(paceLines(state).find((line) => line.family === 'tableSaw')).toEqual({
      family: 'tableSaw',
      label: 'Saw, industrial',
      percent: 12,
    });
    const plate = parse(renderTopbar(state, 'hall'));
    const saw = plate.querySelector('[data-pace="tableSaw"]');
    expect(saw?.querySelector('.tip-name')?.textContent).toBe('Saw, industrial');
    expect(saw?.querySelector('.tip-min')?.textContent).toBe('+12%');
    // The lost minutes keep their `No place` line beside it (CLAUDE.md T25 2.3).
    expect(plate.querySelector('[data-cause="noPlace"] .tip-name')?.textContent).toBe('No place');
    // The day one kit's budget bench is at 1.00 and has no line.
    expect(plate.querySelector('[data-pace="workbench"]')).toBeNull();
  });

  it('says what a used saw costs, below 1.00', () => {
    const state = fourAtOneSaw('used');
    const saw = parse(renderTopbar(state, 'hall')).querySelector('[data-pace="tableSaw"]');
    expect(saw?.querySelector('.tip-name')?.textContent).toBe('Saw, used');
    expect(saw?.querySelector('.tip-min')?.textContent).toBe('-5%');
  });
});
