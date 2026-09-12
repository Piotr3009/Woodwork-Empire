// The office is a room, not a desk. Three photoreal layers on one 1672 by 941 canvas, scaled to
// whatever room the page has under the top bar and centred, with the click regions and the live
// text laid over them in canvas coordinates (docs/art/SPRITES.md 8).
//
// One scale value carries the stack, the regions and the text, so nothing can drift out of line.
// The hall stays isometric; the two views never share a screen.

import { formatTime } from '../engine/clock';
import type { GameState } from '../engine/types';
import { escapeText } from './hall';
import { pickSprite, spriteFiles } from './sprites';

/** The canvas every office layer is drawn on (docs/art/SPRITES.md 8.1). */
export const OFFICE_CANVAS = { width: 1672, height: 941 };

export interface OfficeLayer {
  /** The sprite key, which is the file name in public/sprites. */
  key: string;
  /** What a flat placeholder rectangle says while the art is not there yet. */
  name: string;
}

/** Back to front (docs/art/SPRITES.md 8.1). */
export const OFFICE_LAYERS: OfficeLayer[] = [
  { key: 'officeBackground', name: 'Office background' },
  { key: 'officeDesk', name: 'Office desk' },
  { key: 'officeLaptop', name: 'Office laptop' },
];

export interface OfficeRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The clock is the live clock and opens nothing (docs/art/SPRITES.md 8.2). */
  opens: boolean;
}

/** The rectangles of docs/art/SPRITES.md 8.2, in canvas pixels before any scaling. */
export const OFFICE_REGIONS: OfficeRegion[] = [
  { id: 'workPlan', name: 'Work Plan board', x: 20, y: 10, width: 365, height: 515, opens: true },
  { id: 'orders', name: 'Orders board', x: 1290, y: 20, width: 372, height: 500, opens: true },
  { id: 'door', name: 'Door to the hall', x: 640, y: 15, width: 305, height: 585, opens: true },
  { id: 'clock', name: 'Clock', x: 1040, y: 88, width: 122, height: 58, opens: false },
  { id: 'laptop', name: 'Laptop', x: 558, y: 449, width: 557, height: 443, opens: true },
  {
    id: 'catalogue',
    name: 'Equipment catalogue',
    x: 60,
    y: 680,
    width: 445,
    height: 210,
    opens: true,
  },
  { id: 'binder', name: 'Accounting binder', x: 1170, y: 620, width: 435, height: 280, opens: true },
];

export interface OfficeTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pixels at scale 1. The stack's own scale carries it from there. */
  fontSize: number;
}

/** The two texts the artwork leaves blank for the game to fill (docs/art/SPRITES.md 8.3). */
export const OFFICE_TEXTS: Record<'clock' | 'company', OfficeTextBox> = {
  clock: { x: 1050, y: 96, width: 102, height: 40, fontSize: 28 },
  company: { x: 200, y: 92, width: 170, height: 46, fontSize: 22 },
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
 *  Hover lightens it and shows the name (docs/art/SPRITES.md 8.2). */
function regionHtml(region: OfficeRegion): string {
  const style = boxStyle(region);
  if (!region.opens) {
    return `<div class="office-region is-quiet" data-office="${region.id}" style="${style}"></div>`;
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
  return (
    `<span class="office-clock" data-office-text="clock" ` +
    `style="${boxStyle(clock)};font-size:${clock.fontSize}px">` +
    `${escapeText(formatTime(state.clock.minute))}</span>` +
    `<span class="office-company" data-office-text="company" ` +
    `style="${boxStyle(company)};font-size:${company.fontSize}px">` +
    `${escapeText(state.companyName)}</span>`
  );
}

/** `files` is what the art side has delivered. It is a parameter so a test can ask what the room
 *  looks like before the art arrives, which is what the placeholders are for (T4 3.1). */
export function renderOffice(
  state: GameState,
  viewport: Viewport,
  files: readonly string[] = spriteFiles(),
): string {
  const scale = round(officeScale(viewport));
  return (
    '<div class="office-room">' +
    `<div class="office-stack" data-scale="${scale}" ` +
    `style="width:${OFFICE_CANVAS.width}px;height:${OFFICE_CANVAS.height}px;` +
    `transform:translate(-50%,-50%) scale(${scale})">` +
    OFFICE_LAYERS.map((layer, index) => layerHtml(layer, index, files)).join('') +
    OFFICE_REGIONS.map(regionHtml).join('') +
    liveText(state) +
    '</div></div>'
  );
}
