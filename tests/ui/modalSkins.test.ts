// @vitest-environment jsdom
// Three UI families and nothing else: paper on a kraft folder, cards on a board, or the one
// screen, which is the laptop. Every modal id in the game is on the one table and wears exactly
// one of the three (CLAUDE.md T11 1, 3.5, T14 2.1).

import { beforeAll, describe, expect, it } from 'vitest';
import { MODAL_IS_FULL, currentState, mount, render } from '../../src/ui/app';
import { MODAL_SKINS } from '../../src/ui/modal';
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

function goTo(view: 'hall' | 'office'): void {
  const inOffice = root().querySelector('.office-room') !== null;
  if ((view === 'office') === inOffice) return;
  click(`[data-do="setView"][data-view="${view}"]`);
}

/** What opens each modal the player can reach from the room and from the top bar, as
 *  tests/ui/modalSize.test.ts drives them. */
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
];

/** The two ids the modal layer opens that are not on the room: the event of the minute and a past
 *  day's summary. Both are paper. */
const LAYER_ONLY = ['event', 'daySummary'];

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, buyNow(buyNow(buyNow(state, 'desk'), 'laptop'), 'tableSaw'));
  render();
});

const SKIN_CLASSES = ['modal-folder', 'modal-board', 'modal-screen'];

describe('the three skins', () => {
  it('names every modal in the game, and nothing that is not one', () => {
    const named = Object.keys(MODAL_SKINS).sort();
    const known = [...Object.keys(MODAL_IS_FULL), ...LAYER_ONLY].sort();
    expect(named).toEqual(known);
  });

  it('gives every one of them exactly one of the three families, and the screen to the laptop only', () => {
    for (const [id, skin] of Object.entries(MODAL_SKINS)) {
      expect(['folder', 'board', 'screen'], id).toContain(skin);
    }
    // The laptop is the one computer in the game (CLAUDE.md T14 2.1).
    expect(Object.entries(MODAL_SKINS).filter(([, skin]) => skin === 'screen')).toEqual([
      ['laptop', 'screen'],
    ]);
  });

  it('puts that family on the modal the player opens, and exactly one skin class on it', () => {
    for (const [id, opener] of OPENERS) {
      goTo(id === 'shopping' || id === 'machineCard' ? 'hall' : 'office');
      click(opener);
      dismissEvents();
      const node = root().querySelector('.modal-layer .modal');
      expect(node?.getAttribute('data-modal'), id).toBe(id);
      const worn = SKIN_CLASSES.filter((name) => node?.classList.contains(name) ?? false);
      expect(worn, id).toEqual([`modal-${MODAL_SKINS[id] ?? ''}`]);
      click(`[data-modal="${id}"] [data-do="closeModal"]`);
    }
  });

  it('gives the company board the felt, and nothing else', () => {
    goTo('office');
    click('[data-office="company"]');
    dismissEvents();
    const node = root().querySelector('.modal-layer .modal');
    expect(node?.classList.contains('modal-felt')).toBe(true);
    click('[data-modal="company"] [data-do="closeModal"]');
    goTo('office');
    click('[data-office="workPlan"]');
    const plan = root().querySelector('.modal-layer .modal');
    expect(plan?.classList.contains('modal-felt')).toBe(false);
    click('[data-modal="workPlan"] [data-do="closeModal"]');
  });
});
