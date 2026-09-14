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
    expect(APP_VERSION).toBe('v17');
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
    const spelled = sourceFiles('src').filter((path) => readFileSync(path, 'utf8').includes("'v17'"));
    expect(spelled).toEqual(['src/engine/constants.ts']);
  });
});
