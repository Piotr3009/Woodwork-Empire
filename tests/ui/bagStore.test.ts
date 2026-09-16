// @vitest-environment jsdom
// The hall's bag store on the floor: click the extractor and the line under the hall says how
// full the bags are, with a small bar that goes red once they are full; the chore to empty them
// carries the bags and the minutes in its name (CLAUDE.md T12 3.3).

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { renderLaptop } from '../../src/ui/laptop';
import { BAG_CHANGE_MINUTES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, choose, fillBags } from '../helpers';

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

function kitId(specId: string): string {
  const item = game().equipment.find((entry) => entry.specId === specId);
  if (item === undefined) throw new Error(`no ${specId} in the hall`);
  return item.id;
}

/** Every line under the hall, the hall's own state line included, as one string. */
function notes(): string {
  return Array.from(root().querySelectorAll('.view-note'))
    .map((element) => element.textContent ?? '')
    .join(' | ');
}

function gauge(): { full: boolean; width: string } | null {
  const bar = root().querySelector('.bag-gauge');
  const fill = root().querySelector('.bag-gauge-fill');
  if (!(bar instanceof HTMLElement) || !(fill instanceof HTMLElement)) return null;
  return { full: bar.classList.contains('is-full'), width: fill.style.width };
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  Object.assign(game(), buyStartingKit(game()));
  render();
});

describe('the store under the hall', () => {
  it('reads the line and the bar when the extractor is clicked, and the bar fills with the store', () => {
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(notes()).toContain('Bags 0 / 1 m³');
    expect(gauge()).toEqual({ full: false, width: '0%' });
    // The note is drawn off the state, so it moves as the saws run.
    game().bagFillM3 = 0.4;
    render();
    expect(notes()).toContain('Bags 0.4 / 1 m³');
    expect(gauge()).toEqual({ full: false, width: '40%' });
    fillBags(game());
    render();
    expect(notes()).toContain('Bags 1 / 1 m³');
    expect(gauge()).toEqual({ full: true, width: '100%' });
  });

  it('asks who empties them when the extractor is clicked full, in one event for the hall', () => {
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(game().activeEvent?.title).toBe('Bags full in the workshop');
    expect(root().innerHTML).toContain('Bags full in the workshop');
    // Left stopped, the chore stays on the owner's list under its full name.
    Object.assign(game(), choose(game(), 'later'));
    render();
    expect(game().activeEvent).toBeNull();
    const tasks = renderLaptop(game(), { page: 'tasks', stockSheets: '', teamTab: 'workshop' });
    expect(tasks).toContain(`Empty the bags (1 bag, ${BAG_CHANGE_MINUTES} min)`);
  });

  it('gives way to any other note, so the store never lingers under the wrong click', () => {
    Object.assign(game(), act(game(), { type: 'ASK_EMPTY_BAGS' }));
    Object.assign(game(), choose(game(), 'later'));
    game().bagFillM3 = 0.2;
    render();
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(gauge()).not.toBeNull();
    click(`[data-kit="${kitId('tableSaw')}"]`);
    expect(notes()).toContain('of use on the clock');
    expect(gauge()).toBeNull();
  });
});
