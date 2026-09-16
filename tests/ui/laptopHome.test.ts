// @vitest-environment jsdom
// The laptop is a computer (PIOTR, 15.09; CLAUDE.md T14 2.1): it opens on a home screen of three
// big tiles, Tasks, Stock and Drawings in that order, each with a live line the engine counts, and
// an Office group of small tiles under a rule; the screen skin is the laptop's alone; no
// handwriting is inside the screen; and the tab bar is gone.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { formatDate, laptopHome } from '../../src/engine/index';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { HOME_TILES, OFFICE_GROUP, laptopPageFrom } from '../../src/ui/laptop';
import { MODAL_SKINS } from '../../src/ui/modal';
import { acceptNow, buyStartingKit, fillRack, placeEnquiry } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

/** The font families the stylesheet defines as custom properties, so a var() can be written out. */
const FONT_VARS = new Map<string, string>();
for (const found of CSS.matchAll(/(--font-[\w-]+):\s*([^;]+);/g)) {
  FONT_VARS.set(found[1] ?? '', (found[2] ?? '').trim());
}

/** The font family an element is drawn in, as the stylesheet cascades it: its own value, else the
 *  nearest ancestor's, the way a browser inherits it, with the custom properties written out. */
function fontFamilyOf(element: Element): string {
  let node: Element | null = element;
  while (node !== null) {
    const value = getComputedStyle(node).fontFamily;
    if (value !== '') return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => FONT_VARS.get(name) ?? '');
    node = node.parentElement;
  }
  return '';
}

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

function openModalId(): string | null {
  return root().querySelector('.modal-layer .modal')?.getAttribute('data-modal') ?? null;
}

function closeModals(): void {
  let guard = 0;
  while (root().querySelector('.modal-layer [data-do="closeModal"]') !== null && guard < 10) {
    click('.modal-layer [data-do="closeModal"]');
    guard += 1;
  }
}

function openLaptop(): void {
  closeModals();
  const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
  if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
  click('[data-office="laptop"]');
}

function line(tile: string): string {
  return laptop().querySelector(`[data-line="${tile}"]`)?.textContent ?? '';
}

/** Every .ts file under src, for the greps of the cross check (CLAUDE.md T14 7). */
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
  // The stylesheet is on the page, so the fonts can be computed and not only read as text.
  document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  // The day 1 kit standing in the hall, a full rack and one job on the books: a known state.
  Object.assign(state, fillRack(buyStartingKit(state), 20));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 900, deadlineDays: 20 });
  Object.assign(state, acceptNow(state, enquiry.id));
  render();
});

describe('home first', () => {
  it('opens on home, on the screen skin and no other, filling the page', () => {
    openLaptop();
    const node = laptop();
    expect(node.querySelector('.laptop-screen[data-laptop-page="home"]')).not.toBeNull();
    expect(node.classList.contains('modal-screen')).toBe(true);
    expect(node.classList.contains('modal-folder')).toBe(false);
    expect(node.classList.contains('modal-board')).toBe(false);
    expect(node.classList.contains('modal-full')).toBe(true);
    expect(MODAL_SKINS.laptop).toBe('screen');
    // The company and the game's clock in one small line at the top, off the one formatter.
    const state = currentState();
    if (state === null) throw new Error('no game');
    expect(node.querySelector('.screen-status')?.textContent).toBe(
      `${state.companyName}, ${formatDate(state.clock)}`,
    );
  });

  it('has the three big tiles in the order of the contract, with a gap and an icon each', () => {
    openLaptop();
    const tiles = Array.from(laptop().querySelectorAll('.screen-tiles .screen-tile'));
    expect(tiles.map((tile) => tile.getAttribute('data-tile'))).toEqual(['tasks', 'stock', 'drawings']);
    expect(HOME_TILES.map((tile) => tile.page)).toEqual(['tasks', 'stock', 'drawings']);
    expect(tiles.map((tile) => tile.querySelector('.screen-tile-big')?.textContent)).toEqual([
      'Tasks',
      'Stock',
      'Drawings',
    ]);
    for (const tile of tiles) expect(tile.querySelector('svg.screen-icon')).not.toBeNull();
    // The gap is the stylesheet's, one figure, and the row is the three and nothing else.
    expect(CSS).toContain('--screen-tile-gap: 24px;');
    expect(CSS).toContain('gap: var(--screen-tile-gap);');
    expect(laptop().querySelectorAll('.screen-tiles > *')).toHaveLength(3);
  });

  it('prints the counts of the one engine function and computes none of its own', () => {
    openLaptop();
    const state = currentState();
    if (state === null) throw new Error('no game');
    const home = laptopHome(state);
    expect(home.tasksOpen).toBeGreaterThan(0);
    expect(line('tasks')).toBe(`${home.tasksOpen} open, ${home.tasksDueToday} due today`);
    // Twenty on the rack, less what the job on the books holds (CLAUDE.md T13 3.2).
    const held = state.jobs[0]?.sheetsReserved ?? 0;
    expect(held).toBeGreaterThan(0);
    expect(home.sheetsFree).toBe(20 - held);
    expect(line('stock')).toBe(`${home.sheetsFree} sheets free, all stocked`);
    expect(home.drawingsWaiting).toBe(1);
    expect(line('drawings')).toBe('1 waiting for a list');
    // A minute later the same numbers, from the same function, without the page being rebuilt.
    const before = laptop().querySelector('[data-line="tasks"]');
    advanceMinutes(1);
    expect(laptop().querySelector('[data-line="tasks"]')).toBe(before);
    expect(line('tasks')).toBe(
      `${laptopHome(currentState() as never).tasksOpen} open, ${laptopHome(currentState() as never).tasksDueToday} due today`,
    );
  });

  it('shows the low count in the game\'s red above zero, and the words when it is zero', () => {
    openLaptop();
    const state = currentState();
    if (state === null) throw new Error('no game');
    const held = state.jobs[0]?.sheetsReserved ?? 0;
    state.stock.sheets = held + 2;
    render();
    const low = laptop().querySelector('[data-line="stock"] .bad');
    expect(low?.textContent).toBe('1 low');
    expect(line('stock')).toBe('2 sheets free, 1 low');
    state.stock.sheets = held + 20;
    render();
    expect(laptop().querySelector('[data-line="stock"] .bad')).toBeNull();
    expect(line('stock')).toBe('20 sheets free, all stocked');
    // And nothing waiting reads as words too.
    for (const task of state.tasks) if (task.kind === 'materialTakeOff') task.done = true;
    render();
    expect(line('drawings')).toBe('nothing waiting');
    for (const task of state.tasks) if (task.kind === 'materialTakeOff') task.done = false;
    render();
  });

  it('has the Office group under a rule, in the order the brief names it', () => {
    openLaptop();
    const node = laptop();
    expect(node.querySelector('.screen-rule')).not.toBeNull();
    expect(node.querySelector('.screen-group')?.textContent).toBe('Office');
    const small = Array.from(node.querySelectorAll('.screen-small-tiles .screen-small-tile'));
    expect(small.map((tile) => tile.textContent)).toEqual([
      'Team',
      'Website',
      'Insurance',
      'Security',
      'Joinery Core',
      'Settings',
    ]);
    expect(OFFICE_GROUP.map((tile) => tile.id)).toEqual([
      'team',
      'website',
      'insurance',
      'security',
      'joineryCore',
      'settings',
    ]);
  });
});

describe('every Office tile opens its thing', () => {
  it('Team opens the Team board', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="team"]');
    expect(openModalId()).toBe('team');
    expect(root().innerHTML).toContain('Taking somebody on');
  });

  it('Website, Insurance and Security open those pages inside the laptop, with the back arrow', () => {
    for (const [tile, mark] of [
      ['website', '.website-level'],
      ['insurance', '.insurance-line'],
      ['security', '.security-level'],
    ]) {
      openLaptop();
      click(`[data-modal="laptop"] [data-tile="${tile}"]`);
      expect(openModalId(), tile).toBe('laptop');
      expect(laptop().querySelector(`.laptop-screen[data-laptop-page="${tile}"]`), tile).not.toBeNull();
      expect(laptop().querySelector(mark ?? ''), tile).not.toBeNull();
      expect(laptop().querySelector('.screen-back')?.textContent, tile).toBe('← Home');
    }
  });

  it('Joinery Core opens the software line, which is the Technical tab of the Team board', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="joineryCore"]');
    expect(openModalId()).toBe('team');
    expect(root().querySelector('[data-do="teamTab"][data-id="technical"]')?.className).toContain('is-on');
    expect(root().innerHTML).toContain('data-do="buyJoineryCore"');
    // Inside the board the chip is still the tab, and nothing more.
    click('[data-do="teamTab"][data-id="office"]');
    expect(openModalId()).toBe('team');
    expect(root().querySelector('[data-do="teamTab"][data-id="office"]')?.className).toContain('is-on');
  });

  it('Settings opens the Settings modal', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="settings"]');
    expect(openModalId()).toBe('settings');
    expect(root().innerHTML).toContain('data-do="setTips"');
  });
});

describe('the tiles are the navigation', () => {
  it('opens a big tile\'s page full screen and the back arrow returns to home', () => {
    for (const tile of ['tasks', 'stock', 'drawings']) {
      openLaptop();
      click(`[data-modal="laptop"] [data-tile="${tile}"]`);
      expect(laptop().querySelector(`.laptop-screen[data-laptop-page="${tile}"]`), tile).not.toBeNull();
      expect(laptop().classList.contains('modal-full'), tile).toBe(true);
      const back = laptop().querySelector('.screen-back');
      expect(back?.textContent, tile).toBe('← Home');
      expect(back?.getAttribute('data-do'), tile).toBe('laptopPage');
      expect(back?.getAttribute('data-id'), tile).toBe('home');
      click('[data-modal="laptop"] .screen-back');
      expect(laptop().querySelector('.laptop-screen[data-laptop-page="home"]'), tile).not.toBeNull();
    }
  });

  it('opens on home every time, with no memory of the last page', () => {
    openLaptop();
    click('[data-modal="laptop"] [data-tile="stock"]');
    expect(laptop().querySelector('[data-laptop-page="stock"]')).not.toBeNull();
    click('[data-modal="laptop"] [data-do="closeModal"]');
    click('[data-office="laptop"]');
    expect(laptop().querySelector('[data-laptop-page="home"]')).not.toBeNull();
  });

  it('has no tab bar, no laptopTab route and no page it does not know', () => {
    openLaptop();
    expect(laptop().querySelector('.tabs')).toBeNull();
    expect(root().innerHTML).not.toContain('data-do="laptopTab"');
    const sources = sourceFiles('src');
    const spelled = sources.filter((path) => readFileSync(path, 'utf8').includes('laptopTab'));
    expect(spelled).toEqual([]);
    const tabBars = readFileSync('src/ui/laptop.ts', 'utf8');
    expect(tabBars).not.toContain('tabBar(');
    expect(laptopPageFrom('team')).toBe('home');
    expect(laptopPageFrom('materials')).toBe('home');
    expect(laptopPageFrom('stock')).toBe('stock');
  });
});

describe('no handwriting inside the screen', () => {
  it('draws every heading inside the screen, on every page, in the system stack and never the title font', () => {
    const title = FONT_VARS.get('--font-title') ?? '';
    const system = FONT_VARS.get('--font-ui') ?? '';
    expect(title).toContain('Patrick Hand');
    expect(system).toContain('system-ui');
    let headings = 0;
    for (const page of ['home', 'tasks', 'stock', 'drawings', 'website', 'insurance', 'security']) {
      openLaptop();
      if (page !== 'home') click(`[data-modal="laptop"] [data-tile="${page}"]`);
      const inside = laptop().querySelectorAll('.laptop-screen h1, .laptop-screen h2, .laptop-screen h3, .laptop-screen h4');
      for (const heading of Array.from(inside)) {
        headings += 1;
        const family = fontFamilyOf(heading);
        expect(family, `${page}: ${heading.textContent ?? ''}`).not.toContain('Patrick Hand');
        expect(family, `${page}: ${heading.textContent ?? ''}`).toBe(system);
      }
      // The modal's own head is on the screen too, and it is not handwritten either.
      const head = laptop().querySelector('.modal-head h2');
      if (head !== null) expect(fontFamilyOf(head), page).toBe(system);
    }
    expect(headings).toBeGreaterThan(6);
    // And the stylesheet gives the screen no cream, no folder picture and no title font.
    const screen = CSS.slice(CSS.indexOf('.modal-screen {'));
    expect(screen).not.toContain('--font-title');
    expect(screen).not.toContain('ui.folder.png');
    expect(screen).not.toContain('#f5efe2');
    expect(screen).not.toContain('var(--cream)');
  });
});
