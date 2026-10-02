// The cross check of CLAUDE.md T26 section 7, the two greps of it kept as a test so a later turn
// cannot bring a word back by accident: the three trades that went (2.6) are named only by the
// migration that turns them into the two that stayed, and `helper` is the labourer's id and the
// art side's sheet names and nothing a player reads (2.7).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
}

function hits(files: readonly string[], pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of files) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (pattern.test(line)) found.push(`${file}:${index + 1}: ${line.trim()}`);
      });
  }
  return found;
}

describe('the cross check of Turn 26', () => {
  it('names the trades that went only in the migration and its tests', () => {
    const files = [...filesUnder('src'), ...filesUnder('tests')].filter(
      (file) => !file.endsWith('src/engine/migrate.ts') && !file.endsWith('tests/cloud/migrate.test.ts') &&
        !file.endsWith('turn26CrossCheck.test.ts'),
    );
    expect(hits(files, /MACHINE_PLACES|sprayer|estimator|purchasingClerk|tradeFactor|SPRAY_RATE/)).toEqual([]);
  });

  it('keeps helper as the labourer s id and the sheets names and nothing a player reads', () => {
    const lines = hits(filesUnder('src'), /elper/);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const text = line.slice(line.indexOf(': ') + 2);
      const idOrSheet =
        /'helper'|\bhelper:|character\.helper/.test(text) ||
        // The type's own comment, which says why the id stays.
        /The labourer\. The id is `helper`|sheets carry the name/.test(text);
      expect(idOrSheet, line).toBe(true);
    }
  });
});
