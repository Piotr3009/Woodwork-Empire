// What the hall draws for Turn 13: the placeholders the art side has not painted yet, in the
// hall's 2:1 dimetric and through the one helper (CLAUDE.md T13 1, 3.13).

import { describe, expect, it } from 'vitest';
import { objectArt, renderHall } from '../../src/render/hall';
import { PLACEHOLDER_SPRITES, placeholderKindFor } from '../../src/render/sprites';
import { newGame, placeEquipment } from '../helpers';

describe('a picture the art side owes', () => {
  it('names the spindle moulder classes and the pallet truck, and nothing else', () => {
    expect([...PLACEHOLDER_SPRITES]).toEqual(['spindleMoulder', 'palletTruck']);
    expect(placeholderKindFor('spindleMoulder', 'used')).toBe('spindleMoulder.used');
    expect(placeholderKindFor('palletTruck', 'standard')).toBe('palletTruck.standard');
    expect(placeholderKindFor('palletTruck', null)).toBe('palletTruck');
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
