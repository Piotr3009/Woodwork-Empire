// Every connection point is a number in a table, per picture file [PIOTR, 19.09;
// CLAUDE.md T22 2.8]. This is the table's own test: that every file a pipe is drawn to has a line,
// that the two that want no extraction have none, that a machine's cell lands on its own body and
// an extractor's in front of its mouth, and that the mirror of a line is a mirror and not a guess.
//
// The drawing's half of 2.8 is measured in `tests/render/ports.test.ts`, where the landing point of
// the pipe and the cell the engine routes to are held equal.

import { describe, expect, it } from 'vitest';
import {
  EXTRACTION_CAPACITY,
  EXTRACTION_DEMAND,
  EQUIPMENT_SPECS,
} from '../../src/engine/constants';
import {
  PORTS,
  type Port,
  deliveredFiles,
  measuredFiles,
  mirroredPort,
  pictureFor,
  portCellIn,
  portFor,
  portOf,
  spriteFileName,
} from '../../src/engine/ports';
import { footprintOf } from '../../src/engine/machines';
import { needsPortData } from '../../src/engine/pipes';
import type { Orientation } from '../../src/engine/types';

/** Every class of every family, with the file its base picture would be called. */
function classes(): Array<{ specId: string; spriteKey: string; variantId: string; file: string }> {
  const rows: Array<{ specId: string; spriteKey: string; variantId: string; file: string }> = [];
  for (const spec of EQUIPMENT_SPECS) {
    for (const variant of spec.variants) {
      rows.push({
        specId: spec.id,
        spriteKey: spec.spriteKey,
        variantId: variant.id,
        file: spriteFileName(spec.spriteKey, variant.id),
      });
    }
  }
  return rows;
}

describe('the table covers what a pipe is drawn to (CLAUDE.md T22 2.8)', () => {
  it('has a line for every delivered picture of a machine that pulls on the extraction', () => {
    const files = deliveredFiles();
    let checked = 0;
    for (const row of classes()) {
      const demand = EXTRACTION_DEMAND[row.specId]?.[row.variantId] ?? 0;
      if (demand <= 0 || !files.includes(row.file)) continue;
      expect(portFor(row.file), row.file).not.toBeNull();
      checked += 1;
    }
    // The five saws, the five spindle moulders and the three floor edgebanders: thirteen pictures
    // of machines with a demand have landed. The thicknesser, the solid wood tools and the CNC
    // have a demand and no picture yet, so there is nothing to measure on them
    // (docs/art/REQUESTS-T22.md 6).
    expect(checked).toBe(13);
  });

  it('has a line for every delivered picture of a fan, and none for a central system', () => {
    const files = deliveredFiles();
    for (const row of classes()) {
      const capacity = EXTRACTION_CAPACITY[row.specId]?.[row.variantId] ?? 0;
      if (capacity <= 0 || !files.includes(row.file)) continue;
      if (row.specId === 'extractor') {
        expect(portFor(row.file), row.file).not.toBeNull();
        continue;
      }
      // A central system draws a run along the rear wall and a drop to every machine: there is no
      // inlet of its own to measure (CLAUDE.md T16 2.3).
      expect(needsPortData(row), row.file).toBe(false);
      expect(portFor(row.file), row.file).toBeNull();
    }
  });

  it('leaves the two hand edgebanders out, which is the one case a missing line is right', () => {
    for (const variantId of ['used', 'budget']) {
      expect(EXTRACTION_DEMAND.edgebander?.[variantId]).toBe(0);
      expect(needsPortData({ specId: 'edgebander', variantId })).toBe(false);
      expect(portFor(`edgebander.${variantId}.png`)).toBeNull();
    }
    // And the three floor classes do want one.
    for (const variantId of ['standard', 'pro', 'industrial']) {
      expect(needsPortData({ specId: 'edgebander', variantId })).toBe(true);
      expect(portFor(`edgebander.${variantId}.png`), variantId).not.toBeNull();
    }
  });

  it('measures eighteen files and every pixel of them is inside its own file', () => {
    expect(measuredFiles()).toHaveLength(18);
    for (const file of measuredFiles()) {
      const port = portFor(file);
      if (port === null) throw new Error(`no line for ${file}`);
      expect(port.px, file).toBeGreaterThan(0);
      expect(port.py, file).toBeGreaterThan(0);
    }
  });
});

describe('the cell a port routes to (CLAUDE.md T22 2.8)', () => {
  /** The family a measured file belongs to, and the class, off the file name. */
  function rowOf(file: string): { specId: string; spriteKey: string; variantId: string } {
    const parts = file.replace('.png', '').split('.');
    const spriteKey = parts[0] ?? '';
    const variantId = parts[1] ?? '';
    const spec = EQUIPMENT_SPECS.find((entry) => entry.spriteKey === spriteKey);
    return { specId: spec?.id ?? spriteKey, spriteKey, variantId };
  }

  it('lands a machine’s drop on its own footprint and a fan’s inlet off it, at every orientation', () => {
    for (const file of measuredFiles()) {
      const row = rowOf(file);
      const port = portFor(file);
      if (port === null) throw new Error(`no line for ${file}`);
      for (const orientation of [0, 1] as Orientation[]) {
        const stands = footprintOf(row.specId, row.variantId, orientation);
        const cell = portCellIn(deliveredFiles(), {
          spriteKey: row.spriteKey,
          variantId: row.variantId,
          orientation,
        });
        if (cell === null) throw new Error(`no cell for ${file} at ${orientation}`);
        const inside =
          cell.x >= 0 && cell.y >= 0 && cell.x < stands.width && cell.y < stands.depth;
        // A machine's drop comes down onto its own body, so its cell is one of the cells it stands
        // on. An extractor's vertical stands in front of its mouth, so its cell is not: it is the
        // cell of the floor the pipe comes down in, and `connectCheck` refuses the run when there
        // is no such cell (CLAUDE.md T22 2.8). Nothing is clamped either way.
        expect(inside, `${file} at ${orientation}`).toBe(port.faces === undefined);
      }
    }
  });

  it('swaps the two offsets of a cell on a mirrored picture, and swaps the mouth with them', () => {
    // A mirror about the vertical screen axis exchanges the two world axes, which is why `faces`
    // swaps in the same sentence of 2.8. The two worked examples, from the coordinator's own
    // measurement of 19.09.
    const saw = portFor('tableSaw.standard.png');
    if (saw === null) throw new Error('no saw line');
    expect(saw.cell).toEqual({ x: 1, y: 0 });
    // A 3 by 1 saw turned is 1 by 3: the table cell one along x becomes one along y, which is the
    // middle cell of the turned footprint. `width - 1 - x` gave -1, a metre off the machine.
    expect(mirroredPort(saw, 208).cell).toEqual({ x: 0, y: 1 });
    expect(footprintOf('tableSaw', 'standard', 1)).toEqual({ width: 1, depth: 3, height: 1 });
    const fan = portFor('extractor.standard.png');
    if (fan === null) throw new Error('no fan line');
    expect(fan.cell).toEqual({ x: 0, y: 1 });
    expect(fan.faces).toBe('+y');
    const turned = mirroredPort(fan, 160);
    // The cell in front of the mouth moves with the mouth: down and to the left becomes down and
    // to the right, and the cell goes from one along y to one along x.
    expect(turned.cell).toEqual({ x: 1, y: 0 });
    expect(turned.faces).toBe('+x');
    expect(turned.px).toBe(160 - fan.px);
    expect(turned.py).toBe(fan.py);
  });

  it('reads the picture the hall really draws, so a turned file brings its own numbers', () => {
    // The saw has no `.r` file, so a quarter turn is the base picture mirrored and the base line
    // mirrored with it.
    expect(pictureFor(deliveredFiles(), 'tableSaw', 'standard', 1)).toEqual({
      file: 'tableSaw.standard.png',
      mirrored: true,
    });
    const port = portOf(
      deliveredFiles(),
      { spriteKey: 'tableSaw', variantId: 'standard', orientation: 1 },
      { fileWidth: 208 },
    );
    expect(port?.cell).toEqual({ x: 0, y: 1 });
    // The tool cabinet has all four files and no orientation of it is mirrored, so the day an
    // `extractor.<class>.r.png` lands it brings its own line and no code changes at all.
    for (const orientation of [0, 1, 2, 3] as Orientation[]) {
      expect(pictureFor(deliveredFiles(), 'toolCabinet', 'standard', orientation).mirrored).toBe(
        false,
      );
    }
  });

  it('says nothing at all for a file with no line, which keeps the rule the game had', () => {
    const table: Record<string, Port> = { ...PORTS };
    delete table['tableSaw.standard.png'];
    expect(portFor('tableSaw.standard.png', table)).toBeNull();
    expect(
      portCellIn(deliveredFiles(), { spriteKey: 'tableSaw', variantId: 'standard' }, table),
    ).toBeNull();
    // And the real table still has it: the copy above changed nothing.
    expect(portFor('tableSaw.standard.png')).not.toBeNull();
  });
});
