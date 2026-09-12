// @vitest-environment jsdom
// Every region of the room does what docs/art/SPRITES.md 8.2 and 8.4 say it does, and the four
// laptop tabs are the one path to the modals that lost their desk item (CLAUDE.md T4 3.1).

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount } from '../../src/ui/app';
import { OFFICE_REGIONS } from '../../src/render/office';
import { STARTING_KIT } from '../helpers';

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

function html(): string {
  return root().innerHTML;
}

function openModalId(): string | null {
  return root().querySelector('.modal-layer .modal')?.getAttribute('data-modal') ?? null;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setView"][data-view="office"]');
  click('[data-office="catalogue"]');
  for (const specId of STARTING_KIT) {
    const choose = root().querySelector(`[data-do="openMachine"][data-id="${specId}"]`);
    if (choose === null) {
      click(`[data-do="buyEquipment"][data-id="${specId}"]`);
      continue;
    }
    click(`[data-do="openMachine"][data-id="${specId}"]`);
    click(`[data-modal="machine"] [data-do="buyEquipment"][data-id="${specId}"]`);
    click('[data-modal="machine"] [data-do="closeModal"]');
  }
  click('[data-do="buySoftware"][data-id="oneOff"]');
  click('[data-do="closeModal"]');
});

describe('what each region of the room opens', () => {
  it('has all seven regions on the page', () => {
    for (const region of OFFICE_REGIONS) {
      expect(html(), region.id).toContain(`data-office="${region.id}"`);
    }
  });

  it('opens the right modal from each board and object, and the door goes to the hall', () => {
    for (const [region, modal] of [
      ['workPlan', 'workPlan'],
      ['orders', 'board'],
      ['laptop', 'laptop'],
      ['catalogue', 'catalogue'],
      ['binder', 'accounting'],
    ]) {
      click(`[data-office="${region}"]`);
      expect(openModalId(), region).toBe(modal);
      click('[data-do="closeModal"]');
      expect(openModalId(), region).toBeNull();
    }
    click('[data-office="door"]');
    expect(html()).toContain('hall-view');
    expect(html()).not.toContain('office-room');
    click('[data-do="setView"][data-view="office"]');
    expect(html()).toContain('office-room');
  });

  it('leaves the clock alone: it is the live clock and opens nothing', () => {
    click('[data-office="clock"]');
    expect(openModalId()).toBeNull();
    expect(html()).toContain('office-room');
  });

  it('shows the game time and the company name on the artwork', () => {
    const state = currentState();
    const clock = root().querySelector('[data-office-text="clock"]');
    const company = root().querySelector('[data-office-text="company"]');
    expect(clock?.textContent).toBe('08:00');
    expect(company?.textContent).toBe(state?.companyName ?? '');
  });
});

describe('the laptop tabs', () => {
  it('carries the four tabs of the contract, Tasks first', () => {
    click('[data-office="laptop"]');
    const tabs = Array.from(root().querySelectorAll('[data-do="laptopTab"]'));
    expect(tabs.map((tab) => tab.getAttribute('data-id'))).toEqual([
      'tasks',
      'materials',
      'team',
      'drawings',
    ]);
    expect(tabs[0]?.className).toContain('is-on');
  });

  it('reaches the material, the team and the drawings, one path each', () => {
    for (const [tab, mark] of [
      ['tasks', 'Office tasks today'],
      ['materials', 'Buy sheets for stock'],
      ['team', 'Taking somebody on'],
      ['drawings', 'Design queue'],
    ]) {
      click(`[data-do="laptopTab"][data-id="${tab}"]`);
      expect(html(), tab).toContain(mark ?? '');
      expect(openModalId(), tab).toBe('laptop');
    }
    // There is no second way in: the three have no modal of their own any more.
    expect(html()).not.toContain('data-modal="materials"');
    expect(html()).not.toContain('data-modal="hiring"');
    expect(html()).not.toContain('data-modal="drawings"');
    click('[data-do="laptopTab"][data-id="tasks"]');
    click('[data-do="closeModal"]');
  });

  it('puts the jobs on the books on the Work Plan board and nowhere else', () => {
    click('[data-office="laptop"]');
    expect(html()).not.toContain('data-do="startProduction"');
    click('[data-do="closeModal"]');
    click('[data-office="workPlan"]');
    expect(html()).toContain('Work Plan');
    click('[data-do="closeModal"]');
  });
});
