// @vitest-environment jsdom
// The sprite check page is the acceptance tool for a batch of art (CLAUDE.md T3 3.6).

import { describe, expect, it } from 'vitest';
import {
  DELIVERY_VAN_SPRITE,
  EQUIPMENT_SPECS,
  ROOM_LAYOUT,
} from '../../src/engine/constants';
import { OFFICE_LAYERS } from '../../src/render/office';
import { renderSpriteCheck, spriteTargets } from '../../src/ui/spriteCheck';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the sprite check page', () => {
  it('lists every key the game can draw, exactly once', () => {
    const names = spriteTargets().map((target) => target.name);
    expect(new Set(names).size).toBe(names.length);
    for (const spec of EQUIPMENT_SPECS) expect(names, spec.id).toContain(spec.spriteKey);
    for (const room of ROOM_LAYOUT) expect(names, room.id).toContain(room.spriteKey);
    expect(names).toContain(DELIVERY_VAN_SPRITE);
    // The office desk items went with the desk: the page asks for the catalogue, the rooms and
    // the van, and nothing else (the grep in tests/render/deskItemsGone.test.ts proves it).
    expect(names.every((name) => name !== '')).toBe(true);
    // The five classes of saw (CLAUDE.md T3 3.5).
    expect(names).toContain('tableSaw.used');
    expect(names).toContain('tableSaw.industrial');
    // A family with one class gets no class cell of its own.
    expect(names).not.toContain('compressor.standard');
  });

  it('draws one cell per key, each with a footprint, a box and a picture slot', () => {
    const page = parse(renderSpriteCheck());
    const cells = Array.from(page.querySelectorAll('.sprite-grid .sprite-cell'));
    expect(cells).toHaveLength(spriteTargets().length);
    const keys = cells.map((cell) => cell.getAttribute('data-sprite-target'));
    expect(new Set(keys).size).toBe(keys.length);
    for (const cell of cells) {
      expect(cell.querySelector('.sprite-proof')).not.toBeNull();
      expect(cell.querySelector('.sprite-shot')).not.toBeNull();
    }
  });

  it('shows the three office layers full width, so the art PR can be checked here', () => {
    const page = parse(renderSpriteCheck());
    expect(page.innerHTML).toContain('The office room');
    for (const layer of OFFICE_LAYERS) {
      const cell = page.querySelector(`.sprite-wide-grid [data-sprite-target="${layer.key}"]`);
      expect(cell, layer.key).not.toBeNull();
      expect(cell?.textContent, layer.key).toContain(`${layer.key}.png`);
      expect(cell?.textContent, layer.key).toContain('1672 by 941');
      expect(cell?.textContent, layer.key).toContain(layer.name);
    }
    // They are full width pictures, not a footprint diamond with a box on it.
    expect(page.querySelector('.sprite-wide-grid .sprite-proof')).toBeNull();
  });

  it('prints the key, the footprint and the canvas the art side has to hit', () => {
    const page = parse(renderSpriteCheck());
    const saw = page.querySelector('[data-sprite-target="tableSaw"]');
    expect(saw?.textContent).toContain('tableSaw.png');
    expect(saw?.textContent).toContain('4 by 2 by 2 tiles');
    // 288 by 240 plus 8 px of padding on every side (docs/art/SPRITES.md 6).
    expect(saw?.textContent).toContain('canvas 288 by 240');
    expect(saw?.textContent).toContain('file 304 by 256');
  });

  it('says so plainly where there is no file yet', () => {
    const page = parse(renderSpriteCheck());
    expect(page.querySelectorAll('.sprite-grid .sprite-shot.is-missing')).toHaveLength(
      spriteTargets().length,
    );
    expect(page.innerHTML).toContain('no file');
    expect(page.innerHTML).toContain(`${spriteTargets().length} keys, 0 with a file`);
  });
});
