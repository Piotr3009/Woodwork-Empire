// A room is a photoreal picture the player walks into: layers on one 1672 by 941 canvas, scaled
// to whatever room the page has under the top bar and centred, with the click regions and the
// live text laid over them in canvas coordinates (docs/art/SPRITES.md 8).
//
// One scale value carries the stack, the regions and the text, so nothing can drift out of line.
// The office was the only such room until Turn 23, when the canteen became the second one, so
// everything both of them do lives here and each room is a table of layers, of regions and of
// whatever text it writes over them (CLAUDE.md T23 2.9). The hall stays isometric; no two of the
// three views ever share a screen.
//
// The markup keeps the office's own class names and its `data-office` hook. They are the name the
// stylesheet gives this family of screen and the name `officeRegion` gives the one click handler,
// and a room that wore a second set of them would be a second code path for the same thing.

import { type Scene, escapeText } from './hall';
import { pickSprite } from './sprites';

/** The empty element a room's shell leaves for its live text. The hall's slot is an SVG group and
 *  a room is HTML, so the two are not the same element, only the same idea. */
export const ROOM_LIVE_SLOT = '<div class="office-live" data-live="1"></div>';

/** The canvas every room layer is drawn on (docs/art/SPRITES.md 8.1). Both rooms are painted on
 *  it, so there is one canvas in the game and not one a room. */
export const ROOM_CANVAS = { width: 1672, height: 941 };

export interface RoomLayer {
  /** The sprite key, which is the file name in public/sprites. */
  key: string;
  /** What a flat placeholder rectangle says while the art is not there yet. */
  name: string;
  /** The catalogue line that has to be bought before this layer is in the room. Null for a layer
   *  the room has from the first morning (CLAUDE.md T7 3.8). */
  needs: string | null;
}

export interface RoomLitLayer {
  /** The sprite key, which is the file name in public/sprites. */
  key: string;
  name: string;
  /** The region whose pointer lights it. */
  region: string;
  /** The layer it is painted over, by key. Left out it goes over the first layer, which is the
   *  room itself: that is where the office's lit door belongs, because the door is painted into
   *  the background. The canteen's lit lockers are a lit copy of the locker bank, so they go over
   *  the bank and under the table that stands in front of it (CLAUDE.md T23 2.9). */
  over?: string;
}

export interface RoomRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** A region that opens something is a button; one that opens nothing is quiet, like the
   *  office's clock and the canteen's kitchenette (docs/art/SPRITES.md 8.2). */
  opens: boolean;
  /** The catalogue line that has to be bought before this region does anything. Null or left out
   *  for a region that is the room itself (CLAUDE.md T7 3.8). */
  needs?: string | null;
}

export interface RoomTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pixels at scale 1. The stack's own scale carries it from there. */
  fontSize: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** The one scale value: the biggest the whole canvas can be drawn without cropping it. */
export function roomScale(viewport: Viewport): number {
  return Math.min(viewport.width / ROOM_CANVAS.width, viewport.height / ROOM_CANVAS.height);
}

/** Four decimal places, so the same viewport always writes the same style string and a render
 *  that changed nothing changes no markup. */
export function roundScale(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function boxStyle(box: { x: number; y: number; width: number; height: number }): string {
  return `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px`;
}

/** One layer: the delivered PNG, or a flat rectangle with the layer's name on it so the room is
 *  usable and testable before the art side has delivered (CLAUDE.md T4 3.1). There are three
 *  placeholder colours in the stylesheet and a room may have more layers than that, so a fourth
 *  layer starts the three again rather than falling through to no colour at all. */
export function layerHtml(layer: RoomLayer, index: number, files: readonly string[]): string {
  const url = pickSprite(files, layer.key);
  if (url !== null) {
    return (
      `<img class="office-layer" data-layer="${layer.key}" src="${url}" alt="" ` +
      'draggable="false" />'
    );
  }
  return (
    `<div class="office-layer office-placeholder office-placeholder-${(index % 3) + 1}" ` +
    `data-layer="${layer.key}"><span>${escapeText(layer.name)}</span></div>`
  );
}

/** A lit overlay, over the room only while the pointer is on its region, which the stylesheet
 *  does off the stack's data-lit and the region's own pointer state (CLAUDE.md T14 2.2). */
export function litHtml(layer: RoomLitLayer, files: readonly string[]): string {
  const url = pickSprite(files, layer.key);
  if (url === null) return '';
  return (
    `<img class="office-layer office-lit" data-layer="${layer.key}" data-lit="${layer.region}" ` +
    `src="${url}" alt="" draggable="false" />`
  );
}

/** The label of a region: a handwritten pill with the region's name from the table, a child of
 *  the region every time and shown by the stylesheet alone while the pointer is on it, so the
 *  room's markup never changes with the pointer (CLAUDE.md T14 2.2, T9 3.4). */
function labelHtml(region: RoomRegion): string {
  return `<span class="office-label">${escapeText(region.name)}</span>`;
}

/** What a room wants drawn inside one of its regions, over and above the transparent rectangle
 *  every region is: the office draws its company board and its floor catalogue this way, because
 *  there is no artwork under either of them until the art side paints one. */
export interface RegionDressing {
  /** Class names added to the region, beside `office-region`. */
  classes?: string;
  /** Markup put inside the region, before its label. */
  inside?: string;
}

export type RegionDresser = (
  region: RoomRegion,
  files: readonly string[],
) => RegionDressing | null;

/** A region is a transparent rectangle over the artwork: no frame, no button drawn on the room.
 *  The pointer on it lights the thing and names it, in CSS (CLAUDE.md T14 2.2). */
export function regionHtml(
  region: RoomRegion,
  files: readonly string[],
  dress?: RegionDresser,
): string {
  const style = boxStyle(region);
  const label = labelHtml(region);
  if (!region.opens) {
    return (
      `<div class="office-region is-quiet" data-office="${region.id}" style="${style}">` +
      `${label}</div>`
    );
  }
  const dressing = dress === undefined ? null : dress(region, files);
  const classes = dressing?.classes ?? '';
  const inside = dressing?.inside ?? '';
  return (
    `<button class="office-region${classes === '' ? '' : ` ${classes}`}" ` +
    `data-do="officeRegion" data-office="${region.id}" ` +
    `style="${style}">${inside}${label}</button>`
  );
}

/** The scale the renderer works out is taken from the window, because the room has to be drawn
 *  before it can be measured. Once it is on the page its own box is the authority, so the scale is
 *  re-taken from it: no copy of the stylesheet's numbers can then be wrong. In a headless DOM the
 *  box measures zero and the computed value stands. */
export function fitRoomStack(page: ParentNode): void {
  const room = page.querySelector('.office-room');
  const stack = room === null ? null : room.querySelector('.office-stack');
  if (!(room instanceof HTMLElement) || !(stack instanceof HTMLElement)) return;
  const box = room.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return;
  const scale = roundScale(roomScale({ width: box.width, height: box.height }));
  if (stack.dataset.scale === String(scale)) return;
  stack.dataset.scale = String(scale);
  stack.style.transform = `translate(-50%,-50%) scale(${scale})`;
}

/** Everything one room is: what it is called, what it is made of this morning, and what the game
 *  writes over it every minute. */
export interface RoomView {
  /** The room's own name, which starts its scene key and tells the page which room it is on. */
  name: string;
  /** The layers the room has this morning, back to front. */
  layers: RoomLayer[];
  /** The lit overlays the art side has delivered for it. */
  lit: RoomLitLayer[];
  /** The regions the room has this morning. */
  regions: RoomRegion[];
  /** The live text, written again every render. */
  live: string;
  /** Anything else that, when it changes, means the shell has to be built again. */
  keyExtra?: readonly string[];
  /** What the room draws inside a region of its own, if it draws anything. */
  dress?: RegionDresser;
}

/** The room in two pieces: the shell with its pictures and its regions, which is built once and
 *  kept, and the live text, which is written again every render. The pictures are megabytes and
 *  the stack's scale is corrected from its own box once it is on the page, so rebuilding the room
 *  every game minute made it blink and jump once a second.
 *
 *  `files` is what the art side has delivered. It is a parameter so a test can ask what the room
 *  looks like before the art arrives, which is what the placeholders are for (T4 3.1). */
export function roomScene(view: RoomView, viewport: Viewport, files: readonly string[]): Scene {
  const scale = roundScale(roomScale(viewport));
  // Neither the scale nor the viewport belongs in the key: the stack is scaled by a style the
  // renderer writes once and fitRoomStack corrects on the page, so a resize does not need the
  // pictures loaded again. What the room has in it does belong in it: buying the desk puts a
  // whole layer into the office (CLAUDE.md T7 3.8).
  const key = [
    view.name,
    view.layers.map((layer) => pickSprite(files, layer.key) ?? layer.key).join(','),
    view.regions.map((region) => region.id).join(','),
    ...(view.keyExtra ?? []),
    // Every lit overlay is a picture of its own: delivering one rebuilds the room once
    // (CLAUDE.md T14 2.2).
    view.lit.map((layer) => layer.key).join(','),
  ].join('|');
  const first = view.layers[0];
  // A lit overlay goes directly over the layer it lights and under everything in front of that,
  // so the canteen's lit lockers are not buried under the locker bank they are a copy of.
  const stacked = view.layers
    .map((layer, index) => {
      const over = view.lit.filter((entry) =>
        entry.over === undefined ? layer.key === first?.key : entry.over === layer.key,
      );
      return layerHtml(layer, index, files) + over.map((entry) => litHtml(entry, files)).join('');
    })
    .join('');
  // The stack says which regions have a lit overlay, so the stylesheet can drop the soft light
  // spot on those and show the painted overlay instead (CLAUDE.md T14 2.2).
  const litRegions = view.lit.map((layer) => layer.region).join(' ');
  return {
    key,
    shell: () =>
      `<div class="office-room" data-room-view="${view.name}" data-scene="${key}">` +
      `<div class="office-stack" data-scale="${scale}"` +
      `${litRegions === '' ? '' : ` data-lit="${litRegions}"`} ` +
      `style="width:${ROOM_CANVAS.width}px;height:${ROOM_CANVAS.height}px;` +
      `transform:translate(-50%,-50%) scale(${scale})">` +
      stacked +
      view.regions.map((region) => regionHtml(region, files, view.dress)).join('') +
      ROOM_LIVE_SLOT +
      '</div></div>',
    live: view.live,
  };
}

/** A room as one string, for a caller that just wants the markup. */
export function renderRoom(scene: Scene): string {
  return scene
    .shell()
    .replace(ROOM_LIVE_SLOT, `<div class="office-live" data-live="1">${scene.live}</div>`);
}
