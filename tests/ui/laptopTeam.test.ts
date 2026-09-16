// @vitest-environment jsdom
// The laptop, Turn 15 (PIOTR, 16.09; CLAUDE.md T15 2.3): a red count in the corner of each big
// tile while there is something to do and no element at all when there is not; the line icons on
// the six Office tiles; the Team as a page inside the screen, reached from its tile, from the
// Joinery Core tile and from the order board, with the separate team modal deleted; and the
// back arrow first in the header of every page but home.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { HIRING_MINUTES, HOLIDAY_OPTIONS_DAYS, LAPTOP_BOOT_MINUTES, OWNER_DRAW_TIERS } from '../../src/engine/constants';
import { laptopHome } from '../../src/engine/index';
import { MODAL_IS_FULL, advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { OFFICE_GROUP, laptopPageFrom, renderLaptop } from '../../src/ui/laptop';
import { MODAL_SKINS } from '../../src/ui/modal';
import { acceptNow, buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

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

function closeModals(): void {
  let guard = 0;
  while (root().querySelector('.modal-layer [data-do="closeModal"]') !== null && guard < 10) {
    click('.modal-layer [data-do="closeModal"]');
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

function openModalId(): string | null {
  return root().querySelector('.modal-layer .modal')?.getAttribute('data-modal') ?? null;
}

function openLaptop(): void {
  closeModals();
  const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
  if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
  click('[data-office="laptop"]');
  advanceMinutes(LAPTOP_BOOT_MINUTES);
  dismissEvents();
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** Every .ts file under a directory. */
function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (name.endsWith('.ts')) found.push(path);
  }
  return found;
}

beforeAll(() => {
  document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  // The day 1 kit, a rack of twenty and one job on the books: tasks to do and a list to make.
  Object.assign(state, fillRack(buyStartingKit(state), 20));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 900, deadlineDays: 20 });
  Object.assign(state, acceptNow(state, enquiry.id));
  state.reputation = 40;
  render();
});

describe('the counts on the big tiles', () => {
  it('are the fields of laptopHome as elements, and no element at all at zero', () => {
    openLaptop();
    const state = currentState();
    if (state === null) throw new Error('no game');
    const home = laptopHome(state);
    expect(home.tasksOpen).toBeGreaterThan(0);
    expect(home.lowLines).toBe(0);
    expect(home.drawingsWaiting).toBe(1);
    const count = (tile: string): Element | null =>
      laptop().querySelector(`.screen-tile[data-tile="${tile}"] .screen-tile-count`);
    expect(count('tasks')?.textContent).toBe(String(home.tasksOpen));
    expect(count('tasks')?.getAttribute('data-count')).toBe('tasks');
    // Nothing low: no badge on Stock, not a hidden one, none.
    expect(count('stock')).toBeNull();
    expect(laptop().querySelector('.screen-tile[data-tile="stock"]')?.innerHTML).not.toContain('screen-tile-count');
    expect(count('drawings')?.textContent).toBe('1');
    // The live line at the bottom stays exactly as Turn 14 left it.
    expect(laptop().querySelector('[data-line="tasks"]')?.textContent).toBe(
      `${home.tasksOpen} open, ${home.tasksDueToday} due today`,
    );
    // Run the rack down: Stock gets its badge; make the list: Drawings loses its own.
    const held = state.jobs[0]?.sheetsReserved ?? 0;
    state.stock.sheets = held + 1;
    for (const task of state.tasks) if (task.kind === 'materialTakeOff') task.done = true;
    render();
    const after = laptopHome(currentState() as never);
    expect(after.lowLines).toBe(1);
    expect(after.drawingsWaiting).toBe(0);
    expect(count('stock')?.textContent).toBe('1');
    expect(count('drawings')).toBeNull();
    state.stock.sheets = held + 20;
    for (const task of state.tasks) if (task.kind === 'materialTakeOff') task.done = false;
    render();
    // The badge: TILE_COUNT 34 px, the game's red, white bold at the lead size, a white ring.
    const rule = CSS.slice(CSS.indexOf('.screen-tile-count {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toContain('height: 34px;');
    expect(body).toContain('min-width: 34px;');
    expect(body).toContain('background: var(--bad);');
    expect(body).toContain('color: #fff;');
    expect(body).toContain('font-size: var(--fs-lead);');
    expect(body).toContain('border: 2px solid rgba(255, 255, 255, 0.85);');
    expect(body).toContain('right: 12px;');
    expect(body).toContain('top: 12px;');
  });
});

describe('the Office tiles', () => {
  it('carry the six line icons of the mockup, in the game\'s green, above the label', () => {
    openLaptop();
    const tiles = Array.from(laptop().querySelectorAll('.screen-small-tile'));
    expect(tiles).toHaveLength(6);
    for (const tile of tiles) {
      const icon = tile.querySelector('svg.screen-icon');
      expect(icon, tile.textContent ?? '').not.toBeNull();
      expect(icon?.nextElementSibling?.className).toBe('screen-small-label');
      expect(icon?.getAttribute('stroke')).toBe('currentColor');
    }
    const rule = CSS.slice(CSS.indexOf('.screen-small-tile .screen-icon {'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('color: var(--screen-green);');
    expect(rule.slice(0, rule.indexOf('}'))).toContain('height: 30px;');
    expect(OFFICE_GROUP.map((tile) => tile.id)).toEqual(['team', 'website', 'insurance', 'security', 'joineryCore', 'settings']);
  });
});

describe('the Team as a page of the laptop', () => {
  it('opens inside the screen from its tile, with the four tabs as the screen\'s segmented control', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="team"]');
    expect(openModalId()).toBe('laptop');
    expect(page()).toBe('team');
    const tabs = Array.from(laptop().querySelectorAll('.laptop-screen .tabs [data-do="teamTab"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Workshop', 'Office', 'Technical', 'Management']);
    expect(laptop().textContent).toContain('Taking somebody on');
    // The skin: white segments, the one on in green; the hire cards white panels with Hire green.
    const tabsRule = CSS.slice(CSS.indexOf('.modal-screen .tabs {'));
    expect(tabsRule.slice(0, tabsRule.indexOf('}'))).toContain('display: inline-flex;');
    expect(CSS).toContain('.modal-screen .tabs .chip.is-on,');
    const hire = CSS.slice(CSS.indexOf('.modal-screen .tile-action .btn:not([disabled]) {'));
    expect(hire.slice(0, hire.indexOf('}'))).toContain('background: var(--screen-green);');
    // The tab bar of the page is its own content, not a second navigation of the laptop.
    click('[data-modal="laptop"] [data-do="teamTab"][data-id="office"]');
    expect(page()).toBe('team');
    expect(laptop().querySelector('[data-do="teamTab"][data-id="office"]')?.className).toContain('is-on');
  });

  it('opens from the Joinery Core tile on the Technical tab, and from the order board\'s link', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="joineryCore"]');
    expect(page()).toBe('team');
    expect(laptop().querySelector('[data-do="teamTab"][data-id="technical"]')?.className).toContain('is-on');
    expect(laptop().innerHTML).toContain('data-do="buyJoineryCore"');
    // The order board's "Open the team" on a job the crew is too small for.
    closeModals();
    const state = currentState();
    if (state === null) throw new Error('no game');
    placeEnquiry(state, {
      name: 'Big kitchen',
      price: 9000,
      deadlineDays: 3,
      unreachable: true,
      blockReason: 'too few people for the deadline',
      blockWhere: 'team',
    });
    render();
    click('[data-office="orders"]');
    const link = root().querySelector('[data-modal="board"] [data-do="laptopPage"][data-id="team"]');
    expect(link?.textContent).toBe('Open the team');
    click('[data-modal="board"] [data-do="laptopPage"][data-id="team"]');
    expect(openModalId()).toBe('laptop');
    expect(page()).toBe('team');
    state.enquiries = state.enquiries.filter((enquiry) => enquiry.name !== 'Big kitchen');
    render();
  });

  it('keeps hiring, the draw, the holiday and the second shift working from inside the screen', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="team"]');
    // The page remembers its tab; the owner's card is on the Workshop one (CLAUDE.md T13 3.18).
    click('[data-modal="laptop"] [data-do="teamTab"][data-id="workshop"]');
    const state = currentState();
    if (state === null) throw new Error('no game');
    // The draw: one click on a tier, and the chip is on.
    expect(OWNER_DRAW_TIERS.length).toBeGreaterThan(2);
    click('[data-modal="laptop"] [data-do="setOwnerDraw"][data-id="2"]');
    expect(currentState()?.ownerDraw.tier).toBe(2);
    expect(laptop().querySelector('[data-do="setOwnerDraw"][data-id="2"]')?.className).toContain('is-on');
    click('[data-modal="laptop"] [data-do="setOwnerDraw"][data-id="0"]');
    expect(currentState()?.ownerDraw.tier).toBe(0);
    // The holiday: no production manager, so the reason and a greyed button, on the page.
    const holiday = laptop().querySelector('.holiday');
    expect(holiday?.textContent).toContain('Holiday');
    expect(holiday?.querySelector('.btn[disabled]')).not.toBeNull();
    expect(HOLIDAY_OPTIONS_DAYS.length).toBeGreaterThan(0);
    // The second shift line: the reason there is none yet.
    expect(laptop().querySelector('.shift-control')?.textContent).toContain('Second shift');
    // Hiring: the office admin off the Office tab, an interview, and she is on the books.
    click('[data-modal="laptop"] [data-do="teamTab"][data-id="office"]');
    click('[data-modal="laptop"] [data-do="hire"][data-role="officeAdmin"]');
    expect(page()).toBe('team');
    expect(currentState()?.workers).toHaveLength(0);
    expect(laptop().textContent).toContain(`Interview: 0 of ${HIRING_MINUTES} min`);
    advanceMinutes(HIRING_MINUTES);
    dismissEvents();
    expect(currentState()?.workers).toHaveLength(1);
    expect(currentState()?.workers[0]?.role).toBe('officeAdmin');
    expect(page()).toBe('team');
    expect(laptop().querySelector('[data-candidate="officeAdmin."]')?.className).toContain('is-owned');
  });

  it('has no modal of its own any more: no skin, no size, no route, no opener', () => {
    expect(MODAL_SKINS).not.toHaveProperty('team');
    expect(MODAL_IS_FULL).not.toHaveProperty('team');
    expect(laptopPageFrom('team')).toBe('team');
    // 'team' in src/ui is the page value, its tab, and the openers onto the page: never a modal.
    for (const file of sourceFiles('src/ui')) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toContain("openModal('team')");
      expect(text, file).not.toContain('data-modal="team"');
    }
    // The renderer is the laptop's page and nothing of app.ts: no import, no modal id, no title.
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).not.toContain('renderTeam');
    expect(app).not.toContain("| 'team'");
    expect(app).not.toContain("team: 'Team'");
    expect((app.match(/openLaptopPage\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
    openLaptop();
    expect(root().innerHTML).not.toContain('data-modal="team"');
  });
});

describe('back on every page', () => {
  it('is the first child of the page header, the same control, and lands on home', () => {
    const pages = ['tasks', 'stock', 'drawings', 'team', 'website', 'insurance', 'security'];
    for (const id of pages) {
      openLaptop();
      click(`[data-modal="laptop"] [data-tile="${id}"]`);
      expect(page(), id).toBe(id);
      const head = laptop().querySelector('.laptop-screen > .screen-page-head');
      expect(head, id).not.toBeNull();
      const back = head?.firstElementChild;
      expect(back?.className, id).toBe('screen-back');
      expect(back?.textContent, id).toBe('← Home');
      expect(back?.getAttribute('data-do'), id).toBe('laptopPage');
      expect(back?.getAttribute('data-id'), id).toBe('home');
      expect(head?.querySelector('.screen-page-title')?.textContent, id).toBe(
        id === 'joineryCore' ? 'Team' : `${id[0]?.toUpperCase() ?? ''}${id.slice(1)}`,
      );
      click('[data-modal="laptop"] .screen-page-head > .screen-back');
      expect(page(), id).toBe('home');
    }
    // Home has no header and no back: it is where the arrow goes.
    expect(laptop().querySelector('.screen-page-head')).toBeNull();
    expect(laptop().querySelector('.screen-back')).toBeNull();
    // And the page frame is the same on a page rendered on its own.
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 30);
    for (const id of pages) {
      const inside = parse(renderLaptop(state, { page: id as never, stockSheets: '6', teamTab: 'workshop' }))
        .querySelector('.laptop-screen');
      expect(inside?.firstElementChild?.className, id).toBe('screen-page-head');
      expect(inside?.firstElementChild?.firstElementChild?.className, id).toBe('screen-back');
    }
  });
});
