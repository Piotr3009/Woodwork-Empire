/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The line's own forklift [PIOTR, 10.10: "when the pallet of windows is stacked, ten of them, the
// forklift takes it to the door"; 11.10: "and the forklift driving"; that evening "won't we add it
// to this turn?"] (CLAUDE.md T31 2.10). It is the renderer's, as the walkers and the doors are: no
// game state, no lift, no minute booked and no money. In the engine a pallet is at the gate the
// moment it leaves module 6, as in Turn 30; this module only draws the trip that takes it there.
//
// The forklift comes with the line and goes with it. It waits on the lane's front strip in front of
// module 6's pallet, facing `nw`, and whenever the count of pallets at the gate goes up on the same
// day it drives the newest one along the front strip (`nw`) and up the left strip (`ne`) until the
// pallet on its forks is over its place at the gate, sets it down, and drives back empty (`sw`,
// then `se`). Its memory is module level and is set again after every page written, so a page
// written mid trip never puts it back where it waits; it is forgotten wherever a view is built from
// nothing, when the line is moved or sold, and from `WALK_SKIPPED_FROM_SPEED` on.

import {
  FIGURE_DEPTH_OFFSET,
  FORKLIFT_CELLS_PER_SECOND,
  FORKLIFT_LOAD_AHEAD,
  FORKLIFT_SHEETS,
  LINE_PALLET_LAYOUT,
  LINE_PALLETS_DRAWN,
} from '../engine/constants';
import type { VehicleSheetFigures } from '../engine/constants';
import { forkliftLane, linePlace } from '../engine/layout';
import { lineStandsWhole } from '../engine/machines';
import { facingTowards } from '../engine/stations';
import type { GameState } from '../engine/types';
import { type Facing, cellBox, frameAt, walksAreSkipped } from './characters';
import { depthKey, tileToScreen } from './iso';
import { SPRITE_DIR, SPRITE_SCALE } from './sprites';
import { placeAmongDrawables } from './walkers';

interface Point {
  x: number;
  y: number;
}

/** Waiting at the line's end, driving the pallet to the gate, or driving back empty. */
type Leg = 'wait' | 'out' | 'back';

interface Forklift {
  /** The line's place and the hall's depth it was worked out for: a move forgets the trip. */
  key: string;
  day: number;
  /** The pallets at the gate it last saw. */
  pallets: number;
  leg: Leg;
  at: Point;
  /** The points still ahead on this leg. */
  path: Point[];
  facing: Facing;
  /** The pallet at the gate that is on its forks while the loaded leg runs, by the index the hall
   *  draws it under, or null. */
  onTheForks: number | null;
  lastMs: number | null;
}

let forklift: Forklift | null = null;

/** Forgets the forklift: back where it waits, with no trip. */
export function resetForklift(): void {
  forklift = null;
}

/** The forklift as it stands this frame, for the tests and nobody else. */
export function forkliftNow(): Readonly<Forklift> | null {
  return forklift;
}

/** How far short of the front strip's end the forklift's anchor waits, in metres: in front of
 *  module 6's pallet, which stands at the end of its rollers [TUNE: chat: the cell]. */
const WAIT_SHORT_OF_THE_END = 1;

/** The most real time one step of the forklift covers, so a frame that comes late never sends it
 *  across the hall [TUNE]. */
const MAX_STEP_SECONDS = 1;

/** The three points of the trip for the line where it stands: where it waits, the lane's corner,
 *  and where it stops with the pallet on its forks over its place at the gate. Null while the six do
 *  not stand whole or the line has no lane: then there is no forklift (CLAUDE.md T31 2.10). */
export function forkliftPoints(state: GameState): { wait: Point; corner: Point; drop: Point; key: string } | null {
  if (!lineStandsWhole(state)) return null;
  const at = linePlace(state);
  if (at === null) return null;
  const lane = forkliftLane(state, at);
  const front = lane?.[0];
  const left = lane?.[1];
  if (front === undefined || left === undefined) return null;
  const frontMiddle = front.y + front.depth / 2;
  const leftMiddle = left.x + left.width / 2;
  return {
    wait: { x: front.x + front.width - WAIT_SHORT_OF_THE_END, y: frontMiddle },
    corner: { x: leftMiddle, y: frontMiddle },
    drop: { x: leftMiddle, y: LINE_PALLET_LAYOUT.y + LINE_PALLET_LAYOUT.depth / 2 + FORKLIFT_LOAD_AHEAD },
    key: `${at.x},${at.y},${state.unit.depthCells}`,
  };
}

/** The sheet of the forklift on this leg: loaded on the way out, empty otherwise. */
function sheetOf(leg: Leg): VehicleSheetFigures {
  return leg === 'out' ? FORKLIFT_SHEETS.loaded : FORKLIFT_SHEETS.empty;
}

function screenAt(at: Point): string {
  const screen = tileToScreen(at.x, at.y);
  return `translate(${screen.x.toFixed(2)},${screen.y.toFixed(2)})`;
}

/** The depth the forklift is drawn at: the cell its anchor is on, as a figure's (CLAUDE.md T31
 *  2.10). */
function depthAt(at: Point): number {
  return depthKey(Math.floor(at.x), Math.floor(at.y)) + FIGURE_DEPTH_OFFSET;
}

/** The forklift as the hall draws it waiting, one drawable: an svg clipped to one cell by its view
 *  box over the whole sheet, halved like every sprite, its anchor on the point it stands on, marked
 *  `data-forklift` with its leg, and taking no click (CLAUDE.md T31 2.10). This module moves it
 *  from frame to frame. */
export function forkliftArt(at: Point): { svg: string; depth: number; feet: Point } {
  const sheet = FORKLIFT_SHEETS.empty;
  const row = sheet.rows.nw;
  const round = (value: number): number => Math.round(value * 100) / 100;
  return {
    depth: depthAt(at),
    feet: at,
    svg:
      `<g data-forklift="wait" transform="${screenAt(at)}" pointer-events="none">` +
      `<svg data-forklift-art="1" data-frame="0" data-row="${row}" ` +
      `x="${round(-sheet.anchorX / SPRITE_SCALE)}" y="${round(-sheet.anchorY / SPRITE_SCALE)}" ` +
      `width="${round(sheet.cellWidth / SPRITE_SCALE)}" height="${round(sheet.cellHeight / SPRITE_SCALE)}" ` +
      `viewBox="${cellBox(sheet, row, 0)}" preserveAspectRatio="xMidYMid meet">` +
      `<image href="${SPRITE_DIR}/${sheet.file}" x="0" y="0" /></svg></g>`,
  };
}

/** A forklift waiting, with no trip, having seen the pallets at the gate as they are. */
function waiting(key: string, state: GameState, wait: Point): Forklift {
  return {
    key,
    day: state.clock.day,
    pallets: state.windowLine.palletsAtGate,
    leg: 'wait',
    at: { ...wait },
    path: [],
    facing: 'nw',
    onTheForks: null,
    lastMs: null,
  };
}

/** Reads the state for this frame: forgets the forklift when it has to, starts a trip when a pallet
 *  has left module 6 on the same day while it waits, and drives it on by the real time since its
 *  last step when `drive` is set. A pallet sent while it is out is at the gate at once. */
function follow(state: GameState, nowMs: number, drive: boolean): void {
  const points = forkliftPoints(state);
  if (points === null) {
    forklift = null;
    return;
  }
  const pallets = state.windowLine.palletsAtGate;
  if (forklift === null || forklift.key !== points.key || walksAreSkipped()) {
    forklift = waiting(points.key, state, points.wait);
  } else if (forklift.day !== state.clock.day) {
    forklift.day = state.clock.day;
    forklift.pallets = pallets;
  } else if (pallets > forklift.pallets) {
    if (forklift.leg === 'wait') {
      forklift.leg = 'out';
      forklift.path = [points.corner, points.drop];
      forklift.onTheForks = Math.min(pallets, LINE_PALLETS_DRAWN) - 1;
      forklift.lastMs = nowMs;
    }
    forklift.pallets = pallets;
  } else if (pallets < forklift.pallets) {
    forklift.pallets = pallets;
  }
  if (drive && forklift.lastMs !== null) {
    const seconds = Math.min(MAX_STEP_SECONDS, Math.max(0, (nowMs - forklift.lastMs) / 1000));
    driveOn(forklift, seconds * FORKLIFT_CELLS_PER_SECOND, points);
  }
  forklift.lastMs = nowMs;
  const next = forklift.path[0];
  if (next !== undefined) forklift.facing = facingTowards(forklift.at, next);
}

/** Drives this far along the points ahead, turning on the spot at a corner, and ends a leg at its
 *  last point: the pallet set down at the gate and the forklift empty, or back where it waits and
 *  facing `nw` again (CLAUDE.md T31 2.10) [TUNE: chat: no lifting drawn]. */
function driveOn(truck: Forklift, cells: number, points: { wait: Point; corner: Point }): void {
  let left = cells;
  while (left > 0) {
    const target = truck.path[0];
    if (target === undefined) return;
    const distance = Math.hypot(target.x - truck.at.x, target.y - truck.at.y);
    if (distance > left) {
      truck.at = {
        x: truck.at.x + ((target.x - truck.at.x) / distance) * left,
        y: truck.at.y + ((target.y - truck.at.y) / distance) * left,
      };
      return;
    }
    truck.at = { ...target };
    truck.path.shift();
    left -= distance;
    if (truck.path.length > 0) continue;
    if (truck.leg === 'out') {
      truck.leg = 'back';
      truck.onTheForks = null;
      truck.path = [points.corner, points.wait];
    } else {
      truck.leg = 'wait';
      truck.facing = 'nw';
      return;
    }
  }
}

/** Writes the forklift where it has got to onto the page: its leg, its place, its row and frame, its
 *  sheet, its depth among the drawables, and the pallet on its forks left out of the gate. Nothing
 *  it set before survives a page written, so all of it is written each time. */
function draw(root: ParentNode, nowMs: number): void {
  const pallets = Array.from(root.querySelectorAll('[data-line-pallet]'));
  for (const pallet of pallets) {
    const onTheForks = forklift !== null && forklift.onTheForks === Number(pallet.getAttribute('data-line-pallet'));
    if (onTheForks) pallet.setAttribute('visibility', 'hidden');
    else pallet.removeAttribute('visibility');
  }
  const node = root.querySelector('[data-forklift]');
  if (node === null || forklift === null) return;
  const sheet = sheetOf(forklift.leg);
  const moving = forklift.path.length > 0;
  const row = sheet.rows[forklift.facing];
  const frame = moving ? frameAt(sheet, nowMs) : 0;
  node.setAttribute('data-forklift', forklift.leg);
  node.setAttribute('transform', screenAt(forklift.at));
  const art = node.querySelector('[data-forklift-art]');
  if (art !== null) {
    art.setAttribute('data-row', String(row));
    art.setAttribute('data-frame', String(frame));
    art.setAttribute('viewBox', cellBox(sheet, row, frame));
    art.querySelector('image')?.setAttribute('href', `${SPRITE_DIR}/${sheet.file}`);
  }
  placeAmongDrawables(node, depthAt(forklift.at), forklift.at);
}

/** The frame's step: in every frame with the state, whatever page is open and whether the clock runs
 *  or stands, the forklift drives on in real time and is drawn where it has got to (CLAUDE.md T31
 *  2.10). */
export function stepForklift(root: ParentNode, state: GameState, nowMs: number): void {
  follow(state, nowMs, true);
  draw(root, nowMs);
}

/** After every page written: the forklift is put back where it had got to, and a pallet that has
 *  just left module 6 is never painted at the gate for a frame (CLAUDE.md T31 2.10). */
export function syncForklift(root: ParentNode, state: GameState, nowMs: number): void {
  follow(state, nowMs, false);
  draw(root, nowMs);
}
