// @vitest-environment jsdom
// The inside of a catalogue folder: one tile per class, with what each one does, what it costs
// and what it takes of the floor (CLAUDE.md T3 3.5, T7 3.7).

import { describe, expect, it } from 'vitest';
import { renderCatalogue } from '../../src/ui/catalogue';
import { isMachineFamily, recommendedVariant, renderMachine } from '../../src/ui/machine';
import { deliveryDaysFor, enduranceHoursFor, findSpec, plural } from '../../src/engine/index';
import {
  CLASS_BADGE,
  CLASS_ORDER,
  DUST_WASTE_MONTHLY,
  EQUIPMENT_SPECS,
  GATE_OUTPUT_BONUS,
  PROPERTY_INSURANCE_RATE_YEARLY,
} from '../../src/engine/constants';
import { insuranceAddedYearly } from '../../src/engine/machines';
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

function insuranceLine(price: number): string {
  return `Insurance ${money(insuranceAddedYearly(price))} a year`;
}

/** The class specific line every class with a drop carries (CLAUDE.md T13 3.11). */
const GATE_LINE = `Takes an automatic gate: output +${Math.round(GATE_OUTPUT_BONUS * 100)}% once fitted`;

/** The lines of the effects block and of the costs block, top to bottom (CLAUDE.md T13 3.1). */
function effects(tile: Element | undefined): string[] {
  return Array.from(tile?.querySelectorAll('.card-effects .tile-figures') ?? []).map((line) =>
    text(line),
  );
}

function costs(tile: Element | undefined): string[] {
  return Array.from(tile?.querySelectorAll('.card-costs .tile-figures') ?? []).map((line) =>
    text(line),
  );
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

describe('the Tool cabinets folder (CLAUDE.md T22 2.12)', () => {
  it('lists the five, each with what it holds, and the class ladder words of the machines', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    // The folder is under Storage with the racks and the benches, and the money is spent inside it.
    const storage = parse(renderCatalogue(state, '', 'storage'));
    expect(storage.querySelector('[data-do="openFolder"][data-id="toolCabinet"]')).not.toBeNull();
    expect(storage.innerHTML).toContain('from £90');
    expect(storage.innerHTML).toContain('5 classes');
    const cards = tiles(state, 'toolCabinet');
    expect(cards).toHaveLength(5);
    // What a class is for is how many men's hand tools it holds [PIOTR, 19.09], and it is on the
    // effect line of every one of the five.
    expect(cards.map((tile) => effects(tile).find((line) => line.startsWith('Holds')))).toEqual([
      'Holds 1 man\u0027s tools',
      'Holds 1 man\u0027s tools',
      'Holds 2 men\u0027s tools',
      'Holds 4 men\u0027s tools',
      'Holds 8 men\u0027s tools',
    ]);
    expect(cards.map((tile) => text(tile.querySelector('.tile-price')))).toEqual([
      '£90',
      '£175',
      '£350',
      '£700',
      '£1,400',
    ]);
    // The class ladder words are the machines': the badge of every class, off the one table
    // (CLAUDE.md T13 3.12).
    expect(cards.map((tile) => text(tile.querySelector('.badge')))).toEqual([
      'Used',
      'Budget',
      'Standard',
      'Pro',
      'Industrial',
    ]);
    expect(isMachineFamily(findSpec('toolCabinet') ?? ({} as never))).toBe(true);
    // And the floor each one wants, which is the picture's own footprint, and the working room,
    // which is the same cells: a cabinet reserves exactly what it stands on (CLAUDE.md T22 2.12).
    expect(cards.map((tile) => costs(tile).find((line) => line.startsWith('Takes')))).toEqual([
      'Takes 1 m by 1 m, works in 1 m by 1 m',
      'Takes 1 m by 1 m, works in 1 m by 1 m',
      'Takes 2 m by 1 m, works in 2 m by 1 m',
      'Takes 2 m by 1 m, works in 2 m by 1 m',
      'Takes 3 m by 1 m, works in 3 m by 1 m',
    ]);
  });
});

describe('the tiles inside a folder', () => {
  it('draws five tiles for the saw, the compressor, the extractor and the thicknesser, one for the dryer', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(tiles(state, 'tableSaw')).toHaveLength(5);
    // The extraction and air families got their five classes in Turn 10 (CLAUDE.md T10 3.4).
    expect(tiles(state, 'compressor')).toHaveLength(5);
    expect(tiles(state, 'extractor')).toHaveLength(5);
    // Every machine family has its five classes from Turn 13 (CLAUDE.md T13 3.12).
    expect(tiles(state, 'thicknesser')).toHaveLength(5);
    expect(tiles(state, 'airDryer')).toHaveLength(1);
  });

  it('names each class, prices it, describes it and lists what it does', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const used = tiles(state, 'tableSaw')[0];
    if (!used) throw new Error('no tile');
    expect(text(used.querySelector('.tile-name')).replace(/\s+/g, ' ').trim()).toBe(
      'Used table saw Used',
    );
    expect(text(used.querySelector('.tile-price'))).toBe('£1,800');
    expect(text(used.querySelector('.tile-text')).length).toBeGreaterThan(80);
    // The effects, in Piotr's order: what it does to the work, what it makes, what it needs of
    // the air, how long it lasts, and what its class alone does (CLAUDE.md T12 3.1, T13 3.1).
    expect(effects(used)).toEqual([
      'Output -5%',
      'Dust 0.015 m\u00b3/h of use',
      // What it asks of the fans while somebody is standing at it (CLAUDE.md T10 3.1).
      'Needs 800 m\u00b3/h of extraction',
      'Life about 750 hours',
      GATE_LINE,
    ]);
    // Then the costs: the price, the wait, the power, the insurance it adds a year and the floor
    // it takes (CLAUDE.md T13 3.1, 3.15).
    expect(costs(used)).toEqual([
      // What he waits for after he has paid for it (CLAUDE.md T8 3.2).
      'Delivered in 1 working day',
      'Power 3 a day',
      insuranceLine(1800),
      'Takes 2 m by 1 m, works in 3 m by 3 m',
    ]);
    expect(insuranceAddedYearly(1800)).toBe(1800 * PROPERTY_INSURANCE_RATE_YEARLY);
    expect(insuranceLine(1800)).toBe('Insurance \u00a336 a year');
    const industrial = tiles(state, 'tableSaw')[4];
    expect(effects(industrial)).toEqual([
      'Output +30%',
      'Dust 0.015 m\u00b3/h of use',
      'Needs 2,200 m\u00b3/h of extraction',
      'Life about 6,000 hours',
      GATE_LINE,
    ]);
    expect(text(industrial?.querySelector('.tile-price') ?? null)).toBe('\u00a325,000');
    expect(costs(industrial)).toEqual([
      'Delivered in 12 working days',
      'Power 7 a day',
      insuranceLine(25000),
      'Takes 4 m by 2 m, works in 5 m by 4 m',
    ]);
  });

  it('prints effects, then costs, then the description, in that order on every card', () => {
    // One layout function for every family (PIOTR; CLAUDE.md T13 3.1).
    const state = newGame({ difficulty: 'veryEasy' });
    for (const spec of EQUIPMENT_SPECS) {
      for (const card of tiles(state, spec.id)) {
        const blocks = card.querySelectorAll('.card-effects, .card-costs, .card-description');
        expect(
          Array.from(blocks).map((block) => block.className.split(' ').pop()),
          `${spec.id}.${card.getAttribute('data-variant') ?? ''}`,
        ).toEqual(['card-effects', 'card-costs', 'card-description']);
        // The price is the first cost, and the description is the body font.
        expect(card.querySelector('.card-costs > :first-child')?.className).toBe('tile-price');
        expect(card.querySelector('.card-description')?.classList.contains('tile-text')).toBe(true);
      }
    }
  });

  it('wears the badge and the frame colour of its class, the same across families', () => {
    // One CLASS_BADGE table, five entries, in the order of the one ladder (CLAUDE.md T13 3.12).
    expect(Object.keys(CLASS_BADGE)).toEqual([...CLASS_ORDER]);
    const state = newGame({ difficulty: 'veryEasy' });
    for (const spec of EQUIPMENT_SPECS) {
      const cards = tiles(state, spec.id);
      if (!isMachineFamily(spec)) {
        // A line with one class wears no class badge: there is nothing to tell apart.
        for (const card of cards) expect(card.querySelector('.badge-class')).toBeNull();
        continue;
      }
      expect(cards.map((card) => card.getAttribute('data-variant')), spec.id).toEqual([
        ...CLASS_ORDER,
      ]);
      for (const card of cards) {
        const classId = card.getAttribute('data-variant') ?? '';
        const badge = card.querySelector('.badge-class');
        expect(badge?.textContent, `${spec.id}.${classId}`).toBe(CLASS_BADGE[classId]?.label);
        expect(badge?.classList.contains(`class-${classId}`)).toBe(true);
        expect(card.classList.contains(`class-${classId}`)).toBe(true);
        expect(card.getAttribute('style')).toContain(`--class-colour:${CLASS_BADGE[classId]?.colour}`);
      }
    }
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
    const standard = effects(tiles(state, 'tableSaw')[2]);
    expect(standard[0]).toBe('Output +5%');
    expect(standard[1]).toBe('Dust 0.015 m\u00b3/h of use');
    expect(standard[2]).toBe('Needs 1,100 m\u00b3/h of extraction');
    expect(standard[3]).toBe(lifeLine('tableSaw', 'standard'));
    const standardCosts = costs(tiles(state, 'tableSaw')[2]);
    expect(standardCosts[1]).toMatch(/^Power \d+ a day$/);
    expect(standardCosts[3]).toBe('Takes 3 m by 1 m, works in 4 m by 3 m');
    // Three decimals with the trailing zeros trimmed, and "none" where the family makes nothing.
    expect(figures(tiles(state, 'thicknesser')[0])[1]).toBe('Dust 0.25 m\u00b3/h of use');
    expect(figures(tiles(state, 'cnc')[0])[1]).toBe('Dust 0.06 m\u00b3/h of use');
    expect(figures(tiles(state, 'compressor')[0])[1]).toBe('Dust none');
  });

  it('colours every signed line by its sign through the one helper, and nothing else', () => {
    const cards = tiles(newGame({ difficulty: 'veryEasy' }), 'tableSaw');
    const tone = (line: Element | null | undefined): string =>
      line?.querySelector('.figure')?.className ?? '';
    const outputLine = (card: Element | undefined): Element | null | undefined =>
      card?.querySelector('.tile-figures');
    // Used at -5%, budget as a standard machine, industrial at +30%: red, the body colour, green
    // (CLAUDE.md T12 3.1, T13 1).
    expect(tone(outputLine(cards[0]))).toBe('figure bad');
    expect(figures(cards[1])[0]).toBe('Output as a standard machine');
    expect(tone(outputLine(cards[1]))).toBe('');
    expect(tone(outputLine(cards[4]))).toBe('figure good');
    for (const card of cards) {
      // Every plus and minus on the card is inside a span the sign helper wrote, and every
      // line without a sign is in the body colour.
      for (const line of Array.from(card.querySelectorAll('.tile-figures'))) {
        const signed = /[+-]\d/.test(text(line));
        expect(line.className).toBe('tile-figures');
        expect(line.querySelector('.figure') !== null, text(line)).toBe(signed);
        if (signed) expect(tone(line)).toMatch(/^figure (good|bad)$/);
      }
      // The gate's +2% is a plus, so it is green (CLAUDE.md T13 3.11).
      const gate = Array.from(card.querySelectorAll('.tile-figures')).find(
        (line) => text(line) === GATE_LINE,
      );
      expect(tone(gate)).toBe('figure good');
    }
  });

  it('says what a fan holds, in bags and in cubic metres, and that a central system holds nothing', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const pro = tiles(state, 'extractor')[3];
    expect(pro?.getAttribute('data-variant')).toBe('pro');
    // A fan has no output of its own and makes nothing: its life, then what it pulls and what
    // its bags hold, which are its class's own effects; then the costs as on every card
    // (CLAUDE.md T12 3.2, T13 3.1).
    expect(effects(pro)).toEqual([
      lifeLine('extractor', 'pro'),
      'Pulls 3,600 m\u00b3/h, 2,988 usable',
      'Bags 4, holds 4 m\u00b3',
    ]);
    expect(costs(pro)).toEqual([
      deliveryLine('extractor', 'pro'),
      'Power 8 a day',
      insuranceLine(findSpec('extractor')?.variants[3]?.price ?? NaN),
      'Takes 3 m by 1 m, works in 3 m by 1 m',
    ]);
    expect(figures(tiles(state, 'extractor')[4])).toContain('Bags 10, holds 10 m\u00b3');
    expect(figures(tiles(state, 'extractor')[0])).toContain('Bags 1, holds 1 m\u00b3');
    const central = effects(tiles(state, 'dustSystem')[0]);
    expect(central[1]).toBe('Pulls 12,000 m\u00b3/h, 9,960 usable');
    expect(central[2]).toBe(`No bags. Waste collection ${money(DUST_WASTE_MONTHLY)} a month`);
    expect(central[2]).toBe('No bags. Waste collection \u00a3400 a month');
    expect(effects(tiles(state, 'flexiSystem')[0])[2]).toBe(central[2]);
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
