// @vitest-environment jsdom
// The sprite check page is the acceptance tool for a batch of art (CLAUDE.md T3 3.6).

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { HALL_LAYERS, PALLET_SPRITE } from '../../src/render/hall';
import { OFFICE_LAYERS, OFFICE_LIT_LAYERS } from '../../src/render/office';
import { standsInTheHall } from '../../src/engine/machines';
import { spriteUrl } from '../../src/render/sprites';
import { CHARACTER_ROLES, PIPE_LAYER_KEYS, renderSpriteCheck, spriteTargets } from '../../src/ui/spriteCheck';
import { ANIMATIONS } from '../../src/render/characters';
import { PIPE_TILE_KEYS } from '../../src/engine/constants';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the sprite check page', () => {
  it('lists every key the game can draw, exactly once', () => {
    const names = spriteTargets().map((target) => target.name);
    expect(new Set(names).size).toBe(names.length);
    // The pallet of sheets stands where the lorry stood (CLAUDE.md T13 3.21).
    expect(names).toContain(PALLET_SPRITE);
    expect(names).not.toContain('deliveryVan');
    // A family with classes is asked for one picture per class, because the loader asks for the
    // class and a class has its own footprint (CLAUDE.md T7 3.5). A family with one class is
    // asked for once, by the family key. The office desk items went with the desk (T4 3.1) and
    // the rooms are the hall layers now (docs/art/SPRITES.md 9.3).
    const wanted = new Set<string>([PALLET_SPRITE]);
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
    // The extractor and the compressor got their five classes in Turn 10, so the page lists
    // every one of them (CLAUDE.md T10 3.4).
    expect(names).toContain('extractor.used');
    expect(names).toContain('extractor.industrial');
    expect(names).toContain('compressor.used');
    expect(names).toContain('compressor.industrial');
    expect(names).not.toContain('compressor.standard.standard');
    // Every machine family has its five classes from Turn 13 (CLAUDE.md T13 3.12); a line with
    // one class still gets no class cell of its own.
    expect(names).toContain('thicknesser.standard');
    expect(names).not.toContain('airDryer.standard');
    // The air dryer is a line of the catalogue and a key the art side owes a picture for.
    expect(names).toContain('airDryer');
  });

  it('draws one cell per key, each with a footprint, a box and a picture slot', () => {
    const page = parse(renderSpriteCheck());
    const cells = Array.from(page.querySelectorAll('.sprite-grid .sprite-cell[data-sprite-target]'));
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
    // Seven layer cells in all: three of the hall, three of the office and the lit door the art
    // side owes (CLAUDE.md T14 2.2), each once. The figures have wide cells of their own beside
    // them, keyed by the sheet and not by a sprite (CLAUDE.md T9 3.13).
    const wide = Array.from(page.querySelectorAll('.sprite-wide-grid [data-sprite-target]'));
    expect(wide).toHaveLength(HALL_LAYERS.length + OFFICE_LAYERS.length + OFFICE_LIT_LAYERS.length);
    expect(page.innerHTML).toContain('The office, lit');
    expect(page.querySelector('[data-sprite-target="officeDoorLit"]')).not.toBeNull();
    const keys = wide.map((cell) => cell.getAttribute('data-sprite-target'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('draws the spindle moulder classes as placeholders in the hall dimetric until they are painted', () => {
    const page = parse(renderSpriteCheck());
    for (const classId of ['used', 'budget', 'standard', 'pro', 'industrial']) {
      const cell = page.querySelector(`[data-sprite-target="spindleMoulder.${classId}"]`);
      expect(cell, classId).not.toBeNull();
      const drawn = cell?.querySelector('.sprite-shot.is-placeholder [data-placeholder]');
      expect(drawn?.getAttribute('data-placeholder'), classId).toBe(`spindleMoulder.${classId}`);
      // The 2:1 diamond, never straight on (docs/art/REQUESTS-T13.md).
      expect(drawn?.querySelectorAll('polygon').length, classId).toBeGreaterThanOrEqual(3);
    }
    const truck = page.querySelector('[data-sprite-target="palletTruck"] [data-placeholder]');
    expect(truck?.getAttribute('data-placeholder')).toBe('palletTruck');
  });

  it('lists the eight pipe tiles and the gate collar once each, drawn as the hall draws them', () => {
    // The pipe layer the art side owes (CLAUDE.md T13 3.11, 3.19; docs/art/REQUESTS-T13.md 1, 2).
    expect([...PIPE_LAYER_KEYS]).toEqual([...PIPE_TILE_KEYS, 'gate.collar']);
    const page = parse(renderSpriteCheck());
    expect(page.innerHTML).toContain('The pipe layer');
    const cells = Array.from(page.querySelectorAll('[data-pipe-key]'));
    expect(cells.map((cell) => cell.getAttribute('data-pipe-key'))).toEqual([...PIPE_LAYER_KEYS]);
    for (const cell of cells) {
      const key = cell.getAttribute('data-pipe-key') ?? '';
      // Drawn by the pipe helper, as the hall draws it, until the file lands (CLAUDE.md T16 2.3).
      expect(cell.querySelector(`[data-pipe-tile="${key}"]`), key).not.toBeNull();
      expect(cell.querySelector('[data-placeholder]'), key).toBeNull();
      expect(cell.textContent, key).toContain(`${key}.png`);
    }
  });

  it('lists every role of the game with every frame key, the two of Turn 13 among them', () => {
    // Every state the character system can be in has a key, home included (CLAUDE.md T13 3.23).
    // Sweep joined them in Turn 20, for the helper with a broom (CLAUDE.md T20 2.8).
    expect([...ANIMATIONS]).toEqual([
      'walk',
      'bench',
      'carry',
      'idle',
      'phone',
      'home',
      'sweep',
    ]);
    expect(CHARACTER_ROLES).toContain('estimator');
    expect(CHARACTER_ROLES).toContain('productionManager');
    const page = parse(renderSpriteCheck());
    const cells = Array.from(page.querySelectorAll('[data-character-key]')).map((cell) =>
      cell.getAttribute('data-character-key'),
    );
    expect(cells).toHaveLength(CHARACTER_ROLES.length * ANIMATIONS.length);
    expect(cells).toContain('character.productionManager.phone');
    expect(cells).toContain('character.estimator.idle');
    expect(cells).toContain('character.owner.home');
  });

  it('prints the key, the footprint and the canvas the art side has to hit', () => {
    const page = parse(renderSpriteCheck());
    const saw = page.querySelector('[data-sprite-target="tableSaw.used"]');
    expect(saw?.textContent).toContain('tableSaw.used.png');
    // Metres now, and half the tiles of Turns 1 to 4 (docs/art/SPRITES.md 9.1).
    expect(saw?.textContent).toContain('2 m by 1 m, 1 m high');
    // The canvas formula of docs/art/SPRITES.md 2, in metres, plus 8 px of padding a side, which
    // is the 160 by 136 of CLAUDE.md T7 3.5.
    expect(saw?.textContent).toContain('canvas 144 by 120');
    expect(saw?.textContent).toContain('file 160 by 136');
    // And a class with its own footprint gets its own canvas: the pro saw is 3 m by 2 m, 1 m
    // high, written the way every footprint is (CLAUDE.md T12 3.1).
    const pro = page.querySelector('[data-sprite-target="tableSaw.pro"]');
    expect(pro?.textContent).toContain('3 m by 2 m, 1 m high');
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
    // A Turn 13 picture the art side owes is drawn as its placeholder rather than as "no file":
    // the spindle moulder's five classes and the pallet truck (CLAUDE.md T13 3.13, 3.21).
    const placeholders = Array.from(page.querySelectorAll('.sprite-grid .sprite-shot.is-placeholder'));
    expect(placeholders).toHaveLength(6);
    expect(page.querySelectorAll('.sprite-grid .sprite-shot.is-missing')).toHaveLength(
      targets.length - delivered.length - placeholders.length,
    );
    expect(page.innerHTML).toContain('no file');
    expect(page.innerHTML).toContain(`${targets.length} keys, ${delivered.length} with a file`);
  });
});
