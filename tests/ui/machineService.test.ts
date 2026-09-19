// @vitest-environment jsdom
// The Service button of the Machines page, pressed once (PIOTR, 18.09; CLAUDE.md T20 2.9.2,
// 2.9.3). The rule replaces Turn 8's half hour at the spanner: the service is "paid when called"
// and the machine is "out for one working day from the call", so the press pays and takes the
// machine out in the same minute and there is no task for anybody to stand at. B3's review asked
// for this test, because all three places are in `src/engine/game.ts` (REPORT-T20.md, T20-C1).

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES } from '../../src/engine/constants';
import { nextWorkingDay } from '../../src/engine/clock';
import { serviceCostFor } from '../../src/engine/machines';
import { rolesForTask } from '../../src/engine/tasks';
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

function theSaw(state: GameState): Equipment {
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('no saw in the hall');
  return saw;
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
});

beforeEach(() => {
  const fresh = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  fresh.enquiries = [];
  Object.assign(game(), fresh);
  render();
});

describe('calling a service in from the Machines page (CLAUDE.md T20 2.9)', () => {
  it('pays for it and takes the machine out in the minute the button is pressed', () => {
    // The laptop is opened the way the player opens it, and then the Machines tile.
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    dismissEvents();
    click('[data-modal="laptop"] [data-tile="machines"]');
    const saw = theSaw(game());
    const price = serviceCostFor(saw);
    const cash = game().cash;
    const day = game().clock.day;
    const button = root().querySelector(`[data-machine="${saw.id}"] [data-do="serviceMachine"]`);
    expect(button?.textContent).toContain('Service');
    click(`[data-machine="${saw.id}"] [data-do="serviceMachine"]`);
    // One click, and in the same minute: the money is gone, the machine is away until the next
    // working day, the service is counted and nothing is left on anybody's list.
    const after = theSaw(game());
    expect(cash - game().cash).toBeCloseTo(price, 6);
    expect(after.inServiceUntilDay).toBe(nextWorkingDay(day));
    expect(after.serviceCount).toBe(1);
    expect(game().tasks.some((task) => task.kind === 'service' && !task.done)).toBe(false);
    click('.modal-layer [data-do="closeModal"]');
  });

  it('leaves nobody on the books eligible to work a service off', () => {
    // A service task nobody can take must not offer a Start on the Tasks page: it is paid for at
    // the call, not worked off, so the eligible and the auto lists are both empty. What the
    // reminder card offers instead ("Call it in", and "Leave it") is asserted in
    // `tests/engine/machines.test.ts`.
    expect(rolesForTask('service').eligible).toEqual([]);
    expect(rolesForTask('service').auto).toEqual([]);
  });
});
