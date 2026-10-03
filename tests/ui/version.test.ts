// @vitest-environment jsdom
// The build in the corner: one constant, shown on every screen, written in one place
// (CLAUDE.md T8 3.1, T9 1).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../src/engine/constants';
import { mount } from '../../src/ui/app';

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

/** Every .ts and .css file under src, so the grep below reads the game and not its tests. */
function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!/\.(ts|css)$/.test(name)) continue;
    found.push(path);
  }
  return found;
}

describe('the version in the corner', () => {
  it('is a v number that the turn bumped', () => {
    expect(APP_VERSION).toMatch(/^v\d+$/);
    // v53 took the waiting out of the hall and the timber tool set out of the game
    // (PIOTR, 24.09; v53). v54 made the vans five classes and the pallet trucks and forklifts
    // one family (PIOTR, 24.09).
    // v55 is one stage a machine, a quarter each, and the men drawing their machines (PIOTR, 24.09).
    // v56 stands the spray booths at their pictures' size and bolts the CNC's tool changer head to
    // the CNC (PIOTR, 25.09). v57 takes the timber offers off the board until the timber branch
    // (PIOTR, 25.09). v58 puts the machines' capacities of 24.09 back (PIOTR, 25.09). v59 stands
    // the man waiting for the boss at the canteen door and names the first two joiners Jack T and
    // Jack B (PIOTR, 30.09). v60 adds the pace up from points and calls it Pace, keeps the desk
    // staff off the hall, locks the board on machines still on order and hands the take off to the
    // admin (PIOTR, 30.09). v61 makes a man's minute his grade times the hall's points and v62 the
    // assign lists of free men only (PIOTR, 01.10 and 02.10). v63 is Turn 26: one kind of man on
    // the floor, and a hall that looks like a workshop (PIOTR, 02.10).
    expect(APP_VERSION).toBe('v79');
  });

  it('stands in the bottom right corner of the start screen and of the game', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    // The start screen, before a game exists at all.
    expect(root().innerHTML).toContain(`<span class="version-corner">${APP_VERSION}</span>`);
    const start = root().querySelector('[data-do="startGame"]');
    if (start === null) throw new Error('no start button');
    start.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // And in the game itself.
    expect(root().innerHTML).toContain(`<span class="version-corner">${APP_VERSION}</span>`);
  });

  it('is written in constants.ts and nowhere else in the source', () => {
    const spelled = sourceFiles('src').filter((path) => readFileSync(path, 'utf8').includes("'v79'"));
    expect(spelled).toEqual(['src/engine/constants.ts']);
  });
});
