// @vitest-environment jsdom
// One cross to close everything (PIOTR, 17.09; CLAUDE.md T18 2.5). Every modal, every page and
// every card is shut by the cross the Company board has: the same helper writes it, the same
// class carries it, and the three skins' own crosses, the catalogue's little dark one among them,
// are gone.

import { beforeAll, describe, expect, it } from 'vitest';
import { MODAL_IS_FULL, currentState, mount, render } from '../../src/ui/app';
import { closeButton } from '../../src/ui/modal';
import { STATION_IDLE } from '../../src/engine/stations';
import { renderMenu } from '../../src/ui/topbar';
import { newGame, buyNow } from '../helpers';
import { readFileSync } from 'node:fs';

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
  while (
    root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null &&
    guard < 50
  ) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

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

/** Every ModalId the player can open, and what opens it. The table is checked against
 *  `MODAL_IS_FULL`, which is the one list of the ids, so a new modal cannot be added without a
 *  line here. */
const OPENERS: Array<[string, string]> = [
  ['workPlan', '[data-office="workPlan"]'],
  ['board', '[data-office="orders"]'],
  ['catalogue', '[data-office="catalogue"]'],
  ['accounting', '[data-office="binder"]'],
  ['shopping', '[data-do="openModal"][data-modal="shopping"]'],
  ['company', '[data-office="company"]'],
  ['laptop', '[data-office="laptop"]'],
  ['settings', '[data-do="openSettings"]'],
  ['machineCard', '.hall-view [data-sprite="tableSaw"]'],
  // A click on a man on the hall opens his card. The owner is the one figure there is always one
  // of (PIOTR, 20.09; CLAUDE.md T23 2.13).
  ['personCard', '[data-owner="1"]'],
];

const CSS = readFileSync('src/ui/styles.css', 'utf8');

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

describe('the one cross (CLAUDE.md T18 2.5)', () => {
  it('opens every ModalId in the game, and nothing that is not one', () => {
    expect(OPENERS.map(([id]) => id).sort()).toEqual(Object.keys(MODAL_IS_FULL).sort());
  });

  it('gives each of them exactly one .modal-close, and the same markup for every one', () => {
    const wanted = closeButton();
    for (const [id, opener] of OPENERS) {
      goTo(
        id === 'shopping' || id === 'machineCard' || id === 'settings' || id === 'personCard'
          ? 'hall'
          : 'office',
      );
      if (id === 'personCard') ownerOntoTheFloor();
      click(opener);
      dismissEvents();
      const modal = root().querySelector(`.modal-layer [data-modal="${id}"]`);
      expect(modal, id).not.toBeNull();
      const crosses = Array.from(modal?.querySelectorAll('.modal-close') ?? []);
      expect(crosses.length, id).toBe(1);
      expect(crosses[0]?.outerHTML, id).toBe(wanted);
      // The modal's own last child, not the head's: three of the skins place their head, and a
      // cross hung off a placed head lands somewhere different on each of them.
      expect(modal?.lastElementChild, id).toBe(crosses[0]);
      click(`[data-modal="${id}"] .modal-close`);
      expect(root().querySelector(`.modal-layer [data-modal="${id}"]`), id).toBeNull();
    }
  });

  it("is the Menu's way out too, with the one action that differs", () => {
    const holder = document.createElement('div');
    holder.innerHTML = renderMenu(newGame(), { available: false, signedIn: null });
    expect(holder.querySelectorAll('.modal-close')).toHaveLength(1);
    expect(holder.querySelector('.modal-close')?.outerHTML).toBe(closeButton('closeMenu'));
  });

  it('is one rule in the stylesheet, and no skin has a cross of its own', () => {
    // The look is on `.modal-close` and nowhere else: the folder's dark cross, the board's pale
    // one, the screen's grey one and the felt's disc rule are all gone.
    for (const gone of [
      '.modal-folder .modal-close {',
      '.modal-board .modal-close {',
      '.modal-screen .modal-close {',
      '.modal-felt .modal-close {',
      '.menu-close {',
    ]) {
      expect(CSS, gone).not.toContain(gone);
    }
    // And the markup is written in one place: `closeButton`, which is the only thing in the
    // source that spells the class.
    const inSource = ['src/ui/modal.ts', 'src/ui/topbar.ts', 'src/ui/app.ts', 'src/ui/catalogue.ts']
      .filter((path) => readFileSync(path, 'utf8').includes('class="modal-close"'));
    expect(inSource).toEqual(['src/ui/modal.ts']);
    // One place sets how far it hangs off, so no skin can hang it somewhere of its own. Measured
    // against the running page at 1280 by 800, every modal reads the same 54 px disc and the same
    // 11 px of overhang, to the pixel a skin's own border takes off it (REPORT-T18.md).
    expect(CSS.match(/--close-out:/g)).toHaveLength(1);
    expect(CSS.match(/--close-disc:/g)).toHaveLength(1);
  });
});
