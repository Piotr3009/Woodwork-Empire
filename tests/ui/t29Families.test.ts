/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.4: the art side's 22 pictures of the five axis CNC, the spraying robot, the line's
// five modules and the two timber stores, in as they came (PIOTR, 05.10: "you have it in the zip",
// "put everything into the next turn"; CLAUDE.md T29 2.4, section 7).

import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { spriteFiles } from '../../src/render/sprites';

/** The 22 files, each class and its turn, as the game names them. */
const PICTURES: readonly string[] = [
  'cnc5.standard',
  'cnc5.pro',
  'cnc5.industrial',
  'sprayRobot.standard',
  'windowLine1.standard',
  'windowLine2.standard',
  'windowLine3.standard',
  'windowLine4.standard',
  'windowLine5.standard',
  'timberRack.standard',
  'timberShelter.standard',
].flatMap((name) => [`${name}.png`, `${name}.r.png`]);

describe('the pictures of Turn 29 (CLAUDE.md T29 2.4, section 7)', () => {
  it('has the twenty two files on disk and in the manifest, and the folder they came in is gone', () => {
    expect(PICTURES).toHaveLength(22);
    const files = spriteFiles();
    const onDisk = new Set(readdirSync('public/sprites'));
    for (const name of PICTURES) {
      expect(files, name).toContain(name);
      expect(onDisk.has(name), name).toBe(true);
    }
    expect(readdirSync('docs')).not.toContain('pictures-t29');
  });
});
