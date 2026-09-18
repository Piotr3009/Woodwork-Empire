// The office is a room, not a desk. Three photoreal layers on one 1672 by 941 canvas, scaled to
// whatever room the page has under the top bar and centred, with the click regions and the live
// text laid over them in canvas coordinates (docs/art/SPRITES.md 8).
//
// One scale value carries the stack, the regions and the text, so nothing can drift out of line.
// The hall stays isometric; the two views never share a screen.

import { formatTime } from '../engine/clock';
import { has } from '../engine/machines';
import { ownerIsAvailable } from '../engine/owner';
import { companyTotals } from '../engine/reputation';
import { STATION_OFFICE, STATION_PHONE } from '../engine/stations';
import type { GameState } from '../engine/types';
import { animationForStation, characterArt, characterSheet } from './characters';
import { type Scene, escapeText, fitName } from './hall';
import { SPRITE_SCALE, pickSprite, spriteFiles } from './sprites';

/** The empty element the office shell leaves for its live text. The hall's slot is an SVG group
 *  and the office is HTML, so the two are not the same element, only the same idea. */
export const OFFICE_LIVE_SLOT = '<div class="office-live" data-live="1"></div>';

/** The canvas every office layer is drawn on (docs/art/SPRITES.md 8.1). */
export const OFFICE_CANVAS = { width: 1672, height: 941 };

export interface OfficeLayer {
  /** The sprite key, which is the file name in public/sprites. */
  key: string;
  /** What a flat placeholder rectangle says while the art is not there yet. */
  name: string;
  /** The catalogue line that has to be bought before this layer is in the room. Null for the
   *  room itself, which is there from the first morning (CLAUDE.md T7 3.8). */
  needs: string | null;
}

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

export interface OfficeLitLayer {
  /** The sprite key, which is the file name in public/sprites. */
  key: string;
  name: string;
  /** The region whose pointer lights it. */
  region: string;
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

export interface OfficeRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The clock is the live clock and opens nothing (docs/art/SPRITES.md 8.2). */
  opens: boolean;
  /** The catalogue line that has to be bought before this region does anything. Null for the
   *  door, the clock and the whiteboard, which are the room itself (CLAUDE.md T7 3.8). */
  needs?: string | null;
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

export interface OfficeTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pixels at scale 1. The stack's own scale carries it from there. */
  fontSize: number;
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

export interface Viewport {
  width: number;
  height: number;
}

/** The one scale value: the biggest the whole canvas can be drawn without cropping it. */
export function officeScale(viewport: Viewport): number {
  return Math.min(
    viewport.width / OFFICE_CANVAS.width,
    viewport.height / OFFICE_CANVAS.height,
  );
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function boxStyle(box: { x: number; y: number; width: number; height: number }): string {
  return `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px`;
}

/** One layer: the delivered PNG, or a flat rectangle with the layer's name on it so the room is
 *  usable and testable before the art side has delivered (CLAUDE.md T4 3.1). */
function layerHtml(layer: OfficeLayer, index: number, files: readonly string[]): string {
  const url = pickSprite(files, layer.key);
  if (url !== null) {
    return (
      `<img class="office-layer" data-layer="${layer.key}" src="${url}" alt="" ` +
      'draggable="false" />'
    );
  }
  return (
    `<div class="office-layer office-placeholder office-placeholder-${index + 1}" ` +
    `data-layer="${layer.key}"><span>${escapeText(layer.name)}</span></div>`
  );
}

/** The label of a region: a handwritten pill with the region's name from the table, a child of
 *  the region every time and shown by the stylesheet alone while the pointer is on it, so the
 *  room's markup never changes with the pointer (CLAUDE.md T14 2.2, T9 3.4). */
function labelHtml(region: OfficeRegion): string {
  return `<span class="office-label">${escapeText(region.name)}</span>`;
}

/** A region is a transparent rectangle over the artwork: no frame, no button drawn on the room.
 *  The pointer on it lights the thing and names it, in CSS (CLAUDE.md T14 2.2). The catalogue on
 *  the floor is the one exception: there is no artwork under it, so the game draws the object
 *  itself with the word Equipment on its cover (CLAUDE.md T7 3.8). */
function regionHtml(
  region: OfficeRegion,
  onTheFloor: boolean,
  files: readonly string[],
): string {
  const style = boxStyle(region);
  const label = labelHtml(region);
  if (!region.opens) {
    return (
      `<div class="office-region is-quiet" data-office="${region.id}" style="${style}">` +
      `${label}</div>`
    );
  }
  if (region.id === COMPANY_BOARD) {
    // The painted board when the art side has delivered it, the drawn one while it has not
    // (SPRITES.md 11; PIOTR, 14.09: the drawn square goes once the picture is there).
    const url = pickSprite(files, COMPANY_BOARD_SPRITE);
    if (url !== null) {
      return (
        '<button class="office-region office-company-board is-art" data-do="officeRegion" ' +
        `data-office="${region.id}" style="${style}">` +
        `<img class="office-floor-art" data-sprite="${COMPANY_BOARD_SPRITE}" src="${url}" ` +
        `alt="" draggable="false" />${label}</button>`
      );
    }
    return (
      '<button class="office-region office-company-board" data-do="officeRegion" ' +
      `data-office="${region.id}" style="${style}">` +
      `<span>How the company is doing</span>${label}</button>`
    );
  }
  if (region.id === 'catalogue') {
    // The same book on the floor before the desk and on the desk after it (PIOTR, 14.09): the
    // loader first, the drawn object second, exactly as a machine is drawn in the hall
    // (CLAUDE.md T3 3.6, T8 3.7). With the picture there is no drawn box under it.
    const url = pickSprite(files, FLOOR_CATALOGUE_SPRITE);
    if (url !== null) {
      return (
        `<button class="office-region office-floor-catalogue is-art${onTheFloor ? '' : ' on-desk'}" ` +
        `data-do="officeRegion" data-office="${region.id}" ` +
        `style="${style}"><img class="office-floor-art" data-sprite="${FLOOR_CATALOGUE_SPRITE}" ` +
        `src="${url}" alt="" draggable="false" />${label}</button>`
      );
    }
    if (onTheFloor) {
      return (
        '<button class="office-region office-floor-catalogue" data-do="officeRegion" ' +
        `data-office="${region.id}" style="${style}">` +
        `<span>Equipment</span>${label}</button>`
      );
    }
  }
  return (
    `<button class="office-region" data-do="officeRegion" data-office="${region.id}" ` +
    `style="${style}">${label}</button>`
  );
}

/** A lit overlay, over the room only while the pointer is on its region, which the stylesheet
 *  does off the stack's data-lit and the region's own pointer state (CLAUDE.md T14 2.2). */
function litHtml(layer: OfficeLitLayer, files: readonly string[]): string {
  const url = pickSprite(files, layer.key);
  if (url === null) return '';
  return (
    `<img class="office-layer office-lit" data-layer="${layer.key}" data-lit="${layer.region}" ` +
    `src="${url}" alt="" draggable="false" />`
  );
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
    `viewBox="${round(left)} ${round(top)} ${round(sheet.cellWidth / SPRITE_SCALE)} ` +
    `${round(sheet.cellHeight / SPRITE_SCALE)}" aria-hidden="true">${art}</svg>`
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

/** The scale the renderer works out is taken from the window, because the room has to be drawn
 *  before it can be measured. Once it is on the page its own box is the authority, so the scale is
 *  re-taken from it: no copy of the stylesheet's numbers can then be wrong. In a headless DOM the
 *  box measures zero and the computed value stands. */
export function fitOfficeStack(page: ParentNode): void {
  const room = page.querySelector('.office-room');
  const stack = room === null ? null : room.querySelector('.office-stack');
  if (!(room instanceof HTMLElement) || !(stack instanceof HTMLElement)) return;
  const box = room.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return;
  const scale = round(officeScale({ width: box.width, height: box.height }));
  if (stack.dataset.scale === String(scale)) return;
  stack.dataset.scale = String(scale);
  stack.style.transform = `translate(-50%,-50%) scale(${scale})`;
}

/** The room in two pieces: the shell with the three pictures and the seven regions, which is
 *  built once and kept, and the live text, which is written again every minute. The pictures are
 *  megabytes and the stack's scale is corrected from its own box once it is on the page, so
 *  rebuilding the room every game minute made it blink and jump once a second.
 *
 *  `files` is what the art side has delivered. It is a parameter so a test can ask what the room
 *  looks like before the art arrives, which is what the placeholders are for (T4 3.1). */
export function officeScene(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): Scene {
  const scale = round(officeScale(viewport));
  const layers = officeLayersOf(state);
  const lit = officeLitLayersOf(files);
  const regions = officeRegionsOf(state);
  const onTheFloor = !has(state, 'desk');
  // Neither the scale nor the viewport belongs in the key: the stack is scaled by a style the
  // renderer writes once and fitOfficeStack corrects on the page, so a resize does not need the
  // pictures loaded again. What the room has in it does belong in it: buying the desk puts a
  // whole layer into the room (CLAUDE.md T7 3.8).
  const key = [
    'office',
    layers.map((layer) => pickSprite(files, layer.key) ?? layer.key).join(','),
    regions.map((region) => region.id).join(','),
    // The floor catalogue is a picture of its own: delivering it rebuilds the room once.
    onTheFloor ? pickSprite(files, FLOOR_CATALOGUE_SPRITE) ?? 'drawn' : '',
    // So is every lit overlay (CLAUDE.md T14 2.2).
    lit.map((layer) => layer.key).join(','),
  ].join('|');
  // The lit overlays go over the background and under the desk and the laptop, which stand in
  // front of the door; the stack says which regions have one, so the stylesheet can drop the
  // light spot on those (CLAUDE.md T14 2.2).
  const [background, ...furniture] = layers;
  const litRegions = lit.map((layer) => layer.region).join(' ');
  return {
    key,
    shell: () =>
      `<div class="office-room" data-scene="${key}">` +
      `<div class="office-stack" data-scale="${scale}"` +
      `${litRegions === '' ? '' : ` data-lit="${litRegions}"`} ` +
      `style="width:${OFFICE_CANVAS.width}px;height:${OFFICE_CANVAS.height}px;` +
      `transform:translate(-50%,-50%) scale(${scale})">` +
      (background === undefined ? '' : layerHtml(background, 0, files)) +
      lit.map((layer) => litHtml(layer, files)).join('') +
      furniture.map((layer, index) => layerHtml(layer, index + 1, files)).join('') +
      regions.map((region) => regionHtml(region, onTheFloor, files)).join('') +
      OFFICE_LIVE_SLOT +
      '</div></div>',
    live: liveText(state, files),
  };
}

/** The room as one string, for a caller that just wants the markup. */
export function renderOffice(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): string {
  const scene = officeScene(state, viewport, files);
  return scene
    .shell()
    .replace(OFFICE_LIVE_SLOT, `<div class="office-live" data-live="1">${scene.live}</div>`);
}
