// @vitest-environment jsdom
// The inside of a catalogue folder: one tile per class, with what each one does, what it costs
// and what it takes of the floor (CLAUDE.md T3 3.5, T7 3.7).

import { describe, expect, it } from 'vitest';
import { renderCatalogue } from '../../src/ui/catalogue';
import { recommendedVariant, renderMachine } from '../../src/ui/machine';
import { findSpec } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { buyNow, newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function tiles(state: GameState, specId: string): HTMLElement[] {
  return Array.from(parse(renderMachine(state, specId)).querySelectorAll('.tile'));
}

function text(node: Element | null): string {
  return node?.textContent ?? '';
}

describe('the catalogue lists folders', () => {
  it('gives every family a folder, and the money is spent inside it', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const saws = parse(renderCatalogue(state, '', 'sheetMachines'));
    expect(saws.querySelector('[data-do="openFolder"][data-id="tableSaw"]')).not.toBeNull();
    expect(saws.querySelector('[data-do="buyEquipment"][data-id="tableSaw"]')).toBeNull();
    expect(saws.innerHTML).toContain('from £1,800');
    expect(saws.innerHTML).toContain('5 classes');
    // A locker has one class and it is in a folder like everything else (CLAUDE.md T7 3.7).
    const storage = parse(renderCatalogue(state, '', 'storage'));
    expect(storage.querySelector('[data-do="openFolder"][data-id="locker"]')).not.toBeNull();
    const open = parse(renderCatalogue(state, '', 'storage', 'locker'));
    expect(open.querySelector('[data-do="buyEquipment"][data-id="locker"]')).not.toBeNull();
  });
});

describe('the tiles inside a folder', () => {
  it('draws five tiles for the saw and one for the compressor', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(tiles(state, 'tableSaw')).toHaveLength(5);
    expect(tiles(state, 'compressor')).toHaveLength(1);
    expect(tiles(state, 'extractor')).toHaveLength(1);
  });

  it('names each class, prices it, describes it and lists what it does', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const used = tiles(state, 'tableSaw')[0];
    if (!used) throw new Error('no tile');
    expect(text(used.querySelector('.tile-name')).trim()).toBe('Used table saw');
    expect(text(used.querySelector('.tile-price'))).toBe('£1,800');
    expect(text(used.querySelector('.tile-text')).length).toBeGreaterThan(80);
    const effects = Array.from(used.querySelectorAll('.tile-figures')).map((line) =>
      text(line),
    );
    expect(effects).toEqual([
      'Output -5%',
      'Bag every 1,200 min of use',
      'Life about 750 hours',
      'Power 3 a day',
      'Takes 2 by 1 m on a 3 by 3 m zone',
      // What he waits for after he has paid for it (CLAUDE.md T8 3.2).
      'Delivered in 1 working day',
    ]);
    const industrial = tiles(state, 'tableSaw')[4];
    const bigEffects = Array.from(industrial?.querySelectorAll('.tile-figures') ?? []).map(
      (line) => text(line),
    );
    expect(bigEffects).toEqual([
      'Output +30%',
      'Bag every 4,800 min of use',
      'Life about 6,000 hours',
      'Power 7 a day',
      'Takes 4 by 2 m on a 5 by 4 m zone',
      'Delivered in 12 working days',
    ]);
  });

  it('gives every tile a picture slot with the family key and the class as the tier', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const slots = Array.from(
      parse(renderMachine(state, 'tableSaw')).querySelectorAll('.tile-picture'),
    );
    expect(slots).toHaveLength(5);
    expect(slots.map((slot) => slot.getAttribute('data-tier'))).toEqual([
      'used',
      'budget',
      'standard',
      'pro',
      'industrial',
    ]);
    expect(slots.every((slot) => slot.getAttribute('data-sprite') === 'tableSaw')).toBe(true);
    // Piotr delivered a picture per class of the saw, so the tile shows it rather than a box
    // (CLAUDE.md T3 3.6, T7 3.5).
    expect(slots.every((slot) => slot.querySelector('img') !== null)).toBe(true);
    // And a family with no file at all still gets its box. The compressor has a picture since
    // 13.09, so the family with none is the pelletiser's neighbour that has no art yet: the CNC.
    const boxes = Array.from(
      parse(renderMachine(state, 'cnc')).querySelectorAll('.tile-picture'),
    );
    expect(boxes.every((slot) => slot.querySelector('.tile-picture-box') !== null)).toBe(true);
  });

  it('puts the one accent button on the cheapest class the workshop can pay for', () => {
    const easy = newGame({ difficulty: 'easy' });
    expect(recommendedVariant(easy, findSpec('tableSaw') ?? { variants: [] } as never)).toBe('used');
    const page = parse(renderMachine(easy, 'tableSaw'));
    const accents = Array.from(page.querySelectorAll('.btn-primary'));
    expect(accents).toHaveLength(1);
    expect(accents[0]?.getAttribute('data-variant')).toBe('used');
  });

  it('greys the classes the workshop cannot pay for, with the reason as text', () => {
    const broke = newGame({ difficulty: 'hard' });
    const page = parse(renderMachine(broke, 'tableSaw'));
    const locked = Array.from(page.querySelectorAll('.tile.is-locked'));
    expect(locked.length).toBeGreaterThan(0);
    expect(page.innerHTML).toContain('Not enough cash');
    for (const tile of locked) {
      const buy = tile.querySelector('button');
      expect(buy instanceof HTMLButtonElement && buy.disabled).toBe(true);
    }
  });

  it('says how many of the family are already in the hall', () => {
    const state = buyNow(newGame({ difficulty: 'veryEasy' }), 'tableSaw', 'pro');
    expect(parse(renderMachine(state, 'tableSaw')).innerHTML).toContain('One is in the hall already.');
  });
});
