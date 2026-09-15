// @vitest-environment jsdom
// The inside of a catalogue folder: one tile per class, with what each one does, what it costs
// and what it takes of the floor (CLAUDE.md T3 3.5, T7 3.7).

import { describe, expect, it } from 'vitest';
import { renderCatalogue } from '../../src/ui/catalogue';
import { recommendedVariant, renderMachine } from '../../src/ui/machine';
import { deliveryDaysFor, enduranceHoursFor, findSpec, plural } from '../../src/engine/index';
import { DUST_WASTE_MONTHLY } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { money } from '../../src/ui/modal';
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

/** The lines of figures on a tile, top to bottom. */
function figures(tile: Element | undefined): string[] {
  return Array.from(tile?.querySelectorAll('.tile-figures') ?? []).map((line) => text(line));
}

function lifeLine(specId: string, variantId: string): string {
  return `Life about ${enduranceHoursFor(specId, variantId).toLocaleString('en-GB')} hours`;
}

function deliveryLine(specId: string, variantId: string): string {
  return `Delivered in ${plural(deliveryDaysFor(specId, variantId), 'working day', 'working days')}`;
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
  it('draws five tiles for the saw, the compressor and the extractor, one for the thicknesser', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(tiles(state, 'tableSaw')).toHaveLength(5);
    // The extraction and air families got their five classes in Turn 10 (CLAUDE.md T10 3.4).
    expect(tiles(state, 'compressor')).toHaveLength(5);
    expect(tiles(state, 'extractor')).toHaveLength(5);
    expect(tiles(state, 'thicknesser')).toHaveLength(1);
    expect(tiles(state, 'airDryer')).toHaveLength(1);
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
    // In Piotr's order: what it does to the work, what it makes, what it needs of the air, how
    // long it lasts, what it draws, what it takes of the floor (CLAUDE.md T12 3.1).
    expect(effects).toEqual([
      'Output -5%',
      'Dust 0.015 m\u00b3/h of use',
      // What it asks of the fans while somebody is standing at it (CLAUDE.md T10 3.1).
      'Needs 800 m\u00b3/h of extraction',
      'Life about 750 hours',
      'Power 3 a day',
      'Takes 2 m by 1 m, works in 3 m by 3 m',
      // What he waits for after he has paid for it (CLAUDE.md T8 3.2).
      'Delivered in 1 working day',
    ]);
    const industrial = tiles(state, 'tableSaw')[4];
    expect(figures(industrial)).toEqual([
      'Output +30%',
      'Dust 0.015 m\u00b3/h of use',
      'Needs 2,200 m\u00b3/h of extraction',
      'Life about 6,000 hours',
      'Power 7 a day',
      'Takes 4 m by 2 m, works in 5 m by 4 m',
      'Delivered in 12 working days',
    ]);
  });

  it('writes the dust in cubic metres an hour of use, the same on every class of the family', () => {
    // A dearer saw does not make more dust: the material makes the dust, not the price of the
    // machine (PIOTR, CLAUDE.md T12 2.1). The line is the family's and it is on every card.
    const state = newGame({ difficulty: 'veryEasy' });
    for (const card of tiles(state, 'tableSaw')) {
      expect(figures(card)[1], card.getAttribute('data-variant') ?? '').toBe(
        'Dust 0.015 m\u00b3/h of use',
      );
    }
    const standard = figures(tiles(state, 'tableSaw')[2]);
    expect(standard[0]).toBe('Output +5%');
    expect(standard[1]).toBe('Dust 0.015 m\u00b3/h of use');
    expect(standard[2]).toBe('Needs 1,100 m\u00b3/h of extraction');
    expect(standard[3]).toBe(lifeLine('tableSaw', 'standard'));
    expect(standard[4]).toMatch(/^Power \d+ a day$/);
    expect(standard[5]).toBe('Takes 3 m by 1 m, works in 4 m by 3 m');
    // Three decimals with the trailing zeros trimmed, and "none" where the family makes nothing.
    expect(figures(tiles(state, 'thicknesser')[0])[1]).toBe('Dust 0.25 m\u00b3/h of use');
    expect(figures(tiles(state, 'cnc')[0])[1]).toBe('Dust 0.06 m\u00b3/h of use');
    expect(figures(tiles(state, 'compressor')[0])[1]).toBe('Dust none');
  });

  it('colours the output line by its sign, and nothing else on the card', () => {
    const cards = tiles(newGame({ difficulty: 'veryEasy' }), 'tableSaw');
    const outputLine = (card: Element | undefined): string =>
      card?.querySelector('.tile-figures')?.className ?? '';
    // Used at -5%, budget as a standard machine, industrial at +30%: red, the body colour, green.
    expect(outputLine(cards[0])).toBe('tile-figures bad');
    expect(figures(cards[1])[0]).toBe('Output as a standard machine');
    expect(outputLine(cards[1])).toBe('tile-figures');
    expect(outputLine(cards[4])).toBe('tile-figures good');
    for (const card of cards) {
      const rest = Array.from(card.querySelectorAll('.tile-figures')).slice(1);
      expect(rest.every((line) => line.className === 'tile-figures')).toBe(true);
    }
  });

  it('says what a fan holds, in bags and in cubic metres, and that a central system holds nothing', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const pro = tiles(state, 'extractor')[3];
    expect(pro?.getAttribute('data-variant')).toBe('pro');
    // A fan has no output of its own and makes nothing: what it pulls, what its bags hold, then
    // the life, the power and the floor as on every card (CLAUDE.md T12 3.2).
    expect(figures(pro)).toEqual([
      'Pulls 3,600 m\u00b3/h',
      'Bags 4, holds 4 m\u00b3',
      lifeLine('extractor', 'pro'),
      'Power 8 a day',
      'Takes 3 m by 1 m, works in 3 m by 1 m',
      deliveryLine('extractor', 'pro'),
    ]);
    expect(figures(tiles(state, 'extractor')[4])).toContain('Bags 10, holds 10 m\u00b3');
    expect(figures(tiles(state, 'extractor')[0])).toContain('Bags 1, holds 1 m\u00b3');
    const central = figures(tiles(state, 'dustSystem')[0]);
    expect(central[0]).toBe('Pulls 12,000 m\u00b3/h');
    expect(central[1]).toBe(`No bags. Waste collection ${money(DUST_WASTE_MONTHLY)} a month`);
    expect(central[1]).toBe('No bags. Waste collection \u00a3400 a month');
    expect(figures(tiles(state, 'flexiSystem')[0])[1]).toBe(central[1]);
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
