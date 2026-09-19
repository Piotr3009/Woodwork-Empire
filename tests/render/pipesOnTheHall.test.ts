// Pipes that join (CLAUDE.md T22 2.7, variant A of docs/mockups/t22/pipes-A-one-path.png): a run is
// one continuous path through the centre of every cell it passes, with the quadratic bend of
// Turn 17 at every corner, stroked five times in the four galvanised greys. The nine tiles of
// Turn 16 are deleted and nothing of the pipe layer is a picture any more, so there is no joint
// left to miss (PIOTR's screenshot, 19.09).
//
// The one thing this file measures rather than asserts is the path itself: the `d` is parsed out of
// the rendered SVG and sampled here, by arithmetic of its own, so the drawing is checked against
// the cells and not against the helper that drew it.

import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { connectExtraction } from '../../src/engine/pipes';
import { centralRunArt, ductSystemOf, renderHall } from '../../src/render/hall';
import { PIPE_STROKE, runArt } from '../../src/render/pipes';
import { TILE_RISE, tileToScreen } from '../../src/render/iso';
import {
  DUCT_HEIGHT,
  PIPE_BODY,
  PIPE_LIGHT,
  PIPE_RIM,
  PIPE_SHADE,
} from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

interface Point {
  x: number;
  y: number;
}

/** Six cells with exactly one corner in them: east along the row, then south down the column. */
const SIX: Point[] = [
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 4, y: 2 },
  { x: 5, y: 2 },
  { x: 5, y: 3 },
  { x: 5, y: 4 },
];

/** Every `d` in a piece of SVG, in the order they are drawn. */
function pathData(svg: string): string[] {
  return Array.from(svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)).map((match) => match[1] ?? '');
}

/** The one `d` of a group, and a failure when the group draws more than one shape. */
function oneShape(svg: string): string {
  const shapes = new Set(pathData(svg));
  expect(shapes.size).toBe(1);
  return [...shapes][0] ?? '';
}

/** A path of `M`, `L` and `Q` sampled into points, by arithmetic written here and not borrowed
 *  from the helper under test. */
function samplePath(d: string, steps = 60): Point[] {
  const numbers = (text: string): number[] =>
    text
      .trim()
      .split(/[\s,]+/)
      .filter((part) => part !== '')
      .map(Number);
  const points: Point[] = [];
  let at: Point = { x: 0, y: 0 };
  for (const piece of d.matchAll(/([MLQ])([^MLQ]*)/g)) {
    const command = piece[1];
    const values = numbers(piece[2] ?? '');
    if (command === 'M' || command === 'L') {
      const to = { x: values[0] ?? 0, y: values[1] ?? 0 };
      if (command === 'L') {
        for (let step = 1; step <= steps; step += 1) {
          const t = step / steps;
          points.push({ x: at.x + (to.x - at.x) * t, y: at.y + (to.y - at.y) * t });
        }
      } else {
        points.push(to);
      }
      at = to;
      continue;
    }
    const control = { x: values[0] ?? 0, y: values[1] ?? 0 };
    const to = { x: values[2] ?? 0, y: values[3] ?? 0 };
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const rest = 1 - t;
      points.push({
        x: rest * rest * at.x + 2 * rest * t * control.x + t * t * to.x,
        y: rest * rest * at.y + 2 * rest * t * control.y + t * t * to.y,
      });
    }
    at = to;
  }
  return points;
}

/** How far a point is from the nearest sample of the path. */
function distanceToPath(d: string, at: Point): number {
  return Math.min(
    ...samplePath(d).map((point) => Math.hypot(point.x - at.x, point.y - at.y)),
  );
}

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

describe('a run is one drawing (CLAUDE.md T22 2.7)', () => {
  it('draws six cells with a corner as one path, and no picture anywhere in it', () => {
    const art = runArt(SIX);
    const shapes = new Set(pathData(art));
    expect(shapes.size).toBe(1);
    expect(art).not.toContain('<image');
    expect(art).not.toContain('data-pipe-tile');
    // One shape, five strokes of it: nothing is drawn twice over and nothing is tiled.
    expect((art.match(/<path /g) ?? []).length).toBe(5);
  });

  it('puts the centre of every cell it passes on the path, at the ducting’s height', () => {
    const d = oneShape(runArt(SIX));
    for (const [index, cell] of SIX.entries()) {
      const centre = tileToScreen(cell.x + 0.5, cell.y + 0.5, DUCT_HEIGHT);
      // The corner cell is the one exception, and it is the bend of Turn 17 doing what a bend
      // does: its centre is the control point of the quadratic, so the pipe cuts the corner and
      // passes within a stroke of the centre rather than over it (CLAUDE.md T17 2.7, T22 2.7).
      const corner = index === 3;
      expect(distanceToPath(d, centre), `${cell.x},${cell.y}`).toBeLessThan(
        corner ? PIPE_STROKE : 0.01,
      );
    }
    // The path is up in the air and not on the floor: where it starts is a full 3.2 m of rise
    // above the cell it starts over, which is the height Piotr raised the ducting to on 19.09.
    const flat = tileToScreen(2.5, 2.5, 0);
    const up = tileToScreen(2.5, 2.5, DUCT_HEIGHT);
    expect(flat.y - up.y).toBeCloseTo(DUCT_HEIGHT * TILE_RISE, 6);
    expect(DUCT_HEIGHT).toBe(3.2);
    const first = samplePath(d)[0];
    expect(first?.x).toBeCloseTo(up.x, 6);
    expect(first?.y).toBeCloseTo(up.y, 1);
  });

  it('strokes the one path five times, darkest first, in the four greys and nothing else', () => {
    const art = runArt(SIX);
    const strokes = Array.from(art.matchAll(/stroke="([^"]+)"/g)).map((match) => match[1]);
    expect(strokes).toEqual([PIPE_RIM, PIPE_BODY, PIPE_SHADE, PIPE_LIGHT, PIPE_LIGHT]);
    // The rim is two pixels wider than the body, the shade a third of it and the specular a tenth.
    const widths = Array.from(art.matchAll(/stroke-width="([\d.]+)"/g)).map((match) =>
      Number(match[1]),
    );
    expect(widths).toEqual([
      PIPE_STROKE + 2,
      PIPE_STROKE,
      Math.round((PIPE_STROKE / 3) * 100) / 100,
      Math.round((PIPE_STROKE / 10) * 100) / 100,
    ]);
    // The purple of Turn 16, its half transparent black, the joint discs, the clips and the shadow
    // under the run are all gone [PIOTR, 19.09: "what are those circles for; remove"].
    expect(art).not.toContain('pipe-joint');
    expect(art).not.toContain('rgba(0,0,0,0.35)');
    expect(art).not.toContain('<ellipse');
    expect(art).not.toContain('contact-shadow');
  });

  it('shades a run top to bottom and a vertical left to right', () => {
    // A run lying along the hall is lit along its top and shaded along its underside, so the two
    // offsets are down the screen and up it.
    const along = Array.from(runArt(SIX).matchAll(/translate\((-?[\d.]+),(-?[\d.]+)\)/g)).map(
      (match) => [Number(match[1]), Number(match[2])],
    );
    expect(along.every(([x]) => x === 0)).toBe(true);
    expect(along.map(([, y]) => Math.sign(y ?? 0))).toEqual([1, -1, -1]);
    // The drop on a machine is a pipe standing on end, and it is lit down one side of itself
    // instead (CLAUDE.md T22 2.7).
    const svg = renderHall(twoSaws(), { files: [] });
    const drop = /<g class="pipe"[^>]*data-pipe-for="kit-saw-1">([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
    expect(drop).not.toBe('');
    const upright = Array.from(
      drop.matchAll(/data-pipe-part="drop"[^>]*transform="translate\((-?[\d.]+),(-?[\d.]+)\)"/g),
    ).map((match) => [Number(match[1]), Number(match[2])]);
    expect(upright.length).toBe(3);
    expect(upright.every(([, y]) => y === 0)).toBe(true);
    expect(upright.map(([x]) => Math.sign(x ?? 0))).toEqual([1, -1, -1]);
  });
});

describe('the runs on the hall (CLAUDE.md T22 2.7)', () => {
  it('draws one path for the run, keyed by the machine, above the equipment and off no file', () => {
    const state = twoSaws();
    const run = state.pipes[0];
    if (run === undefined) throw new Error('no run');
    const svg = renderHall(state, { files: [] });
    expect(svg).toContain(`data-pipe="${run.id}"`);
    expect(svg).toContain('data-pipe-for="kit-saw-1"');
    // One run over the floor, whatever its length: the drawing no longer counts the cells.
    expect((svg.match(/data-pipe-part="run"/g) ?? []).length).toBe(5);
    expect(new Set(pathData(svg).filter((d) => d.includes('L'))).size).toBeGreaterThan(0);
    expect(svg).not.toContain('data-pipe-tile="pipe.');
    expect(svg).not.toContain('/sprites/pipe.');
    // The layer is over the machines, as it was.
    expect(svg.indexOf('class="pipe-layer"')).toBeGreaterThan(svg.indexOf('data-kit="kit-saw-1"'));
  });

  it('draws a branch as a path of its own, over the run it tees onto', () => {
    const state = twoSaws();
    // The second saw is nearer the first saw's run than the fan, so the game tees it on.
    connectExtraction(state, 'kit-saw-2');
    expect(state.pipes).toHaveLength(2);
    const branch = state.pipes[1];
    if (branch === undefined) throw new Error('no branch');
    expect(branch.tiles[branch.tiles.length - 1]?.key).toBe('pipe.tee');
    const svg = renderHall(state, { files: [] });
    const runs = Array.from(svg.matchAll(/data-pipe="([^"]+)"/g)).map((match) => match[1]);
    expect(runs).toEqual([state.pipes[0]?.id, branch.id]);
    // Two runs, two paths, the main one first and the branch over it: the group of the branch
    // comes after the group of the run it joins (CLAUDE.md T22 2.7).
    const groups = svg.split('data-pipe=');
    expect(groups.length).toBe(3);
    for (const group of groups.slice(1)) {
      expect(new Set(pathData(group.slice(0, group.indexOf('</g>'))).filter((d) => d !== '')).size)
        .toBeGreaterThan(0);
    }
    // A tee itself is nothing: the branch simply ends over the centre of the cell it meets, with
    // no disc and no collar on the joint.
    expect(svg).not.toContain('pipe-joint');
  });

  it('says nothing over a bare machine but the words under its name, and wears no ring', () => {
    const state = twoSaws();
    const svg = renderHall(state, { files: [] });
    expect((svg.match(/data-not-connected="1"/g) ?? []).length).toBe(1);
    // The pulsing red disc of Turn 16 is gone with the tiles [PIOTR, 19.09] (CLAUDE.md T22 2.8).
    expect(svg).not.toContain('port-ring');
    expect(svg).not.toContain('data-unconnected=');
    expect(svg).not.toContain('duct-run');
    expect(svg).not.toContain('duct-drop');
  });

  it('draws a central system as the same path along the rear wall, with a drop to every machine', () => {
    const state = twoSaws();
    state.pipes = [];
    placeEquipment(state, 'dustSystem', { x: 20, y: 1 });
    expect(ductSystemOf(state)).toBe('dustSystem');
    const svg = renderHall(state, { files: [] });
    expect(svg).toContain('data-ducts="dustSystem"');
    expect(svg).toContain('data-central-for="kit-saw-1"');
    expect(svg).toContain('data-central-for="kit-saw-2"');
    // The run along the wall is one path the width of the hall, not one tile a cell.
    const wall = /<g class="pipe central-run"[^>]*>([\s\S]*?)<\/g>/.exec(centralRunArt(state, []))?.[1] ?? '';
    const d = oneShape(wall);
    const from = tileToScreen(0.5, 0.5, DUCT_HEIGHT);
    const to = tileToScreen(state.unit.widthCells - 0.5, 0.5, DUCT_HEIGHT);
    expect(d).toBe(
      `M ${from.x} ${Math.round(from.y * 100) / 100} L ${to.x} ${Math.round(to.y * 100) / 100}`,
    );
    expect(svg).not.toContain('data-unconnected=');
  });

  it('draws nothing of the central system without one', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(centralRunArt(state, [])).toBe('');
    expect(ductSystemOf(state)).toBeNull();
  });

  it('has no pipe picture left on disk to draw from', () => {
    // The nine `pipe.*.png` of Turn 16 are deleted and never redrawn (CLAUDE.md T22 1, 6). The
    // gate's collar is not one of them and stays.
    const files = readdirSync('public/sprites').filter((name) => name.startsWith('pipe.'));
    expect(files).toEqual([]);
    expect(readdirSync('public/sprites')).toContain('gate.collar.png');
  });
});
