// The seven Turn 3 desk items are a deletion, not a hide: their render code, their hooks and
// their constants are gone from the repository. This test greps the source for them, so nothing
// can quietly come back (CLAUDE.md T4 2).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderOffice } from '../../src/render/office';
import { newGame } from '../helpers';

/** Every .ts and .css file under src and tests, except this one. */
function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!/\.(ts|css|mjs)$/.test(name)) continue;
    if (name === 'deskItemsGone.test.ts') continue;
    found.push(path);
  }
  return found;
}

/** What went with the desk: the layout that placed the items, and every key and hook of theirs.
 *  `desk`, `laptop` and `catalogue` are not here: they are still catalogue lines, or a region of
 *  the room, and only their desk objects went. */
const GONE = [
  'DESK_LAYOUT',
  'DeskObjectSpec',
  'OFFICE_TILES',
  'ledgerFolder',
  'materialsBinder',
  'teamBoard',
  'data-office="desk"',
  'data-office="phone"',
  'data-office="drawings"',
  'data-office="materials"',
  'data-office="hiring"',
  'data-office="accounting"',
];

describe('the desk items are gone, not hidden', () => {
  it('leaves not one reference anywhere in src or tests', () => {
    const files = [...sourceFiles('src'), ...sourceFiles('tests'), ...sourceFiles('scripts')];
    expect(files.length).toBeGreaterThan(30);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const gone of GONE) {
        expect(text.includes(gone), `${file} still mentions ${gone}`).toBe(false);
      }
    }
  });

  it('draws no SVG in the office at all', () => {
    const html = renderOffice(newGame(), { width: 1280, height: 800 });
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('viewBox');
    expect(readFileSync('src/render/office.ts', 'utf8')).not.toContain('<svg');
  });
});
