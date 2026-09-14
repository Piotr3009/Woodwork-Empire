// Where things stand on the hall floor. Pure geometry over the state, so the setup view can ask
// before it drops and the catalogue can ask before it buys (CLAUDE.md T2 3.10).

import { GATE_LANE, ROOM_LAYOUT } from './constants';
import { findSpec, itemStandsInTheHall, standsInTheHall, zoneOf } from './machines';
import { reservedItems } from './orders';
import type { Equipment, GameState, OnOrderItem } from './types';

export interface PlaceCheck {
  ok: boolean;
  reason: string;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  depth: number;
}

const OK: PlaceCheck = { ok: true, reason: '' };

function overlaps(left: Box, right: Box): boolean {
  return (
    left.x < right.x + right.width &&
    right.x < left.x + left.width &&
    left.y < right.y + right.depth &&
    right.y < left.y + left.depth
  );
}

/** The cells inside the shutter that nothing may stand on. Fixed geometry of the painted hall,
 *  not worked out from the unit any more (docs/art/SPRITES.md 9.3). */
export function gateLane(): Box {
  return { x: GATE_LANE.x, y: GATE_LANE.y, width: GATE_LANE.width, depth: GATE_LANE.depth };
}

/** Everything standing on the hall floor: what a move can bump into. The office furniture lives
 *  in the office view and the van stands in the yard, so neither is in the way. */
export function hallItems(state: GameState): Equipment[] {
  return state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') return false;
    if (!itemStandsInTheHall(item)) return false;
    return item.anchorX < state.unit.widthCells;
  });
}

/** The floor a thing of this class takes up where it is put: its working zone, which is what
 *  nothing else may stand on (CLAUDE.md T7 3.3). */
export function boxOf(
  specId: string,
  x: number,
  y: number,
  variantId?: string,
  rotated = false,
): Box {
  const zone = zoneOf(specId, variantId, rotated);
  return { x, y, width: zone.width, depth: zone.depth };
}

/** The floor something already in the hall takes up, turned the way it stands (T10 3.8). */
function boxOfItem(item: { specId: string; variantId: string; rotated: boolean }, x: number, y: number): Box {
  return boxOf(item.specId, x, y, item.variantId, item.rotated);
}

/** Can a thing of this kind stand here? `ignoreItemId` is the item being moved, which never
 *  collides with itself. */
export function canPlaceSpec(
  state: GameState,
  specId: string,
  x: number,
  y: number,
  ignoreItemId: string | null,
  variantId?: string,
  rotated = false,
): PlaceCheck {
  const spec = findSpec(specId);
  if (!spec) return { ok: false, reason: 'Not in the catalogue' };
  if (!standsInTheHall(specId, variantId)) {
    return { ok: false, reason: 'It lives in a tool cabinet' };
  }
  const box = boxOf(specId, x, y, variantId, rotated);
  if (
    x < 0 ||
    y < 0 ||
    x + box.width > state.unit.widthCells ||
    y + box.depth > state.unit.depthCells
  ) {
    return { ok: false, reason: 'Off the floor' };
  }
  for (const room of ROOM_LAYOUT) {
    if (overlaps(box, { x: room.x, y: room.y, width: room.width, depth: room.depth })) {
      return { ok: false, reason: `On the ${room.name.toLowerCase()}` };
    }
  }
  if (overlaps(box, gateLane())) {
    return { ok: false, reason: 'Blocking the way to the gate' };
  }
  for (const item of hallItems(state)) {
    if (item.id === ignoreItemId) continue;
    const other = findSpec(item.specId);
    if (!other) continue;
    // Zone against zone: two saws whose working room would overlap cannot both stand there, even
    // where the machines themselves would not touch (CLAUDE.md T7 3.3).
    if (overlaps(box, boxOfItem(item, item.anchorX, item.anchorY))) {
      return { ok: false, reason: `On the ${other.name.toLowerCase()}` };
    }
  }
  // The cells held for what is bought and not here yet are taken as surely as the cells a machine
  // stands on: it is coming, and it has to have somewhere to stand (CLAUDE.md T8 3.2).
  for (const item of reservedItems(state)) {
    if (item.id === ignoreItemId) continue;
    const other = findSpec(item.specId);
    if (!other) continue;
    if (overlaps(box, boxOfItem(item, item.anchorX, item.anchorY))) {
      return { ok: false, reason: `On the ${other.name.toLowerCase()} that is on order` };
    }
  }
  return OK;
}

/** The outline of something on order, which setup mode drags about like a machine. */
export function reservationById(state: GameState, itemId: string): OnOrderItem | null {
  return reservedItems(state).find((entry) => entry.id === itemId) ?? null;
}

/** Can this item stand here? An outline held for a delivery answers exactly as the machine it is
 *  holding the floor for would (CLAUDE.md T8 3.2). */
export function canPlace(
  state: GameState,
  itemId: string,
  x: number,
  y: number,
  rotated?: boolean,
): PlaceCheck {
  const reserved = reservationById(state, itemId);
  if (reserved !== null) {
    return canPlaceSpec(
      state,
      reserved.specId,
      x,
      y,
      reserved.id,
      reserved.variantId,
      rotated ?? reserved.rotated,
    );
  }
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'Nothing to move' };
  const spec = findSpec(item.specId);
  if (spec?.category === 'furniture') return { ok: false, reason: 'It lives in the office' };
  if (item.anchorX >= state.unit.widthCells) return { ok: false, reason: 'It stands in the yard' };
  return canPlaceSpec(state, item.specId, x, y, item.id, item.variantId, rotated ?? item.rotated);
}

/** Moves it, or says why not. The man at a bench goes with his bench. */
export function moveItem(
  state: GameState,
  itemId: string,
  x: number,
  y: number,
  rotated?: boolean,
): PlaceCheck {
  const check = canPlace(state, itemId, x, y, rotated);
  if (!check.ok) return check;
  const reserved = reservationById(state, itemId);
  if (reserved !== null) {
    // Nothing is carried and nothing is unplugged: the floor held for it is held somewhere else.
    reserved.anchorX = x;
    reserved.anchorY = y;
    if (rotated !== undefined) reserved.rotated = rotated;
    return OK;
  }
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (!item) return check;
  const fromX = item.anchorX;
  const fromY = item.anchorY;
  item.anchorX = x;
  item.anchorY = y;
  if (rotated !== undefined) item.rotated = rotated;
  for (const worker of state.workers) {
    if (worker.anchorX === fromX && worker.anchorY === fromY) {
      worker.anchorX = x;
      worker.anchorY = y;
    }
  }
  return OK;
}

/** The first cell, reading along each row in turn, where a thing of this kind fits. */
export function firstFreeCell(
  state: GameState,
  specId: string,
  variantId?: string,
): { x: number; y: number } | null {
  const zone = zoneOf(specId, variantId);
  if (zone.width <= 0 || zone.depth <= 0) return null;
  for (let y = 0; y + zone.depth <= state.unit.depthCells; y += 1) {
    for (let x = 0; x + zone.width <= state.unit.widthCells; x += 1) {
      if (canPlaceSpec(state, specId, x, y, null, variantId).ok) return { x, y };
    }
  }
  return null;
}
