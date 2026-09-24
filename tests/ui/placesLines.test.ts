// @vitest-environment jsdom
// The Work Plan says in one line who is working and who has every place he could take taken
// (CLAUDE.md T25 2.8), the efficiency plate says what the machines buy the hall, one line a family
// whose pace is not 1.00, beside the `No free machines` line of the lost minutes (T25 2.3, 2.4),
// and the Output sheet and the saw's own card say when the hall has too few saws for its crew
// (PIOTR, 24.09; v53).

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import {
  hallProductivityFactor,
  outputBreakdown,
  paceLines,
  placeShortages,
  shortageLine,
} from '../../src/engine/machines';
import { placesSummary, planPlaces } from '../../src/engine/production';
import { renderCompany } from '../../src/ui/company';
import { renderMachineCard } from '../../src/ui/machineCard';
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

/** The same four men with the day one kit's one bench and no other: the five benches the crew
 *  stood at are taken out, so the saw and that one bench are every place the hall has. Nobody
 *  waits for the saw, so a man stands only when every place he could take is taken
 *  (PIOTR, 24.09; v53). */
function fourAtOneSawAndOneBench(sawVariant: string): GameState {
  const state = fourAtOneSaw(sawVariant);
  const kit = state.equipment.find((item) => item.specId === 'workbench');
  state.equipment = state.equipment.filter((item) => item.specId !== 'workbench' || item === kit);
  planPlaces(state);
  return state;
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the Work Plan s one line (CLAUDE.md T25 2.8)', () => {
  it('counts the men working and, only when somebody stands, the men with no free machines', () => {
    // One used saw and one bench, two places for four men: the first cuts, the second takes the
    // bench, and the other two stand with every place taken. The line counts them and names no
    // machine (PIOTR, 24.09; v53). Until v53 the one saw alone stood three of them.
    const used = fourAtOneSawAndOneBench('used');
    expect(placesSummary(used)).toBe('2 men working \u00b7 2 with no free machines');
    const line = parse(renderWorkPlan(used)).querySelector('[data-plan-places]');
    expect(line?.textContent).toBe('2 men working \u00b7 2 with no free machines');
    expect(line?.classList.contains('warn')).toBe(true);
    // An industrial saw has three places, and with the bench that is a place for every man: the
    // line says who is working and nothing else. Until v53 the fourth man stood at the saw.
    const industrial = fourAtOneSawAndOneBench('industrial');
    expect(placesSummary(industrial)).toBe('4 men working');
    const full = parse(renderWorkPlan(industrial)).querySelector('[data-plan-places]');
    expect(full?.textContent).toBe('4 men working');
    expect(full?.classList.contains('warn')).toBe(false);
  });

  it('says only who is working when every man has a place, spread over the saw and the benches, and nought when nobody is on anything', () => {
    // One used saw and the six benches: nobody waits for the saw. The first man cuts and the
    // other three each take a bench of his own, so nobody is on another man's place
    // (PIOTR, 24.09; v53).
    const state = fourAtOneSaw('used');
    const plan = planPlaces(state);
    expect(plan.map((entry) => entry.working)).toEqual([true, true, true, true]);
    expect(plan.map((entry) => entry.family)).toEqual(['tableSaw', 'workbench', 'workbench', 'workbench']);
    const places = plan.map((entry) => `${entry.machine?.id ?? ''}:${entry.place}`);
    expect(new Set(places).size).toBe(4);
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
    // The lost minutes keep their line for a man with no place beside it, in the words of the
    // mark over his head (CLAUDE.md T25 2.3; PIOTR, 24.09; v53).
    expect(plate.querySelector('[data-cause="noPlace"] .tip-name')?.textContent).toBe('No free machines');
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

describe('the saws too few for the crew (PIOTR, 24.09; v53)', () => {
  it('puts a hall line on the Output sheet and the capacity on the saw s own card, and says what it costs', () => {
    // Three men on the books at work, one used saw of one place: three men for one place. Nobody
    // waits for it; the two past its place work elsewhere at the by hand pace, and the whole hall
    // is multiplied by (1 + 2 / 1.5) / 3 = 0.78 [PIOTR, 24.09: "me and two men is three; with
    // four, too few saws for the men"]. The owner is on nothing here, and from v54 the crew is the
    // men at work, so he is not counted (PIOTR, 24.09: "nobody worked and it still cuts").
    const state = fourAtOneSaw('used');
    state.workers = state.workers.slice(0, 3);
    planPlaces(state);
    expect(placeShortages(state)).toEqual([
      { family: 'tableSaw', places: 1, men: 3, over: 2, factor: (1 + 2 / 1.5) / 3 },
    ]);
    expect(hallProductivityFactor(state)).toBeCloseTo((1 + 2 / 1.5) / 3, 10);
    const row = Array.from(
      parse(renderCompany(state)).querySelectorAll('[data-sheet="output"] [data-line="hall"]'),
    ).find((node) => node.querySelector('.ledger-main')?.textContent === 'Too few saws: 1 place, 3 men');
    expect(row?.querySelector('.ledger-points')?.textContent).toBe('\u22120.22');
    expect(row?.querySelector('.ledger-points')?.classList.contains('bad')).toBe(true);
    // The saw's hover says it in a sentence, and its own card says the capacity against the crew
    // in red with the men past it and their pace [PIOTR, 24.09: "capacity 6 men green, capacity 6
    // and 7 men red, and one man works at 67 per cent"] (v54).
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('the saw is wanted');
    expect(shortageLine(state, 'tableSaw')).toBe('Too few saws for the crew: 3 men, 1 place, 2 work at 67%');
    const card = parse(renderMachineCard(state, saw.id, null));
    const capacity = card.querySelector('[data-capacity="tableSaw"]');
    expect(capacity?.textContent).toBe('Saw capacity: 1 man, crew 3');
    expect(capacity?.classList.contains('bad')).toBe(true);
    expect(card.querySelector('[data-capacity-over]')?.textContent).toBe('2 men work at 67% efficiency');
    // A second used saw is a place for one more man, and the line moves with it: (2 + 1 / 1.5) / 3.
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 14, y: 1, id: 'kit-saw-second' });
    expect(outputBreakdown(state).lines.map((line) => line.label)).toContain('Too few saws: 2 places, 3 men');
    expect(hallProductivityFactor(state)).toBeCloseTo((2 + 1 / 1.5) / 3, 10);
    // Three saws are a place for every man, and the sheet says nothing of it; the card says the
    // capacity in green.
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 14, y: 3, id: 'kit-saw-3' });
    expect(placeShortages(state)).toEqual([]);
    expect(shortageLine(state, 'tableSaw')).toBe('');
    expect(outputBreakdown(state).lines.some((line) => line.label.startsWith('Too few'))).toBe(false);
    const enough = parse(renderMachineCard(state, saw.id, null)).querySelector('[data-capacity="tableSaw"]');
    expect(enough?.textContent).toBe('Saw capacity: 3 men, crew 3');
    expect(enough?.classList.contains('good')).toBe(true);
  });
});
