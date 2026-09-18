// The figures in the hall, drawn from the sheets the art side delivers (PIOTR, 13.09: "the joiner
// walks"; CLAUDE.md T9 3.13).
//
// A sheet is a PNG of cells and a JSON of numbers beside it, both named for the role and the
// animation: character.joiner.walk.sheet.png and character.joiner.walk.json. The numbers cannot be
// fetched at render time, so the build gathers every one of them into public/sprites/characters
// .json, which is imported here the way the sprite manifest is.
//
// The contract, which is the same idea as docs/art/SPRITES.md 2 for an object: the sheet is at 2x
// like every sprite and the loader halves it; one row is one direction and one column is one
// frame; the anchor is where the figure's feet are inside a cell, and it goes on the figure's tile
// point. A direction the sheet has no row for is mirrored from its opposite with a horizontal
// flip. No sheet, or no animation, and the game draws the capsule it has always drawn.

import sheets from '../../public/sprites/characters.json';
import { WALK_CELLS_PER_SECOND, WALK_STRIDE_METRES } from '../engine/constants';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_PHONE,
  STATION_RACK,
  stationPlaceAt,
  stationSecondAt,
} from '../engine/stations';
import { pickSprite, spriteFiles, SPRITE_SCALE } from './sprites';

/** The four ways a figure can face on a 2:1 isometric floor. */
export type Facing = 'sw' | 'se' | 'nw' | 'ne';

/** What a figure can be doing: every state the character system can be in has a frame key
 *  (CLAUDE.md T9 3.13, T13 3.23). `home` is the figure going home at the end of the day; no
 *  sheet is wanted for it, so it falls back to idle like any missing frame.
 *  `sweep` is the helper with a broom, whose sheet came in with v28 (CLAUDE.md T20 2.8). */
export type Animation = 'walk' | 'bench' | 'carry' | 'idle' | 'phone' | 'home' | 'sweep';

export const ANIMATIONS: readonly Animation[] = [
  'walk',
  'bench',
  'carry',
  'idle',
  'phone',
  'home',
  'sweep',
];

/** Where a missing direction is mirrored from (CLAUDE.md T9 3.13). */
const MIRROR: Record<Facing, Facing> = { se: 'sw', sw: 'se', nw: 'ne', ne: 'nw' };

/** What a caller may hand the loader instead of what is on disk, so a test can ask what a figure
 *  looks like with a sheet the art side has not delivered yet. */
export interface CharacterOptions {
  files?: readonly string[];
  sheets?: Record<string, CharacterSheet>;
}

/** One animation of one role, as the art side delivers it beside the sheet. Every length is in
 *  file pixels, which are 2x the screen. */
export interface CharacterSheet {
  /** One cell of the sheet. */
  cellWidth: number;
  cellHeight: number;
  /** The figure's feet inside a cell. */
  anchorX: number;
  anchorY: number;
  /** Columns in a row, and how many of them a second are played. */
  frames: number;
  fps: number;
  /** The row each direction is on. A direction that is not here is mirrored from its opposite. */
  rows: Partial<Record<Facing, number>>;
}

const DELIVERED = sheets as Record<string, CharacterSheet>;

/** The key a role and an animation are delivered under. */
export function characterKey(role: string, animation: Animation): string {
  return `character.${role}.${animation}`;
}

/** The sheet for this role and animation, with the URL of its picture, or null while the art side
 *  has not delivered it. Both halves have to be there: numbers without a picture draw nothing. */
export function characterSheet(
  role: string,
  animation: Animation,
  options: CharacterOptions = {},
): { key: string; url: string; sheet: CharacterSheet } | null {
  const key = characterKey(role, animation);
  const table = options.sheets ?? DELIVERED;
  const sheet = table[key];
  if (!sheet) return null;
  const url = pickSprite(options.files ?? spriteFiles(), `${key}.sheet`);
  if (url === null) return null;
  return { key, url, sheet };
}

/** What the figure plays, with the fallbacks of 3.13: the animation asked for, then idle, then
 *  the first frame of walk, then nothing at all and the capsule stands. */
export function playableAnimation(
  role: string,
  wanted: Animation,
  options: CharacterOptions = {},
): { animation: Animation; frozen: boolean } | null {
  if (characterSheet(role, wanted, options) !== null) return { animation: wanted, frozen: false };
  if (characterSheet(role, 'idle', options) !== null) {
    return { animation: 'idle', frozen: false };
  }
  if (characterSheet(role, 'walk', options) !== null) {
    // Frame 0 of the walk, standing still: a figure that is there but has nothing to play.
    return { animation: 'walk', frozen: true };
  }
  return null;
}

/** Which way a figure is facing, from the screen vector of where it is going. World +x runs
 *  down-right on the screen and world +y runs down-left (docs/art/SPRITES.md 1). */
export function facingFromScreen(dx: number, dy: number): Facing {
  if (dy >= 0) return dx >= 0 ? 'se' : 'sw';
  return dx >= 0 ? 'ne' : 'nw';
}

/** The row to draw this direction with, and whether it has to be flipped to get there. Null when
 *  the sheet has neither the row nor the one it mirrors from. */
export function rowFor(sheet: CharacterSheet, facing: Facing): { row: number; flip: boolean } | null {
  const own = sheet.rows[facing];
  if (typeof own === 'number') return { row: own, flip: false };
  const mirrored = sheet.rows[MIRROR[facing]];
  if (typeof mirrored === 'number') return { row: mirrored, flip: true };
  return null;
}

/** The frame this animation is on at this moment of real time, at the sheet's own fps. Real time,
 *  and never game minutes: a man does not walk faster because the clock is at 10x
 *  (CLAUDE.md T9 3.13). A figure on the page plays at the fps written on it, which for the
 *  locomotion sheets is `walkFps` and not the sheet's own (CLAUDE.md T19 2.1). */
export function frameAt(sheet: CharacterSheet, nowMs: number): number {
  if (sheet.frames <= 1 || sheet.fps <= 0) return 0;
  return Math.floor((nowMs / 1000) * sheet.fps) % sheet.frames;
}

/** The animations that carry a man across the floor. They are the only ones whose frame rate is
 *  the floor's and not the sheet's (CLAUDE.md T19 2.1). */
const LOCOMOTION: readonly Animation[] = ['walk', 'carry'];

/** How many frames a second a locomotion sheet plays at, so the feet plant where the floor moves
 *  (PIOTR, 17.09: "they walk like robots"; CLAUDE.md T19 2.1). One full cycle of the sheet is one
 *  stride of `WALK_STRIDE_METRES`, so the cycle has to last exactly as long as the man takes to
 *  cover that much floor: `frames * cells a second / metres a stride`. The sheets were delivered
 *  at 3.4286 fps with no stride at all beside them (docs/art/SPRITES.md 10.5), which at one cell a
 *  second dragged the feet 1.67 times past where they planted. The manifest is not touched: what
 *  is written on the figure is the renderer's, which is what SPRITES.md 10.4 leaves to it. */
export function walkFps(sheet: CharacterSheet, cellsPerSecond = WALK_CELLS_PER_SECOND): number {
  if (sheet.frames <= 1 || WALK_STRIDE_METRES <= 0) return 0;
  return (sheet.frames * cellsPerSecond) / WALK_STRIDE_METRES;
}

/** The fps to write on a figure: the floor's pace for a walk and a carry, the sheet's own for
 *  everything else, and nothing at all for a sheet with nothing to play. */
function fpsFor(sheet: CharacterSheet, animation: Animation, frozen: boolean): number {
  if (frozen) return 0;
  return LOCOMOTION.includes(animation) ? walkFps(sheet) : sheet.fps;
}

/** The view box of one cell of the sheet, in file pixels. */
export function cellBox(sheet: CharacterSheet, row: number, frame: number): string {
  return `${frame * sheet.cellWidth} ${row * sheet.cellHeight} ${sheet.cellWidth} ${sheet.cellHeight}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The figure's art: an image clipped to one cell by a nested view box, anchored at the cell's
 *  anchor on the figure's own tile point and halved like every sprite. Null when there is no
 *  sheet for this role, and the caller draws the capsule (CLAUDE.md T9 3.13). */
export function characterArt(
  role: string,
  wanted: Animation,
  facing: Facing,
  options: CharacterOptions = {},
): string | null {
  const playable = playableAnimation(role, wanted, options);
  if (playable === null) return null;
  const found = characterSheet(role, playable.animation, options);
  if (found === null) return null;
  const { sheet, url } = found;
  const placed = rowFor(sheet, facing);
  if (placed === null) return null;
  const width = sheet.cellWidth / SPRITE_SCALE;
  const height = sheet.cellHeight / SPRITE_SCALE;
  const x = -sheet.anchorX / SPRITE_SCALE;
  const y = -sheet.anchorY / SPRITE_SCALE;
  const inner =
    `<svg class="figure-art" data-character="${role}" data-anim="${playable.animation}" ` +
    `data-facing="${facing}" data-frame="0" data-frames="${sheet.frames}" ` +
    `data-fps="${fpsFor(sheet, playable.animation, playable.frozen)}" data-row="${placed.row}" ` +
    `x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" ` +
    `viewBox="${cellBox(sheet, placed.row, 0)}" preserveAspectRatio="xMidYMid meet">` +
    `<image href="${url}" x="0" y="0" /></svg>`;
  // Mirroring is about the anchor, which is the local origin, so the name under the figure is not
  // in the flipped group and reads the right way round. The group is always there, so turning him
  // round later is one attribute and not a piece of the page built again (CLAUDE.md T9 3.8).
  return `<g class="figure-flip" transform="scale(${placed.flip ? -1 : 1},1)">${inner}</g>`;
}

/** Turns a figure that is already on the page to face this way: the row it draws and the flip its
 *  group carries, and nothing else. */
export function faceCharacter(
  art: Element,
  facing: Facing,
  options: CharacterOptions = {},
): void {
  const role = art.getAttribute('data-character');
  const animation = art.getAttribute('data-anim') as Animation | null;
  if (role === null || animation === null) return;
  if (art.getAttribute('data-facing') === facing) return;
  const found = characterSheet(role, animation, options);
  if (found === null) return;
  const placed = rowFor(found.sheet, facing);
  if (placed === null) return;
  art.setAttribute('data-facing', facing);
  art.setAttribute('data-row', String(placed.row));
  const frame = Number(art.getAttribute('data-frame') ?? '0');
  art.setAttribute('viewBox', cellBox(found.sheet, placed.row, frame));
  const group = art.parentElement;
  if (group !== null && group.classList.contains('figure-flip')) {
    group.setAttribute('transform', `scale(${placed.flip ? -1 : 1},1)`);
  }
}

/** Puts a figure that is already on the page on to another animation: the picture it draws from,
 *  the cell it is clipped to and where that cell sits. Attributes, again, and nothing rebuilt. */
export function setCharacterAnimation(
  art: Element,
  wanted: Animation,
  options: CharacterOptions = {},
): void {
  const role = art.getAttribute('data-character');
  if (role === null) return;
  const playable = playableAnimation(role, wanted, options);
  if (playable === null) return;
  if (art.getAttribute('data-anim') === playable.animation) return;
  const found = characterSheet(role, playable.animation, options);
  if (found === null) return;
  const facing = (art.getAttribute('data-facing') ?? 'sw') as Facing;
  const placed = rowFor(found.sheet, facing);
  if (placed === null) return;
  const { sheet, url } = found;
  // The cycle carries on where it was instead of snapping back to frame 0: a walk that becomes a
  // carry is the same man still walking, and a page written again in the middle of a leg must not
  // be seen to restart him (CLAUDE.md T19 2.1). A sheet with fewer frames wraps into its own.
  const was = Number(art.getAttribute('data-frame') ?? '0');
  const frame = Number.isFinite(was) && sheet.frames > 0 ? Math.abs(Math.trunc(was)) % sheet.frames : 0;
  art.setAttribute('data-anim', playable.animation);
  art.setAttribute('data-frames', String(sheet.frames));
  art.setAttribute('data-fps', String(fpsFor(sheet, playable.animation, playable.frozen)));
  art.setAttribute('data-row', String(placed.row));
  art.setAttribute('data-frame', String(frame));
  art.setAttribute('viewBox', cellBox(sheet, placed.row, frame));
  art.setAttribute('x', String(round(-sheet.anchorX / SPRITE_SCALE)));
  art.setAttribute('y', String(round(-sheet.anchorY / SPRITE_SCALE)));
  art.setAttribute('width', String(round(sheet.cellWidth / SPRITE_SCALE)));
  art.setAttribute('height', String(round(sheet.cellHeight / SPRITE_SCALE)));
  const picture = art.querySelector('image');
  if (picture !== null) picture.setAttribute('href', url);
  const group = art.parentElement;
  if (group !== null && group.classList.contains('figure-flip')) {
    group.setAttribute('transform', `scale(${placed.flip ? -1 : 1},1)`);
  }
}

/** Moves every figure on the page on to the frame this moment of real time asks for. It writes two
 *  attributes on elements that are already there and nothing else: no part of the page is built
 *  again for it (CLAUDE.md T9 3.13, 3.8). */
export function playCharacters(root: ParentNode, nowMs: number): void {
  for (const node of Array.from(root.querySelectorAll('[data-character]'))) {
    const frames = Number(node.getAttribute('data-frames') ?? '0');
    const fps = Number(node.getAttribute('data-fps') ?? '0');
    const row = Number(node.getAttribute('data-row') ?? '0');
    const box = (node.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
    const cellWidth = box[2] ?? 0;
    const cellHeight = box[3] ?? 0;
    if (!Number.isFinite(cellWidth) || cellWidth <= 0) continue;
    const frame =
      frames > 1 && fps > 0 ? Math.floor((nowMs / 1000) * fps) % frames : 0;
    if (node.getAttribute('data-frame') === String(frame)) continue;
    node.setAttribute('data-frame', String(frame));
    node.setAttribute(
      'viewBox',
      `${frame * cellWidth} ${row * cellHeight} ${cellWidth} ${cellHeight}`,
    );
  }
}

/** What a figure at this station is doing, in the words the sheets are named in: at a bench or a
 *  machine he is at the bench, at the rack he is picking sheets (the bench sheet, hands busy), at
 *  the gate he stands, and anywhere else he is standing about. Carrying is not a station: it is
 *  the leg between two of them, and the walker plays it (CLAUDE.md T9 3.13; T16 2.2). A man is
 *  never seen walking on the spot. */
export function animationForStation(station: string): Animation {
  // The second man of a job is at the first man's bench, in its second place: bench work, the
  // same as the man in front of him (CLAUDE.md T17 2.10). So is everybody past him, at his own
  // place along the same side (CLAUDE.md T19 2.5).
  if (station === STATION_BENCH || station.startsWith('machine:')) return 'bench';
  if (stationSecondAt(station) !== null) return 'bench';
  if (stationPlaceAt(station) !== null) return 'bench';
  if (station === STATION_RACK) return 'bench';
  if (station === STATION_GATE) return 'idle';
  // The phone is in his hand for as long as the call lasts, and idle the moment it is down
  // (PIOTR, 15.09; CLAUDE.md T11 3.11).
  if (station === STATION_PHONE) return 'phone';
  return 'idle';
}

/** Whether a leg of a walk carries material: from the pallet to the rack (an unload trip), from
 *  the rack to a machine or a bench (fetching a sheet), or from a machine to a bench (cut parts).
 *  Every other leg is a walk (CLAUDE.md T16 2.2). */
export function legCarries(fromStation: string, toStation: string): boolean {
  const toMachine = toStation.startsWith('machine:');
  const fromMachine = fromStation.startsWith('machine:');
  if (fromStation === STATION_GATE && toStation === STATION_RACK) return true;
  if (fromStation === STATION_RACK && (toMachine || toStation === STATION_BENCH)) return true;
  if (fromMachine && toStation === STATION_BENCH) return true;
  return false;
}
