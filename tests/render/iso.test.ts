import { describe, expect, it } from 'vitest';
import {
  TILE_HEIGHT,
  TILE_RISE,
  TILE_WIDTH,
  boxPolygons,
  centreOf,
  depthKey,
  footprintPolygon,
  gridBounds,
  screenToTile,
  tileToScreen,
} from '../../src/render/iso';

describe('the tile', () => {
  it('is 48 by 24, so the biggest hall fits on a 1280 px page (CLAUDE.md T2 3.11)', () => {
    expect(TILE_WIDTH).toBe(48);
    expect(TILE_HEIGHT).toBe(24);
    expect(TILE_RISE).toBe(24);
    expect(TILE_WIDTH / TILE_HEIGHT).toBe(2);
  });
});

describe('the projection', () => {
  it('puts the origin at the origin', () => {
    expect(tileToScreen(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('is 2:1 dimetric on a 48 by 24 tile', () => {
    expect(tileToScreen(1, 0)).toEqual({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
    expect(tileToScreen(0, 1)).toEqual({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
    expect(tileToScreen(1, 1)).toEqual({ x: 0, y: TILE_HEIGHT });
  });

  it('lifts an object by its height', () => {
    expect(tileToScreen(0, 0, 2)).toEqual({ x: 0, y: -2 * TILE_RISE });
  });

  it('goes back to the tile it came from', () => {
    for (let x = 0; x <= 24; x += 1) {
      for (let y = 0; y <= 12; y += 1) {
        const screen = tileToScreen(x, y);
        const back = screenToTile(screen.x, screen.y);
        expect(back.x).toBeCloseTo(x, 10);
        expect(back.y).toBeCloseTo(y, 10);
      }
    }
  });

  it('round trips fractional tiles too', () => {
    const screen = tileToScreen(3.25, 7.5);
    const back = screenToTile(screen.x, screen.y);
    expect(back.x).toBeCloseTo(3.25, 10);
    expect(back.y).toBeCloseTo(7.5, 10);
  });
});

describe('shapes', () => {
  it('draws a footprint with four corners', () => {
    const polygon = footprintPolygon(2, 3, 4, 2);
    expect(polygon).toHaveLength(4);
    expect(polygon[0]).toEqual(tileToScreen(2, 3));
    expect(polygon[2]).toEqual(tileToScreen(6, 5));
  });

  it('draws a box as a top and the two faces the camera sees', () => {
    const faces = boxPolygons(0, 0, 2, 2, 1);
    expect(faces.top).toHaveLength(4);
    expect(faces.left).toHaveLength(4);
    expect(faces.right).toHaveLength(4);
    // The top sits one rise above the floor.
    expect(faces.top[0]?.y).toBe(-TILE_RISE);
    // The faces share the near corner.
    expect(faces.left[1]).toEqual(faces.right[1]);
  });

  it('centres a label over the footprint', () => {
    expect(centreOf(0, 0, 2, 2)).toEqual(tileToScreen(1, 1));
    expect(centreOf(0, 0, 2, 2, 1).y).toBe(tileToScreen(1, 1).y - TILE_RISE);
  });

  it('orders nearer objects last', () => {
    expect(depthKey(0, 0)).toBeLessThan(depthKey(1, 0));
    expect(depthKey(3, 4)).toBe(depthKey(4, 3));
  });

  it('measures the box a grid needs', () => {
    const bounds = gridBounds(24, 10, 4);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    // The left corner is the far y edge, the right corner the far x edge.
    expect(bounds.minX).toBe(tileToScreen(0, 10).x);
  });
});
