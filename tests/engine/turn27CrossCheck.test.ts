/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The cross check of CLAUDE.md T27 section 7, the part no task's own test already asserts: the
// year is printed by the top bar's date and the tax's own words and nowhere else (2.1, section 6),
// kept as a grep so a later turn that puts it on another date does so on purpose and flips this.
//
// The rest of section 7 is asserted where its task put it: the year on `calendarYearOf`,
// `formatDate` and `formatCalendarDay` (tests/engine/clock.test.ts), the tax, its warning, the
// strip and December's report (tests/engine/tax.test.ts, tests/ui/taxCards.test.ts and the played
// December of tests/scenarios/turn27.test.ts), the extension at 250,000 on the Premises page
// (tests/engine/v67.test.ts, tests/ui/v67.test.ts) and the fourteen prices with what stayed
// (tests/engine/topClassPrices.test.ts).

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

/** The files whose code, comments left out, calls this function. */
function callersOf(name: string): string[] {
  const call = new RegExp(`\\b${name}\\(`);
  return filesUnder('src')
    .filter((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .some((line) => {
          const code = line.trim();
          if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return false;
          return call.test(code) && !code.startsWith(`export function ${name}(`);
        }),
    )
    .sort();
}

describe('the cross check of CLAUDE.md T27 section 7', () => {
  it('prints the year in the top bar s date and the tax s own words alone', () => {
    // The year is worked out in two places: the date line and the tax.
    expect(callersOf('calendarYearOf')).toEqual(['src/engine/clock.ts', 'src/engine/tax.ts']);
    // And the date line with its year is the top bar's alone; every other screen prints the
    // short date, `formatCalendarDay`, which has none.
    expect(callersOf('formatDate')).toEqual(['src/ui/topbar.ts']);
  });
});
