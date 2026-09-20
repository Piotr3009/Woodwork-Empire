// @vitest-environment jsdom
// Big modals, not tiny ones: anything that is a list or a board fills the page, and a small modal
// is for an event with a decision in it (PIOTR, 13.09; CLAUDE.md T9 1, 3.12).

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { MODAL_IS_FULL, MODAL_IS_WIDE, currentState, mount, render } from '../../src/ui/app';
import { STATION_IDLE } from '../../src/engine/stations';
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

/** The owner stands behind the office door from the first morning, and a figure through a door is
 *  off the hall's drawing (CLAUDE.md T20 2.12), so his card cannot be clicked open until he is
 *  out on the floor. This walks him out, which is the state 2.3 puts him in the moment his office
 *  empties (CLAUDE.md T23 2.3, 2.13). */
function ownerOntoTheFloor(): void {
  const state = currentState();
  if (state === null) throw new Error('no game');
  state.owner.station = STATION_IDLE;
  state.owner.currentTaskId = null;
  render();
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
  // One machine's own card, from a click on the machine standing in the hall (T17 2.6).
  ['machineCard', '.hall-view [data-sprite="tableSaw"]'],
  // And one person's, from a click on the man himself (CLAUDE.md T23 2.13).
  ['personCard', '[data-owner="1"]'],
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
  Object.assign(state, buyNow(buyNow(buyNow(state, 'desk'), 'laptop'), 'tableSaw'));
  render();
});

describe('the size of every modal in the game', () => {
  it('fills the page for every list and board, and for nothing else', () => {
    for (const [id, opener] of OPENERS) {
      goTo(
        id === 'shopping' || id === 'machineCard' || id === 'personCard' ? 'hall' : 'office',
      );
      if (id === 'personCard') ownerOntoTheFloor();
      click(opener);
      dismissEvents();
      const node = openModalNode();
      expect(node?.getAttribute('data-modal'), id).toBe(id);
      expect(node?.classList.contains('modal-full'), id).toBe(MODAL_IS_FULL[id as never]);
      expect(node?.classList.contains('modal-wide'), id).toBe(MODAL_IS_WIDE[id as never]);
      click('[data-modal="' + id + '"] [data-do="closeModal"]');
    }
  });

  it('says full for the six the brief names and the laptop screen, and for nothing else', () => {
    expect(MODAL_IS_FULL).toEqual({
      board: true,
      catalogue: true,
      workPlan: true,
      shopping: true,
      accounting: true,
      company: true,
      // The team is a page of the laptop from Turn 15 (CLAUDE.md T15 2.3).
      // The laptop is a computer, and its screen fills the page (CLAUDE.md T14 2.1).
      laptop: true,
      // The settings are a small plate off the gear on the top bar (CLAUDE.md T13 3.22).
      settings: false,
      // One machine's card is a card, not a list (CLAUDE.md T17 2.6), and one person's is a card
      // in the same sense (CLAUDE.md T23 2.13).
      machineCard: false,
      personCard: false,
    });
  });

  it('gives the machine card the middle folder, so its buttons are not under the fold', () => {
    // The small folder is 62vh and the card is a picture, six figures and five buttons: measured
    // on the real page, the buttons fell 73 px below the body (CLAUDE.md T17 2.6).
    expect(MODAL_IS_WIDE).toEqual({
      board: false,
      laptop: false,
      workPlan: false,
      accounting: false,
      catalogue: false,
      shopping: false,
      company: false,
      settings: false,
      machineCard: true,
      // A person's card wears the machine card's skin and its size with it (CLAUDE.md T23 2.13).
      personCard: true,
    });
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toContain('.modal-folder.modal-wide {');
  });
});
