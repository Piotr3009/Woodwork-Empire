// @vitest-environment jsdom
// The paint of the two families, and the hover rectangles of the office room. "The white squares
// on the laptop and the door still show" (PIOTR, 15.09; CLAUDE.md T11 3.5).

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { mount } from '../../src/ui/app';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

/** The body of one rule of the stylesheet, by its selector. */
function ruleBody(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no rule for ${selector}`);
  const open = CSS.indexOf('{', at);
  const close = CSS.indexOf('}', open);
  return CSS.slice(open + 1, close);
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

beforeAll(() => {
  document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  let guard = 0;
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
  click('[data-do="setView"][data-view="office"]');
});

describe('the hover rectangles of the office room', () => {
  it('has no fill at all and no border at rest, in the computed style', () => {
    const region = root().querySelector('.office-region');
    if (!(region instanceof HTMLElement)) throw new Error('no office region');
    const style = getComputedStyle(region);
    // No fill and no border: what the player sees at rest is the painted room.
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.background).toBe('rgba(0, 0, 0, 0)');
    expect(style.borderTopWidth).toBe('0px');
    // The outline is there and it is invisible until the mouse is on it.
    expect(style.outline).toBe('2px solid transparent');
  });

  it('puts a 2 px orange outline with a 4 px radius on the hover, and nothing else', () => {
    const rest = ruleBody('.office-region');
    expect(rest).toContain('background: transparent;');
    expect(rest).toContain('outline: 2px solid transparent;');
    expect(rest).toContain('border-radius: 4px;');
    const hover = ruleBody('.office-region:hover,\n.office-region:focus-visible');
    expect(hover).toContain('outline-color: var(--accent);');
    expect(hover).toContain('background: transparent;');
    // The white box of Turn 10 is gone, everywhere in the stylesheet.
    expect(CSS).not.toContain('rgb(255 255 255 / 12%)');
  });

  it('writes nothing about the hover into the markup', () => {
    const page = root().innerHTML;
    expect(page).not.toContain('is-hover');
    for (const region of Array.from(root().querySelectorAll('[data-office]'))) {
      expect(region.getAttribute('style') ?? '').not.toContain('background');
    }
  });
});

describe('the board family', () => {
  it('is dark steel in an inner frame, drawn in CSS and not a picture', () => {
    const board = ruleBody('.modal-board');
    expect(board).toContain('#4a4f54');
    expect(board).toContain('#3a3f44');
    expect(board).toContain('#24282c');
    expect(board).not.toContain('url(');
  });

  it('holds the head with a red magnet and the cards with blue ones', () => {
    expect(CSS).toContain('--magnet-red: #c0392b;');
    expect(CSS).toContain('--magnet-blue: #2f6fb0;');
    expect(CSS).toContain('.modal-board .modal-head::before');
  });

  it('tilts the cards between minus one and one and a half degrees', () => {
    const tilts: number[] = [];
    for (const block of CSS.split('}')) {
      if (!block.includes('.modal-board')) continue;
      const found = /transform: rotate\((-?[\d.]+)deg\)/.exec(block);
      if (found !== null) tilts.push(Number(found[1]));
    }
    expect(tilts.length).toBeGreaterThanOrEqual(3);
    for (const angle of tilts) {
      expect(angle).toBeGreaterThanOrEqual(-1);
      expect(angle).toBeLessThanOrEqual(1.5);
    }
  });

  it('paints its buttons light yellow, cream, salmon and grey', () => {
    expect(ruleBody('.modal-board button.btn-primary:not(.chip)')).toContain('#f5e27a');
    expect(ruleBody('.modal-board button:not(.chip):not(.modal-close)')).toContain(
      'background: var(--card);',
    );
    expect(CSS).toContain('#ff8a80');
    expect(ruleBody('.modal-board button[disabled]:not(.chip)')).toContain('#b9bdc1');
    // Hover is the game's orange on both families.
    expect(
      ruleBody('.modal-board button:not(.chip):not(.modal-close):hover:not([disabled])'),
    ).toContain('var(--accent)');
  });
});

describe('the paper family on the rest of the modals', () => {
  it('scales the same folder down for a small modal and a wide one', () => {
    expect(CSS).toContain('.modal-folder:not(.modal-full):not(.modal-wide) {');
    expect(CSS).toContain('.modal-folder.modal-wide {');
    expect(ruleBody('.modal-folder')).toContain("url('/sprites/ui.folder.png')");
  });
});
