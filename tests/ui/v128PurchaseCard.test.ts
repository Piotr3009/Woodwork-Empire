// @vitest-environment jsdom
/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v128: how far ahead the purchase manager buys is set on his own card [PIOTR, 26.10: "set to 2
// days, a week, to full: best set on him by the player"]: three chips, the one set lit, nothing of
// it on anybody else's card, and one click on a chip sets it, through the page.

import { describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES, PURCHASE_MANAGER_MONTHLY_WAGE } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { renderPerson } from '../../src/ui/personCard';
import { act, buyStartingKit, newGame, testJoiner } from '../helpers';

function manager(): Worker {
  return { ...testJoiner('pm-1', 'Pat'), role: 'purchaseManager', tier: null, rate: 0, monthlyWage: PURCHASE_MANAGER_MONTHLY_WAGE };
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

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

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

describe('the purchase manager s card (v128)', () => {
  it('carries the three settings, the one set lit, and nobody else s card carries them', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.workers.push(manager(), { ...testJoiner('adm-1', 'Anna'), role: 'officeAdmin', tier: null, rate: 0, monthlyWage: 2000 });
    const card = parse(renderPerson(state, 'pm-1', 'card'));
    const chips = Array.from(card.querySelectorAll('[data-purchase-cover] [data-do="setPurchaseCover"]'));
    expect(chips.map((chip) => [chip.getAttribute('data-id'), chip.textContent])).toEqual([
      ['twoDays', 'two days'],
      ['week', 'a week'],
      ['full', 'full stores'],
    ]);
    expect(card.querySelector('[data-purchase-cover]')?.textContent).toContain('Orders at noon for:');
    expect(card.querySelector('[data-purchase-cover] .chip.is-on')?.getAttribute('data-id')).toBe('twoDays');
    const week = act(state, { type: 'SET_PURCHASE_COVER', cover: 'week' });
    const lit = parse(renderPerson(week, 'pm-1', 'card')).querySelector('[data-purchase-cover] .chip.is-on');
    expect(lit?.getAttribute('data-id')).toBe('week');
    expect(parse(renderPerson(state, 'adm-1', 'card')).querySelector('[data-purchase-cover]')).toBeNull();
    // On the card only: the row of Our team stays a row.
    expect(parse(renderPerson(state, 'pm-1', 'row')).querySelector('[data-purchase-cover]')).toBeNull();
  });

  it('is set by one click on a chip, from his row on Our team', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    click('[data-do="setSpeed"][data-speed="1"]');
    dismissEvents();
    const state = game();
    Object.assign(state, buyStartingKit(state));
    state.workers.push(manager());
    render();
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    dismissEvents();
    click('[data-modal="laptop"] [data-tile="team"]');
    click('[data-modal="laptop"] [data-do="teamTab"][data-id="ourTeam"]');
    click('[data-modal="laptop"] [data-do="teamTrade"][data-id="purchaseManager"]');
    click('[data-do="openPersonCard"][data-id="pm-1"]');
    expect(root().querySelector('[data-purchase-cover] .chip.is-on')?.getAttribute('data-id')).toBe('twoDays');
    click('[data-purchase-cover] [data-do="setPurchaseCover"][data-id="full"]');
    expect(game().settings.purchaseCover).toBe('full');
    expect(root().querySelector('[data-purchase-cover] .chip.is-on')?.getAttribute('data-id')).toBe('full');
    click('[data-purchase-cover] [data-do="setPurchaseCover"][data-id="week"]');
    expect(game().settings.purchaseCover).toBe('week');
  });
});
