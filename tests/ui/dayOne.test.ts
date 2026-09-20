// @vitest-environment jsdom
// "At the top of the catalogue, a list of what to buy on day one" (PIOTR, 15.09;
// CLAUDE.md T11 3.6).

import { beforeAll, describe, expect, it } from 'vitest';
import { DAY_ONE_KIT, DAY_ONE_SOFTWARE } from '../../src/engine/constants';
import { dayOneComplete, dayOneKit } from '../../src/engine/orders';
import { findSpec } from '../../src/engine/machines';
import { renderCatalogue } from '../../src/ui/catalogue';
import { currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import { STARTING_KIT, buyNow, buyStartingKit, newGame, softwareNow } from '../helpers';

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

/** The catalogue as it is drawn on one tab. */
function shop(state: GameState, tab = 'computers'): HTMLElement {
  return parse(renderCatalogue(state, '', tab as never));
}

/** Everything on the list bought and paid for. The day 1 shopping of the test helpers buys the
 *  same eleven things and the licence with them, in an order the prerequisites allow: the hand
 *  edgebander goes in a tool cabinet, so the cabinet is bought before it. */
function fullyKitted(): GameState {
  return buyStartingKit(newGame({ difficulty: 'veryEasy' }));
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  let guard = 0;
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
  render();
});

describe('the day one list', () => {
  it('is eleven things, in one constant, and every one of them is real', () => {
    // Twelve until Turn 23 took the cordless drill out of the game (PIOTR, 20.09;
    // CLAUDE.md T23 2.5).
    expect(DAY_ONE_KIT).toHaveLength(11);
    // The same ten machines the day 1 shopping buys, and the licence with them.
    expect([...DAY_ONE_KIT].filter((id) => id !== DAY_ONE_SOFTWARE).sort()).toEqual(
      [...STARTING_KIT].sort(),
    );
    for (const id of DAY_ONE_KIT) {
      if (id === DAY_ONE_SOFTWARE) continue;
      expect(findSpec(id), id).not.toBeUndefined();
    }
    expect([...DAY_ONE_KIT]).toEqual([
      'desk',
      'chair',
      'laptop',
      DAY_ONE_SOFTWARE,
      'tableSaw',
      'edgebander',
      'compressor',
      'extractor',
      'workbench',
      'toolCabinet',
      'sheetRack',
    ]);
  });

  it('lists all eleven at the top of the catalogue, on every tab', () => {
    const state = newGame();
    for (const tab of ['computers', 'sheetMachines', 'storage']) {
      const page = shop(state, tab);
      const card = page.querySelector('[data-checklist="dayOne"]');
      expect(card, tab).not.toBeNull();
      expect(card?.querySelectorAll('.checklist-item'), tab).toHaveLength(11);
    }
  });

  it('ticks a thing that is bought, and one that is only on the road', () => {
    const state = newGame();
    expect(dayOneKit(state).every((item) => !item.done)).toBe(true);
    const bought = buyNow(state, 'desk');
    const ticked = dayOneKit(bought).filter((item) => item.done).map((item) => item.id);
    expect(ticked).toEqual(['desk']);
    const page = shop(bought);
    const desk = page.querySelector('[data-kit="desk"]');
    expect(desk?.classList.contains('is-done')).toBe(true);
    expect(page.querySelector('[data-kit="chair"]')?.classList.contains('is-done')).toBe(false);
    // The licence is not a machine and is ticked by its own question.
    expect(dayOneKit(softwareNow(buyNow(bought, 'laptop'), 'oneOff'))
      .find((item) => item.id === DAY_ONE_SOFTWARE)?.done).toBe(true);
  });

  it('opens that thing s folder when the line is clicked, from any tab', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="catalogue"]');
    // Standing on the Office tab, the line for the saw opens the saw's folder on its own tab.
    click('[data-do="dayOneItem"][data-id="tableSaw"]');
    expect(root().querySelector('[data-do="closeFolder"]')).not.toBeNull();
    expect(root().innerHTML).toContain('data-do="buyEquipment" data-id="tableSaw"');
    click('[data-do="closeFolder"]');
    // And the licence line puts him on the tab the licence lives on.
    click('[data-do="dayOneItem"][data-id="software"]');
    expect(
      root().querySelector('[data-do="catalogueTab"][data-id="computers"]')?.className,
    ).toContain('is-on');
    expect(root().innerHTML).toContain('Management software');
    click('[data-modal="catalogue"] [data-do="closeModal"]');
  });

  it('collapses to one line when the last of it is ticked, and stays collapsed', () => {
    const kitted = fullyKitted();
    expect(dayOneComplete(kitted)).toBe(true);
    const page = shop(kitted);
    const card = page.querySelector('[data-checklist="dayOne"]');
    expect(card?.classList.contains('is-done')).toBe(true);
    expect(card?.textContent).toBe('Day one kit complete');
    expect(card?.querySelectorAll('.checklist-item')).toHaveLength(0);
    // On every tab, and with no way to open it again: it is done.
    expect(shop(kitted, 'storage').querySelector('.checklist-item')).toBeNull();
    expect(page.querySelector('[data-do="expandChecklist"]')).toBeNull();
  });
});
