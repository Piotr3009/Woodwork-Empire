// Isometric projection helpers. Pure geometry, no SVG and no DOM, so the same numbers can feed a
// sprite renderer later (CLAUDE.md 10.3).
//
// 2:1 dimetric. One tile is 64 by 32 pixels on screen and half a metre by half a metre in the world.

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
/** Pixels of screen height per tile of object height. */
export const TILE_RISE = 32;

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

/** Tile coordinates to screen pixels. z is height in tiles. */
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
  widthTiles: number,
  depthTiles: number,
  maxHeightTiles = 4,
): Bounds {
  const corners = [
    tileToScreen(0, 0),
    tileToScreen(widthTiles, 0),
    tileToScreen(widthTiles, depthTiles),
    tileToScreen(0, depthTiles),
    tileToScreen(0, 0, maxHeightTiles),
    tileToScreen(widthTiles, 0, maxHeightTiles),
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
