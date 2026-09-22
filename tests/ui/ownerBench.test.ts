// @vitest-environment jsdom
// The hiring gate counts the owner's own place at a bench (PIOTR, 22.09: "the owner has a place at
// a bench before a joiner is hired past him"; CLAUDE.md T24 2.2). Piotr's day 128 save is the hall
// it is for: the boss stood all day with nowhere to put a carcass down, because the gate had
// counted places for the crew and none for him. The card says so in the engine's own words.

import { describe, expect, it } from 'vitest';
import { benchOf, benchPlaces, OWNER } from '../../src/engine/machines';
import { benchPlacesNeeded, canHire, hiringOptions, joiners, shortfallForHire } from '../../src/engine/staff';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The day one hall with its bench swapped for the class asked for, and the rest of a joiner's
 *  kit standing in it, so the bench is the only thing the gate can be short of. */
function hallWith(variantId: string): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  state.cash = 1000000;
  const bench = state.equipment.find((item) => item.specId === 'workbench');
  if (bench === undefined) throw new Error('the day one kit has a bench in it');
  bench.variantId = variantId;
  for (let index = 0; index < 4; index += 1) {
    placeEquipment(state, 'locker', { x: 6 + index, y: 9, id: `kit-locker-${index}` });
    placeEquipment(state, 'handToolSet', { x: 12 + index, y: 9, id: `kit-tools-${index}` });
    placeEquipment(state, 'toolCabinet', { x: 10 + index, y: 9, id: `kit-cabinet-${index}` });
  }
  return state;
}

function card(state: GameState): Element {
  const tile = parse(renderTeam(state, 'workshop')).querySelector('[data-candidate="joiner.novice"]');
  if (tile === null) throw new Error('no joiner card');
  return tile;
}

describe('a place at a bench for the boss', () => {
  it('counts the places against the joiners on the books, the man at the door and the owner', () => {
    const state = hallWith('industrial');
    expect(benchPlacesNeeded(state)).toBe(1);
    expect(benchPlacesNeeded(state, 1)).toBe(2);
    const one = hireNow(state, 'joiner', 'novice');
    expect(joiners(one)).toHaveLength(1);
    expect(benchPlacesNeeded(one, 1)).toBe(3);
  });

  it('refuses the third man at a three place bench, on the card, in the engine\'s own words', () => {
    let state = hallWith('industrial');
    expect(benchPlaces(state)).toBe(3);
    state = hireNow(hireNow(state, 'joiner', 'novice'), 'joiner', 'novice');
    expect(joiners(state)).toHaveLength(2);
    // Two men and the owner fill the three places.
    for (const man of state.workers) expect(benchOf(state, man.id)).not.toBeNull();
    expect(benchOf(state, OWNER)).not.toBeNull();
    expect(canHire(state, 'joiner', 'novice')).toEqual({
      ok: false,
      reason: 'No place at a bench for him: the owner needs one too',
    });
    // The card prints the refusal where the Hire button would be, once, and offers no click.
    const tile = card(state);
    expect(tile.querySelector('.reason')?.textContent).toBe(
      'No place at a bench for him: the owner needs one too',
    );
    expect(tile.querySelector('[data-do="hire"]')).toBeNull();
    expect(tile.classList.contains('is-locked')).toBe(true);
  });

  it('takes him on once a used bench is bought, and says so with the button back', () => {
    let state = hallWith('industrial');
    state = hireNow(hireNow(state, 'joiner', 'novice'), 'joiner', 'novice');
    placeEquipment(state, 'workbench', { variantId: 'used', x: 16, y: 6, id: 'kit-bench-2' });
    expect(benchPlaces(state)).toBe(4);
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    const tile = card(state);
    expect(tile.querySelector('[data-do="hire"]')?.textContent).toBe('Hire');
    expect(tile.querySelector('.reason')).toBeNull();
    state = hireNow(state, 'joiner', 'novice');
    expect(joiners(state)).toHaveLength(3);
  });

  it('bills the first hire for two places, one for the man and one for the boss', () => {
    const bare = newGame();
    expect(shortfallForHire(bare, 'joiner')).toContainEqual({ specId: 'workbench', count: 2 });
    const option = hiringOptions(bare).find((entry) => entry.tier === 'novice');
    expect(option?.missing).toContain('Workbench x 2');
    // And the card carries the shopping list with its price, as it always has.
    const tile = card(bare);
    expect(tile.querySelector('.lock')?.textContent).toContain('Workbench x 2');
  });

  it('leaves a hall whose crew already fills the benches exactly as it is', () => {
    let state = hallWith('standard');
    state = hireNow(state, 'joiner', 'novice');
    const first = state.workers[0];
    if (!first) throw new Error('nobody on the books');
    // A second man written in the way a v25 save carries him, past the gate.
    state.workers.push({ ...first, id: 'staff-saved', name: 'Saved' });
    for (const man of state.workers) expect(benchOf(state, man.id), man.name).not.toBeNull();
    // Nobody is turned off a bench; the owner is the one with none, and only the next hire is
    // refused.
    expect(benchOf(state, OWNER)).toBeNull();
    expect(canHire(state, 'joiner', 'novice').ok).toBe(false);
  });
});
