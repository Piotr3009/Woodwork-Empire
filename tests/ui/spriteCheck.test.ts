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
import { PORTS, type Port } from '../../src/engine/ports';

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

  it('draws the spindle moulder classes from their files (delivered 19.09), and the pallet truck as a placeholder', () => {
    const page = parse(renderSpriteCheck());
    for (const classId of ['used', 'budget', 'standard', 'pro', 'industrial']) {
      const cell = page.querySelector(`[data-sprite-target="spindleMoulder.${classId}"]`);
      expect(cell, classId).not.toBeNull();
      expect(cell?.querySelector('.sprite-shot.is-placeholder'), classId).toBeNull();
      expect(cell?.innerHTML, classId).toContain(`/sprites/spindleMoulder.${classId}.png`);
    }
    const truck = page.querySelector('[data-sprite-target="palletTruck"] [data-placeholder]');
    expect(truck?.getAttribute('data-placeholder')).toBe('palletTruck');
  });

  it('lists the pipe layer once each, drawn as the hall draws it, and from no file at all', () => {
    // The pipe layer (CLAUDE.md T13 3.11, 3.19). The nine `pipe.*.png` tiles Piotr delivered for
    // Turn 16 did not meet each other, so Turn 22 deleted them and draws a run as one path
    // instead: the page shows the vector drawing, which is the only drawing there is now
    // (PIOTR's screenshot, 19.09; CLAUDE.md T22 2.7). Only `gate.collar` is still a file.
    expect([...PIPE_LAYER_KEYS]).toEqual(['gate.collar']);
    const page = parse(renderSpriteCheck());
    expect(page.innerHTML).toContain('The pipe layer');
    const cells = Array.from(page.querySelectorAll('[data-pipe-key]'));
    expect(cells.map((cell) => cell.getAttribute('data-pipe-key'))).toEqual([...PIPE_LAYER_KEYS]);
    for (const cell of cells) {
      const key = cell.getAttribute('data-pipe-key') ?? '';
      expect(cell.querySelector('[data-placeholder]'), key).toBeNull();
      expect(cell.textContent, key).toContain(`${key}.png`);
      if (key === 'gate.collar') {
        expect(cell.innerHTML, key).toContain(`/sprites/${key}.png`);
        continue;
      }
      // Drawn by `src/render/pipes.ts`, off no file: the group the hall itself puts on the floor.
      expect(cell.innerHTML, key).not.toContain('/sprites/pipe.');
      expect(cell.innerHTML, key).toContain(`data-pipe-tile="${key}"`);
    }
  });

  it('prints the measured connection point of every file a pipe is drawn to (CLAUDE.md T22 2.8)', () => {
    const page = parse(renderSpriteCheck());
    // The saw's line: the rear base outlet, hidden behind the body [PIOTR's pick B].
    const saw = page.querySelector('[data-sprite-target="tableSaw.standard"] [data-port]');
    expect(saw?.getAttribute('data-port')).toBe('tableSaw.standard.png');
    expect(saw?.textContent).toContain('drop at px 137, py 62');
    expect(saw?.textContent).toContain('hidden behind the body');
    expect(saw?.className).not.toContain('warn');
    // The fan's line: the mouth, and which way it opens.
    const fan = page.querySelector('[data-sprite-target="extractor.standard"] [data-port]');
    expect(fan?.textContent).toContain('inlet, mouth +y at px 28, py 67');
    // The two hand edgebanders want no extraction at all, so the page asks nothing of them, and
    // neither does a desk or a locker (CLAUDE.md T22 2.8).
    for (const name of ['edgebander.used', 'edgebander.budget', 'locker', 'sheetRack.pro']) {
      expect(
        page.querySelector(`[data-sprite-target="${name}"] [data-port]`),
        name,
      ).toBeNull();
    }
  });

  it('prints no port data in red for a file a pipe is drawn to with nothing measured on it', () => {
    // The one thing a real table can never show, so the page takes the table as an argument and
    // the test hands it one with the standard saw's line taken out (CLAUDE.md T22 2.8).
    const table: Record<string, Port> = { ...PORTS };
    delete table['tableSaw.standard.png'];
    const page = parse(renderSpriteCheck(table));
    const saw = page.querySelector('[data-sprite-target="tableSaw.standard"] [data-port]');
    expect(saw?.getAttribute('data-port')).toBe('none');
    expect(saw?.textContent).toBe('no port data');
    // In red, by the one class the game paints a warning with.
    expect(saw?.className.split(' ')).toContain('warn');
    // The rest of the page is as it was: the pro saw still has its line.
    expect(
      page.querySelector('[data-sprite-target="tableSaw.pro"] [data-port]')?.textContent,
    ).toContain('px 139, py 80');
    expect(renderSpriteCheck()).toContain('px 137, py 62');
  });

  it('says which of the four orientations has a file of its own (CLAUDE.md T22 2.11)', () => {
    const page = parse(renderSpriteCheck());
    // The tool cabinet is the first family in the game the art side has drawn all four of
    // (PIOTR's art, 19.09), and from Turn 22 it is a class ladder, so the page has a cell for each
    // of the five (CLAUDE.md T22 2.11, 2.12).
    for (const classId of ['used', 'budget', 'standard', 'pro', 'industrial']) {
      const cell = page.querySelector(`[data-sprite-target="toolCabinet.${classId}"] [data-turns]`);
      expect(cell?.getAttribute('data-turns'), classId).toBe('0,1,2,3');
      expect(cell?.textContent, classId).toContain('4 of 4 orientations drawn');
      expect(cell?.textContent, classId).toContain('.rrr');
      expect(cell?.textContent, classId).not.toContain('the rest mirrored');
    }
    // Everything else has its base picture and mirrors the quarter turn, as the game has since
    // Turn 10: the saw and the fan say so, and the fan's three turned files are the one thing
    // Turn 22 asks the art side for (docs/art/REQUESTS-T22.md 2).
    for (const name of ['tableSaw.standard', 'extractor.pro']) {
      const cell = page.querySelector(`[data-sprite-target="${name}"] [data-turns]`);
      expect(cell?.getAttribute('data-turns'), name).toBe('0');
      expect(cell?.textContent, name).toContain('1 of 4 orientations drawn: the base file');
      expect(cell?.textContent, name).toContain('the rest mirrored or the base picture');
    }
    // A key with no file at all says none, and still says it.
    const truck = page.querySelector('[data-sprite-target="palletTruck"] [data-turns]');
    expect(truck?.getAttribute('data-turns')).toBe('');
    expect(truck?.textContent).toContain('0 of 4 orientations drawn: none');
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
    // the pallet truck (the spindle moulder's five classes landed on 19.09).
    const placeholders = Array.from(page.querySelectorAll('.sprite-grid .sprite-shot.is-placeholder'));
    expect(placeholders).toHaveLength(1);
    expect(page.querySelectorAll('.sprite-grid .sprite-shot.is-missing')).toHaveLength(
      targets.length - delivered.length - placeholders.length,
    );
    expect(page.innerHTML).toContain('no file');
    expect(page.innerHTML).toContain(`${targets.length} keys, ${delivered.length} with a file`);
  });
});
