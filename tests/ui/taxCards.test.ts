/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// The taxman on the page (CLAUDE.md T27 2.2, 2.3; docs/mockups/t27): the two cards in the event
// modal's small folder with the one cross, the strip's line in December, and December's report
// with its Tax line. What each rule is, is held by tests/engine/tax.test.ts; this is the drawing.

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { DAY_END_MINUTE } from '../../src/engine/constants';
import { applyAction } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';

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

/** The open event modal's title, or nothing. */
function eventTitle(): string {
  return root().querySelector('[data-modal="event"] .modal-head h2')?.textContent ?? '';
}

/** Answers the cards on the page until the one with this title is up, or there are none left. */
function answerUntil(title: string): void {
  let guard = 0;
  while (eventTitle() !== title && guard < 40) {
    const button = root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    if (button === null) return;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    guard += 1;
  }
}

/** Five o'clock of this day with this much in the account, and home: the next morning's cards. */
function homeFrom(day: number, cash: number): void {
  answerUntil('');
  game().clock.day = day;
  game().clock.minute = DAY_END_MINUTE;
  game().monthEndShownFor = Math.floor((day - 1) / 30) + 1;
  game().cash = cash;
  Object.assign(game(), applyAction(game(), { type: 'END_DAY' }));
  render();
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  answerUntil('');
});

describe('the tax on the page (CLAUDE.md T27 2.2, 2.3)', () => {
  it('puts Tax is coming in the small folder with the cross on the first working day of December', () => {
    homeFrom(270, 48000);
    answerUntil('Tax is coming');
    const modal = root().querySelector('[data-modal="event"]');
    expect(eventTitle()).toBe('Tax is coming');
    expect(modal?.classList.contains('modal-folder')).toBe(true);
    expect(modal?.classList.contains('modal-wide')).toBe(false);
    expect(modal?.querySelector(':scope > .modal-close')).not.toBeNull();
    expect(modal?.querySelector('.event-body')?.textContent).toMatch(
      /^On 30 December the taxman takes 25% of whatever is in the account: £[\d,]+ as it stands today\. Money spent on machines or on the workshop before then is not taxed\. Invest, or pay\.$/,
    );
    expect(Array.from(modal?.querySelectorAll('.choices .btn') ?? []).map((button) => button.textContent)).toEqual(['Right']);
  });

  it('says the tax on the strip under the bar once the card is answered', () => {
    answerUntil('');
    game().cash = 48000;
    render();
    const strip = root().querySelector('.warning-strip');
    expect(strip?.getAttribute('data-warning')).toBe('taxComing');
    expect(strip?.textContent).toBe('Tax on 30 December: 25% of the account, £12,000 as it stands');
  });

  it('puts Tax for 2025 up after the open of 30 December, and December s report has its line', () => {
    homeFrom(299, 48000);
    answerUntil('Tax for 2025');
    const modal = root().querySelector('[data-modal="event"]');
    expect(eventTitle()).toBe('Tax for 2025');
    expect(modal?.classList.contains('modal-wide')).toBe(false);
    expect(modal?.querySelector(':scope > .modal-close')).not.toBeNull();
    expect(modal?.querySelector('.event-body')?.textContent).toBe(
      'The taxman took 25% of the £48,000 in the account: £12,000.',
    );
    answerUntil('Month 10: the report');
    const report = root().querySelector('[data-modal="event"] .month-line[data-line="tax"]');
    expect(report?.querySelector('.row-main')?.textContent).toBe('Tax');
    expect(Array.from(report?.querySelectorAll('.row-figure') ?? []).map((figure) => figure.textContent)).toEqual([
      '£0',
      '-£12,000',
      '-£12,000',
    ]);
    expect(root().querySelector('.topbar .date')?.textContent).toMatch(/^Mon 2 January 2026 · /);
  });
});
