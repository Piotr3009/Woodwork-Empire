// The pipes as the hall draws them (CLAUDE.md T22 2.7, variant A of docs/mockups/t22/pipes-A-one-path.png).
//
// GPT's nine pipe tiles of Turn 16 did not meet each other: every cell was a picture of its own and
// every joint was a guess, so Piotr's screenshot of 19.09 showed a run made of gaps. The answer is
// that a run is **one continuous path**, drawn here in the hall's 2 to 1 dimetric at the ducting's
// height: through the centre of every cell of the run, straight between them, with the quadratic
// bend of Turn 17 at every corner (edge middle, cell centre, edge middle). Every joint is then
// exact by construction, because there is no joint.
//
// One geometry, stroked five times, darkest first: the dark rim, the body, the shade along the
// underside, the lit edge along the top and the specular line inside it. A vertical (a machine's
// drop, an extractor's inlet) is the same five strokes with the light running left to right
// instead of top to bottom, because that is what a round pipe standing on end looks like.
//
// No joint discs, no clips and no shadow under the run [PIOTR, 19.09: "what are those circles for;
// remove"]. The four greys are constants in `src/engine/constants.ts` and are written onto each
// stroke as an attribute: one path stroked five times cannot be coloured from a stylesheet, which
// cannot tell the fourth stroke from the second. `.pipe-short` still turns a starved run red,
// because a CSS rule beats a presentation attribute.

import {
  DUCT_HEIGHT,
  HOSE_COLOUR,
  PIPE_BODY,
  PIPE_DIAMETER,
  PIPE_LIGHT,
  PIPE_RIM,
  PIPE_SHADE,
} from '../engine/constants';
import { TILE_RISE, tileToScreen } from './iso';

/** How much wider than its bare diameter the bar is drawn [TUNE]: a duct reads as a pipe at the
 *  hall's scale only if it has some body to it (PIOTR, 16.09; CLAUDE.md T17 2.7). */
const PIPE_BAR_WIDEN = 1.5;

/** The stroke a pipe is drawn with, in pixels: its diameter in metres at the rise of a metre. */
export const PIPE_STROKE = Math.max(4, Math.round(PIPE_DIAMETER * TILE_RISE * PIPE_BAR_WIDEN));

/** How far off the middle of the bar the shade and the lit edge are drawn [TUNE], in pixels: down
 *  and up for a run lying along the hall, left and right for a vertical. */
const EDGE_LIFT = Math.max(1, Math.round(PIPE_STROKE / 3));

/** How much the flexible hose bows on its way from the vertical into a visible port, in pixels
 *  [TUNE]: enough to read as a hose and not as another length of steel. */
const HOSE_BOW = 4;

/** How far a bend's arms reach from the corner, in metres: half a cell, which is the middle of the
 *  cell's edge, the bend of Turn 17 (CLAUDE.md T17 2.7, T22 2.7). */
const BEND_REACH = 0.5;

/** How high the elbow into an extractor's mouth stands above the mouth, in metres [TUNE]: the same
 *  quarter metre the vertical stands in front of it, so the elbow is square. */
export const ELBOW_RISE = 0.25;

/** How far in front of an extractor's mouth the vertical stands, in metres [PIOTR's variant C,
 *  docs/mockups/t22/extractor-inlet-C.png; CLAUDE.md T22 2.8]. */
export const INLET_STANDOFF = 0.25;

/** How far above a visible port the vertical stops, in metres, the hose covering the rest
 *  (CLAUDE.md T22 2.8). */
export const HOSE_DROP = 0.5;

export interface Point {
  x: number;
  y: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function pair(at: Point): string {
  return `${round(at.x)} ${round(at.y)}`;
}

/** The centre of a cell, up at the pipes' height. */
export function cellCentre(cell: { x: number; y: number }): Point {
  return tileToScreen(cell.x + 0.5, cell.y + 0.5, DUCT_HEIGHT);
}

/** A point a bend's reach along the way from one cell's centre towards the next: the middle of the
 *  edge the two cells share, at the pipes' height. */
function towards(cell: { x: number; y: number }, next: { x: number; y: number }): Point {
  return tileToScreen(
    cell.x + 0.5 + Math.sign(next.x - cell.x) * BEND_REACH,
    cell.y + 0.5 + Math.sign(next.y - cell.y) * BEND_REACH,
    DUCT_HEIGHT,
  );
}

/** Which way the next cell lies: `0` for the two cells being the same cell. */
function step(cell: { x: number; y: number }, next: { x: number; y: number }): string {
  return `${Math.sign(next.x - cell.x)},${Math.sign(next.y - cell.y)}`;
}

/** True where the run turns on this cell: the cell before and the cell after are not in line. */
function isCorner(cells: ReadonlyArray<{ x: number; y: number }>, index: number): boolean {
  const cell = cells[index];
  const before = cells[index - 1];
  const after = cells[index + 1];
  if (cell === undefined || before === undefined || after === undefined) return false;
  return step(before, cell) !== step(cell, after);
}

/** The one path a run is drawn as: `M` the centre of its first cell, straight through the centre
 *  of every cell it passes, and at every corner the quadratic bend of Turn 17, whose control point
 *  is the corner cell's own centre. A run of one cell has no length and no path: the drop and the
 *  inlet of 2.8 are the whole of it. */
export function runPath(cells: ReadonlyArray<{ x: number; y: number }>): string {
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (first === undefined || last === undefined || cells.length < 2) return '';
  let d = `M ${pair(cellCentre(first))}`;
  for (let index = 1; index < cells.length - 1; index += 1) {
    if (!isCorner(cells, index)) continue;
    const cell = cells[index];
    const before = cells[index - 1];
    const after = cells[index + 1];
    if (cell === undefined || before === undefined || after === undefined) continue;
    d +=
      ` L ${pair(towards(cell, before))}` +
      ` Q ${pair(cellCentre(cell))} ${pair(towards(cell, after))}`;
  }
  return `${d} L ${pair(cellCentre(last))}`;
}

/** How many straight lengths a bend is flattened into when the path is measured rather than drawn
 *  [TUNE]: a quarter metre of pipe is a couple of pixels, so eight is smooth to well under one. */
const BEND_SEGMENTS = 8;

/** The run as a polyline: the same vertices the path is drawn from, with every bend flattened.
 *  It is what "the run directly above this point" is answered from, so the drawing and the
 *  measurement cannot disagree about where the pipe is. */
export function runPoints(cells: ReadonlyArray<{ x: number; y: number }>): Point[] {
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (first === undefined || last === undefined || cells.length < 2) {
    return first === undefined ? [] : [cellCentre(first)];
  }
  const points: Point[] = [cellCentre(first)];
  for (let index = 1; index < cells.length - 1; index += 1) {
    if (!isCorner(cells, index)) continue;
    const cell = cells[index];
    const before = cells[index - 1];
    const after = cells[index + 1];
    if (cell === undefined || before === undefined || after === undefined) continue;
    const from = towards(cell, before);
    const control = cellCentre(cell);
    const to = towards(cell, after);
    points.push(from);
    for (let step = 1; step <= BEND_SEGMENTS; step += 1) {
      const t = step / BEND_SEGMENTS;
      const rest = 1 - t;
      points.push({
        x: rest * rest * from.x + 2 * rest * t * control.x + t * t * to.x,
        y: rest * rest * from.y + 2 * rest * t * control.y + t * t * to.y,
      });
    }
  }
  points.push(cellCentre(last));
  return points;
}

/** Where the run hangs directly over a screen x: a vertical in the world is a vertical on screen,
 *  so the point of the run above anything is the point of the run at its screen x. The first
 *  crossing along the run, or the nearer end of it when the run does not reach that far
 *  (CLAUDE.md T22 2.8). */
export function runAbove(cells: ReadonlyArray<{ x: number; y: number }>, screenX: number): Point {
  const points = runPoints(cells);
  const first = points[0];
  if (first === undefined) return { x: screenX, y: 0 };
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined) continue;
    const low = Math.min(from.x, to.x);
    const high = Math.max(from.x, to.x);
    if (screenX < low || screenX > high) continue;
    if (high - low < 0.0001) return { x: screenX, y: (from.y + to.y) / 2 };
    const along = (screenX - from.x) / (to.x - from.x);
    return { x: screenX, y: from.y + along * (to.y - from.y) };
  }
  // The port is off the end of the run: the pipe comes down from the end of it, which is the
  // nearest pipe there is.
  const last = points[points.length - 1] ?? first;
  const nearest = Math.abs(first.x - screenX) <= Math.abs(last.x - screenX) ? first : last;
  return { x: screenX, y: nearest.y };
}

/** One geometry, stroked five times, darkest first: the rim around the bar, the body, the shade
 *  along its underside, the lit edge along its top and the specular line inside that
 *  (CLAUDE.md T22 2.7). `lift` is the direction the light runs in: down the screen for a run lying
 *  along the hall, across it for a vertical. */
function fiveStrokes(d: string, lift: Point, kind: string): string {
  const stroke = (
    className: string,
    colour: string,
    width: number | null,
    by: number,
  ): string => {
    // The offset is a transform and never a second set of numbers: all five strokes carry the one
    // `d`, so the shape they are strokes of is provably one shape.
    const shift =
      by === 0 ? '' : ` transform="translate(${round(lift.x * by)},${round(lift.y * by)})"`;
    return (
      `<path class="${className}" data-pipe-part="${kind}" fill="none" d="${d}"${shift} ` +
      `stroke="${colour}"${width === null ? '' : ` stroke-width="${round(width)}"`} />`
    );
  };
  return (
    stroke('pipe-rim', PIPE_RIM, PIPE_STROKE + 2, 0) +
    stroke('pipe-bar', PIPE_BODY, PIPE_STROKE, 0) +
    stroke('pipe-shade', PIPE_SHADE, PIPE_STROKE / 3, 1) +
    stroke('pipe-edge', PIPE_LIGHT, null, -1) +
    stroke('pipe-spec', PIPE_LIGHT, PIPE_STROKE / 10, -1)
  );
}

/** The light on a run lying along the hall: the shade under it, the lit edge over it. */
const ALONG: Point = { x: 0, y: EDGE_LIFT };
/** The light on a vertical: left to right instead of top to bottom, because a pipe standing on
 *  end is lit down one side of itself (CLAUDE.md T22 2.7). */
const UPRIGHT: Point = { x: EDGE_LIFT, y: 0 };

/** A whole run of pipe over the floor: one path, five strokes of it. */
export function runArt(cells: ReadonlyArray<{ x: number; y: number }>): string {
  const d = runPath(cells);
  return d === '' ? '' : fiveStrokes(d, ALONG, 'run');
}

/** A vertical: a machine's drop from the run down onto its port, or the leg of an extractor's
 *  inlet. Lit across itself rather than along, and the same five strokes otherwise. */
export function verticalArt(from: Point, to: Point, kind = 'drop'): string {
  return fiveStrokes(`M ${pair(from)} L ${pair(to)}`, UPRIGHT, kind);
}

/** The elbow that turns an extractor's inlet into its mouth: the quadratic bend of Turn 17 again,
 *  with the corner in front of the mouth as its control point and the mouth itself as its end
 *  [PIOTR's variant C; CLAUDE.md T22 2.8]. */
export function elbowArt(from: Point, corner: Point, mouth: Point): string {
  return fiveStrokes(`M ${pair(from)} Q ${pair(corner)} ${pair(mouth)}`, UPRIGHT, 'elbow');
}

/** The flexible hose from the foot of a vertical into a port that is not hidden behind the body of
 *  the machine: one quadratic curve in the floor's own colour a touch darker, with a dark outline
 *  and no highlight, because a hose is not steel [PIOTR, 19.09; CLAUDE.md T22 2.8]. */
export function hoseArt(from: Point, to: Point): string {
  const width = PIPE_STROKE * 0.7;
  const control = { x: (from.x + to.x) / 2 + HOSE_BOW, y: (from.y + to.y) / 2 };
  const d = `M ${pair(from)} Q ${pair(control)} ${pair(to)}`;
  return (
    `<path class="pipe-rim" data-pipe-part="hose" fill="none" d="${d}" stroke="${PIPE_RIM}" ` +
    `stroke-width="${round(width + 2)}" />` +
    `<path class="pipe-hose" data-pipe-part="hose" fill="none" d="${d}" ` +
    `stroke="${HOSE_COLOUR}" stroke-width="${round(width)}" />`
  );
}

/** A ring lying flat in the hall's own plane: an ellipse half as deep as it is wide, which is what
 *  a circle on the floor looks like on a 2 to 1 dimetric (docs/art/SPRITES.md 9.2). The gate's
 *  collar is the one thing left that wears it. */
export function flatRing(at: Point, radius: number, className: string): string {
  return (
    `<ellipse class="${className}" cx="${round(at.x)}" cy="${round(at.y)}" ` +
    `rx="${round(radius)}" ry="${round(radius / 2)}" stroke="${PIPE_RIM}" ` +
    `stroke-width="${Math.max(2, Math.round(PIPE_STROKE / 3))}" />`
  );
}

/** The gate's collar on a drop: a ring a little wider than the pipe, at the pipe's height on the
 *  drop's cell (CLAUDE.md T13 3.11). */
export function gateCollarArt(cell: { x: number; y: number }): string {
  return (
    '<g class="pipe-tile" data-pipe-tile="gate.collar">' +
    flatRing(cellCentre(cell), PIPE_STROKE, 'pipe-collar') +
    '</g>'
  );
}
