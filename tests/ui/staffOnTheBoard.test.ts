// @vitest-environment jsdom
// The Company board's second list, under the rule: the men and the machines that act where they
// are. Only the men who produce are on it. An estimator has a rate at his desk and it is not a
// production rate, so he is not on the Output sheet at all (PIOTR; CLAUDE.md T20 2.3).

import { describe, expect, it } from 'vitest';
import { PRODUCING_ROLES } from '../../src/engine/constants';
import { produces } from '../../src/engine/staff';
import { renderCompany } from '../../src/ui/company';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, hireNow, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function elsewhereRows(state: GameState): string[] {
  const page = parse(renderCompany(state));
  return Array.from(page.querySelectorAll('[data-line="elsewhere"]')).map(
    (row) => row.textContent ?? '',
  );
}

/** A hall with the welfare a joiner needs, known enough to take anybody on. */
function known(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'canteenSeat', { x: 8, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  state.reputation = 60;
  state.cash = 200000;
  return state;
}

describe('who acts where they are', () => {
  it('is the joiners and the sprayers, and never a desk', () => {
    expect(PRODUCING_ROLES).toEqual(['joiner', 'sprayer']);
    expect(produces('joiner')).toBe(true);
    expect(produces('sprayer')).toBe(true);
    for (const role of ['estimator', 'officeAdmin', 'draftsman', 'purchasingClerk', 'salesman'] as const) {
      expect(produces(role)).toBe(false);
    }
  });

  it('says 0 h of a machine nobody stood at, and never "none" (CLAUDE.md T20 2.14)', () => {
    const page = parse(renderCompany(known()));
    const machines = page.querySelector('[data-sheet="machines"]');
    expect(machines?.textContent).toContain('0 h');
    expect(machines?.textContent).not.toContain('none');
  });

  it('keeps the estimator off the Output sheet and leaves the joiner on it', () => {
    let state = hireNow(known(), 'joiner', 'senior');
    state = hireNow(state, 'estimator', 'experienced');
    const joiner = state.workers.find((worker) => worker.role === 'joiner');
    const estimator = state.workers.find((worker) => worker.role === 'estimator');
    if (!joiner || !estimator) throw new Error('nobody on the books');
    // Both of them carry a rate of their own, and only one of them makes anything.
    expect(estimator.rate).toBeGreaterThan(0);
    const rows = elsewhereRows(state).join(' ');
    expect(rows).toContain(joiner.name);
    expect(rows).not.toContain(estimator.name);
  });

  it('reads the role and never the name, so two men called Dave keep their own lines', () => {
    // The pool of names holds twenty and the crew limit can pass twenty, so a second Dave is
    // reachable. A filter that matched a line by the name it is written under would take the
    // joiner Dave's line off the sheet with the estimator Dave's, so the rule is at the source,
    // in `outputBreakdown`, and it reads the role (NOTES-B2.md 2.3, 8.8).
    let state = hireNow(known(), 'joiner', 'senior');
    state = hireNow(state, 'estimator', 'experienced');
    const joiner = state.workers.find((worker) => worker.role === 'joiner');
    const estimator = state.workers.find((worker) => worker.role === 'estimator');
    if (!joiner || !estimator) throw new Error('nobody on the books');
    joiner.name = 'Dave';
    estimator.name = 'Dave';
    const rows = elsewhereRows(state);
    const daves = rows.filter((row) => row.startsWith('Dave,'));
    expect(daves).toHaveLength(1);
    expect(daves[0]).toContain('joiner');
    expect(daves[0]).not.toContain('estimator');
  });
});
