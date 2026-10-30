/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v131 [PIOTR, 28.10: "a code that adds a billion when I type it"]: `kasa` typed in the game,
// outside any field, puts a billion pounds into the account, on one line of the books.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount } from '../../src/ui/app';
import { CHEAT_CASH_AMOUNT } from '../../src/engine/constants';

function app(): HTMLElement {
  const found = document.querySelector<HTMLElement>('#app');
  if (found === null) throw new Error('no app');
  return found;
}

function type(text: string): void {
  for (const key of text) window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(app());
  app().querySelector<HTMLElement>('[data-do="startGame"]')?.click();
});

afterAll(() => {
  document.body.innerHTML = '';
});

describe('the cheat kasa (v131)', () => {
  it('adds a billion pounds on one line of the books, each time it is typed', () => {
    const before = currentState()?.cash ?? 0;
    type('kasa');
    const state = currentState();
    expect(state?.cash).toBe(before + CHEAT_CASH_AMOUNT);
    expect(state?.ledger.at(-1)).toMatchObject({ category: 'other', label: 'Cheat: kasa', amount: CHEAT_CASH_AMOUNT });
    type('xkasa');
    expect(currentState()?.cash).toBe(before + 2 * CHEAT_CASH_AMOUNT);
  });

  it('does nothing for other letters, or while a field has the caret', () => {
    const before = currentState()?.cash ?? 0;
    type('kas');
    type('b');
    expect(currentState()?.cash).toBe(before);
    const field = document.createElement('input');
    app().appendChild(field);
    field.focus();
    type('kasa');
    expect(currentState()?.cash).toBe(before);
    field.remove();
  });
});
