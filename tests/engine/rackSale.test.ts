// @vitest-environment jsdom
// The rack can be sold, when it is empty and nobody is at it (PIOTR, 18.09; CLAUDE.md T20 2.10).

import { describe, expect, it } from 'vitest';
import { canSell, isSellableFamily, sellMachine } from '../../src/engine/index';
import { salePriceFor, sheetsStrandedBySale } from '../../src/engine/machines';
import { STATION_RACK, somebodyAtTheRack, storageSaleBlock } from '../../src/engine/stations';
import { ownedTile } from '../../src/ui/catalogue';
import { findSpec } from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame } from '../helpers';

function hall(sheets = 0): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), sheets);
  state.enquiries = [];
  return state;
}

function theRack(state: GameState): Equipment {
  const rack = state.equipment.find((item) => item.specId === 'sheetRack');
  if (rack === undefined) throw new Error('no rack in the hall');
  return rack;
}

/** The rack's own tile on the Owned tab, as a document. */
function tile(state: GameState, item: Equipment): HTMLElement {
  const spec = findSpec(item.specId);
  if (spec === null) throw new Error('no spec');
  const holder = document.createElement('div');
  holder.innerHTML = ownedTile(state, item, spec, null);
  return holder;
}

describe('the rack is a thing the workshop can sell (CLAUDE.md T20 2.10)', () => {
  it('is a sellable family now, like a machine, the extraction and the bench', () => {
    expect(isSellableFamily('sheetRack')).toBe(true);
    expect(isSellableFamily('toolCabinet')).toBe(true);
    expect(isSellableFamily('tableSaw')).toBe(true);
    expect(isSellableFamily('workbench')).toBe(true);
    // The office is still a fitting and not plant.
    expect(isSellableFamily('desk')).toBe(false);
    expect(isSellableFamily('chair')).toBe(false);
    expect(isSellableFamily('laptop')).toBe(false);
  });

  it('will not go while it holds sheets, and says how many are on it', () => {
    const state = hall(24);
    const rack = theRack(state);
    expect(sheetsStrandedBySale(state, rack)).toBe(24);
    expect(storageSaleBlock(state, rack)).toBe('Empty it first, 24 sheets on it');
    // One sheet is one sheet, and the sentence counts.
    state.stock.sheets = 1;
    expect(storageSaleBlock(state, rack)).toBe('Empty it first, 1 sheet on it');
  });

  it('will not go while somebody is standing at it', () => {
    const state = hall(0);
    const rack = theRack(state);
    expect(storageSaleBlock(state, rack)).toBe('');
    state.owner.station = STATION_RACK;
    expect(somebodyAtTheRack(state)).toBe(true);
    expect(storageSaleBlock(state, rack)).toBe('Somebody is standing at it');
    state.owner.station = 'idle';
    expect(storageSaleBlock(state, rack)).toBe('');
  });

  it('goes for the buyer s price when it is empty and free, through the one sale path', () => {
    const state = hall(0);
    const rack = theRack(state);
    expect(canSell(state, rack.id).ok).toBe(true);
    expect(storageSaleBlock(state, rack)).toBe('');
    const sold = sellMachine(state, rack.id);
    expect(sold.ok).toBe(true);
    expect(rack.soldOnDay).not.toBeNull();
    expect(canSell(state, rack.id)).toEqual({ ok: false, reason: 'Sold, collection tomorrow' });
  });

  it('draws the refusal on the tile instead of a Sell button, and the button when it is empty', () => {
    const state = hall(24);
    const rack = theRack(state);
    const full = tile(state, rack);
    expect(full.querySelector('[data-do="sellMachine"]')).toBeNull();
    expect(full.querySelector('.reason')?.textContent).toBe(
      'Cannot sell it: Empty it first, 24 sheets on it',
    );
    state.stock.sheets = 0;
    const empty = tile(state, rack);
    const button = empty.querySelector('[data-do="sellMachine"]');
    expect(button?.getAttribute('data-id')).toBe(rack.id);
    expect(button?.textContent).toContain(String(salePriceFor(rack)));
  });
});
