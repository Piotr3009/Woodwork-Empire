// @vitest-environment jsdom
// The sprite check page is the acceptance tool for a batch of art (CLAUDE.md T3 3.6).

import { describe, expect, it } from 'vitest';
import { DELIVERY_VAN_SPRITE, EQUIPMENT_SPECS } from '../../src/engine/constants';
import { HALL_LAYERS } from '../../src/render/hall';
import { OFFICE_LAYERS } from '../../src/render/office';
import { standsInTheHall } from '../../src/engine/machines';
import { spriteUrl } from '../../src/render/sprites';
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
    expect(names).toContain(DELIVERY_VAN_SPRITE);
    // A family with classes is asked for one picture per class, because the loader asks for the
    // class and a class has its own footprint (CLAUDE.md T7 3.5). A family with one class is
    // asked for once, by the family key. The office desk items went with the desk (T4 3.1) and
    // the rooms are the hall layers now (docs/art/SPRITES.md 9.3).
    const wanted = new Set<string>([DELIVERY_VAN_SPRITE]);
    for (const spec of EQUIPMENT_SPECS) {
      if (spec.variants.length > 1) {
        for (const variant of spec.variants) wanted.add(`${spec.spriteKey}.${variant.id}`);
        continue;
      }
      if (standsInTheHall(spec.id)) wanted.add(spec.spriteKey);
    }
    expect(new Set(names)).toEqual(wanted);
    // The family key of a family with classes is not asked for on its own any more.
    expect(names).not.toContain('tableSaw');
    expect(names).not.toContain('edgebander');
    for (const key of ['roomWc', 'roomOffice', 'roomCanteen']) {
      expect(names, key).not.toContain(key);
    }
    // The five classes of saw (CLAUDE.md T3 3.5) and of the three families of T7 3.6.
    expect(names).toContain('tableSaw.used');
    expect(names).toContain('tableSaw.industrial');
    expect(names).toContain('workbench.industrial');
    expect(names).toContain('sheetRack.pro');
    // The hand classes of the edgebander are drawn too, in the cabinet they are kept in.
    expect(names).toContain('edgebander.budget');
    expect(names).toContain('edgebander.industrial');
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
    const saw = page.querySelector('[data-sprite-target="tableSaw.used"]');
    expect(saw?.textContent).toContain('tableSaw.used.png');
    // Metres now, and half the tiles of Turns 1 to 4 (docs/art/SPRITES.md 9.1).
    expect(saw?.textContent).toContain('2 by 1 by 1 m');
    // The canvas formula of docs/art/SPRITES.md 2, in metres, plus 8 px of padding a side, which
    // is the 160 by 136 of CLAUDE.md T7 3.5.
    expect(saw?.textContent).toContain('canvas 144 by 120');
    expect(saw?.textContent).toContain('file 160 by 136');
    // And a class with its own footprint gets its own canvas: the pro saw is 3 by 2 by 1 m.
    const pro = page.querySelector('[data-sprite-target="tableSaw.pro"]');
    expect(pro?.textContent).toContain('3 by 2 by 1 m');
    expect(pro?.textContent).toContain('file 256 by 184');
  });

  it('counts what has been delivered and says so plainly where there is not', () => {
    const page = parse(renderSpriteCheck());
    const targets = spriteTargets();
    const delivered = targets.filter(
      (target) => spriteUrl(target.spriteKey, target.tier) !== null,
    );
    // Piotr delivered a batch with this brief, so the page is no longer all placeholders.
    expect(delivered.length).toBeGreaterThan(0);
    expect(page.querySelectorAll('.sprite-grid .sprite-shot.is-missing')).toHaveLength(
      targets.length - delivered.length,
    );
    expect(page.innerHTML).toContain('no file');
    expect(page.innerHTML).toContain(`${targets.length} keys, ${delivered.length} with a file`);
  });
});
