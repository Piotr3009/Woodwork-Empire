// @vitest-environment jsdom
// When the owner goes home at the end of the day, the day end flow shows the house card first,
// for a few seconds or until a click, and then the summary; and the summary says what house he
// went home to and how the workshop did (PIOTR; CLAUDE.md T13 3.18, 3.5).

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HOUSE_CARD_SECONDS, HOUSE_TIER_NAMES } from '../../src/engine/constants';
import { houseTierFor } from '../../src/engine/index';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { houseLineFor, renderDayEnd } from '../../src/ui/dayEnd';
import { buyStartingKit, newGame, runClock } from '../helpers';

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

function eventModal(): Element | null {
  return root().querySelector('[data-modal="event"]');
}

/** Runs the clock to the house card, answering whatever else the day asks with its first
 *  choice, the way a player clicks on. */
function runToTheHouseCard(): void {
  for (let guard = 0; guard < 120; guard += 1) {
    if (root().querySelector('[data-do="closeHouseCard"]') !== null) return;
    const asked = root().querySelector('[data-do="resolveEvent"]');
    if (asked !== null) {
      asked.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      continue;
    }
    advanceMinutes(30);
  }
  throw new Error('the day never ended');
}

/** The real time the page reads, faked so the card's seconds can be made to pass. */
let realNow = 5000;

beforeAll(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => realNow);
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  expect(currentState()).not.toBeNull();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('going home, through the page', () => {
  it('shows the house card first, with the line and no way out but the click or the clock', () => {
    runToTheHouseCard();
    const modal = eventModal();
    expect(modal?.querySelector('.modal-head h2')?.textContent).toBe('Home');
    expect(modal?.querySelector('.house-card')).not.toBeNull();
    expect(modal?.textContent).toContain('Resting at home now. See you at the workshop in the morning.');
    // The card's own bubble, the first time, and no decision buttons and no cross: the card is
    // a still picture, not a question.
    expect(modal?.querySelector('[data-tip="house"]')).not.toBeNull();
    expect(modal?.querySelector('[data-do="resolveEvent"]')).toBeNull();
    expect(modal?.querySelector('.modal-close')).toBeNull();
    expect(modal?.textContent).not.toContain('Day 1 done');
  });

  it('goes to the summary on the click, and the summary carries the house and the efficiency', () => {
    click('[data-do="closeHouseCard"]');
    const modal = eventModal();
    expect(modal?.querySelector('[data-do="closeHouseCard"]')).toBeNull();
    expect(modal?.textContent).toContain('Day 1 done');
    const state = currentState();
    if (state === null) throw new Error('no game');
    const rows = Array.from(modal?.querySelectorAll('.row') ?? []).map((row) => [
      row.querySelector('.row-main')?.textContent,
      row.querySelector('.row-figure')?.textContent,
    ]);
    expect(rows).toContainEqual(['Home', HOUSE_TIER_NAMES[houseTierFor(state) - 1]]);
    expect(rows.some(([label]) => label === 'Efficiency')).toBe(true);
    // And the summary is a question with one answer, the way it always was.
    expect(modal?.querySelector('[data-do="resolveEvent"]')).not.toBeNull();
    click('[data-modal="event"] [data-do="resolveEvent"]');
    expect(currentState()?.clock.day).toBeGreaterThan(1);
  });

  it('goes to the summary by itself once the seconds have passed without a click', () => {
    runToTheHouseCard();
    expect(eventModal()?.querySelector('[data-do="closeHouseCard"]')).not.toBeNull();
    // The seconds pass on the real clock, and the next paint is the summary.
    realNow += HOUSE_CARD_SECONDS * 1000 + 1;
    render();
    const modal = eventModal();
    expect(modal?.querySelector('[data-do="closeHouseCard"]')).toBeNull();
    expect(modal?.textContent).toContain(`Day ${currentState()?.clock.day ?? 0} done`);
    click('[data-modal="event"] [data-do="resolveEvent"]');
  });

  it('keeps the card up while the seconds have not passed', () => {
    runToTheHouseCard();
    realNow += HOUSE_CARD_SECONDS * 1000 - 500;
    render();
    expect(eventModal()?.querySelector('[data-do="closeHouseCard"]')).not.toBeNull();
    click('[data-do="closeHouseCard"]');
    click('[data-modal="event"] [data-do="resolveEvent"]');
  });
});

describe('the house line on the summary', () => {
  it('is the name of the tier the ledger says, on the evening summary and not on a record', () => {
    const state = runClock(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
    expect(houseLineFor(state)).toBe(HOUSE_TIER_NAMES[houseTierFor(state) - 1]);
    const evening = parse(renderDayEnd(state));
    const home = Array.from(evening.querySelectorAll('.row')).find(
      (row) => row.querySelector('.row-main')?.textContent === 'Home',
    );
    expect(home?.querySelector('.row-figure')?.textContent).toBe(houseLineFor(state));
  });
});
