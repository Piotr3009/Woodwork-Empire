// @vitest-environment jsdom
// The hall's bag store on the floor: click the extractor and its own card says how full the bags
// are, with a small bar that goes red once they are full and the button that empties them; the
// chore carries the bags and the minutes in its name (CLAUDE.md T12 3.3, T17 2.6).

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

/** Everything on the open machine card, as one string. */
function card(): string {
  return root().querySelector('.modal-layer [data-modal="machineCard"]')?.textContent ?? '';
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

describe('the store on the extractor s own card', () => {
  it('reads the line and the bar when the extractor is clicked, and the bar fills with the store', () => {
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(card()).toContain('Bags 0 / 1 m³');
    expect(gauge()).toEqual({ full: false, width: '0%' });
    // The card is drawn off the state, so it moves as the saws run.
    game().bagFillM3 = 0.4;
    render();
    expect(card()).toContain('Bags 0.4 / 1 m³');
    expect(gauge()).toEqual({ full: false, width: '40%' });
    fillBags(game());
    render();
    expect(card()).toContain('Bags 1 / 1 m³');
    expect(gauge()).toEqual({ full: true, width: '100%' });
  });

  it('asks who empties them from the button on the card, in one event for the hall', () => {
    fillBags(game());
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(card()).toContain('Empty bags');
    click('.modal-layer [data-do="emptyBags"]');
    expect(game().activeEvent?.title).toBe('Bags full in the workshop');
    expect(root().innerHTML).toContain('Bags full in the workshop');
    // Left stopped, the chore stays on the owner's list under its full name.
    Object.assign(game(), choose(game(), 'later'));
    render();
    expect(game().activeEvent).toBeNull();
    const tasks = renderLaptop(game(), { page: 'tasks', stockSheets: '', teamTab: 'workshop', tickedTasks: [] });
    expect(tasks).toContain(`Empty the bags (1 bag, ${BAG_CHANGE_MINUTES} min)`);
  });

  it('goes when another machine is clicked: one card, and it is that machine s', () => {
    Object.assign(game(), act(game(), { type: 'ASK_EMPTY_BAGS' }));
    Object.assign(game(), choose(game(), 'later'));
    game().bagFillM3 = 0.2;
    render();
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(gauge()).not.toBeNull();
    // From Turn 17 a click on a machine opens that machine's own card (CLAUDE.md T17 2.6), and
    // the saw's card carries no bags.
    click(`[data-kit="${kitId('tableSaw')}"]`);
    expect(root().querySelector('.modal-layer [data-modal="machineCard"]')).not.toBeNull();
    expect(card()).toContain('Table saw');
    expect(gauge()).toBeNull();
  });
});
