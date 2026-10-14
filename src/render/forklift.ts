/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// A line's own forklift [PIOTR, 10.10: "when the pallet of windows is stacked, ten of them, the
// forklift takes it to the door"; 11.10: "and the forklift driving"; that evening "won't we add it
// to this turn?"] (CLAUDE.md T31 2.10). It is the renderer's, as the walkers and the doors are: no
// game state, no lift, no minute booked and no money. In the engine a pallet is at the gate the
// moment it leaves module 6, as in Turn 30; this module only draws the trip that takes it there.
//
// A forklift comes with its line and goes with it, one a line from v93 (PIOTR, 12.10). It waits on
// its lane's front strip in front of module 6's pallet, facing `nw`, and whenever the count of its
// line's pallets at the gate goes up on the same day it drives the newest one along the front strip
// (`nw`) and up or down the left strip to the pallets until the pallet on its forks is over its
// place at the gate, sets it down, and drives back empty. Its memory is module level and is set
// again after every page written, so a page written mid trip never puts it back where it waits; it
// is forgotten wherever a view is built from nothing, when its line is moved or sold, and from
// `WALK_SKIPPED_FROM_SPEED` on.

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
import { palletsAtTheGate } from '../engine/lineContract';
import { lineRecord, lineStandsWhole, standingLines } from '../engine/machines';
import { facingTowards } from '../engine/stations';
import type { GameState } from '../engine/types';
import { type Facing, cellBox, frameAt, walksAreSkipped } from './characters';
import { depthKey, tileToScreen } from './iso';
import { SPRITE_DIR, SPRITE_SCALE } from './sprites';
import { placeAmongDrawables, writeAttribute } from './walkers';

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
  /** The line's pallets at the gate it last saw. */
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

/** One forklift a line, by the line's number (v93). */
const forklifts = new Map<number, Forklift>();

/** Forgets every forklift: each back where it waits, with no trip. */
export function resetForklift(): void {
  forklifts.clear();
}

/** A line's forklift as it stands this frame, for the tests and nobody else; line 1's unless
 *  asked for another. */
export function forkliftNow(line = 1): Readonly<Forklift> | null {
  return forklifts.get(line) ?? null;
}

/** How far short of the front strip's end the forklift's anchor waits, in metres: in front of
 *  module 6's pallet, which stands at the end of its rollers [TUNE: chat: the cell]. */
const WAIT_SHORT_OF_THE_END = 1;

/** The most real time one step of the forklift covers, so a frame that comes late never sends it
 *  across the hall [TUNE]. */
const MAX_STEP_SECONDS = 1;

/** The three points of a line's trip for the line where it stands: where it waits, the lane's
 *  corner, and where it stops with the pallet on its forks over its place at the gate, which is up
 *  the left strip for a line in front of the pallets and down it for a line behind them. Null while
 *  the six do not stand whole or the line has no lane: then there is no forklift (CLAUDE.md T31
 *  2.10; v93). */
export function forkliftPoints(state: GameState, line: number): { wait: Point; corner: Point; drop: Point; key: string } | null {
  if (!lineStandsWhole(state, line)) return null;
  const at = linePlace(state, line);
  if (at === null) return null;
  const lane = forkliftLane(state, at);
  const front = lane?.[0];
  const left = lane?.[1];
  if (front === undefined || left === undefined) return null;
  const frontMiddle = front.y + front.depth / 2;
  const leftMiddle = left.x + left.width / 2;
  const palletMiddle = LINE_PALLET_LAYOUT.y + LINE_PALLET_LAYOUT.depth / 2;
  // The pallet is ahead of the forklift along the way it drives: the stop is short of the pallets'
  // row on the side it comes from.
  const drop = frontMiddle >= palletMiddle ? palletMiddle + FORKLIFT_LOAD_AHEAD : palletMiddle - FORKLIFT_LOAD_AHEAD;
  return {
    wait: { x: front.x + front.width - WAIT_SHORT_OF_THE_END, y: frontMiddle },
    corner: { x: leftMiddle, y: frontMiddle },
    drop: { x: leftMiddle, y: drop },
    key: `${line}:${at.x},${at.y},${state.unit.depthCells}`,
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

/** A line's forklift as the hall draws it waiting, one drawable: an svg clipped to one cell by its
 *  view box over the whole sheet, halved like every sprite, its anchor on the point it stands on,
 *  marked `data-forklift` with its leg and `data-forklift-line` with its line, and taking no click
 *  (CLAUDE.md T31 2.10; v93). This module moves it from frame to frame. */
export function forkliftArt(line: number, at: Point): { svg: string; depth: number; feet: Point } {
  const sheet = FORKLIFT_SHEETS.empty;
  const row = sheet.rows.nw;
  const round = (value: number): number => Math.round(value * 100) / 100;
  return {
    depth: depthAt(at),
    feet: at,
    svg:
      `<g data-forklift="wait" data-forklift-line="${line}" transform="${screenAt(at)}" pointer-events="none">` +
      `<svg data-forklift-art="1" data-frame="0" data-row="${row}" ` +
      `x="${round(-sheet.anchorX / SPRITE_SCALE)}" y="${round(-sheet.anchorY / SPRITE_SCALE)}" ` +
      `width="${round(sheet.cellWidth / SPRITE_SCALE)}" height="${round(sheet.cellHeight / SPRITE_SCALE)}" ` +
      `viewBox="${cellBox(sheet, row, 0)}" preserveAspectRatio="xMidYMid meet">` +
      `<image href="${SPRITE_DIR}/${sheet.file}" x="0" y="0" /></svg></g>`,
  };
}

/** A line's pallets at the gate as the engine has them. */
function linePallets(state: GameState, line: number): number {
  return lineRecord(state, line)?.palletsAtGate ?? 0;
}

/** A forklift waiting, with no trip, having seen its line's pallets at the gate as they are. */
function waiting(key: string, state: GameState, line: number, wait: Point): Forklift {
  return {
    key,
    day: state.clock.day,
    pallets: linePallets(state, line),
    leg: 'wait',
    at: { ...wait },
    path: [],
    facing: 'nw',
    onTheForks: null,
    lastMs: null,
  };
}

/** Reads the state for this frame for one line: forgets its forklift when it has to, starts a trip
 *  when a pallet has left its module 6 on the same day while it waits, and drives it on by the real
 *  time since its last step when `drive` is set. A pallet sent while it is out is at the gate at
 *  once. */
function followLine(state: GameState, line: number, nowMs: number, drive: boolean): void {
  const points = forkliftPoints(state, line);
  if (points === null) {
    forklifts.delete(line);
    return;
  }
  const pallets = linePallets(state, line);
  let forklift = forklifts.get(line) ?? null;
  if (forklift === null || forklift.key !== points.key || walksAreSkipped()) {
    forklift = waiting(points.key, state, line, points.wait);
    forklifts.set(line, forklift);
  } else if (forklift.day !== state.clock.day) {
    forklift.day = state.clock.day;
    forklift.pallets = pallets;
  } else if (pallets > forklift.pallets) {
    if (forklift.leg === 'wait') {
      forklift.leg = 'out';
      forklift.path = [points.corner, points.drop];
      // The newest pallet the hall draws at the gate, every line's counted (CLAUDE.md T31 2.10).
      forklift.onTheForks = Math.min(palletsAtTheGate(state), LINE_PALLETS_DRAWN) - 1;
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

/** Every line's forklift read for this frame, and the forklift of a line that is gone forgotten. */
function follow(state: GameState, nowMs: number, drive: boolean): void {
  const lines = standingLines(state);
  for (const line of Array.from(forklifts.keys())) {
    if (!lines.includes(line)) forklifts.delete(line);
  }
  for (const line of lines) followLine(state, line, nowMs, drive);
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

/** Writes every forklift where it has got to onto the page: its leg, its place, its row and frame,
 *  its sheet, its depth among the drawables, and the pallet on its forks left out of the gate.
 *  Nothing it set before survives a page written, so all of it is written each time. */
function draw(root: ParentNode, nowMs: number): void {
  const onForks = new Set<number>();
  for (const forklift of forklifts.values()) {
    if (forklift.onTheForks !== null) onForks.add(forklift.onTheForks);
  }
  const pallets = Array.from(root.querySelectorAll('[data-line-pallet]'));
  for (const pallet of pallets) {
    if (onForks.has(Number(pallet.getAttribute('data-line-pallet')))) writeAttribute(pallet, 'visibility', 'hidden');
    else if (pallet.hasAttribute('visibility')) pallet.removeAttribute('visibility');
  }
  // Every attribute written only when it changes: a forklift that waits writes nothing in a frame
  // (v97).
  for (const node of Array.from(root.querySelectorAll('[data-forklift]'))) {
    const forklift = forklifts.get(Number(node.getAttribute('data-forklift-line'))) ?? null;
    if (forklift === null) continue;
    const sheet = sheetOf(forklift.leg);
    const moving = forklift.path.length > 0;
    const row = sheet.rows[forklift.facing];
    const frame = moving ? frameAt(sheet, nowMs) : 0;
    writeAttribute(node, 'data-forklift', forklift.leg);
    writeAttribute(node, 'transform', screenAt(forklift.at));
    const art = node.querySelector('[data-forklift-art]');
    if (art !== null) {
      writeAttribute(art, 'data-row', String(row));
      writeAttribute(art, 'data-frame', String(frame));
      writeAttribute(art, 'viewBox', cellBox(sheet, row, frame));
      const picture = art.querySelector('image');
      if (picture !== null) writeAttribute(picture, 'href', `${SPRITE_DIR}/${sheet.file}`);
    }
    placeAmongDrawables(node, depthAt(forklift.at), forklift.at);
  }
}

/** The frame's step: in every frame with the state, whatever page is open and whether the clock runs
 *  or stands, every forklift drives on in real time and is drawn where it has got to (CLAUDE.md T31
 *  2.10). */
export function stepForklift(root: ParentNode, state: GameState, nowMs: number): void {
  follow(state, nowMs, true);
  draw(root, nowMs);
}

/** After every page written: every forklift is put back where it had got to, and a pallet that has
 *  just left a module 6 is never painted at the gate for a frame (CLAUDE.md T31 2.10). */
export function syncForklift(root: ParentNode, state: GameState, nowMs: number): void {
  follow(state, nowMs, false);
  draw(root, nowMs);
}
