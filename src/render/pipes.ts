// The pipes as the hall draws them (CLAUDE.md T16 2.3): one vector helper for every tile of every
// run, in the hall's 2 to 1 dimetric, in the air at the ducting's height. A round duct drawn as a
// rounded bar in the game's duct grey with a lighter top edge, for the eight kinds a run is made
// of: ns and ew, the four elbows, the tee, the drop (the vertical down to the machine, ending in a
// ring on the port) and the inlet (a collar at the extractor). Nothing here is a placeholder:
// it is the drawing until the art side paints the eight tiles, and then the sprite file check
// picks those instead, the way every sprite is picked (CLAUDE.md T16 6).

import {
  DUCT_HEIGHT,
  PIPE_BODY,
  PIPE_DIAMETER,
  PIPE_LIGHT,
  PIPE_RIM,
  PIPE_SHADE,
  PORT_RING,
} from '../engine/constants';
import { TILE_RISE, tileToScreen } from './iso';

export type PipeKind =
  | 'pipe.ns'
  | 'pipe.ew'
  | 'pipe.ne'
  | 'pipe.nw'
  | 'pipe.se'
  | 'pipe.sw'
  | 'pipe.tee'
  | 'pipe.drop'
  | 'pipe.inlet';

/** The eight kinds a run is made of, and the collar a gate adds on a drop. */
export const PIPE_KINDS: readonly string[] = [
  'pipe.ns',
  'pipe.ew',
  'pipe.ne',
  'pipe.nw',
  'pipe.se',
  'pipe.sw',
  'pipe.tee',
  'pipe.drop',
  'pipe.inlet',
];

/** How much wider than its bare diameter the bar is drawn [TUNE]: a duct reads as a pipe at the
 *  hall's scale only if it has some body to it (PIOTR, 16.09; CLAUDE.md T17 2.7). */
const PIPE_BAR_WIDEN = 1.5;

/** The stroke a pipe is drawn with, in pixels: its diameter in metres at the rise of a metre. */
const PIPE_STROKE = Math.max(4, Math.round(PIPE_DIAMETER * TILE_RISE * PIPE_BAR_WIDEN));
/** The lighter edge along the top of the bar and the shade along the bottom of it, both a
 *  thinner line off the middle [TUNE]. */
const EDGE_LIFT = Math.max(1, Math.round(PIPE_STROKE / 3));
/** How dark the underside of the bar is painted: the shade grey of the constants
 *  (CLAUDE.md T22 2.7). */
const UNDERSIDE = PIPE_SHADE;
/** How deep the collar on a machine's port is, in metres of the hall [TUNE]. */
const COLLAR_DEPTH = 0.18;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

interface Point {
  x: number;
  y: number;
}

function lifted(at: Point, by: number): Point {
  return { x: at.x, y: at.y + by };
}

/** The centre of a cell at the pipe's height, and the middle of each of its four edges. */
function anchors(cell: { x: number; y: number }): {
  centre: Point;
  n: Point;
  s: Point;
  e: Point;
  w: Point;
} {
  return {
    centre: tileToScreen(cell.x + 0.5, cell.y + 0.5, DUCT_HEIGHT),
    n: tileToScreen(cell.x + 0.5, cell.y, DUCT_HEIGHT),
    s: tileToScreen(cell.x + 0.5, cell.y + 1, DUCT_HEIGHT),
    e: tileToScreen(cell.x + 1, cell.y + 0.5, DUCT_HEIGHT),
    w: tileToScreen(cell.x, cell.y + 0.5, DUCT_HEIGHT),
  };
}

/** A length of pipe as three strokes of the one shape: the bar itself, the shade along its
 *  underside and the lighter edge along its top (PIOTR, 16.09; CLAUDE.md T17 2.7). `shape` is
 *  asked for one stroke lifted by so many pixels, so a straight and a bend are drawn the same
 *  way. */
function threeStrokes(shape: (by: number, className: string, extra: string) => string): string {
  return (
    shape(0, 'pipe-bar', `stroke="${PIPE_BODY}" stroke-width="${PIPE_STROKE}"`) +
    shape(
      EDGE_LIFT,
      'pipe-bar',
      `stroke="${UNDERSIDE}" stroke-width="${round(PIPE_STROKE / 3)}"`,
    ) +
    shape(-EDGE_LIFT, 'pipe-edge', `stroke="${PIPE_LIGHT}"`)
  );
}

/** A straight length from one point to another. */
function straight(from: Point, to: Point): string {
  return threeStrokes(
    (by, className, extra) =>
      `<line class="${className}" x1="${round(from.x)}" y1="${round(from.y + by)}" ` +
      `x2="${round(to.x)}" y2="${round(to.y + by)}"${extra === '' ? '' : ` ${extra}`} />`,
  );
}

/** A bend, drawn as the quarter arc a real elbow is and not as two bars with a disc over the
 *  joint: the two edge middles with the cell's centre pulling the curve round (PIOTR, 16.09;
 *  CLAUDE.md T17 2.7). */
function bend(from: Point, corner: Point, to: Point): string {
  return threeStrokes(
    (by, className, extra) =>
      `<path class="${className}" fill="none" d="M ${round(from.x)} ${round(from.y + by)} ` +
      `Q ${round(corner.x)} ${round(corner.y + by)} ${round(to.x)} ${round(to.y + by)}"` +
      `${extra === '' ? '' : ` ${extra}`} />`,
  );
}

/** One arm of a tee: the cell's centre out to the middle of one edge. */
function arm(from: Point, to: Point): string {
  return straight(from, to);
}

/** A ring lying flat in the hall's own plane: an ellipse half as deep as it is wide, which is
 *  what a circle on the floor looks like on a 2 to 1 dimetric (docs/art/SPRITES.md 9.2). */
function flatRing(at: Point, radius: number, className: string): string {
  return (
    `<ellipse class="${className}" cx="${round(at.x)}" cy="${round(at.y)}" ` +
    `rx="${round(radius)}" ry="${round(radius / 2)}" stroke="${PIPE_RIM}" ` +
    `stroke-width="${Math.max(2, Math.round(PIPE_STROKE / 3))}" />`
  );
}

/** The arms each kind reaches out along. */
const ARMS: Record<string, ReadonlyArray<'n' | 's' | 'e' | 'w'>> = {
  'pipe.ns': ['n', 's'],
  'pipe.ew': ['e', 'w'],
  'pipe.ne': ['n', 'e'],
  'pipe.nw': ['n', 'w'],
  'pipe.se': ['s', 'e'],
  'pipe.sw': ['s', 'w'],
  'pipe.tee': ['n', 's', 'e', 'w'],
  'pipe.inlet': [],
  'pipe.drop': [],
};

/** The two ends of a bend, in the order the curve is drawn. */
const BENDS: Record<string, ['n' | 's' | 'e' | 'w', 'n' | 's' | 'e' | 'w']> = {
  'pipe.ne': ['n', 'e'],
  'pipe.nw': ['n', 'w'],
  'pipe.se': ['s', 'e'],
  'pipe.sw': ['s', 'w'],
};

/** One tile of pipe on this cell, as a group the tests can find by its kind. A drop is the
 *  vertical from the pipe's height down onto the machine, ending in a short collar over the top
 *  face of its footprint; an inlet is a flange at the unit; a bend is a quarter arc; everything
 *  else is a bar along its arms. A kind the helper does not know draws as a straight ns length,
 *  so a run is never a hole. `landsAt` is how high the thing under a drop stands, in metres: the
 *  floor of the cell when nothing is given (CLAUDE.md T16 2.3, T17 2.7). */
export function pipeTile(kind: string, cell: { x: number; y: number }, landsAt = 0): string {
  const at = anchors(cell);
  let inner = '';
  if (kind === 'pipe.drop') {
    // Down onto the machine's own top face and not through it to the floor of the cell.
    const top = tileToScreen(cell.x + 0.5, cell.y + 0.5, landsAt + COLLAR_DEPTH);
    const port = tileToScreen(cell.x + 0.5, cell.y + 0.5, landsAt);
    inner =
      straight(at.centre, top) +
      // The collar itself: a short sleeve standing on the port, with the ring of it on the face.
      `<line class="pipe-bar" x1="${round(top.x)}" y1="${round(top.y)}" ` +
      `x2="${round(port.x)}" y2="${round(port.y)}" stroke="${PIPE_BODY}" ` +
      `stroke-width="${round(PIPE_STROKE * 1.4)}" />` +
      flatRing(port, PIPE_STROKE, 'pipe-port');
  } else if (kind === 'pipe.inlet') {
    // The flange where the run meets the unit: a stub of pipe and the plate it is bolted to.
    const face = lifted(at.centre, round(PIPE_STROKE / 2));
    inner =
      straight(at.centre, face) +
      flatRing(face, PIPE_STROKE * 1.6, 'pipe-collar') +
      flatRing(face, PIPE_STROKE * 0.9, 'pipe-collar');
  } else if (BENDS[kind] !== undefined) {
    const ends = BENDS[kind] ?? ['n', 'e'];
    inner = bend(at[ends[0]], at.centre, at[ends[1]]);
  } else {
    const arms = ARMS[kind] ?? ARMS['pipe.ns'] ?? [];
    inner = arms.map((edge) => arm(at.centre, at[edge])).join('');
    // Where three ways or four meet there is a body on the real thing, and this is it. Two arms
    // in a line are one length of pipe and want no joint in the middle of them.
    if (arms.length > 2) {
      inner +=
        `<ellipse class="pipe-joint" cx="${round(at.centre.x)}" cy="${round(at.centre.y)}" ` +
        `fill="${PIPE_RIM}" rx="${round(PIPE_STROKE / 2)}" ry="${round(PIPE_STROKE / 3)}" />`;
    }
  }
  return `<g class="pipe-tile" data-pipe-tile="${kind}">${inner}</g>`;
}

/** The gate's collar on a drop: a ring a little wider than the pipe, at the pipe's height on the
 *  drop's cell (CLAUDE.md T13 3.11). */
export function gateCollarArt(cell: { x: number; y: number }): string {
  const at = anchors(cell);
  return (
    `<g class="pipe-tile" data-pipe-tile="gate.collar">` +
    flatRing(at.centre, PIPE_STROKE, 'pipe-collar') +
    '</g>'
  );
}

/** The red ring on the port of a machine with no pipe: on the floor of the port cell, pulsing on
 *  the stylesheet, with nothing written (CLAUDE.md T16 2.3). */
export function portRing(cell: { x: number; y: number }, equipmentId: string): string {
  const foot = tileToScreen(cell.x + 0.5, cell.y + 0.5, 0);
  return (
    `<g class="port-ring" data-unconnected="${equipmentId}">` +
    `<circle cx="${round(foot.x)}" cy="${round(foot.y)}" r="${PORT_RING}" />` +
    '</g>'
  );
}
