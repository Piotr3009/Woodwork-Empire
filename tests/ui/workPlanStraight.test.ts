// @vitest-environment jsdom
// The Work Plan is an interactive board the player reads numbers off, so NOTHING on it is crooked
// (PIOTR, 16.09: "the job cards must not be crooked. Straight, nice boxes"; CLAUDE.md T15 2.4).
// Until Turn 20 that held by accident of class names: the modal had only plan rows on it, and the
// tilt is on the board family's cards, rows and tiles. Its Contracts tab brought all three onto
// this board, so the rule now names the modal (CLAUDE.md T20 1, 2.1). The tilt itself stays, on
// the Shopping board.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderShopping } from '../../src/ui/shopping';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { acceptNow, act, buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';
import { drawContract } from '../../src/engine/index';
import { contractPiece, contractPriceFor } from '../../src/engine/contracts';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

/** Every rule of the stylesheet as [selector list, body], comments stripped. */
function rules(): Array<[string, string]> {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map((found) => [
    (found[1] ?? '').trim(),
    found[2] ?? '',
  ]);
}

/** A board on the page, inside the steel frame every board wears, with the stylesheet on it. The
 *  modal is named, because the tilt is the Shopping board's and not the Work Plan's, and a board
 *  mounted under the wrong name would prove nothing. */
function onTheBoard(body: string, modal: 'workPlan' | 'shopping' = 'workPlan'): HTMLElement {
  document.body.innerHTML =
    `<style>${CSS}</style><div class="modal modal-full modal-board" data-modal="${modal}">` +
    `<div class="modal-body">${body}</div></div>`;
  const node = document.querySelector('.modal-body');
  if (!(node instanceof HTMLElement)) throw new Error('no board');
  return node;
}

/** The Work Plan's other tab, with one contract of each kind on it, so what the board does to a
 *  card and to the rows inside it can be read off the real thing (CLAUDE.md T20 2.1). */
function withAContract() {
  const state = withJobs();
  state.contracts = [];
  const offer = drawContract(state);
  offer.pieceId = 'cutSheetPack';
  offer.pricePerPiece = contractPriceFor(contractPiece(offer));
  state.contracts.push(offer);
  return state;
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
    // The three tilt rules are still there for the rest of the board family, and every one of
    // them holds the Work Plan out by name.
    const tilts = rules().filter(([, body]) => /transform: rotate\(/.test(body));
    const onCards = tilts.filter(([selectors]) => selectors.includes('.card:nth-of-type'));
    expect(onCards).toHaveLength(3);
    for (const [selectors] of onCards) {
      expect(selectors).toContain('.row:nth-of-type');
      expect(selectors).toContain('.tile:nth-of-type');
      expect(selectors).not.toContain('.plan-row');
      expect(selectors).toContain(":not([data-modal='workPlan'])");
    }
  });

  it('render with no transform on the board, while a shopping card still tilts', () => {
    const state = withJobs();
    const plan = onTheBoard(renderWorkPlan(state, 'jobs'));
    const rows = Array.from(plan.querySelectorAll('.plan-row[data-plan]'));
    expect(rows.length).toBe(4);
    for (const [index, row] of rows.entries()) {
      const transform = getComputedStyle(row).transform;
      expect(transform, `row ${index}`).toMatch(/^(none|)$/);
    }
    // The same stylesheet, the same steel frame, a card of the Shopping board: the tilt is still
    // there.
    const ordered = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'used' });
    const shopping = onTheBoard(renderShopping(ordered), 'shopping');
    const card = shopping.querySelector('.card, .row, .tile');
    expect(card).not.toBeNull();
    if (card !== null) expect(getComputedStyle(card).transform).toMatch(/rotate\(/);
  });

  it('keep the Contracts tab straight too, and its figure lines inside the card', () => {
    const board = onTheBoard(renderWorkPlan(withAContract(), 'contracts'));
    const card = board.querySelector('.contract-offer');
    expect(card).not.toBeNull();
    if (card === null) return;
    // The card is pinned to the board, straight, like a job row.
    expect(getComputedStyle(card).transform).toMatch(/^(none|)$/);
    const rows = Array.from(card.querySelectorAll('.row'));
    expect(rows.length).toBeGreaterThan(4);
    for (const [index, row] of rows.entries()) {
      // A figure line inside the card is a line of it: no tilt, no shadow, no paper of its own,
      // and the numbers stay level with the words they belong to (T20-C5).
      const style = getComputedStyle(row);
      expect(style.transform, `row ${index}`).toMatch(/^(none|)$/);
      expect(style.boxShadow, `row ${index}`).toMatch(/^(none|)$/);
    }
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
