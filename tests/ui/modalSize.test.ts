// @vitest-environment jsdom
// Big modals, not tiny ones: anything that is a list or a board fills the page, and a small modal
// is for an event with a decision in it (PIOTR, 13.09; CLAUDE.md T9 1, 3.12).

import { beforeAll, describe, expect, it } from 'vitest';
import { MODAL_IS_FULL, currentState, mount, render } from '../../src/ui/app';
import { buyNow } from '../helpers';

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

function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

function openModalNode(): Element | null {
  return root().querySelector('.modal-layer .modal');
}

/** The top bar carries one toggle between the two views, so it is pressed only when the player is
 *  not already where he wants to be. */
function goTo(view: 'hall' | 'office'): void {
  const inOffice = root().querySelector('.office-room') !== null;
  if ((view === 'office') === inOffice) return;
  click(`[data-do="setView"][data-view="${view}"]`);
}

/** What opens each modal the player can reach from the room and from the top bar. */
const OPENERS: Array<[string, string]> = [
  ['workPlan', '[data-office="workPlan"]'],
  ['board', '[data-office="orders"]'],
  ['catalogue', '[data-office="catalogue"]'],
  ['accounting', '[data-office="binder"]'],
  ['shopping', '[data-do="openModal"][data-modal="shopping"]'],
  ['company', '[data-office="company"]'],
  ['laptop', '[data-office="laptop"]'],
];

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  // The order board and the binder are the desk and the laptop's: no laptop, no board
  // (CLAUDE.md T7 3.8). They are stood in the room here rather than ordered, because this test is
  // about the size of a modal and not about how the furniture arrives.
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, buyNow(buyNow(state, 'desk'), 'laptop'));
  render();
});

describe('the size of every modal in the game', () => {
  it('fills the page for every list and board, and for nothing else', () => {
    for (const [id, opener] of OPENERS) {
      goTo(id === 'shopping' ? 'hall' : 'office');
      click(opener);
      dismissEvents();
      const node = openModalNode();
      expect(node?.getAttribute('data-modal'), id).toBe(id);
      expect(node?.classList.contains('modal-full'), id).toBe(MODAL_IS_FULL[id as never]);
      click('[data-modal="' + id + '"] [data-do="closeModal"]');
    }
  });

  it('says full for the six the brief names, the team, and the laptop screen, and for nothing else', () => {
    expect(MODAL_IS_FULL).toEqual({
      board: true,
      catalogue: true,
      workPlan: true,
      shopping: true,
      accounting: true,
      company: true,
      // The team is a page of the game from Turn 10, not a tab of the laptop (T10 3.6).
      team: true,
      // The laptop is a computer, and its screen fills the page (CLAUDE.md T14 2.1).
      laptop: true,
      // The settings are a small plate off the gear on the top bar (CLAUDE.md T13 3.22).
      settings: false,
    });
  });
});
