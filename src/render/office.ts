// The office is a room, not a desk. Three photoreal layers on one 1672 by 941 canvas, scaled to
// whatever room the page has under the top bar and centred, with the click regions and the live
// text laid over them in canvas coordinates (docs/art/SPRITES.md 8).
//
// The machinery that does all of that is `src/render/room.ts`, which the canteen uses too since
// Turn 23: one code path for both rooms (CLAUDE.md T23 2.9). What is left in this file is the
// office itself, which is its layers, its regions, its two live texts and the man at the desk.

import { formatTime } from '../engine/clock';
import { has } from '../engine/machines';
import { ownerIsAvailable } from '../engine/owner';
import { companyTotals } from '../engine/reputation';
import { STATION_OFFICE, STATION_PHONE } from '../engine/stations';
import type { GameState } from '../engine/types';
import { animationForStation, characterArt, characterSheet } from './characters';
import { type Scene, escapeText, fitName } from './hall';
import {
  ROOM_CANVAS,
  ROOM_LIVE_SLOT,
  type RegionDressing,
  type RoomLayer,
  type RoomLitLayer,
  type RoomRegion,
  type RoomTextBox,
  type Viewport,
  boxStyle,
  fitRoomStack,
  renderRoom,
  roomScale,
  roomScene,
  roundScale,
} from './room';
import { SPRITE_SCALE, pickSprite, spriteFiles } from './sprites';

/** The empty element the office shell leaves for its live text. */
export const OFFICE_LIVE_SLOT = ROOM_LIVE_SLOT;

/** The canvas every office layer is drawn on (docs/art/SPRITES.md 8.1). It is the canvas of every
 *  room in the game: the canteen is painted on the same one (CLAUDE.md T23 2.9). */
export const OFFICE_CANVAS = ROOM_CANVAS;

export type OfficeLayer = RoomLayer;
export type OfficeLitLayer = RoomLitLayer;
export type OfficeRegion = RoomRegion;
export type OfficeTextBox = RoomTextBox;
export type { Viewport };

/** The one scale value: the biggest the whole canvas can be drawn without cropping it. */
export const officeScale = roomScale;

/** The scale re-taken from the room's own box once it is on the page. It finds whichever room the
 *  player is standing in, because both wear the same shell. */
export const fitOfficeStack = fitRoomStack;

/** Back to front (docs/art/SPRITES.md 8.1). The desk, the catalogue on it and the binder come
 *  with the desk; the laptop comes on its own (CLAUDE.md T7 3.8). */
export const OFFICE_LAYERS: OfficeLayer[] = [
  { key: 'officeBackground', name: 'Office background', needs: null },
  { key: 'officeDesk', name: 'Office desk', needs: 'desk' },
  { key: 'officeLaptop', name: 'Office laptop', needs: 'laptop' },
];

/** The layers the room actually has this morning. */
export function officeLayersOf(state: GameState): OfficeLayer[] {
  return OFFICE_LAYERS.filter((layer) => layer.needs === null || has(state, layer.needs));
}

/** The overlays that light one thing in the room while the pointer is on its region, painted by
 *  the art side one at a time (docs/art/REQUESTS-T14.md). Each goes through the same file check
 *  every sprite does: it is laid over the background only when its file is there, and until then
 *  the region gets a soft light spot instead (CLAUDE.md T14 2.2). */
export const OFFICE_LIT_LAYERS: OfficeLitLayer[] = [
  { key: 'officeDoorLit', name: 'Office door, lit', region: 'door' },
];

/** The lit overlays the art side has delivered. */
export function officeLitLayersOf(files: readonly string[]): OfficeLitLayer[] {
  return OFFICE_LIT_LAYERS.filter((layer) => pickSprite(files, layer.key) !== null);
}

/** Where the company board hangs: flat on the rear wall, exactly in the middle between the door
 *  and the corner of the walls, under the clock, square like the picture (PIOTR, 16.09; CLAUDE.md
 *  T15 2.1). Measured on officeBackground.png at y 300: the door frame's right edge is at x 971
 *  (the dark line of the frame is columns 970 and 971) and the corner of the rear and right walls
 *  at x 1214 (the brightness jumps between columns 1212 and 1216, the same on every row from 200
 *  to 450), so the free wall is 243 px wide with its centre at x 1092; the clock above it is
 *  centred at 1101. 180 square, 31 px of wall on the left and 32 on the right, under the clock
 *  (y 88..146) [TUNE]. */
export const COMPANY_BOARD_BOX = { x: 1002, y: 168, width: 180, height: 180 };

/** The pinned sheet of the felt picture, as fractions of the board: x 19.4% to 80.6% across it and
 *  y 40.7% to 80.9% down it (docs/art/SPRITES.md 11). */
const COMPANY_SHEET = { left: 0.194, right: 0.806, top: 0.407, bottom: 0.809 };

/** The rectangles of docs/art/SPRITES.md 8.2, in canvas pixels before any scaling. The name is
 *  what the label says when the pointer is on the region, one place for every one of them
 *  (CLAUDE.md T14 2.2). */
export const OFFICE_REGIONS: OfficeRegion[] = [
  { id: 'workPlan', name: 'Work plan', x: 20, y: 10, width: 365, height: 515, opens: true },
  // The order board is the management software's, so it wants the laptop the software runs on
  // (CLAUDE.md T7 3.8).
  {
    id: 'orders',
    name: 'Orders',
    x: 1290,
    y: 20,
    width: 372,
    height: 500,
    opens: true,
    needs: 'laptop',
  },
  { id: 'door', name: 'To the hall', x: 640, y: 15, width: 305, height: 585, opens: true },
  { id: 'clock', name: 'Clock', x: 1040, y: 88, width: 122, height: 58, opens: false },
  {
    id: 'laptop',
    name: 'Laptop',
    x: 558,
    y: 449,
    width: 557,
    height: 443,
    opens: true,
    needs: 'laptop',
  },
  {
    id: 'catalogue',
    name: 'Catalogue',
    x: 60,
    y: 680,
    width: 445,
    height: 210,
    opens: true,
  },
  {
    id: 'binder',
    name: 'Accounts',
    x: 1170,
    y: 620,
    width: 435,
    height: 280,
    opens: true,
    needs: 'desk',
  },
  // The free wall right of the door (PIOTR, 13.09; CLAUDE.md T9 3.10). It is the room's own
  // board, like the Work Plan: it needs nothing bought before it says how the company is doing.
  { id: 'company', name: 'Company board', ...COMPANY_BOARD_BOX, opens: true },
];

/** The board the game draws itself until the art side paints one, with its heading lettered on it
 *  (CLAUDE.md T9 3.10). The same idea as the catalogue on the floor: a drawn object rather than
 *  an invisible rectangle over artwork that has nothing on it. */
export const COMPANY_BOARD = 'company';

/** Where the catalogue lies before there is a desk to put it on: on the floor by the door, in the
 *  region the brief gives it on the office canvas (CLAUDE.md T8 3.7). */
export const FLOOR_CATALOGUE = { x: 60, y: 700, width: 440, height: 200 };

/** The key the art side delivers the floor catalogue under. It goes through the loader like any
 *  other object: the PNG when there is one, and the drawn placeholder while there is not
 *  (CLAUDE.md T8 3.7). */
export const FLOOR_CATALOGUE_SPRITE = 'catalogueFloor';
/** The board on the wall right of the door: GPT's felt board when delivered (SPRITES.md 11). */
export const COMPANY_BOARD_SPRITE = 'officeCompanyBoard';

/** The regions the room has this morning, with the catalogue on the floor while there is no desk
 *  to put it on. Nothing else works until there is (CLAUDE.md T7 3.8). */
export function officeRegionsOf(state: GameState): OfficeRegion[] {
  return OFFICE_REGIONS.filter(
    (region) => region.needs === undefined || region.needs === null || has(state, region.needs),
  ).map((region) =>
    region.id === 'catalogue' && !has(state, 'desk')
      ? { ...region, ...FLOOR_CATALOGUE, name: 'Catalogue, on the floor' }
      : region,
  );
}

/** The two texts the artwork leaves blank for the game to fill (docs/art/SPRITES.md 8.3). */
/** The smallest the board is ever lettered at scale 1 [TUNE] (CLAUDE.md T6 3.10). */
export const OFFICE_NAME_SIZE_MIN = 12;

export const OFFICE_TEXTS: Record<'clock' | 'company' | 'companyTotals', OfficeTextBox> = {
  clock: { x: 1050, y: 96, width: 102, height: 40, fontSize: 28 },
  company: { x: 200, y: 92, width: 170, height: 46, fontSize: 22 },
  // The pinned sheet of the felt board on the wall, in office canvas pixels, off the board's own
  // box so the two cannot drift apart (COMPANY_SHEET; docs/art/SPRITES.md 11). The wall board
  // carries the two totals and nothing else (PIOTR, 15.09; CLAUDE.md T11 3.5). The lettering
  // scales with the board: 12 px at scale 1 on the 180 board [TUNE].
  companyTotals: {
    x: Math.round(COMPANY_BOARD_BOX.x + COMPANY_BOARD_BOX.width * COMPANY_SHEET.left),
    y: Math.round(COMPANY_BOARD_BOX.y + COMPANY_BOARD_BOX.height * COMPANY_SHEET.top),
    width: Math.round(COMPANY_BOARD_BOX.width * (COMPANY_SHEET.right - COMPANY_SHEET.left)),
    height: Math.round(COMPANY_BOARD_BOX.height * (COMPANY_SHEET.bottom - COMPANY_SHEET.top)),
    fontSize: 12,
  },
};

/** The two things the office draws inside a region of its own. The company board and the floor
 *  catalogue have no artwork under them until the art side paints one, so the game draws the
 *  object itself rather than leaving an invisible rectangle over bare wall and bare floor
 *  (CLAUDE.md T7 3.8, T9 3.10; SPRITES.md 11; PIOTR, 14.09: the drawn square goes once the
 *  picture is there). */
function officeDressing(onTheFloor: boolean) {
  return (region: OfficeRegion, files: readonly string[]): RegionDressing | null => {
    if (region.id === COMPANY_BOARD) {
      const url = pickSprite(files, COMPANY_BOARD_SPRITE);
      if (url !== null) {
        return {
          classes: 'office-company-board is-art',
          inside:
            `<img class="office-floor-art" data-sprite="${COMPANY_BOARD_SPRITE}" src="${url}" ` +
            'alt="" draggable="false" />',
        };
      }
      return {
        classes: 'office-company-board',
        inside: '<span>How the company is doing</span>',
      };
    }
    if (region.id === 'catalogue') {
      // The same book on the floor before the desk and on the desk after it (PIOTR, 14.09): the
      // loader first, the drawn object second, exactly as a machine is drawn in the hall
      // (CLAUDE.md T3 3.6, T8 3.7). With the picture there is no drawn box under it.
      const url = pickSprite(files, FLOOR_CATALOGUE_SPRITE);
      if (url !== null) {
        return {
          classes: `office-floor-catalogue is-art${onTheFloor ? '' : ' on-desk'}`,
          inside:
            `<img class="office-floor-art" data-sprite="${FLOOR_CATALOGUE_SPRITE}" ` +
            `src="${url}" alt="" draggable="false" />`,
        };
      }
      if (onTheFloor) {
        return { classes: 'office-floor-catalogue', inside: '<span>Equipment</span>' };
      }
    }
    return null;
  };
}

/** Where the owner stands in the office, in canvas pixels [TUNE] (CLAUDE.md T19 2.2). The office
 *  picture has no desk region to read this off: `OFFICE_REGIONS` is the boards, the door, the
 *  clock, the laptop, the catalogue and the binder, and the desk is a layer. So the box is
 *  measured off `officeDesk.png` and the background instead: the clear strip of wall between the
 *  Work Plan board, which ends at x 385, and the laptop on the desk, which begins at x 558, with
 *  his feet at y 600 where the floor meets the wall behind the desk. The room is drawn from the
 *  owner's own chair, so he cannot be at the desk without standing in front of his own eyes:
 *  standing him at the wall behind it is the readable compromise, and it is the one place on the
 *  canvas where he covers nothing the player clicks, which a test holds him to. He is across the
 *  room from the camera, so he is drawn small; the box keeps the sheet cell's own 112 by 151 so
 *  nothing is stretched. */
export const OFFICE_OWNER_BOX = { x: 392, y: 378, width: 165, height: 222 };

/** The owner, drawn in the room the player followed him into (PIOTR, 17.09: "he vanishes when he
 *  goes into the office"; CLAUDE.md T19 2.2). He is here while his station is the office or the
 *  phone, and nowhere else; the hall draws him in the doorway at the same minute, so a player who
 *  walks through the door finds the same man. Nothing at all while the art side has delivered no
 *  sheet for him, which is what the office tests render with: a capsule on a photoreal room would
 *  read as a bug and not as a man. */
export function officeFigure(state: GameState, files: readonly string[]): string {
  if (!ownerIsAvailable(state)) return '';
  const station = state.owner.station;
  if (station !== STATION_OFFICE && station !== STATION_PHONE) return '';
  const animation = animationForStation(station);
  const found = characterSheet('owner', animation, { files }) ?? characterSheet('owner', 'idle', { files });
  if (found === null) return '';
  // The art is drawn about the figure's feet, so the box is the sheet's own cell in scene units
  // with the anchor at the origin: the box does the scaling and no second factor is wanted.
  const { sheet } = found;
  const art = characterArt('owner', animation, 'se', { files });
  if (art === null) return '';
  const left = -sheet.anchorX / SPRITE_SCALE;
  const top = -sheet.anchorY / SPRITE_SCALE;
  return (
    `<svg class="office-figure" data-office-figure="owner" style="${boxStyle(OFFICE_OWNER_BOX)}" ` +
    `viewBox="${roundScale(left)} ${roundScale(top)} ${roundScale(sheet.cellWidth / SPRITE_SCALE)} ` +
    `${roundScale(sheet.cellHeight / SPRITE_SCALE)}" aria-hidden="true">${art}</svg>`
  );
}

/** The clock and the company name, drawn by the game over the blank areas of the artwork. */
function liveText(state: GameState, files: readonly string[]): string {
  const clock = OFFICE_TEXTS.clock;
  const company = OFFICE_TEXTS.company;
  // Shrink to fit before cutting, the same helper the hall letters its wall with. The board is
  // 22 px at scale 1 and never smaller than 12, which is readable on the artwork (T6 3.10).
  const fitted = fitName(state.companyName, company.width, {
    max: company.fontSize,
    min: OFFICE_NAME_SIZE_MIN,
  });
  const totals = companyTotals(state);
  const board = OFFICE_TEXTS.companyTotals;
  return (
    `<span class="office-clock" data-office-text="clock" ` +
    `style="${boxStyle(clock)};font-size:${clock.fontSize}px">` +
    `${escapeText(formatTime(state.clock.minute))}</span>` +
    `<span class="office-company" data-office-text="company" ` +
    `style="${boxStyle(company)};font-size:${fitted.fontSize}px">` +
    `<span>${escapeText(fitted.text)}</span></span>` +
    // The two totals on the pinned sheet of the board on the wall, and nothing else on it.
    `<span class="office-board-totals" data-office-text="companyTotals" ` +
    `style="${boxStyle(board)};font-size:${board.fontSize}px">` +
    `<span data-total="reputation">${escapeText(totals.reputation)}</span>` +
    `<span data-total="output">${escapeText(totals.output)}</span></span>` +
    // The man at the desk follows the state like the clock does, so he is in the live part and
    // never in the shell: sitting down must not rebuild the room (CLAUDE.md T19 2.2).
    officeFigure(state, files)
  );
}

/** The office, in the two pieces the page needs it in. */
export function officeScene(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): Scene {
  const onTheFloor = !has(state, 'desk');
  return roomScene(
    {
      name: 'office',
      layers: officeLayersOf(state),
      lit: officeLitLayersOf(files),
      regions: officeRegionsOf(state),
      live: liveText(state, files),
      // The floor catalogue is a picture of its own: delivering it rebuilds the room once.
      keyExtra: [onTheFloor ? pickSprite(files, FLOOR_CATALOGUE_SPRITE) ?? 'drawn' : ''],
      dress: officeDressing(onTheFloor),
    },
    viewport,
    files,
  );
}

/** The room as one string, for a caller that just wants the markup. */
export function renderOffice(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): string {
  return renderRoom(officeScene(state, viewport, files));
}
