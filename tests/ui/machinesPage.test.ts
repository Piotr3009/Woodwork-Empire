// @vitest-environment jsdom
// The Machines page of the laptop (PIOTR; CLAUDE.md T20 2.9): one row per machine and extractor
// standing in the hall, its picture small, its class, the bar of its life with the figures under
// it, and Service with its price on the row.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES, SERVICE_INTERVAL_HOURS } from '../../src/engine/constants';
import { serviceCostFor, serviceMachine } from '../../src/engine/machines';
import { formatMoney } from '../../src/engine/index';
import { LIFE_LOW_FRACTION, machinesInTheHall, renderMachinesPage } from '../../src/ui/machinesPage';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

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

function hall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  return state;
}

function theSaw(state: GameState): Equipment {
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('no saw in the hall');
  return saw;
}

/** The page as a document, so a row can be read by its parts and not by a substring. */
function page(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderMachinesPage(state);
  return holder;
}

function rowOf(state: GameState, id: string): HTMLElement {
  const row = page(state).querySelector(`[data-machine="${id}"]`);
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

describe('the Machines page (CLAUDE.md T20 2.9)', () => {
  it('has one row for every machine and extractor standing in the hall, and nothing else', () => {
    const state = hall();
    const rows = Array.from(page(state).querySelectorAll('[data-machine]')).map((row) =>
      row.getAttribute('data-machine'),
    );
    expect(rows).toEqual(machinesInTheHall(state).map((item) => item.id));
    expect(rows).toContain(theSaw(state).id);
    // The desk, the chair, the laptop, the rack and the bench are fittings, not plant.
    for (const specId of ['desk', 'chair', 'laptop', 'sheetRack', 'workbench']) {
      const item = state.equipment.find((entry) => entry.specId === specId);
      if (item) expect(rows).not.toContain(item.id);
    }
  });

  it('carries the picture small, the name and the class on the row', () => {
    const state = hall();
    const row = rowOf(state, theSaw(state).id);
    const picture = row.querySelector('.tile-picture');
    expect(picture?.classList.contains('is-small')).toBe(true);
    expect(picture?.getAttribute('data-sprite')).toBe('tableSaw');
    expect(row.querySelector('.row-main')?.textContent).toContain('Table saw');
    expect(row.querySelector('.row-main')?.textContent).toContain('Used table saw');
  });

  it('draws the bar of its life with the hours under it, and turns it red under a tenth left', () => {
    const state = hall();
    const saw = theSaw(state);
    saw.hoursUsed = saw.enduranceHours / 2;
    const half = rowOf(state, saw.id);
    const fill = half.querySelector('.contract-fill');
    expect(fill?.getAttribute('style')).toBe('width:50%');
    expect(fill?.classList.contains('is-low')).toBe(false);
    expect(half.querySelector('.row-figure')?.textContent).toBe(
      `${(saw.enduranceHours / 2).toLocaleString('en-GB')} of ${saw.enduranceHours.toLocaleString('en-GB')} h`,
    );
    // Under a tenth of the life left, and the bar is the bad colour.
    saw.hoursUsed = saw.enduranceHours * (1 - LIFE_LOW_FRACTION / 2);
    expect(rowOf(state, saw.id).querySelector('.contract-fill')?.classList.contains('is-low')).toBe(
      true,
    );
    // And the bar never runs past its own end.
    saw.hoursUsed = saw.enduranceHours * 2;
    expect(rowOf(state, saw.id).querySelector('.contract-fill')?.getAttribute('style')).toBe(
      'width:100%',
    );
  });

  it('puts Service with its price on the row, and says past its life when it is', () => {
    const state = hall();
    const saw = theSaw(state);
    const action = rowOf(state, saw.id).querySelector('.row-action');
    const button = action?.querySelector('[data-do="serviceMachine"]');
    expect(button?.getAttribute('data-id')).toBe(saw.id);
    expect(button?.textContent).toContain(formatMoney(serviceCostFor(saw)));
    // What it buys is on the button itself, so the price has something to be weighed against.
    expect(button?.getAttribute('title')).toContain('more hours of life');
    saw.hoursUsed = saw.enduranceHours + 1;
    expect(rowOf(state, saw.id).querySelector('.row-main')?.textContent).toContain('past its life');
  });

  it('says in service instead of offering it again while the machine is away', () => {
    const state = hall();
    const saw = theSaw(state);
    serviceMachine(state, saw.id);
    const row = rowOf(state, saw.id);
    expect(row.querySelector('.row-main')?.textContent).toContain('in service');
    expect(row.querySelector('[data-do="serviceMachine"]')).toBeNull();
    expect(row.querySelector('.reason')?.textContent).toBe('In service');
  });

  it('says broken, and service due, in the same place', () => {
    const state = hall();
    const saw = theSaw(state);
    saw.hoursUsed = SERVICE_INTERVAL_HOURS;
    expect(rowOf(state, saw.id).querySelector('.row-main')?.textContent).toContain('service due');
    saw.broken = true;
    const row = rowOf(state, saw.id);
    expect(row.querySelector('.row-main')?.textContent).toContain('broken');
    expect(row.querySelector('[data-do="serviceMachine"]')).toBeNull();
    expect(row.querySelector('.reason')?.textContent).toBe('It is broken. Fix it first');
  });

  it('is behind the Machines tile of the laptop, with the page head every page has', () => {
    // The laptop is opened the way the player opens it: the office, the laptop on the desk, the
    // lid's five minutes, then the tile (CLAUDE.md T7 3.10, T15 2.3).
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    let guard = 0;
    while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      guard += 1;
    }
    click('[data-modal="laptop"] [data-tile="machines"]');
    const laptop = root().querySelector('[data-laptop-page="machines"]');
    expect(laptop).not.toBeNull();
    expect(laptop?.querySelector('.screen-page-title')?.textContent).toBe('Machines');
    expect(laptop?.querySelector('.screen-back')).not.toBeNull();
    expect(laptop?.querySelectorAll('[data-machine]').length).toBe(
      machinesInTheHall(game()).length,
    );
    click('.modal-layer [data-do="closeModal"]');
  });
});
