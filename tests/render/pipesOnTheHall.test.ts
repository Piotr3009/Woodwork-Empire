// Pipes you can read (CLAUDE.md T16 2.3): one drawing of a pipe for every run, the Turn 4 ducting
// gone, a red ring and the words on a machine with no pipe, and with a central system a drop to
// every machine and no ring at all.

import { describe, expect, it } from 'vitest';
import { connectExtraction } from '../../src/engine/pipes';
import {
  centralRunArt,
  ductSystemOf,
  footprintIn,
  portRings,
  renderHall,
} from '../../src/render/hall';
import { portCell } from '../../src/engine/pipes';
import { tileToScreen } from '../../src/render/iso';
import { PIPE_KINDS, pipeTile, portRing } from '../../src/render/pipes';
import { PIPE_BODY, PIPE_LIGHT, PIPE_SHADE } from '../../src/engine/constants';
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
    // Every length of pipe is three strokes: the bar, the shade along its underside and the
    // lighter edge along its top (CLAUDE.md T17 2.7). A tee is four arms and the body they meet
    // in; a bend is one quarter arc with no disc over a joint it has not got.
    const tee = pipeTile('pipe.tee', { x: 5, y: 5 });
    expect((tee.match(/<line class="pipe-bar"/g) ?? []).length).toBe(8);
    expect((tee.match(/<line class="pipe-edge"/g) ?? []).length).toBe(4);
    expect(tee).toContain('pipe-joint');
    const elbow = pipeTile('pipe.ne', { x: 5, y: 5 });
    expect((elbow.match(/<path class="pipe-bar"/g) ?? []).length).toBe(2);
    expect((elbow.match(/<path class="pipe-edge"/g) ?? []).length).toBe(1);
    expect(elbow).toContain(' Q ');
    expect(elbow).not.toContain('pipe-joint');
    // And a straight run has no joint in the middle of it either.
    expect(pipeTile('pipe.ew', { x: 5, y: 5 })).not.toContain('pipe-joint');
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
    // The ring sits on the port cell of the bare saw, on the floor: the cell `PORTS` measured on
    // `tableSaw.standard.png`, which is one cell in from the corner of its own footprint and so
    // one cell right of where the old guess put it (CLAUDE.md T22 2.8).
    const bare = state.equipment.find((item) => item.id === 'kit-saw-2');
    if (!bare) throw new Error('no bare saw');
    expect(portCell(bare)).toEqual({ x: 11, y: 3 });
    expect(portRings(state)).toBe(portRing({ x: 11, y: 3 }, 'kit-saw-2'));
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

describe('pipes that look like pipes (PIOTR, 16.09; CLAUDE.md T17 2.7)', () => {
  it('lands the drop on the machine and not through it to the floor of the cell', () => {
    const state = twoSaws();
    const saw = state.equipment.find((item) => item.id === 'kit-saw-1');
    if (saw === undefined) throw new Error('no saw');
    const stands = footprintIn(saw);
    const port = portCell(saw);
    const svg = renderHall(state, { files: [] });
    const drop = /<g class="pipe-tile" data-pipe-tile="pipe.drop">(.*?)<\/g>/.exec(svg)?.[1] ?? '';
    expect(drop).not.toBe('');
    // The collar sits on the top face of the footprint, which is the machine's own port, and is
    // that much higher on the screen than the floor of the same cell.
    const floor = tileToScreen(port.x + 0.5, port.y + 0.5, 0);
    const top = tileToScreen(port.x + 0.5, port.y + 0.5, stands.height);
    const ring = /<ellipse class="pipe-port"[^>]*cy="([-\d.]+)"/.exec(drop);
    expect(Number(ring?.[1])).toBeCloseTo(top.y, 1);
    expect(Number(ring?.[1])).toBeLessThan(floor.y);
    expect(stands.height).toBeGreaterThan(0);
  });

  it('gives every length a shade under it and the lighter edge over it, in the four greys', () => {
    const straight = pipeTile('pipe.ns', { x: 5, y: 5 });
    // Three strokes a length: the bar, the shade and the edge, each in its own grey off the
    // constants. The purple of Turn 16 and its half transparent black are gone with the nine
    // tiles (PIOTR's screenshot, 19.09; CLAUDE.md T22 2.7).
    expect((straight.match(/<line class="pipe-bar"/g) ?? []).length).toBe(4);
    expect(straight).toContain(`stroke="${PIPE_BODY}"`);
    expect(straight).toContain(`stroke="${PIPE_SHADE}"`);
    expect(straight).toContain(`stroke="${PIPE_LIGHT}"`);
    expect(straight).not.toContain('rgba(0,0,0,0.35)');
    expect((straight.match(/<line class="pipe-edge"/g) ?? []).length).toBe(2);
  });

  it('draws the inlet as a flange at the unit, rings and all', () => {
    const inlet = pipeTile('pipe.inlet', { x: 5, y: 5 });
    expect((inlet.match(/<ellipse class="pipe-collar"/g) ?? []).length).toBe(2);
    expect(inlet).toContain('pipe-bar');
  });
});
