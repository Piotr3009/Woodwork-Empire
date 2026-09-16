// Pipes you can read (CLAUDE.md T16 2.3): one drawing of a pipe for every run, the Turn 4 ducting
// gone, a red ring and the words on a machine with no pipe, and with a central system a drop to
// every machine and no ring at all.

import { describe, expect, it } from 'vitest';
import { connectExtraction } from '../../src/engine/pipes';
import { centralRunArt, ductSystemOf, portRings, renderHall } from '../../src/render/hall';
import { PIPE_KINDS, pipeTile, portRing } from '../../src/render/pipes';
import type { GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

/** One fan and two saws, the first connected by the game's own route and the second bare. */
function twoSaws(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  placeEquipment(state, 'extractor', { variantId: 'pro', x: 18, y: 3, id: 'kit-fan' });
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 4, y: 2, id: 'kit-saw-1' });
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 10, y: 2, id: 'kit-saw-2' });
  state.pipes = [];
  connectExtraction(state, 'kit-saw-1');
  return state;
}

describe('one drawing of a pipe (CLAUDE.md T16 2.3)', () => {
  it('draws every kind as a bar or a collar in the duct grey, and a drop as a vertical ending in a ring', () => {
    for (const kind of PIPE_KINDS) {
      const tile = pipeTile(kind, { x: 5, y: 5 });
      expect(tile, kind).toContain(`data-pipe-tile="${kind}"`);
      expect(tile, kind).not.toContain('placeholder');
    }
    const drop = pipeTile('pipe.drop', { x: 5, y: 5 });
    expect(drop).toContain('pipe-port');
    const bar = /pipe-bar[^>]*y1="([-\d.]+)"[^>]*y2="([-\d.]+)"/.exec(drop);
    // The drop goes down: from the pipe's height to the floor of the cell.
    expect(Number(bar?.[2])).toBeGreaterThan(Number(bar?.[1]));
    expect(pipeTile('pipe.inlet', { x: 5, y: 5 })).toContain('pipe-collar');
    expect(pipeTile('pipe.tee', { x: 5, y: 5 }).match(/pipe-bar/g)?.length).toBe(4);
    expect(pipeTile('pipe.ne', { x: 5, y: 5 }).match(/pipe-bar/g)?.length).toBe(2);
  });

  it('marks the one saw with no pipe: a drop on the other, a red ring and the words on this one, and no Turn 4 ducting', () => {
    const state = twoSaws();
    const svg = renderHall(state, { files: [] });
    expect((svg.match(/data-pipe-tile="pipe.drop"/g) ?? []).length).toBe(1);
    expect(svg).toContain('data-unconnected="kit-saw-2"');
    expect(svg).not.toContain('data-unconnected="kit-saw-1"');
    expect((svg.match(/data-not-connected="1"/g) ?? []).length).toBe(1);
    expect(svg).not.toContain('duct-run');
    expect(svg).not.toContain('duct-drop');
    expect(svg).not.toContain('data-placeholder="pipe.');
    expect(svg).not.toContain('placeholder-art"><g class="placeholder" data-placeholder="pipe');
    // The ring sits on the port cell of the bare saw, on the floor.
    expect(portRings(state)).toBe(portRing({ x: 10, y: 3 }, 'kit-saw-2'));
  });

  it('draws two drops and no ring with a central system, through the same helper', () => {
    const state = twoSaws();
    state.pipes = [];
    placeEquipment(state, 'dustSystem', { x: 20, y: 1 });
    expect(ductSystemOf(state)).toBe('dustSystem');
    const svg = renderHall(state, { files: [] });
    expect((svg.match(/data-pipe-tile="pipe.drop"/g) ?? []).length).toBe(2);
    expect(svg).not.toContain('data-unconnected=');
    expect(svg).not.toContain('data-not-connected');
    expect(svg).toContain('data-ducts="dustSystem"');
    // The run along the rear wall is the width of the hall, one ew tile a cell.
    expect((centralRunArt(state, []).match(/data-pipe-tile="pipe.ew"/g) ?? []).length).toBe(
      state.unit.widthCells,
    );
    expect(svg).toContain('data-central-for="kit-saw-1"');
    expect(svg).toContain('data-central-for="kit-saw-2"');
  });

  it('draws nothing of the central system without one', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(centralRunArt(state, [])).toBe('');
    expect(ductSystemOf(state)).toBeNull();
  });
});
