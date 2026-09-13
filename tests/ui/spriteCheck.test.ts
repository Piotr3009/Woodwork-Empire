// @vitest-environment jsdom
// The sprite check page is the acceptance tool for a batch of art (CLAUDE.md T3 3.6).

import { describe, expect, it } from 'vitest';
import { DELIVERY_VAN_SPRITE, EQUIPMENT_SPECS } from '../../src/engine/constants';
import { HALL_LAYERS } from '../../src/render/hall';
import { OFFICE_LAYERS } from '../../src/render/office';
import { standsInTheHall } from '../../src/engine/machines';
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
    const drawn = EQUIPMENT_SPECS.filter((spec) => standsInTheHall(spec.id));
    for (const spec of drawn) expect(names, spec.id).toContain(spec.spriteKey);
    expect(names).toContain(DELIVERY_VAN_SPRITE);
    // The page asks for the catalogue families and their classes and the lorry, and for nothing
    // else: the office desk items went with the desk (CLAUDE.md T4 3.1), the rooms are the hall
    // layers now (docs/art/SPRITES.md 9.3), and nothing that holds no cell of the floor is asked
    // for at all, because the game never draws it (CLAUDE.md T6 3.5).
    const wanted = new Set<string>([DELIVERY_VAN_SPRITE]);
    for (const spec of drawn) {
      wanted.add(spec.spriteKey);
      if (spec.variants.length < 2) continue;
      for (const variant of spec.variants) wanted.add(`${spec.spriteKey}.${variant.id}`);
    }
    expect(new Set(names)).toEqual(wanted);
    expect(names).not.toContain('edgebander');
    for (const key of ['roomWc', 'roomOffice', 'roomCanteen']) {
      expect(names, key).not.toContain(key);
    }
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

  it('shows the three hall layers full width too, on their own canvas', () => {
    const page = parse(renderSpriteCheck());
    expect(page.innerHTML).toContain('The painted hall');
    for (const layer of HALL_LAYERS) {
      const cell = page.querySelector(`.sprite-wide-grid [data-sprite-target="${layer.key}"]`);
      expect(cell, layer.key).not.toBeNull();
      expect(cell?.textContent, layer.key).toContain(`${layer.key}.png`);
      // The file size, which is the 2x canvas of docs/art/SPRITES.md 9.3.
      expect(cell?.textContent, layer.key).toContain('1680 by 1128');
      expect(cell?.textContent, layer.key).toContain(layer.name);
    }
    // Six wide cells in all: three of the hall and three of the office, each once.
    const wide = Array.from(page.querySelectorAll('.sprite-wide-grid .sprite-cell'));
    expect(wide).toHaveLength(HALL_LAYERS.length + OFFICE_LAYERS.length);
    const keys = wide.map((cell) => cell.getAttribute('data-sprite-target'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('prints the key, the footprint and the canvas the art side has to hit', () => {
    const page = parse(renderSpriteCheck());
    const saw = page.querySelector('[data-sprite-target="tableSaw"]');
    expect(saw?.textContent).toContain('tableSaw.png');
    // Metres now, and half the tiles of Turns 1 to 4 (docs/art/SPRITES.md 9.1).
    expect(saw?.textContent).toContain('2 by 1 by 1 m');
    // The canvas formula of docs/art/SPRITES.md 2, in metres, plus 8 px of padding a side.
    expect(saw?.textContent).toContain('canvas 144 by 120');
    expect(saw?.textContent).toContain('file 160 by 136');
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
