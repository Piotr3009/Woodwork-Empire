// The sprite loader: which file an object is drawn with, and where that file goes on screen.
// The maths is the contract in docs/art/SPRITES.md, not an invention of this file.

import { describe, expect, it } from 'vitest';
import {
  SPRITE_PADDING,
  SPRITE_SCALE,
  pickSprite,
  spriteAnchorIn,
  spriteBox,
  spriteCanvas,
  spriteFileSize,
  spriteFiles,
  spriteImage,
  spriteUrl,
} from '../../src/render/sprites';
import { TILE_WIDTH, tileToScreen } from '../../src/render/iso';
import { pickPngs, spriteFilesIn } from '../../scripts/sprites-manifest.mjs';
import manifest from '../../public/sprites/manifest.json';

describe('which file an object is drawn with', () => {
  const files = ['tableSaw.png', 'tableSaw.pro.png', 'workbench.png'];

  it('takes the class file first, then the family file, then nothing', () => {
    expect(pickSprite(files, 'tableSaw', 'pro')).toBe('/sprites/tableSaw.pro.png');
    // No file for this class, so the family one stands in (docs/art/SPRITES.md 3).
    expect(pickSprite(files, 'tableSaw', 'used')).toBe('/sprites/tableSaw.png');
    expect(pickSprite(files, 'tableSaw')).toBe('/sprites/tableSaw.png');
    expect(pickSprite(files, 'workbench', 'standard')).toBe('/sprites/workbench.png');
    // Nothing at all: the caller draws its placeholder box.
    expect(pickSprite(files, 'edgebander', 'standard')).toBeNull();
    expect(pickSprite([], 'tableSaw', 'pro')).toBeNull();
  });

  it('asks the manifest and never the network', () => {
    // The loader knows what has been delivered from the files on disk, through the manifest the
    // build writes, and by no other route.
    expect(spriteFiles()).toEqual(spriteFilesIn('public/sprites'));
    for (const name of spriteFilesIn('public/sprites')) {
      const key = name.replace(/\.png$/i, '');
      expect(spriteUrl(key), key).toBe(`/sprites/${name}`);
    }
    // The classes arrived with Turn 7 and the family file did not: a class file answers for its
    // own class, and the family key on its own still falls back to the box (SPRITES.md 3).
    expect(spriteFilesIn('public/sprites')).not.toContain('tableSaw.png');
    expect(spriteUrl('tableSaw', 'used')).toBe('/sprites/tableSaw.used.png');
    expect(spriteUrl('tableSaw')).toBeNull();
  });
});

describe('the canvas the art side draws on', () => {
  it('matches every line of the first batch in docs/art/SPRITES.md', () => {
    const rows: Array<[string, number, number, number, number, number]> = [
      ['tableSaw', 4, 2, 2, 288, 240],
      ['workbench', 3, 2, 1, 240, 168],
      ['edgebander', 3, 2, 2, 240, 216],
      ['extractor', 2, 2, 3, 192, 240],
      ['sheetRack', 4, 1, 2, 240, 216],
      ['compressor', 2, 2, 1, 192, 144],
      ['desk', 3, 2, 1, 240, 168],
      ['chair', 1, 1, 1, 96, 96],
      ['locker', 1, 1, 2, 96, 144],
      ['roomOffice', 4, 4, 2, 384, 288],
      ['cnc', 5, 3, 2, 384, 288],
      ['sprayBooth', 5, 3, 3, 384, 336],
      ['dustSystem', 3, 3, 4, 288, 336],
      ['pelletiser', 2, 2, 3, 192, 240],
    ];
    for (const [key, width, depth, height, canvasWidth, canvasHeight] of rows) {
      expect(spriteCanvas(width, depth, height), key).toEqual({
        width: canvasWidth,
        height: canvasHeight,
      });
      expect(spriteFileSize(width, depth, height), key).toEqual({
        width: canvasWidth + 16,
        height: canvasHeight + 16,
      });
    }
    expect(SPRITE_SCALE).toBe(2);
    expect(SPRITE_PADDING).toBe(8);
  });
});

describe('where the image goes', () => {
  it('puts a 4 by 2 by 2 saw on its tile, halved, with the anchor on the bottom corner', () => {
    const at = spriteBox(0, 7, 4, 2, 2);
    // 304 by 256 in the file, halved on screen.
    expect(at.width).toBe(152);
    expect(at.height).toBe(128);
    const anchor = tileToScreen(4, 9);
    expect(anchor).toEqual({ x: -120, y: 156 });
    // The anchor pixel of the file goes on that corner: `8 + w x 48` from the left edge and 8 px
    // above the bottom, both halved (docs/art/SPRITES.md 2).
    expect(at.x + (SPRITE_PADDING + 4 * TILE_WIDTH) / SPRITE_SCALE).toBe(anchor.x);
    expect(at.y + at.height - SPRITE_PADDING / SPRITE_SCALE).toBe(anchor.y);
    expect(at).toEqual({ x: -220, y: 32, width: 152, height: 128 });
  });

  it('puts a one tile object on its own tile the same way', () => {
    const at = spriteBox(3, 3, 1, 1, 1);
    expect(at.width).toBe(56);
    expect(at.height).toBe(56);
    const anchor = tileToScreen(4, 4);
    // A square object is the one case where the anchor is the middle of the file, which is why
    // the old centred rule looked right for so long.
    expect(at.x + at.width / 2).toBe(anchor.x);
    expect(at.x + (SPRITE_PADDING + TILE_WIDTH) / SPRITE_SCALE).toBe(anchor.x);
    expect(at.y + at.height - 4).toBe(anchor.y);
  });

  it('stands an asymmetric footprint on its corner and not on the middle of its file', () => {
    // A 3 by 1 object: the diamond runs 3 x 48 left of the anchor and 1 x 48 right of it, so the
    // anchor is 48 px right of the middle of the file at 2x and 24 at 1x. Centring the image put
    // every 2 by 1 and 3 by 1 machine 12 to 24 px off its tile, which is what Piotr saw as
    // machines sinking into the floor (CLAUDE.md T10 3.12).
    const at = spriteBox(5, 2, 3, 1, 1);
    const anchor = tileToScreen(8, 3);
    expect(at.x).toBe(anchor.x - (SPRITE_PADDING + 3 * TILE_WIDTH) / SPRITE_SCALE);
    // The left edge of the image is the halved padding outside the left corner of the diamond.
    const leftCorner = tileToScreen(5, 3);
    expect(at.x).toBe(leftCorner.x - SPRITE_PADDING / SPRITE_SCALE);
    // The centred rule would have drawn it 24 px, `12 x (w - d)`, to the right of that.
    expect(anchor.x - at.width / 2 - at.x).toBe(24);
    // And a 2 by 1 is out by 12, the other end of the range the brief names.
    const two = spriteBox(0, 0, 2, 1, 1);
    const twoAnchor = tileToScreen(2, 1);
    expect(twoAnchor.x - two.width / 2 - two.x).toBe(12);
    // The anchor pixel inside the file is the one rule, and the hall and the Sprite check page
    // both read it from here.
    expect(spriteAnchorIn(3, 1, 1)).toEqual({ x: 76, y: 76, width: 104, height: 80 });
  });

  it('writes an image element the browser can draw', () => {
    const svg = spriteImage('/sprites/tableSaw.png', spriteBox(0, 0, 4, 2, 2));
    expect(svg).toContain('<image href="/sprites/tableSaw.png"');
    expect(svg).toContain('width="152"');
    expect(svg).toContain('height="128"');
  });
});

describe('the manifest the build writes', () => {
  it('keeps the PNG files, sorted, and nothing else', () => {
    expect(pickPngs(['b.png', 'a.PNG', 'notes.txt', 'c.jpg', 'd.png'])).toEqual([
      'a.PNG',
      'b.png',
      'd.png',
    ]);
    expect(pickPngs([])).toEqual([]);
  });

  it('writes what is on disk, and reads a missing folder as an empty one', () => {
    expect(spriteFilesIn('public/sprites')).toEqual(manifest);
    expect(spriteFilesIn('public/sprites/not-a-folder')).toEqual([]);
  });
});
