// The office is a room, not a desk. Three photoreal layers on one 1672 by 941 canvas, scaled to
// whatever room the page has under the top bar and centred, with the click regions and the live
// text laid over them in canvas coordinates (docs/art/SPRITES.md 8).
//
// One scale value carries the stack, the regions and the text, so nothing can drift out of line.
// The hall stays isometric; the two views never share a screen.

import { formatTime } from '../engine/clock';
import { has } from '../engine/machines';
import { companyTotals } from '../engine/reputation';
import type { GameState } from '../engine/types';
import { type Scene, escapeText, fitName } from './hall';
import { pickSprite, spriteFiles } from './sprites';

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

/** The rectangles of docs/art/SPRITES.md 8.2, in canvas pixels before any scaling. */
export const OFFICE_REGIONS: OfficeRegion[] = [
  { id: 'workPlan', name: 'Work Plan board', x: 20, y: 10, width: 365, height: 515, opens: true },
  // The order board is the management software's, so it wants the laptop the software runs on
  // (CLAUDE.md T7 3.8).
  {
    id: 'orders',
    name: 'Orders board',
    x: 1290,
    y: 20,
    width: 372,
    height: 500,
    opens: true,
    needs: 'laptop',
  },
  { id: 'door', name: 'Door to the hall', x: 640, y: 15, width: 305, height: 585, opens: true },
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
    name: 'Equipment catalogue',
    x: 60,
    y: 680,
    width: 445,
    height: 210,
    opens: true,
  },
  {
    id: 'binder',
    name: 'Accounting binder',
    x: 1170,
    y: 620,
    width: 435,
    height: 280,
    opens: true,
    needs: 'desk',
  },
  // The free wall right of the door (PIOTR, 13.09; CLAUDE.md T9 3.10). It is the room's own
  // board, like the Work Plan: it needs nothing bought before it says how the company is doing.
  {
    id: 'company',
    name: 'Company board',
    // Flat on the rear wall between the door and the corner, under the clock (which sits at
    // y 88..146), square like the picture (PIOTR, 14.09: not in the corner, on the wall).
    x: 1000,
    y: 168,
    width: 280,
    height: 280,
    opens: true,
  },
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
      ? { ...region, ...FLOOR_CATALOGUE, name: 'Equipment catalogue, on the floor' }
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
  // The pinned sheet of the felt board, in office canvas pixels: the board region is 280 square
  // at (1000, 168) and the sheet sits at 19.4% to 80.6% across it and 40.7% to 80.9% down it
  // (docs/art/SPRITES.md 11). The wall board carries the two totals and nothing else
  // (PIOTR, 15.09; CLAUDE.md T11 3.5).
  companyTotals: { x: 1054, y: 282, width: 172, height: 113, fontSize: 18 },
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

/** A region is a transparent rectangle over the artwork: no frame, no button drawn on the room.
 *  Hover lightens it and shows the name (docs/art/SPRITES.md 8.2). The catalogue on the floor is
 *  the one exception: there is no artwork under it, so the game draws the object itself with the
 *  word Equipment on its cover (CLAUDE.md T7 3.8). */
function regionHtml(
  region: OfficeRegion,
  onTheFloor: boolean,
  files: readonly string[],
): string {
  const style = boxStyle(region);
  if (!region.opens) {
    return `<div class="office-region is-quiet" data-office="${region.id}" style="${style}"></div>`;
  }
  if (region.id === COMPANY_BOARD) {
    // The painted board when the art side has delivered it, the drawn one while it has not
    // (SPRITES.md 11; PIOTR, 14.09: the drawn square goes once the picture is there).
    const url = pickSprite(files, COMPANY_BOARD_SPRITE);
    if (url !== null) {
      return (
        '<button class="office-region office-company-board is-art" data-do="officeRegion" ' +
        `data-office="${region.id}" title="${escapeText(region.name)}" style="${style}">` +
        `<img class="office-floor-art" data-sprite="${COMPANY_BOARD_SPRITE}" src="${url}" ` +
        'alt="" draggable="false" /></button>'
      );
    }
    return (
      '<button class="office-region office-company-board" data-do="officeRegion" ' +
      `data-office="${region.id}" title="${escapeText(region.name)}" style="${style}">` +
      '<span>How the company is doing</span></button>'
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
        `data-do="officeRegion" data-office="${region.id}" title="${escapeText(region.name)}" ` +
        `style="${style}"><img class="office-floor-art" data-sprite="${FLOOR_CATALOGUE_SPRITE}" ` +
        `src="${url}" alt="" draggable="false" /></button>`
      );
    }
    if (onTheFloor) {
      return (
        '<button class="office-region office-floor-catalogue" data-do="officeRegion" ' +
        `data-office="${region.id}" title="${escapeText(region.name)}" style="${style}">` +
        '<span>Equipment</span></button>'
      );
    }
  }
  return (
    `<button class="office-region" data-do="officeRegion" data-office="${region.id}" ` +
    `title="${escapeText(region.name)}" style="${style}"></button>`
  );
}

/** The clock and the company name, drawn by the game over the blank areas of the artwork. */
function liveText(state: GameState): string {
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
    `<span data-total="output">${escapeText(totals.output)}</span></span>`
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
  ].join('|');
  return {
    key,
    shell: () =>
      `<div class="office-room" data-scene="${key}">` +
      `<div class="office-stack" data-scale="${scale}" ` +
      `style="width:${OFFICE_CANVAS.width}px;height:${OFFICE_CANVAS.height}px;` +
      `transform:translate(-50%,-50%) scale(${scale})">` +
      layers.map((layer, index) => layerHtml(layer, index, files)).join('') +
      regions.map((region) => regionHtml(region, onTheFloor, files)).join('') +
      OFFICE_LIVE_SLOT +
      '</div></div>',
    live: liveText(state),
    notes: '',
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
