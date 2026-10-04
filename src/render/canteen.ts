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
//
// The enlarged canteen is a second room on the same machinery, with a picture of its own
// (delivered 03.10; v80): the same four layers and the lit lockers under the names the art side
// gave them, one wall of sixteen doors and sixteen plates, all of them on the screen at once.
// Until v80 it was the first room's picture showing its sixteen lockers eight at a time.
//
// In the 800 m2 unit the enlarged canteen holds thirty two lockers (v82), which is more than its
// picture has doors, so the room shows them a page of its plates at a time: the line over the
// lockers says which sixteen are on the wall, and a click on it turns to the others. A canteen
// with a plate for every locker has one page and no such line.

import {
  CANTEEN_COUNTER,
  CANTEEN_COUNTER_TEXT,
  CANTEEN_COUNTER_WIDE,
  CANTEEN_PLATES,
  CANTEEN_PLATES_WIDE,
  CANTEEN_PLATE_TEXT,
  CANTEEN_REGIONS,
  CANTEEN_REGIONS_WIDE,
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

/** The enlarged canteen, back to front: the same four layers, of its own picture (v80). */
export const CANTEEN_LAYERS_WIDE: RoomLayer[] = [
  { key: 'canteenBackgroundWide', name: 'Canteen background', needs: null },
  { key: 'canteenKitchenWide', name: 'Canteen kitchenette', needs: null },
  { key: 'canteenLockersWide', name: 'Canteen lockers', needs: null },
  { key: 'canteenTableWide', name: 'Canteen table', needs: null },
];

/** Its wall of lockers painted as if lit. It takes the place of the wall under the pointer and
 *  is never laid beside it: the two files have the one outline (v80). */
export const CANTEEN_LIT_LAYERS_WIDE: RoomLitLayer[] = [
  {
    key: 'canteenLockersLitWide',
    name: 'Canteen lockers, lit',
    region: 'lockers',
    over: 'canteenLockersWide',
  },
];

/** The layers of this unit's canteen: the room as it was built, or the enlarged one. */
export function canteenLayersOf(state: GameState): RoomLayer[] {
  return state.unit.canteenWide ? CANTEEN_LAYERS_WIDE : CANTEEN_LAYERS;
}

/** The lit overlays the art side has delivered, of this unit's canteen. */
export function canteenLitLayersOf(state: GameState, files: readonly string[]): RoomLitLayer[] {
  const lit = state.unit.canteenWide ? CANTEEN_LIT_LAYERS_WIDE : CANTEEN_LIT_LAYERS;
  return lit.filter((layer) => pickSprite(files, layer.key) !== null);
}

/** The four regions of the room, off the art side's own measurement. The door goes back to the
 *  hall and the lockers open the team page, because the lockers are the men's; the kitchenette
 *  and the table do nothing yet, so they are quiet rectangles like the office's clock
 *  (CLAUDE.md T23 2.9). */
function roomRegions(
  regions: Record<'door' | 'lockers' | 'kitchen' | 'table', RoomRect>,
): RoomRegion[] {
  return [
    { id: 'door', name: 'To the hall', ...onTheCanvas(regions.door), opens: true },
    { id: 'lockers', name: 'The lockers', ...onTheCanvas(regions.lockers), opens: true },
    { id: 'kitchen', name: 'Kitchenette', ...onTheCanvas(regions.kitchen), opens: false },
    { id: 'table', name: 'The table', ...onTheCanvas(regions.table), opens: false },
  ];
}

export const CANTEEN_ROOM_REGIONS: RoomRegion[] = roomRegions(CANTEEN_REGIONS);

/** The same four in the enlarged canteen, where its own picture has them (v80). */
export const CANTEEN_ROOM_REGIONS_WIDE: RoomRegion[] = roomRegions(CANTEEN_REGIONS_WIDE);

/** The region over the lockers of a canteen that holds more of them than its picture has doors:
 *  the line that says which of them are on the wall, and the click that turns to the others
 *  (v82; v67 to v79 had it for the sixteen lockers of a picture of eight). */
export const CANTEEN_PAGE_REGION = 'lockerPage';

/** The door plates of this unit's canteen: the eight of the room as it was built, or the sixteen
 *  of the enlarged one (v80). */
export function canteenPlatesOf(state: GameState): readonly RoomRect[] {
  return state.unit.canteenWide ? CANTEEN_PLATES_WIDE : CANTEEN_PLATES;
}

/** The strip of wall the room's one line is written on. */
function counterOf(state: GameState): RoomRect {
  return state.unit.canteenWide ? CANTEEN_COUNTER_WIDE : CANTEEN_COUNTER;
}

/** How many pages of plates this canteen's lockers come to: one where every locker has a plate,
 *  and two for the thirty two lockers of the 800 m2 unit on a wall of sixteen doors (v82). */
export function canteenPages(state: GameState): number {
  return Math.max(1, Math.ceil(canteenLockers(state) / canteenPlatesOf(state).length));
}

/** The page the room shows: the one asked for, where the canteen has it, and the first otherwise. */
function pageOf(state: GameState, page: number): number {
  return Number.isInteger(page) && page >= 0 && page < canteenPages(state) ? page : 0;
}

/** The regions of this unit's canteen: the four, where its picture has them, and the line that
 *  turns the page where there is more than one. */
export function canteenRegionsOf(state: GameState): RoomRegion[] {
  const regions = state.unit.canteenWide ? CANTEEN_ROOM_REGIONS_WIDE : CANTEEN_ROOM_REGIONS;
  if (canteenPages(state) <= 1) return regions;
  return [
    ...regions,
    {
      id: CANTEEN_PAGE_REGION,
      name: 'The other lockers',
      ...onTheCanvas(counterOf(state)),
      opens: true,
    },
  ];
}

/** The catalogue line a compartment is bought under. The office view names its own layers the
 *  same way, with the id the catalogue knows them by. */
const LOCKER = 'locker';

/** How many of the canteen's lockers have a man: the lockers bought, up to the men there are. */
function lockersInUse(state: GameState): number {
  return Math.min(countOf(state, LOCKER), lockerMen(state).length, canteenLockers(state));
}

/** Whose locker each plate is, in the order they were bought: the first locker the company
 *  bought is the first man's, and a plate with no locker behind it or no man in front of it stays
 *  blank (CLAUDE.md T23 2.9). The owner is not on the books and needs no locker (2.10), and from
 *  Turn 26 the office and the manager have none either: the lockers are the men on the floor's,
 *  the joiners' and the labourer's (PIOTR, 02.10; CLAUDE.md T26 2.10). Eight names in the room as
 *  it was built and sixteen in the enlarged one, a name for every plate of its picture (v80); in
 *  the 800 m2 unit `page` 1 is the seventeenth to the thirty second (v82). */
export function canteenPlateNames(state: GameState, page = 0): string[] {
  const men = lockerMen(state);
  const inUse = lockersInUse(state);
  const plates = canteenPlatesOf(state);
  const first = pageOf(state, page) * plates.length;
  return plates.map((_plate, index) =>
    first + index < inUse ? men[first + index]?.name ?? '' : '',
  );
}

/** The line over the lockers: how many of them are in use, and in a canteen of more than one page
 *  which of them the wall is showing, with the mark that says the line turns the page (v82). */
export function canteenCounterLine(state: GameState, page = 0): string {
  const inUse = lockersInUse(state);
  const total = canteenLockers(state);
  if (canteenPages(state) <= 1) return `${inUse} of ${total} lockers in use`;
  const plates = canteenPlatesOf(state).length;
  const first = pageOf(state, page) * plates + 1;
  const last = Math.min(total, first + plates - 1);
  return `Lockers ${first} to ${last} \u00b7 ${inUse} of ${total} in use \u203a`;
}

/** The plate is the size the picture painted it, so a longer name is cut to the characters that
 *  fit rather than shrunk to nothing. Eight is the art side's own figure. */
function onAPlate(name: string): string {
  return name.length <= CANTEEN_PLATE_TEXT.maxCharacters
    ? name
    : name.slice(0, CANTEEN_PLATE_TEXT.maxCharacters);
}

/** The names and the counter, drawn by the game over the blank plates and the blank strip of wall
 *  the artwork leaves for them. A plate with nobody behind it is still drawn, empty: the
 *  compartment is there whether or not it has been bought. */
function liveText(state: GameState, page: number): string {
  const names = canteenPlateNames(state, page);
  const plates = canteenPlatesOf(state).map((plate, index) => {
    const name = onAPlate(names[index] ?? '');
    return (
      `<span class="canteen-plate" data-canteen-plate="${index}" ` +
      `style="${boxStyle(onTheCanvas(plate))};font-size:${CANTEEN_PLATE_TEXT.fontSize}px">` +
      `${escapeText(name)}</span>`
    );
  }).join('');
  const counter = onTheCanvas(counterOf(state));
  return (
    plates +
    `<span class="canteen-counter${state.unit.canteenWide ? ' is-centred' : ''}" data-canteen-text="counter" ` +
    `style="${boxStyle(counter)};font-size:${CANTEEN_COUNTER_TEXT.fontSize}px">` +
    `${escapeText(canteenCounterLine(state, page))}</span>`
  );
}

/** The canteen, in the two pieces the page needs it in: the room this unit has. `page` is which of
 *  its lockers the plates show, where it holds more of them than the picture has doors (v82). */
export function canteenScene(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
  page = 0,
): Scene {
  return roomScene(
    {
      name: 'canteen',
      layers: canteenLayersOf(state),
      lit: canteenLitLayersOf(state, files),
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
