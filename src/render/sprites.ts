// The sprite loader. No sprite is drawn in code: this hands back the URL of a PNG the art side
// delivered, or nothing, and the caller falls back to the placeholder box (CLAUDE.md T3 3.6).
//
// Where a sprite goes on screen is fixed by docs/art/SPRITES.md: 2x art, one screen tile of
// 96 by 48 in the file, 8 px of transparent padding on every side, and the anchor at the bottom
// corner of the footprint diamond.

import manifest from '../../public/sprites/manifest.json';
import { TILE_HEIGHT, TILE_RISE, TILE_WIDTH, tileToScreen } from './iso';

/** Sprites are delivered at twice the screen size and the loader halves them. */
export const SPRITE_SCALE = 2;
/** Transparent padding on every side of the file, in file pixels (docs/art/SPRITES.md 2). */
export const SPRITE_PADDING = 8;
/** Where Vite serves the folder from. */
export const SPRITE_DIR = '/sprites';

const DELIVERED: string[] = manifest;

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
  return DELIVERED.slice().sort((left, right) => left.localeCompare(right));
}

/** The class file first, then the family file, then nothing (docs/art/SPRITES.md 3). Kept pure so
 *  a test can ask the question of a list of files that is not the one on disk. */
export function pickSprite(
  files: readonly string[],
  spriteKey: string,
  tier?: string | null,
): string | null {
  if (typeof tier === 'string' && tier !== '') {
    const tiered = `${spriteKey}.${tier}.png`;
    if (files.includes(tiered)) return `${SPRITE_DIR}/${tiered}`;
  }
  const plain = `${spriteKey}.png`;
  return files.includes(plain) ? `${SPRITE_DIR}/${plain}` : null;
}

/** The URL to draw this object with, or null while there is no file for it. */
export function spriteUrl(spriteKey: string, tier?: string | null): string | null {
  return pickSprite(DELIVERED, spriteKey, tier);
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

/** Where the image goes: halved, with its anchor pixel on the bottom corner of the footprint. */
export function spriteBox(
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
): SpriteBox {
  const file = spriteFileSize(width, depth, height);
  const box = { width: file.width / SPRITE_SCALE, height: file.height / SPRITE_SCALE };
  const padding = SPRITE_PADDING / SPRITE_SCALE;
  // The lowest point of the floor outline, which is the corner furthest from the camera's left.
  const anchor = tileToScreen(x + width, y + depth);
  return {
    x: anchor.x - box.width / 2,
    y: anchor.y - (box.height - padding),
    width: box.width,
    height: box.height,
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
