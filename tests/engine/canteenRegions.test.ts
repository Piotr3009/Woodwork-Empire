// The canteen room's rectangles are the art side's own measurement of the five layers it
// delivered, and the game copies them rather than guessing at them (CLAUDE.md T23 2.9). This file
// holds the copy to the measurement: every figure of docs/mockups/t23/canteen-regions.json, read
// off the file itself, against the tables in constants.ts.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CANTEEN_COUNTER,
  CANTEEN_COUNTER_TEXT,
  CANTEEN_PLATES,
  CANTEEN_PLATE_TEXT,
  CANTEEN_REGIONS,
} from '../../src/engine/constants';
import { OFFICE_CANVAS } from '../../src/render/office';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Measured {
  door: Rect;
  lockers: Rect;
  kitchen: Rect;
  table: Rect;
  plates: Rect[];
  counter: Rect;
  textStyle: {
    namePlate: { fontSize: number; maxCharacters: number; align: string };
    counter: { fontSize: number };
  };
  canvas: { width: number; height: number };
}

const measured = JSON.parse(
  readFileSync('docs/mockups/t23/canteen-regions.json', 'utf8'),
) as Measured;

describe('the canteen room s rectangles', () => {
  it('are the art side s four regions, figure for figure', () => {
    expect(CANTEEN_REGIONS.door).toEqual(measured.door);
    expect(CANTEEN_REGIONS.lockers).toEqual(measured.lockers);
    expect(CANTEEN_REGIONS.kitchen).toEqual(measured.kitchen);
    expect(CANTEEN_REGIONS.table).toEqual(measured.table);
  });

  it('are eight door plates in reading order, and the counter over the banks', () => {
    // Eight plates, because the room has eight compartments and that is the cap on the crew
    // (PIOTR, 20.09; CLAUDE.md T23 2.9, 2.10).
    expect(CANTEEN_PLATES).toHaveLength(8);
    expect([...CANTEEN_PLATES]).toEqual(measured.plates);
    expect(CANTEEN_COUNTER).toEqual(measured.counter);
  });

  it('carry the hands the measurement gives, so no renderer types a size', () => {
    expect(CANTEEN_PLATE_TEXT.fontSize).toBe(measured.textStyle.namePlate.fontSize);
    expect(CANTEEN_PLATE_TEXT.maxCharacters).toBe(measured.textStyle.namePlate.maxCharacters);
    expect(CANTEEN_PLATE_TEXT.align).toBe(measured.textStyle.namePlate.align);
    expect(CANTEEN_COUNTER_TEXT.fontSize).toBe(measured.textStyle.counter.fontSize);
  });

  it('are on the office s own canvas and not a second one', () => {
    // One room view and one canvas: the canteen is built on the office's machinery
    // (CLAUDE.md T23 2.9).
    expect(OFFICE_CANVAS).toEqual({
      width: measured.canvas.width,
      height: measured.canvas.height,
    });
    for (const rect of [
      ...Object.values(CANTEEN_REGIONS),
      ...CANTEEN_PLATES,
      CANTEEN_COUNTER,
    ]) {
      expect(rect.x + rect.w).toBeLessThanOrEqual(OFFICE_CANVAS.width);
      expect(rect.y + rect.h).toBeLessThanOrEqual(OFFICE_CANVAS.height);
    }
  });
});
