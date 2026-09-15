// @vitest-environment jsdom
// The company board is the felt picture with the live text on it: the name and the week on the
// felt, the output and its two columns on the pinned sheet, and under both, in larger letters,
// the two totals (PIOTR, 15.09; CLAUDE.md T11 3.5).

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { changeReputation, companyTotals } from '../../src/engine/reputation';
import { outputBreakdown } from '../../src/engine/machines';
import { OFFICE_TEXTS } from '../../src/render/office';
import { renderCompany } from '../../src/ui/company';
import { currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A company with a fortnight behind it and a day of the owner's on the log. */
function traded(): GameState {
  const state = fillRack(buyStartingKit(newGame({ companyName: 'Joinery Core' })), 40);
  state.clock.day = 9;
  changeReputation(state, 5, 'Wardrobe: express, on time');
  state.clock.day = 11;
  changeReputation(state, -2, 'Bookcase: late');
  state.owner.dayLog = [
    { category: 'workshop', minutes: 240 },
    { category: 'calls', minutes: 60 },
    { category: 'office', minutes: 180 },
  ];
  state.dayLogs = [{ day: 10, segments: [{ category: 'emails', minutes: 120 }] }];
  return state;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, traded());
  render();
});

describe('the two totals', () => {
  it('are worked out in one place, and read as the player reads them', () => {
    const state = traded();
    const totals = companyTotals(state);
    expect(totals.reputation).toBe(`Reputation ${state.reputation}`);
    expect(totals.output).toBe(`Output ${outputBreakdown(state).total.toFixed(2)}`);
  });

  it('are both on the modal, under the felt and the sheet, in the larger letters', () => {
    const state = traded();
    const page = parse(renderCompany(state));
    const totals = companyTotals(state);
    const shown = Array.from(page.querySelectorAll('.felt-total')).map(
      (node) => node.textContent ?? '',
    );
    expect(shown).toEqual([totals.reputation, totals.output]);
    expect(page.querySelector('[data-total="reputation"]')?.textContent).toBe(totals.reputation);
    expect(page.querySelector('[data-total="output"]')?.textContent).toBe(totals.output);
    // Larger than everything else on the board.
    expect(CSS).toContain('.felt-total {');
    const block = CSS.slice(CSS.indexOf('.felt-total {'));
    expect(block.slice(0, block.indexOf('}'))).toContain('font-size: 34px;');
  });

  it('are the only live text on the board on the office wall', () => {
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) toOffice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const state = currentState();
    if (state === null) throw new Error('no game');
    const totals = companyTotals(state);
    const board = root().querySelector('[data-office-text="companyTotals"]');
    expect(board).not.toBeNull();
    expect(board?.querySelector('[data-total="reputation"]')?.textContent).toBe(totals.reputation);
    expect(board?.querySelector('[data-total="output"]')?.textContent).toBe(totals.output);
    // On the pinned sheet of the picture, which the art side puts at 19.4% to 80.6% across the
    // board and 40.7% to 80.9% down it (docs/art/SPRITES.md 11).
    expect(OFFICE_TEXTS.companyTotals.x).toBe(1054);
    expect(OFFICE_TEXTS.companyTotals.y).toBe(282);
  });
});

describe('the felt and the sheet', () => {
  it('carries the company name and the week on the felt above the sheet', () => {
    const state = traded();
    const page = parse(renderCompany(state));
    expect(page.querySelector('.felt-name')?.textContent).toBe('Joinery Core');
    expect(page.querySelector('.felt-week')?.textContent).toBe('Week 2 · +3');
  });

  it('keeps the week in the same seven bands as the top bar', () => {
    const state = traded();
    const shares = parse(renderCompany(state)).querySelector('.felt-shares')?.textContent ?? '';
    expect(shares).toContain('Workshop');
    expect(shares).toContain('Emails');
    const percents = (shares.match(/(\d+)%/g) ?? []).map((text) => Number(text.replace('%', '')));
    expect(percents.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('counts the day that has just closed once, and not twice', () => {
    // Between the evening writing the day down and the next morning emptying the log it is on
    // both `dayLogs` and the owner: the week must not weight it twice (CLAUDE.md T11 3.1).
    const state = traded();
    state.dayLogs = [{ day: state.clock.day, segments: [{ category: 'workshop', minutes: 100 }] }];
    state.owner.dayLog = [{ category: 'workshop', minutes: 100 }];
    const shares = parse(renderCompany(state)).querySelector('.felt-shares')?.textContent ?? '';
    expect(shares).toBe('Workshop 100%');
    // A day still open is on the week as well as the days that closed before it.
    state.dayLogs = [{ day: state.clock.day - 1, segments: [{ category: 'emails', minutes: 100 }] }];
    const both = parse(renderCompany(state)).querySelector('.felt-shares')?.textContent ?? '';
    expect(both).toContain('Workshop 50%');
    expect(both).toContain('Emails 50%');
  });

  it('puts the output and its two columns on the pinned sheet', () => {
    const state = traded();
    const sheet = parse(renderCompany(state)).querySelector('.felt-sheet');
    expect(sheet?.textContent).toContain('Company output');
    expect(sheet?.textContent).toContain(outputBreakdown(state).total.toFixed(2));
    expect(sheet?.querySelectorAll('.board-column')).toHaveLength(2);
  });

  it('opens on the same picture, full page', () => {
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) toOffice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    click('[data-office="company"]');
    const modal = root().querySelector('.modal-layer .modal');
    expect(modal?.getAttribute('data-modal')).toBe('company');
    expect(modal?.classList.contains('modal-felt')).toBe(true);
    expect(modal?.classList.contains('modal-full')).toBe(true);
    expect(CSS).toContain("url('/sprites/officeCompanyBoard.png')");
    click('[data-modal="company"] [data-do="closeModal"]');
  });
});
