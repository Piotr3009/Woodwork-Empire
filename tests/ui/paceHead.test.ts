// @vitest-environment jsdom
// The Pace sheet says the real number (PIOTR, 02.10; CLAUDE.md T26 2.14): its head is the
// workshop's average today, the number the top bar carries, and a man on a standing contract reads
// his piece's own pace as `machines`, not as a remainder called hall
// (docs/mockups/t26/pace-sheet-head.html).

import { describe, expect, it } from 'vitest';
import { contractOfWorker, contractPiece, contractPieceSpeed } from '../../src/engine/contracts';
import { workshopBreakdownToday, workshopOutputToday } from '../../src/engine/machines';
import { renderCompany } from '../../src/ui/company';
import { day53Hall, runClock } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the Pace sheet s head', () => {
  it('is the workshop s average today, in its own words, and the hall s total only as the sum', () => {
    const state = runClock(day53Hall(), 30);
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="output"]');
    expect(sheet?.querySelector('.ledger-total-label')?.textContent).toBe('every worked minute today was worth');
    expect(sheet?.querySelector('[data-figure="output"]')?.textContent).toBe(workshopOutputToday(state).toFixed(2));
    expect(sheet?.querySelector('[data-figure="workshopToday"]')).toBeNull();
    // Printed once at the top: the head is not repeated as a note under it.
    expect(sheet?.querySelectorAll('.ledger-total')).toHaveLength(1);
  });
});

describe('a contract man s row', () => {
  it('takes its machines from his piece s own pace and multiplies out to its figure', () => {
    const state = runClock(day53Hall(), 30);
    const nathan = state.workers.find((worker) => worker.name === 'Nathan');
    if (nathan === undefined) throw new Error('Nathan is on the books');
    const contract = contractOfWorker(state, nathan.id);
    if (contract === null) throw new Error('Nathan is on a contract');
    const machines = contractPieceSpeed(state, contractPiece(contract)) - 1;
    expect(machines).toBeGreaterThan(0);
    const row = workshopBreakdownToday(state).men.find((man) => man.who === nathan.id);
    if (row === undefined) throw new Error('Nathan worked today');
    expect(row.words).toContain(`+ ${machines.toFixed(2)} machines`);
    // His words multiply out to his figure: his grade times one plus the points named.
    const terms = Array.from(row.words.matchAll(/([+−]) (\d+\.\d\d) (machines|manager|boss away|hall)/g));
    const points = terms.reduce((sum, [, sign, value]) => sum + (sign === '−' ? -1 : 1) * Number(value), 0);
    expect(nathan.rate * (1 + points)).toBeCloseTo(row.figure, 1);
  });
});
