/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 30, 2.2: the art side's 28 pictures of the line of six modules, their working motion and the
// windows on module 6's pallet, in as they came (PIOTR, 11.10: "super"; "put the animation pictures
// into the code"; CLAUDE.md T30 2.2, section 7). Chat's check of every file, its size, anchor,
// metres, kind and hash, is kept beside the art side's notes in docs/art/pack-1110/.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_LINE_MODULES, LINE_MODULES } from '../../src/engine/constants';
import { footprintOf } from '../../src/engine/machines';
import { spriteFileSize, spriteFiles } from '../../src/render/sprites';

interface Checked {
  file: string;
  px: [number, number];
  anchor: [number, number];
  sha256: string;
}

const CHECK = JSON.parse(readFileSync('docs/art/pack-1110/pictures-t30.json', 'utf8')) as {
  files: Checked[];
  problems: unknown[];
};

function pngSize(name: string): { width: number; height: number } {
  const head = readFileSync(join('public/sprites', name)).subarray(16, 24);
  return { width: head.readUInt32BE(0), height: head.readUInt32BE(4) };
}

describe('the pictures of the line (CLAUDE.md T30 2.2, section 7)', () => {
  it('has the twenty eight, byte for byte as chat checked them, in the manifest, and the folder they came in is gone', () => {
    const pictures = CHECK.files.filter((entry) => entry.file.endsWith('.png'));
    expect(pictures).toHaveLength(28);
    expect(CHECK.problems).toEqual([]);
    const files = spriteFiles();
    for (const entry of pictures) {
      expect(files, entry.file).toContain(entry.file);
      const hash = createHash('sha256').update(readFileSync(join('public/sprites', entry.file))).digest('hex');
      expect(hash, entry.file).toBe(entry.sha256);
      expect(pngSize(entry.file), entry.file).toEqual({ width: entry.px[0], height: entry.px[1] });
    }
    expect(readdirSync('docs')).not.toContain('pictures-t30');
  });

  it('draws each of the six modules on the canvas the contract gives 6 m by 3 m by 3 m, and its turn', () => {
    expect(LINE_MODULES).toHaveLength(6);
    for (const id of LINE_MODULES) {
      const stands = footprintOf(id, 'standard');
      expect(stands, id).toEqual({ width: 6, depth: 3, height: 3 });
      const owed = spriteFileSize(stands.width, stands.depth, stands.height);
      expect(pngSize(`${id}.standard.png`), id).toEqual({ width: owed.width, height: owed.height });
      expect(pngSize(`${id}.standard.r.png`), id).toEqual({ width: owed.width, height: owed.height });
    }
  });

  it('holds six work sheets of twelve cells and ten overlays a line, none of them a class picture or a turn', () => {
    // The window line's and, from v108, the door line's of P3 beside them (flipped).
    const sheets = spriteFiles().filter((name) => name.endsWith('.work.sheet.png'));
    expect(sheets).toEqual(ALL_LINE_MODULES.map((id) => `${id}.standard.work.sheet.png`).sort());
    for (const sheet of sheets) expect(pngSize(sheet), sheet).toEqual({ width: 12 * 448, height: 376 });
    const overlays = spriteFiles().filter((name) => /\.stack\d\d\.png$/.test(name));
    expect(overlays).toEqual(
      ['doorLine6', 'windowLine6'].flatMap((module) =>
        Array.from({ length: 10 }, (_, index) => `${module}.standard.stack${String(index + 1).padStart(2, '0')}.png`),
      ),
    );
    for (const name of [...sheets, ...overlays]) expect(name.endsWith('.r.png'), name).toBe(false);
  });
});
