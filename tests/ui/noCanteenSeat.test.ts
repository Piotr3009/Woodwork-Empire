// @vitest-environment jsdom
// The canteen seat is off the screens (PIOTR, 20.09: "too much micromanagement"; CLAUDE.md T23
// 2.11). The room has its table and two stools from the first morning and breaks are taken in
// shifts, so nobody buys a seat: no line in the catalogue, nothing on the Owned tab, nothing on
// the shopping list, and the hiring gate asks for a bench, a locker and a set of tools and never
// a seat.
//
// The engine's half of this is phase A's and is held by tests/render/canteenKit.test.ts and
// tests/engine/staff.test.ts. This file is what the player can see.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { OWNED_TAB, renderCatalogue } from '../../src/ui/catalogue';
import { renderShopping } from '../../src/ui/shopping';
import { EQUIPMENT_SPECS, EQUIPMENT_TABS, JOINER_PREREQUISITES } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

function shop(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 900000;
  return state;
}

/** Every file of the game that can write markup or a rule, the migration apart: the lift is the
 *  one place the id may still appear, because a save that has seats in it has to be read. */
function sources(): string[] {
  return ['src/engine', 'src/render', 'src/ui'].flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith('.ts') && name !== 'migrate.ts')
      .map((name) => `${dir}/${name}`),
  );
}

describe('the catalogue', () => {
  it('has no seat to sell, on any tab or in any folder', () => {
    const state = shop();
    for (const tab of EQUIPMENT_TABS) {
      const html = renderCatalogue(state, '', tab.id);
      expect(html, tab.id).not.toContain('canteenSeat');
      expect(html.toLowerCase(), tab.id).not.toContain('canteen seat');
    }
    expect(EQUIPMENT_SPECS.some((spec) => spec.id === 'canteenSeat')).toBe(false);
    // And the family is not hiding in a folder of its own either.
    expect(EQUIPMENT_SPECS.map((spec) => spec.folder)).not.toContain('Canteen seats');
  });

  it('shows no seat on the Owned tab, whatever the hall has standing in it', () => {
    const html = renderCatalogue(shop(), '', OWNED_TAB, null, 'all');
    expect(html).not.toContain('canteenSeat');
    expect(html.toLowerCase()).not.toContain('canteen seat');
  });
});

describe('the shopping list', () => {
  it('has nothing of the sort on the road', () => {
    const html = renderShopping(shop());
    expect(html).not.toContain('canteenSeat');
    expect(html.toLowerCase()).not.toContain('canteen seat');
  });
});

describe('what a man needs before he starts', () => {
  it('is a bench, a locker, a cabinet slot and a set of tools, and no seat', () => {
    expect(JOINER_PREREQUISITES).not.toContain('canteenSeat');
    expect(JOINER_PREREQUISITES).toContain('workbench');
    expect(JOINER_PREREQUISITES).toContain('locker');
  });

  it('is what the top of src/engine/staff.ts says it is, in the words the file uses', () => {
    const header = readFileSync('src/engine/staff.ts', 'utf8').slice(0, 400);
    expect(header).toContain('a bench, a locker and a set of');
  });
});

describe('the id itself', () => {
  it('is gone from the game but for the lift that reads an old save', () => {
    const left = sources().filter((file) => readFileSync(file, 'utf8').includes('canteenSeat'));
    expect(left).toEqual([]);
    expect(readFileSync('src/engine/migrate.ts', 'utf8')).toContain(
      'Canteen seats retired (v36)',
    );
  });
});
