// The pipes as the hall draws them (CLAUDE.md T16 2.3): one vector helper for every tile of every
// run, in the hall's 2 to 1 dimetric, in the air at the ducting's height. A round duct drawn as a
// rounded bar in the game's duct grey with a lighter top edge, for the eight kinds a run is made
// of: ns and ew, the four elbows, the tee, the drop (the vertical down to the machine, ending in a
// ring on the port) and the inlet (a collar at the extractor). Nothing here is a placeholder:
// it is the drawing until the art side paints the eight tiles, and then the sprite file check
// picks those instead, the way every sprite is picked (CLAUDE.md T16 6).

import { DUCT_HEIGHT, PIPE_DIAMETER, PORT_RING } from '../engine/constants';
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

/** The stroke a pipe is drawn with, in pixels: its diameter in metres at the rise of a metre. */
const PIPE_STROKE = Math.max(3, Math.round(PIPE_DIAMETER * TILE_RISE));
/** The lighter edge along the top of the bar, a thinner line lifted a little [TUNE]. */
const EDGE_LIFT = Math.max(1, Math.round(PIPE_STROKE / 3));

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

interface Point {
  x: number;
  y: number;
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

/** One arm of a tile: from the cell's centre to the middle of one edge, as a bar with its edge. */
function arm(from: Point, to: Point): string {
  return (
    `<line class="pipe-bar" x1="${round(from.x)}" y1="${round(from.y)}" ` +
    `x2="${round(to.x)}" y2="${round(to.y)}" stroke-width="${PIPE_STROKE}" />` +
    `<line class="pipe-edge" x1="${round(from.x)}" y1="${round(from.y - EDGE_LIFT)}" ` +
    `x2="${round(to.x)}" y2="${round(to.y - EDGE_LIFT)}" />`
  );
}

/** A ring: the port a drop lands on, or the collar at the inlet. */
function ring(at: Point, radius: number, className: string): string {
  return (
    `<circle class="${className}" cx="${round(at.x)}" cy="${round(at.y)}" r="${radius}" ` +
    `stroke-width="${Math.max(2, Math.round(PIPE_STROKE / 2))}" />`
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

/** One tile of pipe on this cell, as a group the tests can find by its kind. A drop is the
 *  vertical from the pipe's height down to the floor of its cell, ending in a ring on the port;
 *  an inlet is a collar on the unit; everything else is a bar along its arms. A kind the helper
 *  does not know draws as a straight ns length, so a run is never a hole. */
export function pipeTile(kind: string, cell: { x: number; y: number }): string {
  const at = anchors(cell);
  let inner = '';
  if (kind === 'pipe.drop') {
    const foot = tileToScreen(cell.x + 0.5, cell.y + 0.5, 0);
    inner =
      `<line class="pipe-bar" x1="${round(at.centre.x)}" y1="${round(at.centre.y)}" ` +
      `x2="${round(foot.x)}" y2="${round(foot.y)}" stroke-width="${PIPE_STROKE}" />` +
      ring(foot, Math.max(3, PIPE_STROKE), 'pipe-port');
  } else if (kind === 'pipe.inlet') {
    inner = ring(at.centre, PIPE_STROKE * 1.5, 'pipe-collar');
  } else {
    const arms = ARMS[kind] ?? ARMS['pipe.ns'] ?? [];
    inner = arms.map((edge) => arm(at.centre, at[edge])).join('');
    // The joint where the arms meet, so an elbow reads as one bent pipe and not two bars.
    inner += ring(at.centre, Math.round(PIPE_STROKE / 2), 'pipe-joint');
  }
  return `<g class="pipe-tile" data-pipe-tile="${kind}">${inner}</g>`;
}

/** The gate's collar on a drop: a ring a little wider than the pipe, at the pipe's height on the
 *  drop's cell (CLAUDE.md T13 3.11). */
export function gateCollarArt(cell: { x: number; y: number }): string {
  const at = anchors(cell);
  return (
    `<g class="pipe-tile" data-pipe-tile="gate.collar">` +
    ring(at.centre, PIPE_STROKE, 'pipe-collar') +
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
