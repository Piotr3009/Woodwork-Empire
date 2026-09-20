// What the hall does once the art side has delivered files. The manifest is faked here so the
// test says what it means whatever is on disk: the real folder grows a batch at a time and no
// placeholder PNG is ever committed (CLAUDE.md T3 5.1).

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../public/sprites/manifest.json', () => ({
  default: ['tableSaw.pro.png', 'workbench.png'],
}));

const { renderHall } = await import('../../src/render/hall');
const { spriteBox } = await import('../../src/render/sprites');
const { footprintIn } = await import('../../src/render/hall');
const { act, buyStartingKit, newGame } = await import('../helpers');

function hall(sawVariant: string): string {
  return renderHall(buyStartingKit(newGame(), { sawVariant }));
}

describe('an object with a file is a picture, not a box', () => {
  it('draws the saw of that class as an image, sized and placed by the contract', () => {
    const svg = hall('pro');
    const saw = act(buyStartingKit(newGame(), { sawVariant: 'pro' }), { type: 'SET_SPEED', speed: 0 })
      .equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.variantId).toBe('pro');
    // The footprint comes from the class, in metres, and it stands centred inside the working
    // zone the class reserves, whose corner is the anchor (docs/art/SPRITES.md 9.1, T7 3.3).
    if (!saw) throw new Error('no saw in the hall');
    const stands = footprintIn(saw);
    const at = spriteBox(stands.x, stands.y, stands.width, stands.depth, stands.height);
    expect(svg).toContain('<image href="/sprites/tableSaw.pro.png"');
    expect(svg).toContain(`width="${at.width}" height="${at.height}"`);
    // The hall rounds every coordinate it writes to a hundredth of a pixel (its own `round`),
    // and a 2.15 m saw lands on a fraction where the 1 m saw landed on a whole number.
    const hundredth = (value: number): number => Math.round(value * 100) / 100;
    expect(svg).toContain(`x="${hundredth(at.x)}" y="${hundredth(at.y)}"`);
  });

  it('falls back to the box when there is no file for that class or family', () => {
    // The used saw has no file of its own and there is no tableSaw.png either.
    const svg = hall('used');
    expect(svg).not.toContain('<image href="/sprites/tableSaw');
    expect(svg).toContain('>Table saw<');
  });

  it('takes the name off the picture and leaves it in the tooltip', () => {
    const svg = hall('pro');
    // The workbench has a file, so its name is a title and not text over the art.
    expect(svg).toContain('<title>Workbench (free). One per worker,');
    expect(svg).not.toContain('>Workbench (free)<');
    // The cheap shelving has none, so it keeps its label.
    expect(svg).toContain('>Sheet rack: 0 / 50<');
  });

  it('draws the contact shadow under both the pictures and the boxes', () => {
    const svg = hall('pro');
    const shadows = svg.split('class="contact-shadow"').length - 1;
    // Three rooms, the kit in the hall, and never fewer than one per object drawn.
    expect(shadows).toBeGreaterThanOrEqual(10);
    // The saw has a picture and the shelving has not: both stand on a shadow.
    expect(svg).toContain('<image href="/sprites/tableSaw.pro.png"');
    expect(svg).toContain('>Sheet rack: 0 / 50<');
  });
});
