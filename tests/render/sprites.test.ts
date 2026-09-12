// The sprite loader: which file an object is drawn with, and where that file goes on screen.
// The maths is the contract in docs/art/SPRITES.md, not an invention of this file.

import { describe, expect, it } from 'vitest';
import {
  SPRITE_PADDING,
  SPRITE_SCALE,
  pickSprite,
  spriteBox,
  spriteCanvas,
  spriteFileSize,
  spriteFiles,
  spriteImage,
  spriteUrl,
} from '../../src/render/sprites';
import { tileToScreen } from '../../src/render/iso';
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
    // The folder is empty tonight, so every object in the game falls back to its box.
    expect(spriteFiles()).toEqual([]);
    expect(spriteUrl('tableSaw', 'used')).toBeNull();
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
    // Horizontally centred on the anchor, and the anchor sits 4 px above the bottom edge.
    expect(at.x + at.width / 2).toBe(anchor.x);
    expect(at.y + at.height - SPRITE_PADDING / SPRITE_SCALE).toBe(anchor.y);
    expect(at).toEqual({ x: -196, y: 32, width: 152, height: 128 });
  });

  it('puts a one tile object on its own tile the same way', () => {
    const at = spriteBox(3, 3, 1, 1, 1);
    expect(at.width).toBe(56);
    expect(at.height).toBe(56);
    const anchor = tileToScreen(4, 4);
    expect(at.x + at.width / 2).toBe(anchor.x);
    expect(at.y + at.height - 4).toBe(anchor.y);
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

  it('reads an empty folder as an empty manifest, and a missing one too', () => {
    expect(spriteFilesIn('public/sprites')).toEqual([]);
    expect(spriteFilesIn('public/sprites/not-a-folder')).toEqual([]);
    expect(manifest).toEqual([]);
  });
});
