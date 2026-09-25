// What the hall draws for Turn 16: the placeholders of the pictures still owed (CLAUDE.md T13 1,
// 3.13; T16 2.3). The pipe layer this file once tested is gone (v33, PIOTR 19.09).

import { describe, expect, it } from 'vitest';
import { objectArt, renderHall } from '../../src/render/hall';
import { PLACEHOLDER_SPRITES, placeholderKindFor } from '../../src/render/sprites';
import { newGame, placeEquipment } from '../helpers';

describe('a CNC with its tool changer head (v56)', () => {
  it('is drawn in the picture of the two together, and a CNC with no head in its own', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'cnc', { variantId: 'standard', x: 2, y: 6 });
    placeEquipment(state, 'cnc', { variantId: 'pro', x: 12, y: 6 });
    const bare = renderHall(state);
    expect(bare).toContain('/sprites/cnc.standard.png');
    expect(bare).not.toContain('cncToolChanger');
    // One head: it goes on the CNC bought first, and the other stays as it was. The head itself
    // holds no floor and is not drawn on its own.
    placeEquipment(state, 'cncHead', { x: 18, y: 8 });
    const headed = renderHall(state);
    expect(headed).toContain('/sprites/cncToolChanger.standard.png');
    expect(headed).not.toContain('/sprites/cnc.standard.png');
    expect(headed).toContain('/sprites/cnc.pro.png');
    expect(headed).not.toContain('data-sprite="cncHead"');
    // With no picture of the two delivered, the CNC keeps its own.
    expect(renderHall(state, { files: ['cnc.standard.png', 'cnc.pro.png'] })).toContain('/sprites/cnc.standard.png');
  });
});

describe('a picture the art side owes', () => {
  it('names the spindle moulder classes, and nothing else', () => {
    // The pallet truck was the other until v54 made it the used class of the forklift's family,
    // whose picture it now is (PIOTR, 24.09).
    expect([...PLACEHOLDER_SPRITES]).toEqual(['spindleMoulder']);
    expect(placeholderKindFor('spindleMoulder', 'used')).toBe('spindleMoulder.used');
    expect(placeholderKindFor('forklift', 'used')).toBeNull();
    expect(placeholderKindFor('cnc', 'used')).toBeNull();
  });

  it('is drawn in the hall as the placeholder, on its own cells, with its name', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'spindleMoulder', { variantId: 'pro', x: 8, y: 2 });
    const svg = renderHall(state, { files: [] });
    expect(svg).toContain('data-placeholder="spindleMoulder.pro"');
    expect(svg).toContain('class="placeholder-art"');
    // The name is still on the object, so the player knows what it is.
    expect(svg).toContain('Spindle moulder');
    // A family with no file and no placeholder of its own is still the flat box.
    const cnc = newGame({ difficulty: 'veryEasy' });
    placeEquipment(cnc, 'cnc', { variantId: 'standard', x: 8, y: 2 });
    const plain = renderHall(cnc, { files: [] });
    expect(plain).not.toContain('data-placeholder=');
    expect(plain).toContain('var(--kit-machine)');
  });

  it('takes the file the moment it lands, through the same loader as every picture', () => {
    const art = objectArt({
      spriteKey: 'spindleMoulder',
      tier: 'used',
      x: 3,
      y: 3,
      width: 2,
      depth: 1,
      height: 1,
      fill: 'var(--kit-machine)',
      shade: 'var(--kit-machine-dark)',
      label: 'Spindle moulder',
      files: ['spindleMoulder.used.png'],
    });
    expect(art).toContain('/sprites/spindleMoulder.used.png');
    expect(art).not.toContain('data-placeholder=');
  });
});
