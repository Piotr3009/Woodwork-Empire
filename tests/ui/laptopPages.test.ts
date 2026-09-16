// @vitest-environment jsdom
// The pages behind the laptop's tiles inherit the screen skin and nothing else (CLAUDE.md T14
// 2.1, T14-05): each opens from its tile, the back arrow returns to home, and the content and the
// controls are as Turn 13 left them, the stock page's Restock and Order for this job included.

import { beforeAll, describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES, LOW_STOCK_SHEETS } from '../../src/engine/constants';
import { pendingStockSheets, restockCheck, shortfallOf } from '../../src/engine/index';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { renderDrawings } from '../../src/ui/drawings';
import { renderInsurance } from '../../src/ui/insurance';
import { renderLaptop } from '../../src/ui/laptop';
import { renderMaterials } from '../../src/ui/materials';
import { renderSecurity } from '../../src/ui/security';
import { renderWebsite } from '../../src/ui/website';
import { acceptNow, buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';

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

function laptop(): Element {
  const node = root().querySelector('.modal-layer [data-modal="laptop"]');
  if (node === null) throw new Error('the laptop is not open');
  return node;
}

function page(): string | null {
  return laptop().querySelector('.laptop-screen')?.getAttribute('data-laptop-page') ?? null;
}

function openPage(tile: string): void {
  let guard = 0;
  while (root().querySelector('.modal-layer [data-do="closeModal"]') !== null && guard < 10) {
    click('.modal-layer [data-do="closeModal"]');
    guard += 1;
  }
  const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
  if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
  click('[data-office="laptop"]');
  // The lid costs five minutes the first time in a day, and nothing starts until it is up
  // (CLAUDE.md T7 3.10).
  advanceMinutes(LAPTOP_BOOT_MINUTES);
  dismissEvents();
  click(`[data-modal="laptop"] [data-tile="${tile}"]`);
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  // The day 1 kit in the hall, a rack with a few sheets on it and two jobs on the books: one the
  // rack can hold and one it cannot, so both stock controls have something to do.
  Object.assign(state, fillRack(buyStartingKit(state), LOW_STOCK_SHEETS + 1));
  state.enquiries = [];
  const small = placeEnquiry(state, { price: 400, deadlineDays: 20 });
  Object.assign(state, acceptNow(state, small.id));
  const big = placeEnquiry(state, { price: 6000, deadlineDays: 40 });
  Object.assign(state, acceptNow(state, big.id));
  render();
});

describe('the content is as Turn 13 left it', () => {
  it('puts the Turn 13 renderers inside the screen byte for byte, behind the back arrow', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 30);
    state.enquiries = [];
    state = acceptNow(state, placeEnquiry(state, { price: 900, deadlineDays: 30 }).id);
    const pages: Array<[string, string]> = [
      ['stock', renderMaterials(state, '6')],
      ['drawings', renderDrawings(state)],
      ['website', renderWebsite(state)],
      ['insurance', renderInsurance(state)],
      ['security', renderSecurity(state)],
    ];
    for (const [id, body] of pages) {
      const screen = parse(renderLaptop(state, { page: id as never, stockSheets: '6' }));
      const inside = screen.querySelector(`.laptop-screen[data-laptop-page="${id}"]`);
      expect(inside, id).not.toBeNull();
      const back = inside?.firstElementChild;
      expect(back?.className, id).toBe('screen-back');
      expect(back?.textContent, id).toBe('← Home');
      // Everything after the arrow is the page exactly as its own renderer writes it.
      const rest = (inside?.innerHTML ?? '').slice(back?.outerHTML.length ?? 0);
      expect(rest, id).toBe(parse(body).innerHTML);
    }
    // The tasks page keeps its three headings and nothing of the jobs on the books.
    const tasks = parse(renderLaptop(state, { page: 'tasks', stockSheets: '6' }));
    expect(tasks.querySelector('.laptop-screen[data-laptop-page="tasks"] .screen-back')).not.toBeNull();
    expect(tasks.textContent).toContain('Office tasks today');
    expect(tasks.textContent).toContain('Workshop jobs of work');
    expect(tasks.textContent).toContain('At the gate');
    expect(tasks.textContent).not.toContain('Start production');
  });
});

describe('through the page', () => {
  it('opens each page from its tile and comes back home on the arrow', () => {
    for (const tile of ['tasks', 'stock', 'drawings', 'website', 'insurance', 'security']) {
      openPage(tile);
      expect(page(), tile).toBe(tile);
      expect(laptop().classList.contains('modal-screen'), tile).toBe(true);
      click('[data-modal="laptop"] .screen-back');
      expect(page(), tile).toBe('home');
    }
  });

  it('keeps the stock page working inside the screen: the badge, Restock, and Order for this job', () => {
    openPage('stock');
    const state = currentState();
    if (state === null) throw new Error('no game');
    // The rack is low, so the line wears the badge and Restock is a button (CLAUDE.md T13 3.2).
    expect(laptop().querySelector('.stock-line .badge-low')).not.toBeNull();
    const check = restockCheck(state);
    expect(check.ok).toBe(true);
    const restock = laptop().querySelector('[data-do="restock"]');
    expect(restock).not.toBeNull();
    expect(restock?.textContent).toContain('Restock');
    expect(pendingStockSheets(state)).toBe(0);
    click('[data-modal="laptop"] [data-do="restock"]');
    // One click, one order on the road, and the button says so now.
    expect(pendingStockSheets(currentState() as never)).toBe(check.sheets);
    expect(page()).toBe('stock');
    expect(laptop().querySelector('[data-do="restock"]')).toBeNull();
    // The greyed button carries the reason, the way every locked button does (CLAUDE.md 9.2).
    expect(laptop().querySelector('.stock-head .btn[disabled]')?.getAttribute('title')).toContain('on the way');
    // The big job is short of sheets: its line is red with Order for this job on it (T13 3.6).
    const big = currentState()?.jobs.find((job) => job.price === 6000);
    if (big === undefined) throw new Error('no big job');
    expect(shortfallOf(big)).toBeGreaterThan(0);
    const order = laptop().querySelector(`[data-do="orderForJob"][data-id="${big.id}"]`);
    expect(order).not.toBeNull();
    const ordersBefore = currentState()?.deliveries.length ?? 0;
    click(`[data-modal="laptop"] [data-do="orderForJob"][data-id="${big.id}"]`);
    expect(currentState()?.deliveries.length).toBe(ordersBefore + 1);
    expect(currentState()?.deliveries.some((delivery) => delivery.jobId === big.id)).toBe(true);
    expect(page()).toBe('stock');
    // And the deliveries list under the projects says both are on the way.
    expect(laptop().querySelectorAll('.laptop-screen h3').length).toBeGreaterThanOrEqual(2);
    click('[data-modal="laptop"] .screen-back');
    expect(page()).toBe('home');
  });

  it('keeps the tasks page working inside the screen: a task starts and pauses', () => {
    openPage('tasks');
    const state = currentState();
    if (state === null) throw new Error('no game');
    const bookkeeping = state.tasks.find((task) => task.kind === 'bookkeeping' && !task.done);
    if (bookkeeping === undefined) throw new Error('no bookkeeping on the desk');
    click(`[data-modal="laptop"] [data-do="startTask"][data-id="${bookkeeping.id}"]`);
    expect(currentState()?.owner.currentTaskId).toBe(bookkeeping.id);
    expect(page()).toBe('tasks');
    advanceMinutes(5);
    expect(page()).toBe('tasks');
    click('[data-modal="laptop"] [data-do="pauseTask"]');
    expect(currentState()?.owner.currentTaskId).toBeNull();
  });

  it('keeps the drawings page working inside the screen: a drawing starts', () => {
    openPage('drawings');
    const state = currentState();
    if (state === null) throw new Error('no game');
    const design = state.tasks.find((task) => task.kind === 'design' && !task.done);
    if (design === undefined) throw new Error('no drawing waiting');
    expect(laptop().textContent).toContain('Design queue');
    click(`[data-modal="laptop"] [data-do="startTask"][data-id="${design.id}"]`);
    expect(currentState()?.owner.currentTaskId).toBe(design.id);
    expect(page()).toBe('drawings');
    click('[data-modal="laptop"] [data-do="pauseTask"]');
    expect(currentState()?.owner.currentTaskId).toBeNull();
  });
});
