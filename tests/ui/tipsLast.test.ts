// @vitest-environment jsdom
// The first use bubble sits at the bottom of the screen, after its body, with a graphic
// exclamation mark before the sentence: the top is for what matters, not for tips (PIOTR, 16.09;
// CLAUDE.md T15 2.2). One helper puts it there for every screen, so the order cannot differ.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES, TIPS } from '../../src/engine/constants';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { renderTip } from '../../src/ui/tips';
import { buyStartingKit, fillRack, newGame } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const APP = readFileSync('src/ui/app.ts', 'utf8');

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

function body(id: string): Element {
  const node = root().querySelector(`.modal-layer [data-modal="${id}"] .modal-body`);
  if (node === null) throw new Error(`${id} is not open`);
  return node;
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

beforeAll(() => {
  document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 20));
  render();
  click('[data-do="setView"][data-view="office"]');
});

describe('the bubble', () => {
  it('carries the disc before the sentence, and the Right button after it', () => {
    const bubble = parse(renderTip(newGame(), 'board')).querySelector('.tip-bubble');
    expect(bubble).not.toBeNull();
    const children = Array.from(bubble?.children ?? []);
    expect(children.map((child) => child.getAttribute('class'))).toEqual(['tip-mark', 'tip-text', 'tip-close']);
    const mark = children[0];
    expect(mark?.tagName.toLowerCase()).toBe('svg');
    expect(mark?.querySelector('circle')).not.toBeNull();
    expect(mark?.querySelector('text')?.textContent).toBe('!');
    expect(children[1]?.textContent).toBe(TIPS.board);
    expect(children[2]?.getAttribute('data-do')).toBe('dismissTip');
    // The disc is the accent orange, the bang white in the title hand, the button a pill.
    expect(CSS).toContain('.tip-mark circle {\n  fill: var(--accent);');
    const glyph = CSS.slice(CSS.indexOf('.tip-mark text {'));
    expect(glyph.slice(0, glyph.indexOf('}'))).toContain('font-family: var(--font-title);');
    expect(glyph.slice(0, glyph.indexOf('}'))).toContain('fill: #fff;');
    const pill = CSS.slice(CSS.indexOf('.modal .tip-bubble button.tip-close {'));
    expect(pill.slice(0, pill.indexOf('}'))).toContain('border-radius: 999px;');
  });

  it('is the last child of the body on three screens, and Right dismisses it as before', () => {
    const screens: Array<[string, string, string]> = [
      ['catalogue', '[data-office="catalogue"]', 'catalogue'],
      ['workPlan', '[data-office="workPlan"]', 'workPlan'],
      ['board', '[data-office="orders"]', 'board'],
    ];
    for (const [id, opener, key] of screens) {
      closeModals();
      click(opener);
      dismissEvents();
      const node = body(id);
      const bubble = node.querySelector(`.tip-bubble[data-tip="${key}"]`);
      expect(bubble, id).not.toBeNull();
      expect(node.lastElementChild, id).toBe(bubble);
      expect(node.firstElementChild, id).not.toBe(bubble);
      expect(bubble?.querySelector('svg.tip-mark'), id).not.toBeNull();
      // Not floating over the content: in the flow of the body, so it scrolls with it.
      if (bubble !== null) {
        const position = getComputedStyle(bubble).position;
        expect(position, id).toMatch(/^(static|relative|)$/);
      }
      click(`[data-modal="${id}"] [data-do="dismissTip"][data-id="${key}"]`);
      expect(body(id).querySelector('.tip-bubble'), id).toBeNull();
      expect(currentState()?.tips.seen, id).toContain(key);
    }
    closeModals();
  });

  it('is the last child inside the laptop screen too, on the white panel of the software', () => {
    closeModals();
    click('[data-office="laptop"]');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    dismissEvents();
    click('[data-modal="laptop"] [data-tile="stock"]');
    const node = body('laptop');
    const bubble = node.querySelector('.tip-bubble[data-tip="stock"]');
    expect(bubble).not.toBeNull();
    expect(node.lastElementChild).toBe(bubble);
    expect(bubble?.querySelector('svg.tip-mark')).not.toBeNull();
    if (bubble !== null) {
      expect(getComputedStyle(bubble).backgroundColor).toBe('rgb(255, 255, 255)');
    }
    click('[data-modal="laptop"] [data-do="dismissTip"][data-id="stock"]');
    expect(body('laptop').querySelector('.tip-bubble')).toBeNull();
    closeModals();
  });

  it('comes through the one helper at every call site', () => {
    // renderTip is called once in app.ts, inside withTip; every screen goes through withTip.
    const calls = APP.match(/renderTip\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(APP).toContain('return body + renderTip(current, key);');
    expect((APP.match(/withTip\(/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
