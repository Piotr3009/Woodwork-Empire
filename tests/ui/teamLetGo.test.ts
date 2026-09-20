// @vitest-environment jsdom
// Our team carries the one control that ends a man's time here: Let go, on every worker's tile and
// never on the owner's. Once he has his notice the tile says the day he goes on instead
// (PIOTR, 18.09; CLAUDE.md T20 2.4). From Turn 23 Our team is a column of the tiles of 2.13, so
// the control is on a tile and no longer on a row, and the owner's carries Office in its place
// (CLAUDE.md T23 2.13).

import { beforeAll, describe, expect, it } from 'vitest';
import { formatCalendarDay } from '../../src/engine/index';
import { LAPTOP_BOOT_MINUTES, LET_GO_NOTICE_DAYS } from '../../src/engine/constants';
import { letGo } from '../../src/engine/staff';
import { renderTeam } from '../../src/ui/team';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function tile(state: GameState, id: string): HTMLElement | null {
  return parse(renderTeam(state, 'ourTeam')).querySelector(`[data-person="${id}"]`);
}

function withAJoiner(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  state.reputation = 20;
  return hireNow(state, 'joiner', 'experienced');
}

describe('Let go on Our team', () => {
  it('is on the man s tile and never on the owner s', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const control = tile(state, man.id)?.querySelector('[data-do="letGo"]');
    expect(control).not.toBeNull();
    expect(control?.getAttribute('data-id')).toBe(man.id);
    expect(control?.textContent).toBe('Let go');
    expect(tile(state, 'owner')?.querySelector('[data-do="letGo"]')).toBeNull();
    // The owner's one button is Office instead (CLAUDE.md T23 2.13).
    expect(tile(state, 'owner')?.querySelector('[data-do="openOffice"]')).not.toBeNull();
  });

  it('says the day he goes on once he has his notice, and offers no second click', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(letGo(state, man.id)).toBe(true);
    const leaving = tile(state, man.id);
    expect(leaving?.textContent).toContain(
      `leaves on ${formatCalendarDay(state.clock.day + LET_GO_NOTICE_DAYS)}`,
    );
    expect(leaving?.querySelector('[data-do="letGo"]')).toBeNull();
    expect(leaving?.querySelector('.reason')).not.toBeNull();
  });
});

describe('the Let go click, through the real DOM (CLAUDE.md T20 2.4)', () => {
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

  function dismissEvents(): void {
    let guard = 0;
    while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      guard += 1;
    }
  }

  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    Object.assign(game(), withAJoiner());
    game().speed = 0;
    render();
  });

  it('gives him his notice in one click, and the row says the day he goes on', () => {
    // The laptop, the Team page, Our team: the way the player reaches the row.
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    dismissEvents();
    click('[data-modal="laptop"] [data-tile="team"]');
    click('[data-modal="laptop"] [data-do="teamTab"][data-id="ourTeam"]');
    const man = game().workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(man.leavesOnDay).toBeNull();
    const day = game().clock.day;
    click(`[data-person="${man.id}"] [data-do="letGo"]`);
    const after = game().workers[0];
    expect(after?.leavesOnDay).toBe(day + LET_GO_NOTICE_DAYS);
    // The row has changed with him: the date instead of a second button.
    const leaving = root().querySelector(`[data-person="${man.id}"]`);
    expect(leaving?.textContent).toContain(`leaves on ${formatCalendarDay(day + LET_GO_NOTICE_DAYS)}`);
    expect(leaving?.querySelector('[data-do="letGo"]')).toBeNull();
  });
});
