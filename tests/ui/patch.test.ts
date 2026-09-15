// @vitest-environment jsdom
// The patch keeps what is the player's: a control keeps its node, a field its value, and a
// details element its open state, because the render never carries that and the efficiency plate
// on the top bar would shut every game minute otherwise (CLAUDE.md T9 3.8, T13 3.5).

import { describe, expect, it } from 'vitest';
import { patchInto } from '../../src/ui/patch';

function target(html: string): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

const PLATE =
  '<details class="efficiency"><summary>Efficiency 73%</summary>' +
  '<div class="efficiency-plate">lines</div></details>';

describe('a details element under the patch', () => {
  it('stays open through a render whose markup does not say open', () => {
    const page = target(PLATE);
    const details = page.querySelector('details');
    if (!(details instanceof HTMLDetailsElement)) throw new Error('no details');
    details.open = true;
    patchInto(page, PLATE.replace('73%', '71%'));
    expect(page.querySelector('details')).toBe(details);
    expect(details.open).toBe(true);
    expect(page.querySelector('summary')?.textContent).toBe('Efficiency 71%');
  });

  it('stays shut when the player has not opened it', () => {
    const page = target(PLATE);
    patchInto(page, PLATE.replace('73%', '71%'));
    expect(page.querySelector('details')?.hasAttribute('open')).toBe(false);
  });

  it('opens when the markup itself says open', () => {
    const page = target(PLATE);
    patchInto(page, PLATE.replace('<details', '<details open'));
    expect(page.querySelector('details')?.hasAttribute('open')).toBe(true);
  });

  it('keeps every other attribute in line with the markup, as before', () => {
    const page = target('<details class="efficiency" data-efficiency="73"><summary>x</summary></details>');
    patchInto(page, '<details class="efficiency" data-efficiency="71"><summary>x</summary></details>');
    expect(page.querySelector('details')?.getAttribute('data-efficiency')).toBe('71');
    patchInto(page, '<details class="efficiency"><summary>x</summary></details>');
    expect(page.querySelector('details')?.hasAttribute('data-efficiency')).toBe(false);
  });
});

describe('a control under the patch', () => {
  it('keeps its node while its action and id are the same', () => {
    const page = target('<button data-do="endDay" data-id="a">End day</button>');
    const before = page.querySelector('button');
    patchInto(page, '<button data-do="endDay" data-id="a" class="btn">End the day</button>');
    expect(page.querySelector('button')).toBe(before);
    expect(before?.textContent).toBe('End the day');
    expect(before?.className).toBe('btn');
    patchInto(page, '<button data-do="skipDay" data-id="a">Stay home</button>');
    expect(page.querySelector('button')).not.toBe(before);
  });
});
