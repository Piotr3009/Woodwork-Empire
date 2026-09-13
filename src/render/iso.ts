// Isometric projection helpers. Pure geometry, no SVG and no DOM, so the same numbers can feed a
// sprite renderer later (CLAUDE.md 10.3).
//
// 2:1 dimetric. One grid cell is 48 by 24 pixels on screen and, from Turn 5 on, one metre by one
// metre in the world: the half metre cell of Turns 1 to 4 is gone and every footprint is half
// what it was (docs/art/SPRITES.md 9.1). The pixel numbers did not move, so the painted hall and
// this projection agree: at 2x the art puts a cell at 96 by 48 and the loader halves it.
//
// docs/art/SPRITES.md 9.2 writes the same projection from the art side, on the 2x canvas:
// sx = 600 + (x - y) * 48, sy = 288 + (x + y) * 24 - z * 48. Halve both and take the offsets out
// and what is left is tileToScreen below, which is why HALL_CANVAS can register the background
// against it without a second set of numbers.

export const TILE_WIDTH = 48;
export const TILE_HEIGHT = 24;
/** Pixels of screen height per metre of object height. */
export const TILE_RISE = 24;
/** Metres a grid cell measures each way (docs/art/SPRITES.md 9.1). */
export const METRES_PER_CELL = 1;

export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export interface BoxFaces {
  top: Polygon;
  left: Polygon;
  right: Polygon;
}

/** Grid coordinates in metres to screen pixels. z is height in metres. */
export function tileToScreen(x: number, y: number, z = 0): Point {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2) - z * TILE_RISE,
  };
}

/** Screen pixels back to tile coordinates, on the floor. */
export function screenToTile(px: number, py: number): Point {
  const halfWidth = TILE_WIDTH / 2;
  const halfHeight = TILE_HEIGHT / 2;
  return {
    x: (px / halfWidth + py / halfHeight) / 2,
    y: (py / halfHeight - px / halfWidth) / 2,
  };
}

/** The diamond an object covers on the floor. */
export function footprintPolygon(x: number, y: number, width: number, depth: number): Polygon {
  return [
    tileToScreen(x, y),
    tileToScreen(x + width, y),
    tileToScreen(x + width, y + depth),
    tileToScreen(x, y + depth),
  ];
}

/** The three faces of a placeholder box: top, then the two the camera can see. */
export function boxPolygons(
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
): BoxFaces {
  const top: Polygon = [
    tileToScreen(x, y, height),
    tileToScreen(x + width, y, height),
    tileToScreen(x + width, y + depth, height),
    tileToScreen(x, y + depth, height),
  ];
  const right: Polygon = [
    tileToScreen(x + width, y),
    tileToScreen(x + width, y + depth),
    tileToScreen(x + width, y + depth, height),
    tileToScreen(x + width, y, height),
  ];
  const left: Polygon = [
    tileToScreen(x, y + depth),
    tileToScreen(x + width, y + depth),
    tileToScreen(x + width, y + depth, height),
    tileToScreen(x, y + depth, height),
  ];
  return { top, left, right };
}

/** The outline the camera sees around a box: the three lit and shaded faces as one shape. Used
 *  for hit testing, because a block that stands 2.7 m high covers far more of the screen than the
 *  cells it stands on, and the player clicks what he sees. */
export function blockSilhouette(
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
): Polygon {
  return [
    tileToScreen(x, y + depth, height),
    tileToScreen(x, y, height),
    tileToScreen(x + width, y, height),
    tileToScreen(x + width, y),
    tileToScreen(x + width, y + depth),
    tileToScreen(x, y + depth),
  ];
}

/** Ray casting: is the point inside the shape? Edges count as inside on one side only, which is
 *  all a click needs. */
export function pointInPolygon(point: Point, shape: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i, i += 1) {
    const a = shape[i];
    const b = shape[j];
    if (a === undefined || b === undefined) continue;
    const crosses = a.y > point.y !== b.y > point.y;
    if (!crosses) continue;
    const at = a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y);
    if (point.x < at) inside = !inside;
  }
  return inside;
}

/** Where a label sits: the middle of the footprint, at the given height. */
export function centreOf(
  x: number,
  y: number,
  width: number,
  depth: number,
  height = 0,
): Point {
  return tileToScreen(x + width / 2, y + depth / 2, height);
}

/** Painter order: objects further from the camera are drawn first. */
export function depthKey(x: number, y: number): number {
  return x + y;
}

export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** The screen box a tile grid of this size needs, with room for the tallest object. */
export function gridBounds(
  widthCells: number,
  depthCells: number,
  maxHeightTiles = 4,
): Bounds {
  const corners = [
    tileToScreen(0, 0),
    tileToScreen(widthCells, 0),
    tileToScreen(widthCells, depthCells),
    tileToScreen(0, depthCells),
    tileToScreen(0, 0, maxHeightTiles),
    tileToScreen(widthCells, 0, maxHeightTiles),
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    minX,
    minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}
