// One picture per class: the loader asks for the class id and nothing else, the file the art side
// owes is the size docs/art/SPRITES.md works out from the class footprint, and the picture stands
// with its anchor on the bottom corner of that footprint (CLAUDE.md T7 3.5).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { footprintOf, zoneOf } from '../../src/engine/machines';
import { SPRITE_PADDING, SPRITE_SCALE, spriteAnchorIn, spriteBox, spriteFiles, spriteFileSize, spriteUrl } from '../../src/render/sprites';
import { footprintIn } from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
import { CABINET_SLOT_LAYOUT } from '../../src/engine/constants';
import { newGame, placeEquipment } from '../helpers';

/** The families that arrived with five classes, whose files are named after the class. Turn 7
 *  gave the first four theirs; Turn 10 gave the extraction and air families theirs, and the art
 *  side delivered every one of those ten files with them (CLAUDE.md T10 3.4). */
const CLASS_FAMILIES = ['tableSaw', 'workbench', 'sheetRack', 'edgebander', 'extractor', 'compressor'];

describe('the loader tier is the class id', () => {
  it('asks for the class file of every class of every family that has one', () => {
    const files = spriteFiles();
    for (const spec of EQUIPMENT_SPECS) {
      if (spec.variants.length <= 1) continue;
      for (const variant of spec.variants) {
        const name = `${spec.spriteKey}.${variant.id}.png`;
        if (!files.includes(name)) continue;
        expect(spriteUrl(spec.spriteKey, variant.id), name).toBe(`/sprites/${name}`);
      }
    }
  });

  it('has a file for every class of every family that has them', () => {
    const files = spriteFiles();
    for (const family of CLASS_FAMILIES) {
      const spec = EQUIPMENT_SPECS.find((entry) => entry.spriteKey === family);
      expect(spec, family).toBeDefined();
      if (!spec) continue;
      expect(spec.variants.length, family).toBe(5);
      for (const variant of spec.variants) {
        expect(files, `${family}.${variant.id}`).toContain(`${family}.${variant.id}.png`);
      }
      // The family file was never delivered: with classes there is nothing left for it to answer.
      expect(files, family).not.toContain(`${family}.png`);
      expect(spriteUrl(family), family).toBeNull();
    }
  });

  it('leaves the old better rack file behind, which no class asks for any more', () => {
    // sheetRackBetter went when the rack became one family with classes (CLAUDE.md T7 3.6). The
    // file stays on disk, and no engine class resolves to it.
    expect(spriteFiles()).toContain('sheetRackBetter.standard.png');
    expect(EQUIPMENT_SPECS.some((spec) => spec.spriteKey === 'sheetRackBetter')).toBe(false);
  });
});

describe('the file the art side owes for a class', () => {
  it('measures what the table of CLAUDE.md T7 3.5 says', () => {
    const rows: Array<[string, string, number, number]> = [
      ['tableSaw', 'used', 160, 136],
      ['tableSaw', 'budget', 160, 136],
      ['tableSaw', 'standard', 208, 160],
      ['tableSaw', 'pro', 256, 184],
      ['tableSaw', 'industrial', 304, 217],
      ['workbench', 'used', 160, 131],
      ['workbench', 'budget', 160, 131],
      ['workbench', 'standard', 160, 131],
      ['workbench', 'pro', 160, 131],
      ['workbench', 'industrial', 208, 155],
      ['sheetRack', 'used', 160, 160],
      ['sheetRack', 'budget', 160, 160],
      ['sheetRack', 'standard', 160, 174],
      ['sheetRack', 'pro', 208, 208],
      ['sheetRack', 'industrial', 256, 241],
      ['edgebander', 'used', 112, 88],
      ['edgebander', 'budget', 112, 88],
      ['edgebander', 'standard', 208, 169],
      ['edgebander', 'pro', 208, 174],
      ['edgebander', 'industrial', 256, 203],
      // The five extractor and the five compressor classes of CLAUDE.md T10 3.4.
      ['extractor', 'used', 112, 160],
      ['extractor', 'budget', 112, 160],
      ['extractor', 'standard', 160, 184],
      ['extractor', 'pro', 208, 232],
      ['extractor', 'industrial', 304, 280],
      ['compressor', 'used', 112, 112],
      ['compressor', 'budget', 112, 112],
      ['compressor', 'standard', 160, 160],
      ['compressor', 'pro', 160, 160],
      ['compressor', 'industrial', 208, 232],
    ];
    for (const [family, variantId, width, height] of rows) {
      const spec = EQUIPMENT_SPECS.find((entry) => entry.spriteKey === family);
      if (!spec) throw new Error(`no family ${family}`);
      const stands = footprintOf(spec.id, variantId);
      const file = spriteFileSize(stands.width, stands.depth, stands.height);
      expect(file.width, `${family}.${variantId}`).toBe(width);
      // The brief writes the whole pixels; a class whose height is not a round metre lands a
      // fraction above that, and the art side draws on the whole pixel it names.
      expect(Math.floor(file.height), `${family}.${variantId}`).toBe(height);
    }
  });
});

describe('the anchor of a class', () => {
  /** The bottom corner of the footprint diamond, which is the pixel the anchor sits on: the file
   *  carries it `8 + w x 48` from its left edge and 8 px above its bottom, and the loader halves
   *  both. It is the middle of the file only for a square footprint (CLAUDE.md T10 3.12). */
  function anchorOf(x: number, y: number, width: number, depth: number, height: number): void {
    const at = spriteBox(x, y, width, depth, height);
    const corner = tileToScreen(x + width, y + depth);
    expect(at.x + spriteAnchorIn(width, depth, height).x).toBeCloseTo(corner.x, 6);
    expect(at.y + at.height - SPRITE_PADDING / SPRITE_SCALE).toBeCloseTo(corner.y, 6);
  }

  it('lands on the bottom corner of its footprint for every class', () => {
    for (const spec of EQUIPMENT_SPECS) {
      if (spec.variants.length <= 1) continue;
      for (const variant of spec.variants) {
        const stands = footprintOf(spec.id, variant.id);
        anchorOf(4, 5, stands.width, stands.depth, stands.height);
      }
    }
  });

  it('centres a pro saw inside its 6 by 3 zone and anchors it there', () => {
    const state = newGame();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 6, y: 2 });
    expect(zoneOf('tableSaw', 'pro')).toEqual({ width: 6, depth: 3 });
    const stands = footprintIn(saw);
    // 3 by 2 in a 6 by 3 zone: one and a half metres of clearance each side, half a metre front
    // and back (CLAUDE.md T7 3.3).
    expect(stands).toEqual({ x: 7.5, y: 2.5, width: 3, depth: 2, height: 1 });
    anchorOf(stands.x, stands.y, stands.width, stands.depth, stands.height);
    const at = spriteBox(stands.x, stands.y, stands.width, stands.depth, stands.height);
    const file = spriteFileSize(3, 2, 1);
    expect(at.width).toBe(file.width / SPRITE_SCALE);
    expect(at.height).toBe(file.height / SPRITE_SCALE);
  });

  it('stands a hand edgebander on the cabinet slot it is kept in, with nothing to centre it in', () => {
    const state = newGame();
    const slot = CABINET_SLOT_LAYOUT[0];
    if (!slot) throw new Error('no cabinet slot');
    placeEquipment(state, 'toolCabinet', { x: slot.x, y: slot.y });
    const hand = placeEquipment(state, 'edgebander', {
      variantId: 'budget',
      x: slot.x,
      y: slot.y,
    });
    // A hand tool holds no floor at all, so the picture stands on the cabinet's own cell.
    expect(zoneOf('edgebander', 'budget')).toEqual({ width: 0, depth: 0 });
    const stands = footprintIn(hand);
    expect(stands).toEqual({ x: slot.x, y: slot.y, width: 1, depth: 1, height: 0.5 });
    anchorOf(stands.x, stands.y, stands.width, stands.depth, stands.height);
    expect(spriteUrl('edgebander', 'budget')).toBe('/sprites/edgebander.budget.png');
  });
});

describe('the file on disk and the footprint in the engine', () => {
  /** The width and the height a PNG declares in its own header, which is the one thing the art
   *  side and the engine can disagree about without anybody noticing until a machine stands off
   *  its tile in the hall (CLAUDE.md T10 3.4, 3.12). */
  function pngSize(name: string): { width: number; height: number } {
    const head = readFileSync(join('public/sprites', name)).subarray(16, 24);
    return { width: head.readUInt32BE(0), height: head.readUInt32BE(4) };
  }

  it('agree on every delivered class file, to the whole pixel the art is drawn on', () => {
    let checked = 0;
    for (const spec of EQUIPMENT_SPECS) {
      for (const variant of spec.variants) {
        const name = `${spec.spriteKey}.${variant.id}.png`;
        if (!spriteFiles().includes(name)) continue;
        const stands = footprintOf(spec.id, variant.id);
        const owed = spriteFileSize(stands.width, stands.depth, stands.height);
        const real = pngSize(name);
        expect(real.width, name).toBe(owed.width);
        expect(real.height, name).toBe(Math.floor(owed.height));
        checked += 1;
      }
    }
    // Thirty three files from Turn 7 to Turn 19 (the four families with classes, the extraction
    // and air families of Turn 10, and the three synthetic standard classes measured in Turn 10),
    // plus the six of 19.09: the five spindle moulders and the tool cabinet's one standard
    // picture (the cabinet has no class ladder; its rotated `.r` file is picked by orientation
    // and is not counted here).
    expect(checked).toBe(39);
    for (const name of ['dustSystem.standard.png', 'flexiSystem.standard.png', 'pelletiser.standard.png']) {
      expect(spriteFiles(), name).toContain(name);
    }
  });

  it('measures the turned picture too, which the loop above leaves out', () => {
    // The loop counts one file a class and says so: the cabinet's second orientation, the first `.r`
    // file in the game (PIOTR's art, 19.09), is measured here. A rotated 2 by 1 is a 1 by 2 and
    // `(width + depth)` is the same either way, so a turned picture wants the very same canvas as
    // its unturned pair. Both were redrawn on the two cell canvas on 19.09 (PIOTR's art, tool
    // cabinets v2), which closed the request of docs/art/REQUESTS-T21.md section 2.
    const turned = 'toolCabinet.standard.r.png';
    expect(spriteFiles()).toContain(turned);
    const stands = footprintOf('toolCabinet', 'standard', true);
    expect(stands).toEqual({ width: 1, depth: 2, height: 1 });
    const owed = spriteFileSize(stands.width, stands.depth, stands.height);
    expect([owed.width, Math.floor(owed.height)]).toEqual([160, 136]);
    expect(pngSize(turned)).toEqual({ width: 160, height: 136 });
    // The other four turned files are the cabinet ladder's (tool cabinets v2, PIOTR's art,
    // 19.09): used and budget at 112 by 112, pro at 160 by 175, industrial at 208 by 208, each
    // a true quarter turn. Their classes arrive in Turn 22 (CLAUDE.md T22 2.12); until then the
    // loop above has no variant to measure them against and they are only counted here.
    expect(spriteFiles().filter((name) => name.endsWith('.r.png'))).toEqual([
      'toolCabinet.budget.r.png',
      'toolCabinet.industrial.r.png',
      'toolCabinet.pro.r.png',
      turned,
      'toolCabinet.used.r.png',
    ]);
  });
});
