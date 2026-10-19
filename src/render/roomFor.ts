/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Where a line would go, drawn on the hall in Set up hall [PIOTR, 19.10: "the player is always going
// to be confused without a guide or a picture"; "so the player has to be a clairvoyant?"] (v119).
// The player presses `Room for: <kind>` and the hall draws the block that kind of line takes with
// its ground (`bestLineSite`): green where it fits, and where it does not, red at the place with
// the fewest things in the way, each of them marked on the floor and named in the label. It is the
// renderer's and nothing of the state: a memo of the last answer, keyed by the kind and by where
// every piece of kit stands, so a drag that moves nothing asks nothing twice.

import { LINE_KINDS, lineModulesOf } from '../engine/constants';
import { bestLineSite, boxOf, lineBlockWords, lineBox, lineGround, lineModuleCell } from '../engine/layout';
import { findSpec, isLineModule, lineOf } from '../engine/machines';
import type { GameState, LineKind } from '../engine/types';
import { type Polygon, centreOf, footprintPolygon } from './iso';

/** A polygon's points attribute and a text's escaping, as `hall.ts` writes them; written here too
 *  because the hall draws this module's art and a module the hall draws does not read the hall. */
function points(polygon: Polygon): string {
  return polygon.map((point) => `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`).join(' ');
}
function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Site = ReturnType<typeof bestLineSite>;

/** The last answer and what it was for: the kind and the standing of every piece of kit. */
let memo: { key: string; site: Site } | null = null;

/** Forgets the memo: for a view built from nothing, and for the tests. */
export function resetRoomFor(): void {
  memo = null;
}

function keyOf(state: GameState, kind: LineKind): string {
  const unit = state.unit;
  const kit = state.equipment
    .map((item) => `${item.id}:${item.anchorX},${item.anchorY},${item.orientation},${item.soldOnDay === null ? '' : 's'}`)
    .join(';');
  const held = state.onOrder.map((entry) => `${entry.id}:${entry.anchorX},${entry.anchorY}`).join(';');
  return `${kind}|${unit.widthCells}x${unit.depthCells}|${unit.canteenWide === true ? 'w' : ''}|${kit}|${held}`;
}

function siteFor(state: GameState, kind: LineKind): Site {
  const key = keyOf(state, kind);
  if (memo !== null && memo.key === key) return memo.site;
  const site = bestLineSite(state, kind);
  memo = { key, site };
  return site;
}

/** The things in the way, by name and count, a line's modules together by their line: `6 modules
 *  of line 1, 2 workbenches, 1 sheet rack`. */
function named(state: GameState, ids: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const item = state.equipment.find((entry) => entry.id === id) ?? state.onOrder.find((entry) => entry.id === id);
    const name =
      item === undefined
        ? 'something'
        : isLineModule(item.specId)
          ? `module of line ${lineOf(item)}`
          : (findSpec(item.specId)?.name ?? item.specId).toLowerCase();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => {
      if (name.startsWith('module of line ')) return `${count} ${count === 1 ? 'module' : 'modules'} of line ${name.slice('module of line '.length)}`;
      return count === 1 ? `1 ${name}` : `${count} ${name}s`;
    })
    .join(', ');
}

/** What the player is looking at, in one sentence: the Set up hall bar says it in plain text and
 *  the floor's label repeats it, so it can be read at any zoom (v119). */
export function roomForWords(state: GameState, kind: LineKind | null | undefined): string {
  if (kind === null || kind === undefined) return '';
  const name = LINE_KINDS[kind].name;
  const site = siteFor(state, kind);
  if (site === null) return `The hall is too small for a ${name.toLowerCase()}: it needs a clear ${lineBlockWords(kind)}`;
  if (site.fits) return `${name}: it would go here, ${lineBlockWords(kind)}`;
  const parts = [named(state, site.items), ...(site.lines.length === 0 ? [] : [`the ground of line ${site.lines.join(', ')}`])].filter(
    (part) => part !== '',
  );
  return `${name} needs a clear ${lineBlockWords(kind)}. In the way here: ${parts.join('; ')}`;
}

/** The hall's drawing for `Room for`: the block, its line and stations, its lane, what stands in
 *  the way, and one label saying what the player is looking at. Empty with no kind asked. */
export function roomForArt(state: GameState, kind: LineKind | null | undefined): string {
  if (kind === null || kind === undefined) return '';
  const site = siteFor(state, kind);
  const unit = state.unit;
  const what = roomForWords(state, kind);
  if (site === null) {
    const middle = centreOf(0, 0, unit.widthCells, unit.depthCells);
    return (
      `<g data-room-for="${kind}" data-room-fits="none">` +
      `<text x="${Math.round(middle.x)}" y="${Math.round(middle.y)}" text-anchor="middle" class="iso-label ghost-label" fill="var(--bad)">` +
      `${escapeText(what)}</text></g>`
    );
  }
  const ground = lineGround(state, site.at, kind);
  if (ground === null) return '';
  const colour = site.fits ? 'var(--good)' : 'var(--bad)';
  const line = lineBox(site.at, kind);
  const top = ground.behind === null ? line.y : ground.behind.y;
  const left = Math.min(line.x, ground.front.x);
  const right = Math.max(line.x + line.width, ground.front.x + ground.front.width);
  const block = { x: left, y: top, width: right - left, depth: ground.front.y + ground.front.depth - top };
  const stations = lineModulesOf(kind).map((id) => {
    const cell = lineModuleCell(site.at, id);
    return { x: cell.x, y: cell.y, width: line.width / lineModulesOf(kind).length, depth: line.depth };
  });
  const inTheWay = site.items
    .map((id) => {
      const item = state.equipment.find((entry) => entry.id === id) ?? state.onOrder.find((entry) => entry.id === id);
      if (item === undefined) return '';
      const zone = boxOf(item.specId, 0, 0, item.variantId, item.orientation);
      return (
        `<polygon data-in-the-way="${id}" points="${points(footprintPolygon(item.anchorX, item.anchorY, zone.width, zone.depth))}" ` +
        'fill="var(--bad)" fill-opacity="0.35" stroke="var(--bad)" stroke-width="2" pointer-events="none" />'
      );
    })
    .join('');
  const middle = centreOf(block.x, block.y, block.width, block.depth);
  return (
    `<g data-room-for="${kind}" data-room-fits="${site.fits ? 'yes' : 'no'}" data-room-at="${site.at.x},${site.at.y}">` +
    `<polygon data-room-block="1" points="${points(footprintPolygon(block.x, block.y, block.width, block.depth))}" ` +
    `fill="${colour}" fill-opacity="0.12" stroke="${colour}" stroke-width="3" stroke-dasharray="12 6" pointer-events="none" />` +
    `<polygon data-room-lane="1" points="${points(footprintPolygon(ground.front.x, ground.front.y, ground.front.width, ground.front.depth))}" ` +
    `fill="none" stroke="${colour}" stroke-width="1.5" stroke-dasharray="6 4" pointer-events="none" />` +
    `<polygon data-room-line="1" points="${points(footprintPolygon(line.x, line.y, line.width, line.depth))}" ` +
    `fill="none" stroke="${colour}" stroke-width="3" pointer-events="none" />` +
    stations
      .map(
        (part) =>
          `<polygon data-room-station="1" points="${points(footprintPolygon(part.x, part.y, part.width, part.depth))}" ` +
          `fill="none" stroke="${colour}" stroke-width="1" pointer-events="none" />`,
      )
      .join('') +
    inTheWay +
    `<text x="${Math.round(middle.x)}" y="${Math.round(middle.y)}" text-anchor="middle" class="iso-label ghost-label" fill="${colour}">` +
    `${escapeText(what)}</text></g>`
  );
}
