// The sprite loader. No sprite is drawn in code: this hands back the URL of a PNG the art side
// delivered, or nothing, and the caller falls back to the placeholder box (CLAUDE.md T3 3.6).
//
// Where a sprite goes on screen is fixed by docs/art/SPRITES.md: 2x art, one screen tile of
// 96 by 48 in the file, 8 px of transparent padding on every side, and the anchor at the bottom
// corner of the footprint diamond.

import { deliveredFiles, nextOrientation, orientationsFor, pictureFor } from '../engine/ports';
import type { Clock, Orientation } from '../engine/types';
import { TILE_HEIGHT, TILE_RISE, TILE_WIDTH, tileToScreen } from './iso';

/** Sprites are delivered at twice the screen size and the loader halves them. */
export const SPRITE_SCALE = 2;
/** Transparent padding on every side of the file, in file pixels (docs/art/SPRITES.md 2). */
export const SPRITE_PADDING = 8;
/** Where Vite serves the folder from. */
export const SPRITE_DIR = '/sprites';

/** The file names the art side has delivered. `src/engine/ports.ts` reads the manifest, because
 *  the routing needs to know which turned pictures exist, and the loader takes the same list from
 *  there so the two cannot disagree (CLAUDE.md T22 2.8). */
const DELIVERED: readonly string[] = deliveredFiles();

/** The families whose picture is a Turn 13 placeholder until the art side paints it: the spindle
 *  moulder's five classes (CLAUDE.md T13 1, 3.13; the requests are in docs/art/REQUESTS-T13.md).
 *  The pallet truck was the other until v54 made it a class of the forklift family, whose picture
 *  it now is (PIOTR, 24.09). Everything else with no file falls back to the flat box the hall has
 *  always drawn. */
export const PLACEHOLDER_SPRITES: readonly string[] = ['spindleMoulder'];

/** The placeholder kind for a sprite key and its class, `spindleMoulder.used`, or null when the
 *  family is not one the placeholder function draws. */
export function placeholderKindFor(spriteKey: string, tier?: string | null): string | null {
  if (!PLACEHOLDER_SPRITES.includes(spriteKey)) return null;
  return typeof tier === 'string' && tier !== '' ? `${spriteKey}.${tier}` : spriteKey;
}

export interface SpriteSize {
  width: number;
  height: number;
}

export interface SpriteBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The file names the art side has delivered, sorted. */
export function spriteFiles(): string[] {
  return DELIVERED.slice();
}

/** The orientation's own file first, then the class file, then the family file, then nothing
 *  (docs/art/SPRITES.md 3; CLAUDE.md T22 2.11). Kept pure so a test can ask the question of a list
 *  of files that is not the one on disk. The rule itself is `pictureFor` in
 *  `src/engine/ports.ts`, because the routing has to ask exactly the same question. */
export function pickSprite(
  files: readonly string[],
  spriteKey: string,
  tier?: string | null,
  orientation: Orientation = 0,
): string | null {
  const picture = pictureFor(files, spriteKey, tier, orientation);
  return picture.file === null ? null : `${SPRITE_DIR}/${picture.file}`;
}

/** The orientations this picture can be stood at, and the next one round. The rule itself is
 *  `orientationsFor` and `nextOrientation` in `src/engine/ports.ts`, kept pure so a test can ask it
 *  of a list of files that is not the one on disk; these two ask it of the manifest, which is what
 *  the setup view and the card of a thing on the hall want (CLAUDE.md T22 2.11). */
export function spriteOrientations(spriteKey: string, tier?: string | null): Orientation[] {
  return orientationsFor(DELIVERED, spriteKey, tier);
}

export function nextSpriteOrientation(
  spriteKey: string,
  tier: string | null | undefined,
  orientation: Orientation,
): Orientation {
  return nextOrientation(DELIVERED, spriteKey, tier, orientation);
}

/** True when the hall has to mirror the picture because no file was delivered for this
 *  orientation of this class (CLAUDE.md T10 3.8, T22 2.11). */
export function mirrorNeeded(
  files: readonly string[],
  spriteKey: string,
  tier: string | null | undefined,
  orientation: Orientation,
): boolean {
  return pictureFor(files, spriteKey, tier, orientation).mirrored;
}

/** The URL to draw this object with, or null while there is no file for it. */
export function spriteUrl(
  spriteKey: string,
  tier?: string | null,
  orientation: Orientation = 0,
): string | null {
  return pickSprite(DELIVERED, spriteKey, tier, orientation);
}

/** The canvas the art side draws on, at 2x, before the padding (docs/art/SPRITES.md 2 and 6). */
export function spriteCanvas(width: number, depth: number, height: number): SpriteSize {
  return {
    width: ((width + depth) * TILE_WIDTH * SPRITE_SCALE) / 2,
    height: ((width + depth) * TILE_HEIGHT * SPRITE_SCALE) / 2 + height * TILE_RISE * SPRITE_SCALE,
  };
}

/** What the delivered PNG measures: the canvas plus 8 px of padding on every side. */
export function spriteFileSize(width: number, depth: number, height: number): SpriteSize {
  const canvas = spriteCanvas(width, depth, height);
  return {
    width: canvas.width + SPRITE_PADDING * 2,
    height: canvas.height + SPRITE_PADDING * 2,
  };
}

/** Where the anchor pixel sits inside the image, at the scale the game draws it. The file carries
 *  it at `8 + w x 48` from the left edge and 8 px above the bottom (docs/art/SPRITES.md 2): the
 *  diamond runs `w x 48` to the left of the anchor and `d x 48` to the right of it, so the anchor
 *  is centred in the file only when `w` equals `d`. Corrected 14.09: `spriteBox` centred it, which
 *  stood every 2 by 1 and 3 by 1 machine 12 to 24 px off its tile (CLAUDE.md T10 3.12). The one
 *  rule the hall places a sprite by and the Sprite check page marks. */
export function spriteAnchorIn(width: number, depth: number, height: number): SpriteBox {
  const file = spriteFileSize(width, depth, height);
  return {
    x: (SPRITE_PADDING + width * TILE_WIDTH) / SPRITE_SCALE,
    y: (file.height - SPRITE_PADDING) / SPRITE_SCALE,
    width: file.width / SPRITE_SCALE,
    height: file.height / SPRITE_SCALE,
  };
}

/** Where the image goes: halved, with its anchor pixel on the bottom corner of the footprint. */
export function spriteBox(
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
): SpriteBox {
  const at = spriteAnchorIn(width, depth, height);
  // The lowest point of the floor outline, which is the corner furthest from the camera's left.
  const anchor = tileToScreen(x + width, y + depth);
  return {
    x: anchor.x - at.x,
    y: anchor.y - at.y,
    width: at.width,
    height: at.height,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The image element for an object, sized and placed by the contract. */
export function spriteImage(url: string, box: SpriteBox, extra = ''): string {
  return (
    `<image href="${url}" x="${round(box.x)}" y="${round(box.y)}" ` +
    `width="${round(box.width)}" height="${round(box.height)}" ` +
    `preserveAspectRatio="xMidYMax meet"${extra ? ` ${extra}` : ''} />`
  );
}

/** A machine's working motion drawn in place of its picture: the same box and the same anchor, an
 *  `<svg>` clipped to one cell by its view box over an `<image>` of the whole sheet, exactly as a
 *  man's figure is drawn (`characterArt`, `cellBox`), marked `data-sheet` with its frame, its frames
 *  and its fps, and with the game minutes between two of its loops and the minute of the hour its
 *  loop starts at (v91). Frame 0 is the picture pixel for pixel, so the change is never seen as a
 *  jump (CLAUDE.md T30 2.11). */
export function sheetArt(
  url: string,
  box: SpriteBox,
  sheet: { frames: number; fps: number; frameWidth: number; frameHeight: number; everyMinutes: number; atMinute: number },
  family: string,
): string {
  return (
    `<svg class="machine-sheet" data-sheet="${family}" data-frame="0" data-frames="${sheet.frames}" ` +
    `data-fps="${sheet.fps}" data-every="${sheet.everyMinutes}" data-at="${sheet.atMinute}" ` +
    `x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" ` +
    `height="${round(box.height)}" viewBox="0 0 ${sheet.frameWidth} ${sheet.frameHeight}" ` +
    'preserveAspectRatio="xMidYMax meet">' +
    `<image href="${url}" x="0" y="0" width="${sheet.frameWidth * sheet.frames}" height="${sheet.frameHeight}" />` +
    '</svg>'
  );
}

/** A sheet that has not been on the page for this long in real time (the dinner hour, a pause,
 *  another page, a night) starts again by waiting for its next minute, or by playing if the clock
 *  is on that minute, so the six never all start together when the line comes back [TUNE] (v91). */
export const SHEET_SEEN_GAP_MS = 1000;

/** Where each machine's loop stands, by family: the renderer's own clock, like the walk and the
 *  doors' swing, and not game state (v91). */
interface SheetLoop {
  /** The game's day and minute the sheet was last played at. */
  day: number;
  minute: number;
  /** The real moment it was last played at. */
  seenMs: number;
  /** The real moment its last loop started, or minus infinity before the first. */
  startMs: number;
  /** A minute came while the loop played: one more loop follows on at its end. */
  queued: boolean;
}

const sheetLoops = new Map<string, SheetLoop>();

/** The frame of a sheet at this moment: frame 0, its picture, until the game's clock reaches its
 *  minute of the hour; then one loop at the sheet's own fps, in real time whatever the speed of the
 *  clock; then frame 0 again. A minute that comes while a loop plays makes the next loop follow on
 *  at its end, so from 30x the loops run on with no stop (PIOTR, 11.10; v91). */
function loopFrame(family: string, frames: number, fps: number, every: number, at: number, clock: Clock, nowMs: number): number {
  const loopMs = (frames / fps) * 1000;
  const seen = sheetLoops.get(family);
  if (
    seen === undefined ||
    seen.day !== clock.day ||
    clock.minute < seen.minute ||
    nowMs - seen.seenMs > SHEET_SEEN_GAP_MS ||
    seen.seenMs - nowMs > SHEET_SEEN_GAP_MS
  ) {
    const onItsMinute = (((clock.minute - at) % every) + every) % every === 0;
    const startMs = onItsMinute ? nowMs : Number.NEGATIVE_INFINITY;
    sheetLoops.set(family, { day: clock.day, minute: clock.minute, seenMs: nowMs, startMs, queued: false });
    return 0;
  }
  const due = Math.floor((clock.minute - at) / every) - Math.floor((seen.minute - at) / every);
  seen.minute = clock.minute;
  seen.seenMs = nowMs;
  if (due > 0) {
    if (nowMs - seen.startMs < loopMs) seen.queued = true;
    else seen.startMs = nowMs;
  }
  if (seen.queued && nowMs - seen.startMs >= loopMs) {
    seen.queued = false;
    seen.startMs = nowMs - seen.startMs < 2 * loopMs ? seen.startMs + loopMs : nowMs;
  }
  const elapsed = nowMs - seen.startMs;
  if (!(elapsed >= 0 && elapsed < loopMs)) return 0;
  return Math.floor((elapsed / 1000) * fps) % frames;
}

/** Moves every machine's sheet on the page on to the frame this moment asks for (`loopFrame`). It
 *  writes the frame and the view box on elements already there, only when the frame changes, and
 *  builds nothing; while the clock stands (`clock` null) it holds every sheet where it is, and the
 *  next page written draws the machines from their pictures (CLAUDE.md T30 2.11). Called from the
 *  frame loop beside `playCharacters`, and at the end of every page written, which carries frame 0,
 *  so a sheet never flashes back to it (the figures' cure, `syncFigures`, CLAUDE.md T19 2.1). */
export function playSheets(root: ParentNode, nowMs: number, clock: Clock | null): void {
  if (clock === null) return;
  for (const node of Array.from(root.querySelectorAll('.machine-sheet[data-sheet]'))) {
    const family = node.getAttribute('data-sheet') ?? '';
    const frames = Number(node.getAttribute('data-frames') ?? '0');
    const fps = Number(node.getAttribute('data-fps') ?? '0');
    const every = Number(node.getAttribute('data-every') ?? '0');
    const at = Number(node.getAttribute('data-at') ?? '0');
    const box = (node.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
    const cellWidth = box[2] ?? 0;
    const cellHeight = box[3] ?? 0;
    if (!Number.isFinite(cellWidth) || cellWidth <= 0 || frames <= 1 || fps <= 0) continue;
    if (!Number.isFinite(every) || every <= 0 || !Number.isFinite(at)) continue;
    const frame = loopFrame(family, frames, fps, every, at, clock, nowMs);
    if (node.getAttribute('data-frame') === String(frame)) continue;
    node.setAttribute('data-frame', String(frame));
    node.setAttribute('viewBox', `${frame * cellWidth} 0 ${cellWidth} ${cellHeight}`);
  }
}

/** The soft ellipse the game draws under every object, sprite or box, so nothing floats. A sprite
 *  with its own shadow baked in would give a double one, which is why the contract forbids it. */
export function contactShadow(x: number, y: number, width: number, depth: number): string {
  const centre = tileToScreen(x + width / 2, y + depth / 2);
  const rx = round(((width + depth) * TILE_WIDTH) / 5);
  return (
    `<ellipse class="contact-shadow" cx="${round(centre.x)}" cy="${round(centre.y)}" ` +
    `rx="${rx}" ry="${round(rx / 2)}" />`
  );
}
