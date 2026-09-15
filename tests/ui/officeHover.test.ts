// @vitest-environment jsdom
// Pointing at a thing in the office lights the thing, not a rectangle around it, and names it
// (PIOTR, 15.09; CLAUDE.md T14 2.2). All of it is :hover in the stylesheet: the game writes no
// pointer state and never did (T9 3.4, T11 3.5), so nothing can blink with the clock.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  OFFICE_LIT_LAYERS,
  OFFICE_REGIONS,
  officeLitLayersOf,
  officeRegionsOf,
  renderOffice,
} from '../../src/render/office';
import { currentState, mount, render } from '../../src/ui/app';
import { buyNow, newGame } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const VIEWPORT = { width: 1280, height: 800 };

/** Every rule of the stylesheet as [selector list, body], comments stripped. */
function rules(): Array<[string, string]> {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map((found) => [
    (found[1] ?? '').trim(),
    found[2] ?? '',
  ]);
}

/** The bodies of every rule whose selector list carries exactly this selector. */
function bodiesFor(selector: string): string[] {
  return rules()
    .filter(([selectors]) => selectors.split(',').map((one) => one.trim()).includes(selector))
    .map(([, body]) => body);
}

/** Every rule whose selector list mentions all of these pieces. */
function rulesMentioning(...pieces: string[]): Array<[string, string]> {
  return rules().filter(([selectors]) => pieces.every((piece) => selectors.includes(piece)));
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

function furnished() {
  let state = newGame({ difficulty: 'veryEasy' });
  for (const specId of ['desk', 'chair', 'laptop']) state = buyNow(state, specId);
  return state;
}

function room(files: string[], state = furnished()): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderOffice(state, VIEWPORT, files);
  return holder;
}

describe('the label', () => {
  it('names every region off the table, the floor catalogue included, and invents nothing in CSS', () => {
    // The names of the brief, one place (CLAUDE.md T14 2.2).
    expect(Object.fromEntries(OFFICE_REGIONS.map((region) => [region.id, region.name]))).toEqual({
      workPlan: 'Work plan',
      orders: 'Orders',
      door: 'To the hall',
      clock: 'Clock',
      laptop: 'Laptop',
      catalogue: 'Catalogue',
      binder: 'Accounts',
      company: 'Company board',
    });
    const state = furnished();
    const node = room(['officeCompanyBoard.png', 'catalogueFloor.png'], state);
    for (const region of officeRegionsOf(state)) {
      const element = node.querySelector(`[data-office="${region.id}"]`);
      expect(element, region.id).not.toBeNull();
      const labels = element?.querySelectorAll(':scope > .office-label') ?? [];
      expect(labels, region.id).toHaveLength(1);
      expect(labels[0]?.textContent, region.id).toBe(region.name);
      // A child of the region every time, and no tooltip beside it.
      expect(element?.getAttribute('title'), region.id).toBeNull();
    }
    // Before the desk the book lies on the floor and the label says so.
    const floor = room([], newGame());
    expect(floor.querySelector('[data-office="catalogue"] .office-label')?.textContent).toBe(
      'Catalogue, on the floor',
    );
    // Nothing is lettered in the stylesheet: no content on the label, ever.
    for (const [selectors, body] of rules()) {
      if (selectors.includes('office-label')) expect(body, selectors).not.toContain('content:');
    }
    // The pill: the title hand, dark green on cream, turned a little, shown on the pointer alone.
    const pill = bodiesFor('.office-label').join('');
    expect(pill).toContain('font-family: var(--font-title);');
    expect(pill).toContain('background: rgba(16, 37, 24, 0.85);');
    expect(pill).toContain('color: var(--cream);');
    expect(pill).toContain('transform: rotate(-3deg);');
    expect(pill).toContain('opacity: 0;');
    expect(bodiesFor('.office-region:hover .office-label').join('')).toContain('opacity: 1;');
  });
});

describe('the outline', () => {
  it('is gone from the pointer, and the ring stays on :focus-visible for the keyboard', () => {
    // No outline-color rule for the pointer anywhere in the stylesheet (CLAUDE.md T14 2.2).
    for (const [selectors, body] of rules()) {
      const onPointer = selectors
        .split(',')
        .map((one) => one.trim())
        .some((one) => one.startsWith('.office-region') && one.includes(':hover'));
      if (onPointer) expect(body, selectors).not.toContain('outline');
    }
    expect(bodiesFor('.office-region').join('')).toContain('outline: 2px solid transparent;');
    expect(bodiesFor('.office-region:focus-visible').join('')).toContain('outline-color: var(--accent);');
    // And the orange drop shadows Turn 11 put on the two painted objects are gone with it.
    expect(CSS).not.toContain('.office-company-board.is-art:hover');
    expect(CSS).not.toContain('.office-floor-catalogue.is-art:hover');
  });
});

describe('the glow and the spot', () => {
  it('lights the laptop layer in its own shape, off the region beside it, with no JavaScript', () => {
    const glow = rulesMentioning('[data-office="laptop"]:hover', '[data-layer="officeLaptop"]');
    expect(glow).toHaveLength(1);
    const [selectors, body] = glow[0] ?? ['', ''];
    // The region and the layer are siblings in the stack, so the stack is asked with :has().
    expect(selectors).toContain('.office-stack:has(');
    expect(body).toContain(
      'filter: drop-shadow(0 0 14px rgba(245, 239, 226, 0.75)) drop-shadow(0 0 30px rgba(224, 115, 30, 0.45));',
    );
    // The laptop gets the glow and not the spot as well.
    const noSpot = rulesMentioning('.office-region[data-office="laptop"]:hover');
    expect(noSpot.some(([, rule]) => rule.includes('background-image: none;'))).toBe(true);
  });

  it('gives every other thing a soft light spot fitted to the region, no edge, no rectangle', () => {
    const spot = bodiesFor('.office-stack .office-region:hover').join('');
    expect(spot).toContain(
      'background-image: radial-gradient(ellipse at center, rgba(245, 239, 226, 0.28), transparent 70%);',
    );
    expect(spot).not.toContain('outline');
    expect(spot).not.toContain('border');
    expect(spot).not.toContain('box-shadow');
  });

  it('is CSS only: no pointer word in the TypeScript of the views or the renderers', () => {
    const files = [...sourceFiles('src/ui'), ...sourceFiles('src/render')];
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(/mouseenter|mouseover|hover/i.test(text), file).toBe(false);
    }
  });
});

describe('the lit door', () => {
  it('is laid over the room through the file check when its picture exists, and the spot goes', () => {
    expect(OFFICE_LIT_LAYERS).toEqual([{ key: 'officeDoorLit', name: 'Office door, lit', region: 'door' }]);
    expect(officeLitLayersOf([])).toEqual([]);
    expect(officeLitLayersOf(['officeDoorLit.png'])).toEqual(OFFICE_LIT_LAYERS);
    const lit = room(['officeDoorLit.png', 'officeBackground.png']);
    const overlay = lit.querySelector('.office-layer.office-lit');
    expect(overlay?.getAttribute('data-layer')).toBe('officeDoorLit');
    expect(overlay?.getAttribute('data-lit')).toBe('door');
    expect(overlay?.getAttribute('src')).toBe('/sprites/officeDoorLit.png');
    // Over the background and under the desk and the laptop, which stand in front of the door.
    expect(overlay?.previousElementSibling?.getAttribute('data-layer')).toBe('officeBackground');
    expect(overlay?.nextElementSibling?.getAttribute('data-layer')).toBe('officeDesk');
    expect(lit.querySelector('.office-stack')?.getAttribute('data-lit')).toBe('door');
    // Without the file: no overlay, no data-lit, and the door keeps its spot.
    const bare = room([]);
    expect(bare.querySelector('.office-lit')).toBeNull();
    expect(bare.querySelector('.office-stack')?.hasAttribute('data-lit')).toBe(false);
    // The stylesheet shows it on the door's pointer and takes the spot off that door.
    const shown = rulesMentioning('[data-office="door"]:hover', '.office-lit[data-lit="door"]');
    expect(shown).toHaveLength(1);
    expect(shown[0]?.[1]).toContain('opacity: 1;');
    expect(bodiesFor('.office-lit').join('')).toContain('opacity: 0;');
    const noSpot = rulesMentioning('[data-lit~="door"]', '[data-office="door"]:hover');
    expect(noSpot.some(([, rule]) => rule.includes('background-image: none;'))).toBe(true);
  });
});

describe('on the page', () => {
  beforeAll(() => {
    document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
    mount(document.querySelector('#app') as HTMLElement);
    const start = document.querySelector('[data-do="startGame"]');
    start?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const state = currentState();
    if (state === null) throw new Error('no game');
    Object.assign(state, furnished());
    render();
    document
      .querySelector('[data-do="setView"][data-view="office"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  it('draws every label hidden at rest, and every region without a fill or a rectangle', () => {
    const regions = Array.from(document.querySelectorAll('#app [data-office]'));
    expect(regions.length).toBeGreaterThan(5);
    for (const region of regions) {
      const style = getComputedStyle(region);
      expect(style.backgroundColor, region.getAttribute('data-office') ?? '').toBe('rgba(0, 0, 0, 0)');
      expect(style.outline).toBe('2px solid transparent');
      const label = region.querySelector('.office-label');
      expect(label, region.getAttribute('data-office') ?? '').not.toBeNull();
      if (label !== null) expect(getComputedStyle(label).opacity).toBe('0');
      // Nothing about the pointer is written into the markup (CLAUDE.md T9 3.4).
      expect(region.outerHTML).not.toContain('hover');
      expect(region.getAttribute('title')).toBeNull();
    }
  });
});
