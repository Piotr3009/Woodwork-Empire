/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v105 on the page [PIOTR, 18.10]: the Replace button on a machine whose life bar is red, on its row
// of the Machines page and on its own card, the day the new one comes once it is ordered; the store
// behind the wall made twice the size from its own card; and the store made bigger drawn red.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LIFE_LOW_FRACTION } from '../../src/engine/constants';
import { formatCalendarDay } from '../../src/engine/clock';
import { formatMoney } from '../../src/engine/economy';
import { rearYardPlaceFor } from '../../src/engine/layout';
import { replacementPrice } from '../../src/engine/renewal';
import type { Equipment, GameState } from '../../src/engine/index';
import { hallScene } from '../../src/render/hall';
import { currentState, mount, render } from '../../src/ui/app';
import { renderMachineCard } from '../../src/ui/machineCard';
import { renderMachinesPage } from '../../src/ui/machinesPage';
import { act, buyStartingKit, newGame, placeEquipment } from '../helpers';

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

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

/** The starting hall with its saw near the end of its life and a timber shelter behind the wall. */
function hall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 2000000;
  state.enquiries = [];
  state.activeEvent = null;
  state.eventQueue = [];
  const saw = sawOf(state);
  saw.hoursUsed = saw.enduranceHours * (1 - LIFE_LOW_FRACTION / 2);
  const at = rearYardPlaceFor(state, 'timberShelter');
  if (at === null) throw new Error('the shelter wants a place');
  placeEquipment(state, 'timberShelter', { x: at.x, y: at.y, id: 'kit-shelter' });
  return state;
}

function sawOf(state: GameState): Equipment {
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('no saw in the hall');
  return saw;
}

function html(markup: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  return holder;
}

function rowOf(state: GameState, id: string): HTMLElement {
  const row = html(renderMachinesPage(state)).querySelector(`[data-machine="${id}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${id}`);
  return row;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
});

beforeEach(() => {
  Object.assign(game(), hall());
  render();
});

describe('the Replace button (v105)', () => {
  it('is on the row of a machine whose bar is red, with the new one s price, and not on one with life left', () => {
    const state = hall();
    const saw = sawOf(state);
    const row = rowOf(state, saw.id);
    expect(row.querySelector('.contract-fill')?.classList.contains('is-low')).toBe(true);
    const button = row.querySelector('[data-do="replaceMachine"]');
    expect(button?.getAttribute('data-id')).toBe(saw.id);
    expect(button?.textContent).toBe(`Replace · ${formatMoney(replacementPrice(saw))}`);
    expect(button?.getAttribute('title')).toContain('in the same place');
    // The service is still offered beside it.
    expect(row.querySelector('[data-do="serviceMachine"]')).not.toBeNull();
    saw.hoursUsed = saw.enduranceHours / 2;
    expect(rowOf(state, saw.id).querySelector('[data-do="replaceMachine"]')).toBeNull();
  });

  it('is greyed with the reason when the cash is short', () => {
    const state = hall();
    const saw = sawOf(state);
    state.cash = state.finance.overdraftLimit;
    const locked = rowOf(state, saw.id).querySelector('button[disabled][title="Not enough cash"]');
    expect(locked?.textContent).toContain('Replace');
  });

  it('gives way to the day the new one comes once it is ordered, on the row and on the card', () => {
    const ordered = act(hall(), { type: 'REPLACE_MACHINE', equipmentId: sawOf(hall()).id });
    const saw = sawOf(ordered);
    const words = `New one on order, due ${formatCalendarDay(saw.replacementDay ?? 0)}`;
    const row = rowOf(ordered, saw.id);
    expect(row.querySelector('.row-action')?.textContent).toBe(words);
    expect(row.querySelector('[data-do="replaceMachine"], [data-do="serviceMachine"]')).toBeNull();
    const cardOf = html(renderMachineCard(ordered, saw.id, null));
    expect(cardOf.textContent).toContain(words);
    expect(cardOf.querySelector('[data-do="replaceMachine"]')).toBeNull();
  });

  it('orders the new one from the machine s own card', () => {
    const saw = sawOf(game());
    click(`[data-kit="${saw.id}"]`);
    const card = root().querySelector('.modal-layer [data-modal="machineCard"]');
    expect(card?.querySelector('[data-do="replaceMachine"]')).not.toBeNull();
    const before = game().cash;
    click('.modal-layer [data-modal="machineCard"] [data-do="replaceMachine"]');
    expect(game().cash).toBe(before - replacementPrice(saw));
    expect(sawOf(game()).replacementDay).toBeGreaterThan(game().clock.day);
    click('.modal-layer [data-do="closeModal"]');
  });
});

describe('the store made twice the size (v105)', () => {
  it('is offered on the store s own card for its price, and says what it holds once it is', () => {
    const state = hall();
    const card = html(renderMachineCard(state, 'kit-shelter', null));
    const button = card.querySelector('[data-do="expandStore"]');
    expect(button?.textContent).toBe(`Make it twice the size · ${formatMoney(18000)}`);
    expect(card.textContent).not.toContain('Made twice the size');
    const bigger = act(state, { type: 'EXPAND_STORE', equipmentId: 'kit-shelter' });
    const after = html(renderMachineCard(bigger, 'kit-shelter', null));
    expect(after.querySelector('[data-do="expandStore"]')).toBeNull();
    expect(after.textContent).toContain('Made twice the size: holds 800 boards');
    // Its picture on the card is red too, through the hall's filter under the card's own id.
    expect(card.querySelector('.tile-picture img')?.getAttribute('style')).toBeNull();
    expect(after.querySelector('.tile-picture img')?.getAttribute('style')).toBe('filter:url(#store-expanded-card)');
    expect(after.querySelector('filter#store-expanded-card')).not.toBeNull();
    // No such button on the saw.
    expect(html(renderMachineCard(state, sawOf(state).id, null)).querySelector('[data-do="expandStore"]')).toBeNull();
  });

  it('is made bigger by the click on its card', () => {
    click('[data-kit="kit-shelter"]');
    const before = game().cash;
    click('.modal-layer [data-modal="machineCard"] [data-do="expandStore"]');
    expect(game().cash).toBe(before - 18000);
    expect(game().equipment.find((item) => item.id === 'kit-shelter')?.expanded).toBe(true);
    click('.modal-layer [data-do="closeModal"]');
  });

  it('is drawn red on the hall through the one filter, and a store not made bigger is not', () => {
    const state = act(hall(), { type: 'EXPAND_STORE', equipmentId: 'kit-shelter' });
    const scene = hallScene(state);
    expect(scene.shell()).toContain('<filter id="store-expanded"');
    const live = html(`<svg>${scene.live}</svg>`);
    const shelter = live.querySelector('[data-kit="kit-shelter"]');
    expect(shelter?.querySelector('g[filter="url(#store-expanded)"]')).not.toBeNull();
    const plain = html(`<svg>${hallScene(hall()).live}</svg>`);
    expect(plain.querySelector('[data-kit="kit-shelter"] g[filter]')).toBeNull();
    // Its plate reads the room it has now.
    expect(shelter?.querySelector('title')?.textContent).toContain('/ 800');
  });
});
