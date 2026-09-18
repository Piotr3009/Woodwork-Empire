// @vitest-environment jsdom
// The Work Plan is an interactive board the player reads numbers off, so its job rows are straight
// (PIOTR, 16.09: "the job cards must not be crooked. Straight, nice boxes"; CLAUDE.md T15 2.4).
// The tilt of the board family stays on the cards, rows and tiles of the Shopping board.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderShopping } from '../../src/ui/shopping';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { acceptNow, act, buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

/** Every rule of the stylesheet as [selector list, body], comments stripped. */
function rules(): Array<[string, string]> {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map((found) => [
    (found[1] ?? '').trim(),
    found[2] ?? '',
  ]);
}

/** A board on the page, inside the steel frame every board wears, with the stylesheet on it. */
function onTheBoard(body: string): HTMLElement {
  document.body.innerHTML =
    `<style>${CSS}</style><div class="modal modal-full modal-board" data-modal="workPlan">` +
    `<div class="modal-body">${body}</div></div>`;
  const node = document.querySelector('.modal-body');
  if (!(node instanceof HTMLElement)) throw new Error('no board');
  return node;
}

function withJobs() {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
  state.enquiries = [];
  for (const price of [900, 1500, 2400, 3200]) {
    state = acceptNow(state, placeEnquiry(state, { price, deadlineDays: 30 }).id);
  }
  return state;
}

describe('the Work Plan rows', () => {
  it('are on no rule of the stylesheet that transforms them', () => {
    // No rule on the row itself carries a transform, and no rule near it carries a tilt: the
    // magnet's own centring on ::before is the pseudo element's and not the row's.
    const onTheRow = rules().filter(
      ([selectors, body]) =>
        selectors.includes('.plan-row') && !selectors.includes('::') && body.includes('transform'),
    );
    expect(onTheRow).toEqual([]);
    const tilted = rules().filter(
      ([selectors, body]) => selectors.includes('.plan-row') && /rotate\(/.test(body),
    );
    expect(tilted).toEqual([]);
    // The three tilt rules are still there for the rest of the board family.
    const tilts = rules().filter(([, body]) => /transform: rotate\(/.test(body));
    const onCards = tilts.filter(([selectors]) => selectors.includes('.modal-board .card'));
    expect(onCards).toHaveLength(3);
    for (const [selectors] of onCards) {
      expect(selectors).toContain('.modal-board .row');
      expect(selectors).toContain('.modal-board .tile');
      expect(selectors).not.toContain('.plan-row');
    }
  });

  it('render with no transform on the board, while a shopping card still tilts', () => {
    const state = withJobs();
    const plan = onTheBoard(renderWorkPlan(state, 'jobs', null));
    const rows = Array.from(plan.querySelectorAll('.plan-row[data-plan]'));
    expect(rows.length).toBe(4);
    for (const [index, row] of rows.entries()) {
      const transform = getComputedStyle(row).transform;
      expect(transform, `row ${index}`).toMatch(/^(none|)$/);
    }
    // The same stylesheet, the same frame, a card of the Shopping board: the tilt is still there.
    const ordered = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'used' });
    const shopping = onTheBoard(renderShopping(ordered));
    const card = shopping.querySelector('.card, .row, .tile');
    expect(card).not.toBeNull();
    if (card !== null) expect(getComputedStyle(card).transform).toMatch(/rotate\(/);
  });

  it('keep the paper, the magnet and the chart of the board family', () => {
    const cardRule = rules().find(
      ([selectors]) =>
        selectors.includes('.modal-board .plan-row:not(.plan-scale-row)') &&
        selectors.includes('.modal-board .card'),
    );
    expect(cardRule?.[1]).toContain('background: var(--card-2);');
    expect(CSS).toContain('.modal-board .plan-row:not(.plan-scale-row)::before');
  });
});
