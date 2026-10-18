/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The line engineers in their red shirts, walking along the metre in front of their line [PIOTR,
// 11.10: "the engineers in red shirts walk along the line all the time"; 12.10: "the same picture,
// only the shirts red"] (v94). They are the renderer's, as the forklift and the walkers are: no game
// state, no lift, no minute booked. A line has as many walking as are on duty for it, two at the
// most (`lineEngineersOnDuty`): the first from module 1's end and the second from module 6's, each
// walking the length of the line and back at a man's pace, the two a little apart across the metre
// so they pass side by side. They are drawn on a working day until the crew goes home. Their memory
// is module level and is set again after every page written, so a page written mid walk never puts
// them back at the start; it is forgotten wherever a view is built from nothing and when their line
// is moved or sold.

import { FIGURE_DEPTH_OFFSET, LINE_FRONT_CELLS } from '../engine/constants';
import { isWorkingDay } from '../engine/clock';
import { lineBox, linePlace } from '../engine/layout';
import { lineEngineersOnDuty, standingLines } from '../engine/machines';
import { crewHasGoneHome } from '../engine/staff';
import type { GameState } from '../engine/types';
import { type CharacterOptions, type Facing, characterArt, faceCharacter, walkPace } from './characters';
import { depthKey, tileToScreen } from './iso';
import { placeAmongDrawables, writeAttribute } from './walkers';

interface Point {
  x: number;
  y: number;
}

/** The sheet role the engineers are drawn from: the joiner's own idle and walk with the shirt red
 *  (`scripts/engineer-shirt.py`). */
export const ENGINEER_ROLE = 'lineEngineer';

/** How far either side of the middle of the line's metre the two engineers keep, so they pass
 *  side by side and not through one another [TUNE]. */
const ACROSS_THE_PATH = 0.22;

/** How far in from each end of the line they turn, in metres [TUNE]. */
const IN_FROM_THE_END = 0.5;

/** The most real time one step covers, so a frame that comes late never sends a man across the
 *  hall [TUNE]. */
const MAX_STEP_SECONDS = 1;

/** One engineer walking: how far along his line's path he is, the way he is going, and the line's
 *  place his walk was worked out for, so a move of the line starts it again. */
interface EngineerWalk {
  key: string;
  along: number;
  direction: 1 | -1;
  lastMs: number | null;
}

const walks = new Map<string, EngineerWalk>();

/** Forgets every engineer's walk: each back at his end of the line. */
export function resetEngineers(): void {
  walks.clear();
}

/** An engineer's walk as it stands this frame, for the tests and nobody else. */
export function engineerWalk(line: number, index: number): Readonly<EngineerWalk> | null {
  return walks.get(`${line}:${index}`) ?? null;
}

/** The path a line's engineers walk: along the middle of the metre in front of its modules, from
 *  half a metre in from module 1's end to half a metre in from module 6's, for a line whose module
 *  1 stands. Null for a line that does not stand (v94). */
export function engineerPath(state: GameState, line: number): { from: Point; length: number; key: string } | null {
  if (!standingLines(state).includes(line)) return null;
  const at = linePlace(state, line);
  if (at === null) return null;
  const box = lineBox(at);
  return {
    from: { x: box.x + IN_FROM_THE_END, y: box.y + box.depth + LINE_FRONT_CELLS / 2 },
    length: Math.max(0, box.width - 2 * IN_FROM_THE_END),
    key: `${line}:${at.x},${at.y}`,
  };
}

/** How many of a line's engineers walk now: those on duty for it, on a working day until the crew
 *  goes home (v94). */
export function engineersWalking(state: GameState, line: number): number {
  if (!isWorkingDay(state.clock.day) || crewHasGoneHome(state)) return 0;
  return lineEngineersOnDuty(state, line);
}

/** Where an engineer is on the floor for this far along his path: the second keeps the far side of
 *  the metre. */
function pointOf(path: { from: Point }, index: number, along: number): Point {
  return { x: path.from.x + along, y: path.from.y + (index === 0 ? -ACROSS_THE_PATH : ACROSS_THE_PATH) };
}

/** The way a man walking along x faces: down the line `se`, back up it `nw`. */
function facingOf(direction: 1 | -1): Facing {
  return direction > 0 ? 'se' : 'nw';
}

function screenAt(at: Point): string {
  const screen = tileToScreen(at.x, at.y);
  return `translate(${screen.x.toFixed(2)},${screen.y.toFixed(2)})`;
}

/** The depth a walking engineer is drawn at: the cell his feet are on, as a figure's. */
function depthAt(at: Point): number {
  return depthKey(Math.floor(at.x), Math.floor(at.y)) + FIGURE_DEPTH_OFFSET;
}

/** The feet an engineer is put among the drawables by: the middle of the cell he is on, as a man
 *  walking between stations is (v104). Against the whole metres every thing on the floor stands
 *  on, the middle of his cell puts him where his own feet would, and he is put again only when he
 *  steps on to the next cell and not in every frame he walks: thirty four engineers on seventeen
 *  lines were a fifth of a second of every second at 1x. */
function feetAt(at: Point): Point {
  return { x: Math.floor(at.x) + 0.5, y: Math.floor(at.y) + 0.5 };
}

/** A new walk: the first engineer at module 1's end going down the line, the second at module 6's
 *  coming up it. */
function startOf(key: string, index: number, length: number): EngineerWalk {
  return index === 0
    ? { key, along: 0, direction: 1, lastMs: null }
    : { key, along: length, direction: -1, lastMs: null };
}

/** The engineers as the hall draws them, one drawable each: his walk sheet clipped to one cell,
 *  where his walk has got to, or at his end of the line when it has not started, marked
 *  `data-engineer` with his line and his place among its engineers, and taking no click (v94). This
 *  module moves them from frame to frame. Nothing while the sheet is not delivered. */
export function engineersArt(
  state: GameState,
  options: CharacterOptions = {},
): { svg: string; depth: number; feet: Point }[] {
  const drawn: { svg: string; depth: number; feet: Point }[] = [];
  for (const line of standingLines(state)) {
    const path = engineerPath(state, line);
    if (path === null) continue;
    const count = engineersWalking(state, line);
    for (let index = 0; index < count; index += 1) {
      const known = walks.get(`${line}:${index}`);
      const walk = known !== undefined && known.key === path.key ? known : startOf(path.key, index, path.length);
      const art = characterArt(ENGINEER_ROLE, 'walk', facingOf(walk.direction), options);
      if (art === null) continue;
      const at = pointOf(path, index, walk.along);
      drawn.push({
        depth: depthAt(at),
        feet: feetAt(at),
        svg:
          `<g data-engineer="${line}:${index}" transform="${screenAt(at)}" pointer-events="none">${art}</g>`,
      });
    }
  }
  return drawn;
}

/** The path of a line its engineers walk, by line, as `follow` read them for this frame. */
type Paths = Map<number, { from: Point; length: number; key: string }>;

/** Reads the state for this frame: forgets the walks of engineers no longer walking, starts the
 *  ones that are, and walks each on by the real time since his last step when `drive` is set,
 *  turning at each end of the line. Hands back the paths it read, so the drawing asks the state
 *  nothing again (v104). */
function follow(state: GameState, nowMs: number, drive: boolean): Paths {
  const wanted = new Set<string>();
  const paths: Paths = new Map();
  for (const line of standingLines(state)) {
    const path = engineerPath(state, line);
    if (path === null) continue;
    paths.set(line, path);
    const count = engineersWalking(state, line);
    for (let index = 0; index < count; index += 1) {
      const id = `${line}:${index}`;
      wanted.add(id);
      let walk = walks.get(id);
      if (walk === undefined || walk.key !== path.key) {
        walk = startOf(path.key, index, path.length);
        walks.set(id, walk);
      }
      if (drive && walk.lastMs !== null) {
        const seconds = Math.min(MAX_STEP_SECONDS, Math.max(0, (nowMs - walk.lastMs) / 1000));
        walkOn(walk, seconds * walkPace(), path.length);
      }
      walk.lastMs = nowMs;
    }
  }
  for (const id of Array.from(walks.keys())) {
    if (!wanted.has(id)) walks.delete(id);
  }
  return paths;
}

/** Walks this far along the line and back, turning at each end. */
function walkOn(walk: EngineerWalk, metres: number, length: number): void {
  if (length <= 0) return;
  let left = metres;
  while (left > 0) {
    const room = walk.direction > 0 ? length - walk.along : walk.along;
    if (room > left) {
      walk.along += walk.direction * left;
      return;
    }
    walk.along = walk.direction > 0 ? length : 0;
    left -= room;
    walk.direction = walk.direction > 0 ? -1 : 1;
  }
}

/** Writes every engineer where his walk has got to onto the page: his place, the way he faces and
 *  his depth among the drawables. Nothing it set before survives a page written, so all of it is
 *  written each time; the frame of his walk is `playCharacters`'s. */
function draw(root: ParentNode, paths: Paths): void {
  for (const node of Array.from(root.querySelectorAll('[data-engineer]'))) {
    const [lineText, indexText] = (node.getAttribute('data-engineer') ?? '').split(':');
    const line = Number(lineText);
    const index = Number(indexText);
    const walk = walks.get(`${line}:${index}`);
    const path = paths.get(line);
    if (walk === undefined || path === undefined) continue;
    const at = pointOf(path, index, walk.along);
    // Written only when it changes: an engineer who stands writes nothing in a frame (v97).
    writeAttribute(node, 'transform', screenAt(at));
    const art = node.querySelector('[data-character]');
    if (art !== null) faceCharacter(art, facingOf(walk.direction));
    placeAmongDrawables(node, depthAt(at), feetAt(at));
  }
}

/** The frame's step: in every frame with the state, whatever page is open and whether the clock runs
 *  or stands, every engineer walks on in real time and is drawn where he has got to (v94). */
export function stepEngineers(root: ParentNode, state: GameState, nowMs: number): void {
  draw(root, follow(state, nowMs, true));
}

/** After every page written: every engineer is put back where his walk had got to (v94). */
export function syncEngineers(root: ParentNode, state: GameState, nowMs: number): void {
  draw(root, follow(state, nowMs, false));
}
