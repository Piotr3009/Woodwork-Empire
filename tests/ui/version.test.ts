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
    // the floor, and a hall that looks like a workshop (PIOTR, 02.10). v81 is Turn 27: the year,
    // the taxman, and dearer top machines (PIOTR, 03.10 and 04.10). v82 is the second extension
    // of the unit, to 800 m2 (PIOTR, 04.10). v83 is Turn 28: the timber department, the holidays,
    // and the pelletiser outside (PIOTR, 04.10 and 05.10). v84 is Turn 29: the production line,
    // the five axis CNC, the timber stores, and four to a contract (PIOTR, 05.10). v85 puts the art
    // side's frame presses and glue table in place of chat's stand ins, and the logo on the start
    // screen, in the menu and on the tab (PIOTR, 04.10 and 08.10). v86 takes the sketch of the unit
    // off the start screen and stands its tick beside its words (PIOTR, 08.10). v87 takes the
    // stutter out of a big hall: the crew counted once, the hall's shortages reckoned once a
    // picture, and the bags read off the extractors alone (PIOTR, 10.10). v88 keeps a big hall
    // moving at 30x and 100x: a frame makes up for a tenth of a second at most, the page follows
    // the clock five times a second from 30x up, and the catalogue is asked by id (PIOTR, 10.10).
    // v89 is Turn 30: the line bought whole, its windows contract, its upgrades and its moving
    // pictures (PIOTR, 10.10 and 11.10). v90 played the line's motion four times slower (PIOTR,
    // 11.10). v91 plays it at the speed it was drawn, one loop a game hour a module, one module
    // after another (PIOTR, 11.10). v92 is Turn 31: the line's timber and glass, its books, the
    // forklift's lane and its forklift, the hall that grows, the shelter behind the wall, and
    // contracts that can be lost (PIOTR, 11.10). v93 is more lines than one (PIOTR, 12.10). v94 is
    // the engineers in red shirts and the line given its lane (PIOTR, 12.10). v95 is the hall made
    // wider (PIOTR, 12.10). v96 is Turn 32: one store for every material, the glass racks, and the
    // line fed from the stores (PIOTR, 12.10 and 13.10). v107 is the door line (PIOTR, 18.10). v108
    // is the door line's own pictures (PIOTR, 18.10). v109 is a contract's price risen at fifteen
    // renewals at most (PIOTR, 18.10). v110 is the glass shelter's and the large timber shelter's
    // pictures (PIOTR, 18.10). v111 is the yard behind the hall laid out in its order (PIOTR, 18.10).
    // v112 is the security firms at half the price (PIOTR, 18.10). v113 is the hall's six levels
    // (PIOTR, 18.10). v114 is the timber frame house factory (PIOTR, 18.10).
    expect(APP_VERSION).toBe('v115');
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
    const spelled = sourceFiles('src').filter((path) => readFileSync(path, 'utf8').includes("'v115'"));
    expect(spelled).toEqual(['src/engine/constants.ts']);
  });
});
