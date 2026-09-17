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
import { renderTeam } from '../../src/ui/team';
import { renderWebsite } from '../../src/ui/website';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  newGame,
  placeEnquiry,
  runClock,
  withLicence,
} from '../helpers';

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
      ['team', renderTeam(state, 'workshop')],
      ['website', renderWebsite(state)],
      ['insurance', renderInsurance(state)],
      ['security', renderSecurity(state)],
    ];
    for (const [id, body] of pages) {
      const screen = parse(renderLaptop(state, { page: id as never, stockSheets: '6', teamTab: 'workshop', tickedTasks: [] }));
      const inside = screen.querySelector(`.laptop-screen[data-laptop-page="${id}"]`);
      expect(inside, id).not.toBeNull();
      // The page header first, with the back arrow as its first child (CLAUDE.md T15 2.3).
      const head = inside?.firstElementChild;
      expect(head?.className, id).toBe('screen-page-head');
      const back = head?.firstElementChild;
      expect(back?.className, id).toBe('screen-back');
      expect(back?.textContent, id).toBe('← Home');
      // Everything after the header is the page exactly as its own renderer writes it.
      const rest = (inside?.innerHTML ?? '').slice(head?.outerHTML.length ?? 0);
      expect(rest, id).toBe(parse(body).innerHTML);
    }
    // The tasks page keeps its three headings and nothing of the jobs on the books.
    const tasks = parse(renderLaptop(state, { page: 'tasks', stockSheets: '6', teamTab: 'workshop', tickedTasks: [] }));
    expect(tasks.querySelector('.laptop-screen[data-laptop-page="tasks"] .screen-back')).not.toBeNull();
    expect(tasks.textContent).toContain('Office tasks today');
    expect(tasks.textContent).toContain('Workshop jobs of work');
    expect(tasks.textContent).toContain('At the gate');
    expect(tasks.textContent).not.toContain('Start production');
  });
});

describe('through the page', () => {
  it('opens each page from its tile and comes back home on the arrow', () => {
    for (const tile of ['tasks', 'stock', 'drawings', 'team', 'website', 'insurance', 'security']) {
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

describe('Add as next (CLAUDE.md T19 2.12)', () => {
  /** A desk with the licence in, a job on the books and more than one job of work open on it. */
  function desk(): GameState {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 30);
    state.enquiries = [];
    state = acceptNow(state, placeEnquiry(state, { price: 900, deadlineDays: 30 }).id);
    return state;
  }

  function tasksPage(state: GameState): HTMLElement {
    return parse(
      renderLaptop(state, { page: 'tasks', stockSheets: '6', teamTab: 'workshop', tickedTasks: [] }),
    );
  }

  function openIds(state: GameState): string[] {
    return state.tasks.filter((task) => !task.done).map((task) => task.id);
  }

  it('offers every other job of work behind the one he is on, and never in place of it', () => {
    const state = desk();
    const ids = openIds(state);
    const first = ids[0];
    const second = ids[1];
    if (first === undefined || second === undefined) throw new Error('two jobs of work wanted');
    // Nothing running: every row he could take offers a plain Start, and nothing is queued.
    const idle = tasksPage(state);
    expect(idle.querySelectorAll('[data-do="queueTaskNext"]')).toHaveLength(0);
    expect(idle.querySelectorAll('[data-do="startTask"]').length).toBeGreaterThan(1);

    // One in his hands: that row says what it always said, and the rest say Add as next.
    const busy = act(state, { type: 'START_TASK', taskId: first });
    expect(busy.owner.currentTaskId).toBe(first);
    const page = tasksPage(busy);
    const running = page.querySelector(`[data-task="${first}"]`);
    expect(running?.classList.contains('is-running')).toBe(true);
    expect(running?.querySelector('[data-do="pauseTask"]')?.textContent).toBe('Put that down');
    expect(page.querySelectorAll('[data-do="startTask"]')).toHaveLength(0);
    const add = page.querySelector(`[data-task="${second}"] [data-do="queueTaskNext"]`);
    expect(add?.textContent).toBe('Add as next');
    expect(add?.getAttribute('data-id')).toBe(second);
    expect(add?.classList.contains('task-queue-next')).toBe(true);
    // The way out is never "put that down" on somebody else's row any more.
    expect(page.querySelectorAll('[data-do="pauseTask"]')).toHaveLength(1);
  });

  it('queues it behind the running one instead of replacing it, and says so on the row', () => {
    const state = desk();
    const ids = openIds(state);
    const first = ids[0];
    const second = ids[1];
    if (first === undefined || second === undefined) throw new Error('two jobs of work wanted');
    const busy = act(state, { type: 'START_TASK', taskId: first });
    const queued = act(busy, { type: 'QUEUE_TASK_NEXT', taskId: second });
    // The whole of Piotr's complaint: what he was doing is still in his hands.
    expect(queued.owner.currentTaskId).toBe(first);
    expect(queued.taskQueue).toContain(second);
    // And the row now says it is waiting, with nothing left to press on it.
    const row = tasksPage(queued).querySelector(`[data-task="${second}"]`);
    expect(row?.querySelector('[data-do]')).toBeNull();
    expect(row?.querySelector('.reason')?.textContent).toBe('Next in the queue');
    // A second press of the same button would queue it twice; it cannot be pressed twice.
    const again = act(queued, { type: 'QUEUE_TASK_NEXT', taskId: second });
    expect(again.taskQueue.filter((id) => id === second)).toHaveLength(1);
    // The laptop's own count of the queue reads it.
    expect(tasksPage(queued).textContent).toContain('1 job of work queued');
  });

  it('starts the queued one the moment his hands are free', () => {
    const state = desk();
    const ids = openIds(state);
    const first = ids[0];
    const second = ids[1];
    if (first === undefined || second === undefined) throw new Error('two jobs of work wanted');
    const queued = act(
      act(state, { type: 'START_TASK', taskId: first }),
      { type: 'QUEUE_TASK_NEXT', taskId: second },
    );
    // The one he is on finishes; the queue's head goes into his hands where T17's queue has
    // always picked it up, and nothing about Add as next changes that (CLAUDE.md T17 2.16).
    const held = queued.tasks.find((task) => task.id === first);
    if (held === undefined) throw new Error('the job of work he is on has gone');
    held.minutesRemaining = 1;
    const freed = runClock(queued, 3);
    expect(freed.tasks.find((task) => task.id === first)?.done).toBe(true);
    expect(freed.owner.currentTaskId).toBe(second);
    // It stays on the queue until it is done, the way T17 wrote it: the queue is what he is
    // working through, not what he has yet to pick up.
    expect(freed.taskQueue[0]).toBe(second);
  });

  it('gives the drawings page the same button, because the drawings page is on the laptop too', () => {
    const state = withLicence(desk());
    const design = state.tasks.find((task) => task.kind === 'design' && !task.done);
    const other = state.tasks.find((task) => !task.done && task.kind !== 'design');
    if (design === undefined || other === undefined) throw new Error('a drawing and one other wanted');
    const busy = act(state, { type: 'START_TASK', taskId: other.id });
    const page = parse(renderDrawings(busy));
    const add = page.querySelector(`[data-do="queueTaskNext"][data-id="${design.id}"]`);
    expect(add?.textContent).toBe('Add as next');
  });
});
