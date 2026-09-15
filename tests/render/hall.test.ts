// What the hall draws for Turn 13: the placeholders the art side has not painted yet, in the
// hall's 2:1 dimetric and through the one helper (CLAUDE.md T13 1, 3.13).

import { describe, expect, it } from 'vitest';
import { gateCollars, objectArt, pipeCellArt, pipeRuns, renderHall } from '../../src/render/hall';
import { PLACEHOLDER_SPRITES, placeholderKindFor } from '../../src/render/sprites';
import { connectExtraction, pipeRunFor, portCell } from '../../src/engine/pipes';
import { centreOf } from '../../src/render/iso';
import { DUCT_HEIGHT, PIPE_TILE_KEYS } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

/** A standard saw and a fan of the named class, the saw connected by the game's own route. */
function pipedHall(fanClass: string): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  placeEquipment(state, 'extractor', { variantId: fanClass, x: 18, y: 3, id: 'kit-fan' });
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 4, y: 2, id: 'kit-saw' });
  state.pipes = [];
  connectExtraction(state, 'kit-saw');
  return state;
}

describe('the pipe layer (CLAUDE.md T13 3.19)', () => {
  it('maps every tile key to a placeholder draw in the hall dimetric, and to the file once it lands', () => {
    for (const key of PIPE_TILE_KEYS) {
      const drawn = pipeCellArt(key, { x: 3, y: 4 }, []);
      expect(drawn, key).toContain(`data-placeholder="${key}"`);
      expect(drawn, key).toContain(`data-pipe-tile="${key}"`);
      // The 2:1 diamond of the placeholder helper, never a flat rectangle.
      expect(drawn, key).toContain('<polygon');
      expect(drawn, key).not.toContain('<rect');
      expect(pipeCellArt(key, { x: 3, y: 4 }, [`${key}.png`]), key).toContain(`/sprites/${key}.png`);
    }
    // Lifted to the height of the ducting: the tile sits above the cell it is over.
    const at = /translate\(([-\d.]+),([-\d.]+)\)/.exec(pipeCellArt('pipe.ew', { x: 3, y: 4 }, []));
    expect(Number(at?.[2])).toBeLessThan(centreOf(3, 4, 1, 1).y - DUCT_HEIGHT * 24 + 1);
  });

  it('draws every run tile by tile, above the equipment, keyed by the machine it serves', () => {
    const state = pipedHall('pro');
    const run = pipeRunFor(state, 'kit-saw');
    if (!run) throw new Error('no run');
    const svg = renderHall(state, { files: [] });
    expect(svg).toContain(`data-pipe="${run.id}"`);
    expect(svg).toContain('data-pipe-for="kit-saw"');
    expect((svg.match(/data-pipe-tile="/g) ?? []).length).toBe(run.tiles.length);
    expect(svg).toContain('data-pipe-tile="pipe.drop"');
    expect(svg).toContain('data-pipe-tile="pipe.inlet"');
    // The layer comes after the machines in the live part, so it is over them.
    expect(svg.indexOf('class="pipe-layer"')).toBeGreaterThan(svg.indexOf('data-kit="kit-saw"'));
    // And the tooltip on a machine with no pipe says so.
    const bare = pipedHall('pro');
    bare.pipes = [];
    expect(renderHall(bare, { files: [] })).toContain('Table saw (no pipe)');
    expect(svg).not.toContain('(no pipe)');
  });

  it('outlines the run in red while the hall is short and this machine is one of the ones running', () => {
    // A used fan allows 830 against the standard saw's 1,100 (CLAUDE.md T10 3.1).
    const state = pipedHall('used');
    const saw = state.equipment.find((item) => item.id === 'kit-saw');
    if (!saw) throw new Error('no saw');
    expect(pipeRuns(state, [])).not.toContain('pipe-short');
    saw.takenBy = 'owner';
    expect(pipeRuns(state, [])).toContain('class="pipe pipe-short"');
    // A pro fan pulls enough: no outline while the same saw runs.
    const fine = pipedHall('pro');
    const other = fine.equipment.find((item) => item.id === 'kit-saw');
    if (other) other.takenBy = 'owner';
    expect(pipeRuns(fine, [])).not.toContain('pipe-short');
  });
});

describe('the gate collar (CLAUDE.md T13 3.11)', () => {
  it('is drawn on the drop of a gated machine, above the floor, and on nothing else', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'pro', x: 4, y: 2, id: 'kit-saw' });
    placeEquipment(state, 'extractor', { variantId: 'standard', x: 18, y: 6 });
    expect(gateCollars(state, [])).toBe('');
    expect(renderHall(state, { files: [] })).not.toContain('gate.collar');
    state.gates.push('kit-saw');
    const collars = gateCollars(state, []);
    expect(collars).toContain('class="gate-collar"');
    expect(collars).toContain('data-gate="kit-saw"');
    expect(collars).toContain('data-placeholder="gate.collar"');
    // On the drop cell: the first cell of the saw's own footprint inside its zone, lifted to the
    // height of the ducting so it reads as a collar on the pipe and not a thing on the floor.
    const cell = portCell(saw);
    const centre = centreOf(cell.x, cell.y, 1, 1, DUCT_HEIGHT);
    const floor = centreOf(cell.x, cell.y, 1, 1);
    const at = /translate\(([-\d.]+),([-\d.]+)\)/.exec(collars);
    expect(at).not.toBeNull();
    const y = Number(at?.[2]);
    expect(y).toBeLessThan(floor.y);
    expect(Math.abs(Number(at?.[1]) + 12 - centre.x)).toBeLessThan(1);
    // It is in the hall, in the live part, above the equipment.
    const svg = renderHall(state, { files: [] });
    expect(svg.indexOf('data-gate="kit-saw"')).toBeGreaterThan(svg.indexOf('data-kit="kit-saw"'));
    // The file, once painted, takes the collar's place through the same loader.
    expect(gateCollars(state, ['gate.collar.png'])).toContain('/sprites/gate.collar.png');
  });
});

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
