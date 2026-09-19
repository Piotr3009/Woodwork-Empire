// @vitest-environment jsdom
// Every modal, popover and list has the cross, Escape and a click outside, and this file is the
// rule itself (PIOTR, 18.09; CLAUDE.md T20 2.15). It finds the popovers in the source instead of
// being told them, so one written in a later turn without the cross fails here and not in front
// of Piotr; it opens every one of them and counts the crosses inside it; it reads the one table
// Escape closes them by; and it prints the list it found so the report can quote it.
//
// The four things it walks are the brief's own: a `.modal`, an `.assign-list`, a `.menu-pop` and
// anything carrying `data-popover`, which is the attribute every future popover must wear.
// The first use bubble is not one of them and wears no cross: it is the last child of a modal's
// body and floats over nothing (src/ui/styles.css, `.tip-bubble`), its own `.tip-close` dismisses
// it for good, and a `.modal-close` inside it would be a second cross in the modal it sits in
// (CLAUDE.md T15 2.2).

import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { ESCAPE_ORDER, MODAL_IS_FULL, currentState, mount, render } from '../../src/ui/app';
import { MODAL_SKINS, closeButton, syncModals } from '../../src/ui/modal';
import type { ModalSpec } from '../../src/ui/modal';
import { renderMenu } from '../../src/ui/topbar';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { summaryOfDay } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { firstJob, runDays, twoMenOnSheetWork } from '../helpers';

/** The one selector the rule is written in: everything the game floats over the page is one of
 *  these four, and the fourth is the attribute a new one must carry. */
const POPOVER_SELECTOR = '.modal, .assign-list, .menu-pop, [data-popover]';

const UI_DIR = 'src/ui';

/** Every file that can write markup: the ui layer, which owns the modals and the popovers, and the
 *  render layer beside it, so a popover written there later is found here too. */
const SOURCES = [UI_DIR, 'src/render'].flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({ name: `${dir}/${name}`, text: readFileSync(`${dir}/${name}`, 'utf8') })),
);

interface Popover {
  /** What `data-popover` says, or `modal` for the one shell every modal in the game is drawn in. */
  name: string;
  /** The file that writes the markup. */
  file: string;
  /** The action the cross carries: the one thing that differs between them. */
  close: string;
  /** What it is and how the player opens it, for the printed list. */
  what: string;
}

/** Every popover in the game. The census below checks this table against the source, both ways:
 *  a popover with no line here fails, and a line here with nothing behind it fails too. */
const POPOVERS: Popover[] = [
  {
    name: 'modal',
    file: 'src/ui/modal.ts',
    close: 'closeModal',
    what: `the one modal shell, worn by all ${Object.keys(MODAL_SKINS).length} modals`,
  },
  {
    name: 'assign-job',
    file: 'src/ui/jobCard.ts',
    close: 'closeAssign',
    what: 'who goes on this job, off the Work Plan job card',
  },
  {
    name: 'assign-contract',
    file: 'src/ui/contracts.ts',
    close: 'closeAssign',
    what: 'who goes on this contract, off Running on the Contracts tab',
  },
  { name: 'menu', file: 'src/ui/topbar.ts', close: 'closeMenu', what: 'the Menu, off the top bar' },
  {
    name: 'why',
    file: 'src/ui/app.ts',
    close: 'closeWhy',
    what: 'the real life note, off an "i" link',
  },
];

/** The floating layers of the stylesheet that are not popovers, with the reason each one is not.
 *  A new one appears here or it wears the cross: there is no third way (CLAUDE.md T20 2.15). */
const NOT_POPOVERS: Array<[string, string]> = [
  ['.modal-layer', 'the layer the modal shells live on, not a thing in itself'],
  ['.modal-close', 'the cross itself'],
  ['.day-tip', 'a hover note on the day meter: it takes no click and is gone with the pointer'],
  ['.version-corner', 'the version in the corner, which takes no pointer at all'],
  ['.modal-felt .modal-head', "the felt board's own head, part of the modal it is in"],
  [
    '.efficiency-plate',
    'the body of a native <details> on the top bar: the same summary opens and shuts it, and ' +
      'Turn 20 changes nothing about Efficiency (CLAUDE.md T20 6)',
  ],
  ['.hall-bottom', "the hall's own strip, always on the page"],
  ['.hall-zoom', "the hall's own zoom controls, always on the page"],
];

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The crosses that belong to this popover and not to one nested inside it: an Assign list sits
 *  inside the modal it hangs off, and its cross is the list's, not the modal's. */
function ownCrosses(node: Element): Element[] {
  return Array.from(node.querySelectorAll('.modal-close')).filter(
    (cross) => cross.parentElement?.closest(POPOVER_SELECTOR) === node,
  );
}

/** Every popover in a piece of markup, the outer ones and the nested ones alike. */
function popoversIn(node: Element): Element[] {
  return Array.from(node.querySelectorAll(POPOVER_SELECTOR));
}

// ---------------------------------------------------------------------------
// The census: what the source has, against what this table names
// ---------------------------------------------------------------------------

describe('the census of popovers (CLAUDE.md T20 2.15)', () => {
  it('finds in the source every popover this table names, and no other', () => {
    const found = new Map<string, string>();
    for (const { name, text } of SOURCES) {
      for (const hit of text.matchAll(/data-popover="([a-z-]+)"/g)) {
        const key = hit[1] ?? '';
        expect(found.has(key), `${key} is written twice`).toBe(false);
        found.set(key, name);
      }
    }
    const named = POPOVERS.filter((popover) => popover.name !== 'modal');
    expect([...found.keys()].sort()).toEqual(named.map((popover) => popover.name).sort());
    for (const popover of named) {
      expect(found.get(popover.name), popover.name).toBe(popover.file);
    }
  });

  it('draws every modal out of the one shell, so there is nothing else to walk', () => {
    const writers = SOURCES.filter((entry) => entry.text.includes('data-modal="${')).map(
      (entry) => entry.name,
    );
    expect(writers).toEqual(['src/ui/modal.ts']);
    // And every modal the player can open is on the one table of skins, which is what the walk
    // below goes through.
    for (const id of Object.keys(MODAL_IS_FULL)) expect(Object.keys(MODAL_SKINS)).toContain(id);
  });

  it('gives every list and menu in the source its data-popover', () => {
    for (const { name, text } of SOURCES) {
      for (const hit of text.matchAll(/class="(assign-list|menu-pop|why-pop)"[^>]*/g)) {
        expect(hit[0], `${name}: ${hit[1] ?? ''}`).toContain('data-popover=');
      }
    }
  });

  it('has a reason for every other layer the stylesheet floats over the page', () => {
    const css = readFileSync(`${UI_DIR}/styles.css`, 'utf8');
    const floating: string[] = [];
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const body = rule[2] ?? '';
      if (!/z-index/.test(body) || !/position:\s*(absolute|fixed)/.test(body)) continue;
      const selector = (rule[1] ?? '').trim().split('\n').pop()?.trim() ?? '';
      floating.push(selector);
    }
    const popoverClasses = ['.assign-list', '.menu-pop', '.why-pop'];
    const excused = NOT_POPOVERS.map(([selector]) => selector);
    for (const selector of floating) {
      const known = popoverClasses.includes(selector) || excused.includes(selector);
      expect(known, `${selector} floats over the page: give it the cross or a reason`).toBe(true);
    }
    // And nothing is excused that is not there any more.
    for (const selector of excused) expect(floating, selector).toContain(selector);
  });
});

// ---------------------------------------------------------------------------
// The cross: one in every one of them
// ---------------------------------------------------------------------------

describe('the one cross in every popover (CLAUDE.md T20 2.15)', () => {
  function shellOf(spec: ModalSpec): Element {
    const layer = document.createElement('div');
    syncModals(layer, [spec]);
    const node = layer.firstElementChild;
    if (node === null) throw new Error(`no shell for ${spec.id}`);
    return node;
  }

  it('gives every modal in the game exactly one, and the same markup for all of them', () => {
    for (const id of Object.keys(MODAL_SKINS)) {
      const shell = shellOf({ id, title: id, body: '<p>body</p>' });
      const crosses = ownCrosses(shell);
      expect(crosses.length, id).toBe(1);
      expect(crosses[0]?.outerHTML, id).toBe(closeButton('closeModal'));
    }
  });

  it('leaves the cross off a decision, where the choices are the way out', () => {
    // The one exception in the game, and it is older than this rule: a modal with a choice to make
    // is not closed, it is answered (src/ui/modal.ts, `closable`).
    const decision = shellOf({
      id: 'event',
      title: 'A decision',
      body: '<p>body</p>',
      footer: '<button class="btn" data-do="resolveEvent">Right</button>',
      closable: false,
    });
    expect(ownCrosses(decision)).toHaveLength(0);
    expect(decision.querySelectorAll('[data-do="resolveEvent"]').length).toBeGreaterThan(0);
  });

  it('gives the two Assign lists and the Menu exactly one each', () => {
    const state = workshop();
    const job = firstJob(state);
    const contract = state.contracts.find((entry) => entry.status === 'active');
    if (contract === undefined) throw new Error('a running contract is wanted');
    const drawn: Array<[string, string]> = [
      ['assign-job', renderWorkPlan(state, 'jobs', job.id)],
      ['assign-contract', renderWorkPlan(state, 'contracts', contract.id)],
      ['menu', renderMenu(state, { available: false, signedIn: null })],
    ];
    for (const [name, html] of drawn) {
      const node = parse(html).querySelector(`[data-popover="${name}"]`);
      expect(node, name).not.toBeNull();
      if (node === null) continue;
      const crosses = ownCrosses(node);
      expect(crosses.length, name).toBe(1);
      const wanted = POPOVERS.find((popover) => popover.name === name)?.close ?? '';
      expect(crosses[0]?.outerHTML, name).toBe(closeButton(wanted));
      // And nothing else in that markup is a popover without its own cross.
      for (const other of popoversIn(parse(html))) {
        expect(ownCrosses(other).length, `${name}: ${other.className}`).toBe(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The game itself: the why bubble, Escape and the click outside
// ---------------------------------------------------------------------------

/** Two men on sheet work with three days on the books behind them, and a contract running with
 *  the joiner on it: enough for every popover in the table to be opened for real. */
function workshop(): GameState {
  const state = runDays(twoMenOnSheetWork(), 3).state;
  const contract = drawContract(state);
  state.contracts.push(contract);
  acceptContract(state, contract.id);
  assignContract(state, contract.id, 'staff-1', true);
  // The books are written up to today, so a past day can be put back on the screen.
  state.booksUpToDay = state.clock.day;
  // The clock is stopped: a frame loop running behind this test is a day going by under it
  // (CLAUDE.md T7 3.10).
  state.speed = 0;
  return state;
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

function clickOutside(): void {
  // A click on the page itself, on nothing: what the player does when he has finished with a list.
  root().dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function shown(selector: string): boolean {
  return root().querySelector(selector) !== null;
}

/** A modal is open when the layer has its shell: the top bar's own push buttons carry the same
 *  `data-modal`, so the layer is named every time. */
function modalShown(id: string): boolean {
  return shown(`.modal-layer [data-modal="${id}"]`);
}

function dismissEvents(): void {
  let guard = 0;
  while (
    root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null &&
    guard < 50
  ) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

function openWorkPlan(): void {
  if (!shown('[data-office="workPlan"]')) click('[data-do="setView"][data-view="office"]');
  click('[data-office="workPlan"]');
}

describe('the game itself (CLAUDE.md T20 2.15)', () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    const started = currentState();
    if (started === null) throw new Error('no game');
    Object.assign(started, workshop());
    dismissEvents();
    render();
  });

  it('opens the why bubble on the one cross, and it is the only one in it', () => {
    click('[data-do="setView"][data-view="office"]');
    click('[data-office="binder"]');
    click('[data-do="accountingTab"][data-id="summary"]');
    click('[data-do="showWhy"][data-id="rent"]');
    const bubble = root().querySelector('[data-popover="why"]');
    expect(bubble).not.toBeNull();
    expect(bubble?.className).toBe('why-pop');
    if (bubble !== null) {
      const crosses = ownCrosses(bubble);
      expect(crosses).toHaveLength(1);
      expect(crosses[0]?.outerHTML).toBe(closeButton('closeWhy'));
      // The bubble's own "Right" button is gone: the cross is the one way out (T18 2.5).
      expect(bubble.querySelectorAll('button')).toHaveLength(1);
    }
    click('[data-popover="why"] .modal-close');
    expect(shown('[data-popover="why"]')).toBe(false);
    // And the third way out every popover has: a click outside it.
    click('[data-do="showWhy"][data-id="rent"]');
    expect(shown('[data-popover="why"]')).toBe(true);
    clickOutside();
    expect(shown('[data-popover="why"]')).toBe(false);
    click('.modal-layer [data-modal="accounting"] .modal-close');
  });

  it('shuts the topmost open one on Escape, in the order of the one table', () => {
    expect(ESCAPE_ORDER.map((layer) => layer.name)).toEqual([
      'assign list',
      'why',
      'day summary',
      // The drop card shuts before the Work Plan it was opened over, because Escape means "not that"
      // and the thing the player means is the question in front of him (CLAUDE.md T21 2.3).
      'drop card',
      'modal',
      'menu',
    ]);
    // The Assign list before the modal it hangs off.
    openWorkPlan();
    click('[data-do="openAssign"]');
    expect(shown('[data-popover="assign-job"]')).toBe(true);
    // The list hangs off the modal and sits inside it: the modal keeps its own one cross and the
    // list wears its own, and neither of them counts the other's.
    const modal = root().querySelector('.modal-layer [data-modal="workPlan"]');
    const list = root().querySelector('[data-popover="assign-job"]');
    expect(modal).not.toBeNull();
    if (modal !== null) expect(ownCrosses(modal)).toHaveLength(1);
    if (list !== null) expect(ownCrosses(list)).toHaveLength(1);
    press('Escape');
    expect(shown('[data-popover="assign-job"]')).toBe(false);
    expect(modalShown('workPlan')).toBe(true);
    press('Escape');
    expect(modalShown('workPlan')).toBe(false);
  });

  it('shuts the why bubble before the modal that asked the question', () => {
    click('[data-office="binder"]');
    click('[data-do="accountingTab"][data-id="summary"]');
    click('[data-do="showWhy"][data-id="rent"]');
    expect(shown('[data-popover="why"]')).toBe(true);
    press('Escape');
    expect(shown('[data-popover="why"]')).toBe(false);
    expect(modalShown('accounting')).toBe(true);
  });

  it('shuts the day summary before the books under it', () => {
    const state = currentState();
    expect(state === null ? null : summaryOfDay(state, 1)).not.toBeNull();
    click('[data-do="accountingTab"][data-id="days"]');
    click('[data-do="openDaySummary"][data-id="1"]');
    expect(modalShown('daySummary')).toBe(true);
    press('Escape');
    expect(modalShown('daySummary')).toBe(false);
    expect(modalShown('accounting')).toBe(true);
    press('Escape');
    expect(modalShown('accounting')).toBe(false);
  });

  it('finds the drop card and shuts it before the Work Plan it was opened over', () => {
    // The one action in the game that takes two clicks, so the card is a modal like any other: the
    // one cross, Escape before the board under it, and a click outside (CLAUDE.md T21 2.3).
    openWorkPlan();
    const before = currentState()?.jobs.length ?? 0;
    expect(before).toBeGreaterThan(0);
    click('[data-do="dropJob"]');
    expect(modalShown('dropJob')).toBe(true);
    const card = root().querySelector('.modal-layer [data-modal="dropJob"]');
    if (card !== null) expect(ownCrosses(card)).toHaveLength(1);
    press('Escape');
    expect(modalShown('dropJob')).toBe(false);
    expect(modalShown('workPlan')).toBe(true);
    // Escape is not a drop: the question is what closed, and the job is still on the books.
    expect(currentState()?.jobs.length).toBe(before);
    click('[data-do="dropJob"]');
    clickOutside();
    expect(modalShown('dropJob')).toBe(false);
    expect(currentState()?.jobs.length).toBe(before);
    press('Escape');
  });

  it('shuts the Menu last, after everything on the modal layer', () => {
    openWorkPlan();
    click('[data-do="toggleMenu"]');
    expect(modalShown('workPlan')).toBe(true);
    expect(shown('[data-popover="menu"]')).toBe(true);
    // The modal on the layer first, with the Menu still up behind it.
    press('Escape');
    expect(modalShown('workPlan')).toBe(false);
    expect(shown('[data-popover="menu"]')).toBe(true);
    // And then the Menu, which is the one popover Escape did not touch before tonight
    // (CLAUDE.md T20 2.15).
    press('Escape');
    expect(shown('[data-popover="menu"]')).toBe(false);
  });

  it('shuts the Menu on a click outside it, and the cross shuts it too', () => {
    click('[data-do="toggleMenu"]');
    expect(shown('[data-popover="menu"]')).toBe(true);
    clickOutside();
    expect(shown('[data-popover="menu"]')).toBe(false);
    click('[data-do="toggleMenu"]');
    click('[data-popover="menu"] .modal-close');
    expect(shown('[data-popover="menu"]')).toBe(false);
  });

  it('shuts the Assign list on a click outside it, and the cross shuts it too', () => {
    openWorkPlan();
    click('[data-do="openAssign"]');
    expect(shown('[data-popover="assign-job"]')).toBe(true);
    clickOutside();
    expect(shown('[data-popover="assign-job"]')).toBe(false);
    expect(modalShown('workPlan')).toBe(true);
    click('[data-do="openAssign"]');
    click('[data-popover="assign-job"] .modal-close');
    expect(shown('[data-popover="assign-job"]')).toBe(false);
    // And a click inside the list leaves it open: it is not the outside.
    click('[data-do="openAssign"]');
    const list = root().querySelector('[data-popover="assign-job"]');
    list?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(shown('[data-popover="assign-job"]')).toBe(true);
    click('[data-popover="assign-job"] .modal-close');
    press('Escape');
  });

  it('shuts the Contracts tab list the same way, on the same one cross', () => {
    openWorkPlan();
    click('[data-do="workPlanTab"][data-id="contracts"]');
    click('[data-do="openAssign"]');
    const list = root().querySelector('[data-popover="assign-contract"]');
    expect(list).not.toBeNull();
    if (list !== null) expect(ownCrosses(list)).toHaveLength(1);
    press('Escape');
    expect(shown('[data-popover="assign-contract"]')).toBe(false);
    press('Escape');
  });

  it('prints every popover it found', () => {
    const lines = POPOVERS.map(
      (popover) =>
        `  ${popover.name.padEnd(16)} ${popover.file.padEnd(22)} ` +
        `${popover.close.padEnd(12)} ${popover.what}`,
    );
    const excused = NOT_POPOVERS.map(([selector, why]) => `  ${selector.padEnd(24)} ${why}`);
    console.log(
      [
        `The popovers of the game, ${POPOVERS.length} of them, each with the one cross:`,
        ...lines,
        'Escape shuts them topmost first: ' + ESCAPE_ORDER.map((layer) => layer.name).join(', '),
        'Floating over the page but not popovers, with the reason:',
        ...excused,
      ].join('\n'),
    );
    expect(lines).toHaveLength(POPOVERS.length);
  });
});
