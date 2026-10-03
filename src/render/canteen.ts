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
  CANTEEN_COUNTER_WIDE,
  CANTEEN_PLATES,
  CANTEEN_PLATE_TEXT,
  CANTEEN_REGIONS,
  type RoomRect,
} from '../engine/constants';
import { canteenLockers } from '../engine/layout';
import { countOf } from '../engine/machines';
import { lockerMen } from '../engine/staff';
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

/** The region over the banks of an enlarged canteen: the line that says which eight lockers the
 *  room is showing, and the click that turns to the other eight (PIOTR, 03.10; v67). */
export const CANTEEN_PAGE_REGION = 'lockerPage';

/** The regions of this unit's canteen: the four, and the page line of an enlarged one. */
export function canteenRegionsOf(state: GameState): RoomRegion[] {
  if (!state.unit.canteenWide) return CANTEEN_ROOM_REGIONS;
  return [
    ...CANTEEN_ROOM_REGIONS,
    {
      id: CANTEEN_PAGE_REGION,
      name: 'The other eight',
      ...onTheCanvas(CANTEEN_COUNTER_WIDE),
      opens: true,
    },
  ];
}

/** The catalogue line a compartment is bought under. The office view names its own layers the
 *  same way, with the id the catalogue knows them by. */
const LOCKER = 'locker';

/** How many pages of eight plates this canteen's lockers come to: one as it was built, two once
 *  it is enlarged, because the room is painted with one pair of banks (v67). */
export function canteenPages(state: GameState): number {
  return Math.max(1, Math.ceil(canteenLockers(state) / CANTEEN_PLATES.length));
}

/** The page the room shows: the one asked for, where the canteen has it, and the first otherwise. */
function pageOf(state: GameState, page: number): number {
  return Number.isInteger(page) && page >= 0 && page < canteenPages(state) ? page : 0;
}

/** How many of the canteen's lockers have a man: the lockers bought, up to the men there are. */
function lockersInUse(state: GameState): number {
  return Math.min(countOf(state, LOCKER), lockerMen(state).length, canteenLockers(state));
}

/** Whose locker each of the eight is, in the order they were bought: the first locker the company
 *  bought is the first man's, and a plate with no locker behind it or no man in front of it stays
 *  blank (CLAUDE.md T23 2.9). The owner is not on the books and needs no locker (2.10), and from
 *  Turn 26 the office and the manager have none either: the lockers are the men on the floor's,
 *  the joiners' and the labourer's (PIOTR, 02.10; CLAUDE.md T26 2.10). An enlarged canteen has
 *  sixteen and the room shows them eight at a time: `page` 1 is the ninth to the sixteenth (v67). */
export function canteenPlateNames(state: GameState, page = 0): string[] {
  const men = lockerMen(state);
  const inUse = lockersInUse(state);
  const first = pageOf(state, page) * CANTEEN_PLATES.length;
  return CANTEEN_PLATES.map((_plate, index) =>
    first + index < inUse ? men[first + index]?.name ?? '' : '',
  );
}

/** The line over the banks: how many of the lockers are in use, and in an enlarged canteen which
 *  eight the room is showing, with the mark that says the line turns the page (v67). */
export function canteenCounterLine(state: GameState, page = 0): string {
  const inUse = lockersInUse(state);
  const total = canteenLockers(state);
  if (!state.unit.canteenWide) return `${inUse} of ${total} lockers in use`;
  const first = pageOf(state, page) * CANTEEN_PLATES.length + 1;
  const last = first + CANTEEN_PLATES.length - 1;
  return `Lockers ${first} to ${last} \u00b7 ${inUse} of ${total} in use \u203a`;
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
function liveText(state: GameState, page: number): string {
  const names = canteenPlateNames(state, page);
  const plates = CANTEEN_PLATES.map((plate, index) => {
    const name = onAPlate(names[index] ?? '');
    return (
      `<span class="canteen-plate" data-canteen-plate="${index}" ` +
      `style="${boxStyle(onTheCanvas(plate))};font-size:${CANTEEN_PLATE_TEXT.fontSize}px">` +
      `${escapeText(name)}</span>`
    );
  }).join('');
  const counter = onTheCanvas(state.unit.canteenWide ? CANTEEN_COUNTER_WIDE : CANTEEN_COUNTER);
  return (
    plates +
    `<span class="canteen-counter" data-canteen-text="counter" ` +
    `style="${boxStyle(counter)};font-size:${CANTEEN_COUNTER_TEXT.fontSize}px">` +
    `${escapeText(canteenCounterLine(state, page))}</span>`
  );
}

/** The canteen, in the two pieces the page needs it in. `page` is which eight lockers of an
 *  enlarged canteen the plates show; the room as it was built has the one (v67). */
export function canteenScene(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
  page = 0,
): Scene {
  return roomScene(
    {
      name: 'canteen',
      layers: CANTEEN_LAYERS,
      lit: canteenLitLayersOf(files),
      regions: canteenRegionsOf(state),
      live: liveText(state, page),
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
  page = 0,
): string {
  return renderRoom(canteenScene(state, viewport, files, page));
}
