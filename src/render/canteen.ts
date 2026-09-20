// The canteen is the second room the player walks into (PIOTR, 20.09; CLAUDE.md T23 2.9). A click
// on the canteen block on the hall opens it the way the office door opens the office: the same
// 1672 by 941 canvas, the same scaling and letterboxing, the same regions and the same lighting
// under the pointer, all of it out of `src/render/room.ts`, which the office is built from too.
// What is here is the canteen itself: its four layers, its lit lockers, its four regions and the
// two things the game writes over the artwork.
//
// The art side left a blank label plate on each of the eight doors and a clear strip of wall over
// the banks, and the game letters them, as the office letters its clock and its company name
// (docs/mockups/t23/README.md).

import {
  CANTEEN_COUNTER,
  CANTEEN_COUNTER_TEXT,
  CANTEEN_LOCKERS,
  CANTEEN_PLATES,
  CANTEEN_PLATE_TEXT,
  CANTEEN_REGIONS,
  type RoomRect,
} from '../engine/constants';
import { countOf } from '../engine/machines';
import type { GameState } from '../engine/types';
import { type Scene, escapeText } from './hall';
import {
  type RoomLayer,
  type RoomLitLayer,
  type RoomRegion,
  type Viewport,
  boxStyle,
  renderRoom,
  roomScene,
} from './room';
import { pickSprite, spriteFiles } from './sprites';

/** The art side measures a rectangle as `{x, y, w, h}` and a room view places one as
 *  `{x, y, width, height}`. The two spellings meet here and nowhere else, so no figure of
 *  docs/mockups/t23/canteen-regions.json is ever written out a second time. */
function onTheCanvas(rect: RoomRect): { x: number; y: number; width: number; height: number } {
  return { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
}

/** Back to front (CLAUDE.md T23 2.9). All four are the room as it stands from the first morning:
 *  the table and the two stools are the room's own, so nobody buys a seat (2.11). */
export const CANTEEN_LAYERS: RoomLayer[] = [
  { key: 'canteenBackground', name: 'Canteen background', needs: null },
  { key: 'canteenKitchen', name: 'Canteen kitchenette', needs: null },
  { key: 'canteenLockers', name: 'Canteen lockers', needs: null },
  { key: 'canteenTable', name: 'Canteen table', needs: null },
];

/** The locker bank painted as if lit, laid over the bank itself while the pointer is on it and
 *  under the table that stands in front of it (CLAUDE.md T14 2.2, T23 2.9). */
export const CANTEEN_LIT_LAYERS: RoomLitLayer[] = [
  {
    key: 'canteenLockersLit',
    name: 'Canteen lockers, lit',
    region: 'lockers',
    over: 'canteenLockers',
  },
];

/** The lit overlays the art side has delivered. */
export function canteenLitLayersOf(files: readonly string[]): RoomLitLayer[] {
  return CANTEEN_LIT_LAYERS.filter((layer) => pickSprite(files, layer.key) !== null);
}

/** The four regions of the room, off the art side's own measurement. The door goes back to the
 *  hall and the lockers open the team page, because the lockers are the men's; the kitchenette
 *  and the table do nothing yet, so they are quiet rectangles like the office's clock
 *  (CLAUDE.md T23 2.9). */
export const CANTEEN_ROOM_REGIONS: RoomRegion[] = [
  { id: 'door', name: 'To the hall', ...onTheCanvas(CANTEEN_REGIONS.door), opens: true },
  { id: 'lockers', name: 'The lockers', ...onTheCanvas(CANTEEN_REGIONS.lockers), opens: true },
  { id: 'kitchen', name: 'Kitchenette', ...onTheCanvas(CANTEEN_REGIONS.kitchen), opens: false },
  { id: 'table', name: 'The table', ...onTheCanvas(CANTEEN_REGIONS.table), opens: false },
];

/** The catalogue line a compartment is bought under. The office view names its own layers the
 *  same way, with the id the catalogue knows them by. */
const LOCKER = 'locker';

/** Whose locker each of the eight is, in the order they were bought: the first locker the company
 *  bought is the first man's, and a plate with no locker behind it or no man in front of it stays
 *  blank (CLAUDE.md T23 2.9). The owner is not on the books and needs no locker (2.10). */
export function canteenPlateNames(state: GameState): string[] {
  const bought = countOf(state, LOCKER);
  const inUse = Math.min(bought, state.workers.length);
  return CANTEEN_PLATES.map((_plate, index) =>
    index < inUse ? state.workers[index]?.name ?? '' : '',
  );
}

/** The plate is the size the picture painted it, so a longer name is cut to the characters that
 *  fit rather than shrunk to nothing. Eight is the art side's own figure. */
function onAPlate(name: string): string {
  return name.length <= CANTEEN_PLATE_TEXT.maxCharacters
    ? name
    : name.slice(0, CANTEEN_PLATE_TEXT.maxCharacters);
}

/** The eight names and the counter, drawn by the game over the blank plates and the blank strip
 *  of wall the artwork leaves for them. A plate with nobody behind it is still drawn, empty: the
 *  compartment is there whether or not it has been bought. */
function liveText(state: GameState): string {
  const names = canteenPlateNames(state);
  const plates = CANTEEN_PLATES.map((plate, index) => {
    const name = onAPlate(names[index] ?? '');
    return (
      `<span class="canteen-plate" data-canteen-plate="${index}" ` +
      `style="${boxStyle(onTheCanvas(plate))};font-size:${CANTEEN_PLATE_TEXT.fontSize}px">` +
      `${escapeText(name)}</span>`
    );
  }).join('');
  const counter = onTheCanvas(CANTEEN_COUNTER);
  const inUse = names.filter((name) => name !== '').length;
  return (
    plates +
    `<span class="canteen-counter" data-canteen-text="counter" ` +
    `style="${boxStyle(counter)};font-size:${CANTEEN_COUNTER_TEXT.fontSize}px">` +
    `${escapeText(`${inUse} of ${CANTEEN_LOCKERS} lockers in use`)}</span>`
  );
}

/** The canteen, in the two pieces the page needs it in. */
export function canteenScene(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): Scene {
  return roomScene(
    {
      name: 'canteen',
      layers: CANTEEN_LAYERS,
      lit: canteenLitLayersOf(files),
      regions: CANTEEN_ROOM_REGIONS,
      live: liveText(state),
    },
    viewport,
    files,
  );
}

/** The room as one string, for a caller that just wants the markup. */
export function renderCanteen(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): string {
  return renderRoom(canteenScene(state, viewport, files));
}
