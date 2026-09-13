// One picture per class: the loader asks for the class id and nothing else, the file the art side
// owes is the size docs/art/SPRITES.md works out from the class footprint, and the picture stands
// with its anchor on the bottom corner of that footprint (CLAUDE.md T7 3.5).

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { footprintOf, zoneOf } from '../../src/engine/machines';
import { SPRITE_PADDING, SPRITE_SCALE, spriteBox, spriteFiles, spriteFileSize, spriteUrl } from '../../src/render/sprites';
import { footprintIn } from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
import { CABINET_SLOT_LAYOUT } from '../../src/engine/constants';
import { newGame, placeEquipment } from '../helpers';

/** The families that arrived with five classes, whose files are named after the class. */
const CLASS_FAMILIES = ['tableSaw', 'workbench', 'sheetRack', 'edgebander'];

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

  it('has a file for every class of the four families Turn 7 gave classes to', () => {
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
  /** The bottom corner of the footprint diamond, which is the pixel the anchor sits on. */
  function anchorOf(x: number, y: number, width: number, depth: number, height: number): void {
    const at = spriteBox(x, y, width, depth, height);
    const corner = tileToScreen(x + width, y + depth);
    expect(at.x + at.width / 2).toBeCloseTo(corner.x, 6);
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
